const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// Top-up wallet (initiate Flutterwave payment)
const topUpWallet = async (req, res) => {
  try {
    const { amount, paymentMethod = 'card' } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid amount' });
    }

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Generate unique transaction reference
    const txRef = `TOPUP-${uuidv4()}`;

    // Prepare payment data
    const paymentData = {
      tx_ref: txRef,
      amount,
      currency: 'NGN',
      redirect_url: 'https://drycleaningapp.onrender.com/wallet/verify', // 👈 update for production
      customer: {
        email: user.email,
        name: user.fullName,
      },
      customizations: {
        title: 'Wallet Top-Up',
        description: `Top up of ₦${amount}`,
      },
    };

    // Initiate payment with Flutterwave
    const response = await flw.PaymentInitiation.payment(paymentData);

    if (response.status !== 'success') {
      return res.status(500).json({ status: 'error', message: 'Failed to initiate payment' });
    }

    // Save transaction as pending
    await Transaction.create({
      user: user._id,
      amount,
      type: 'topup',
      method: paymentMethod,
      reference: txRef,
      status: 'pending',
      previousBalance: user.walletBalance,
      newBalance: user.walletBalance, // unchanged until verified
      description: `Wallet top-up initiated via ${paymentMethod}`,
    });

    // Return payment link to frontend
    res.json({ status: 'success', paymentLink: response.data.link });
  } catch (err) {
    console.error('Top-up error:', err);
    res.status(500).json({ status: 'error', message: 'Could not initiate top-up' });
  }
};


// Verify payment (via redirect)
const verifyTopUp = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    const response = await flw.Transaction.verify({ id: transaction_id });
    const { status, tx_ref, amount } = response.data;

    const transaction = await Transaction.findOne({ reference: tx_ref });
    if (!transaction || transaction.status === 'completed') {
      return res.redirect('http://localhost:5173/wallet?status=already');
    }

    if (status === 'successful') {
      const user = await User.findById(transaction.user);
      const prevBalance = user.walletBalance;
      user.walletBalance += Number(amount);
      await user.save();

      transaction.status = 'completed';
      transaction.previousBalance = prevBalance;
      transaction.newBalance = user.walletBalance;
      await transaction.save();

      await User.findByIdAndUpdate(user._id, {
        $push: {
          notifications: {
            message: `Your wallet was credited with ₦${Number(amount).toLocaleString()}`,
            type: 'wallet',
            link: '/wallet',
            read: false,
            createdAt: new Date(),
          },
        },
      });

      return res.redirect('http://localhost:5173/wallet?status=success');
    }

    // Update to failed
    transaction.status = 'failed';
    await transaction.save();
    return res.redirect('http://localhost:5173/wallet?status=failed');
  } catch (error) {
    console.error('Verification error:', error.message);
    return res.redirect('http://localhost:5173/wallet?status=error');
  }
};

// Get wallet balance
const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance fullName');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      status: 'success',
      data: {
        balance: user.walletBalance,
        user: user.fullName,
      },
    });
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ message: 'Failed to retrieve wallet balance' });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.json({
      status: 'success',
      data: transactions,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: total > skip + transactions.length,
      },
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'Failed to retrieve transactions' });
  }
};

// (Optional) Webhook handler for automatic verification
const paymentWebhook = async (req, res) => {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) {
    console.warn('⚠️ Invalid signature:', signature);
    return res.status(401).end();
  }

  try {
    const payload = JSON.parse(req.body.toString('utf8')); // ✅ Parse raw buffer
    console.log('✅ Webhook received:', payload);

    const { tx_ref, status, amount } = payload;

    const transaction = await Transaction.findOne({ reference: tx_ref });
    if (!transaction || transaction.status === 'completed') {
      return res.status(200).end(); // Already handled
    }

    if (status === 'successful') {
      const user = await User.findById(transaction.user);
      const prevBalance = user.walletBalance;
      user.walletBalance += Number(amount);
      await user.save();

      transaction.status = 'completed';
      transaction.previousBalance = prevBalance;
      transaction.newBalance = user.walletBalance;
      await transaction.save();

      await User.findByIdAndUpdate(user._id, {
        $push: {
          notifications: {
            message: `Your wallet was credited with ₦${Number(amount).toLocaleString()}`,
            type: 'wallet',
            link: '/wallet',
            read: false,
            createdAt: new Date(),
          },
        },
      });

    } else {
      transaction.status = 'failed';
      await transaction.save();
    }

    return res.status(200).end();
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).end();
  }
};


module.exports = {
  topUpWallet,
  verifyTopUp,
  getWalletBalance,
  getWalletTransactions,
  paymentWebhook,
};
