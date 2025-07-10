const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const dotenv = require("dotenv");
dotenv.config();

const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

// Helper function to format currency
const formatCurrency = (amount, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency
  }).format(amount);
};

// Initialize wallet top-up
const topUpWallet = async (req, res) => {
  try {
    const { amount, paymentMethod = 'card' } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!amount || isNaN(amount) || amount < 100) { // Minimum amount check
      return res.status(400).json({ 
        success: false,
        message: 'Amount must be at least ₦100' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const txRef = `TOPUP-${Date.now()}-${userId}`;
    
    const paymentData = {
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: "http://localhost:5173/wallet/verify",
      customer: {
        email: user.email,
        name: user.fullName,
        phone_number: user.phoneNumber
      },
      customizations: {
        title: "Wallet Top-Up",
        description: `Top up of ₦${amount}`
      }
    };

    // Initialize Flutterwave payment
    const response = await flw.Payment.initiate(paymentData);
    
    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to initiate payment');
    }

    // Create pending transaction
    await Transaction.create({
      user: userId,
      amount,
      type: "topup",
      method: paymentMethod,
      reference: txRef,
      status: "pending"
    });

    res.json({
      success: true,
      paymentLink: response.data.link
    });

  } catch (error) {
    console.error('Top-up error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Could not initiate payment'
    });
  }
};

// Verify payment and update wallet
const verifyTopUp = async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (!transaction_id) {
      return res.redirect('/wallet?verified=error&message=Transaction ID required');
    }

    // Verify with Flutterwave
    const { status, tx_ref, amount, currency, customer } = (await flw.Transaction.verify({ 
      id: transaction_id 
    })).data;

    // Find existing transaction
    const transaction = await Transaction.findOne({ reference: tx_ref });
    if (!transaction) {
      return res.redirect('/wallet?verified=error&message=Transaction not found');
    }

    if (transaction.status === 'completed') {
      return res.redirect('/wallet?verified=already');
    }

    // Process successful payment
    if (status === "successful") {
      // Atomic update of user balance
      const updatedUser = await User.findOneAndUpdate(
        { _id: transaction.user },
        { 
          $inc: { walletBalance: amount },
          $push: {
            notifications: {
              message: `Wallet credited with ${formatCurrency(amount, currency)}`,
              type: 'wallet',
              link: '/wallet'
            }
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Update transaction record
      await Transaction.updateOne(
        { _id: transaction._id },
        {
          status: 'completed',
          newBalance: updatedUser.walletBalance,
          currency,
          metadata: {
            flutterwaveId: transaction_id,
            verifiedAt: new Date(),
            customerEmail: customer.email
          }
        }
      );

      return res.redirect('/wallet?verified=success');
    }

    // Handle failed payment
    await Transaction.updateOne(
      { _id: transaction._id },
      { status: 'failed' }
    );
    
    return res.redirect('/wallet?verified=failed');

  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect(
      `/wallet?verified=error&message=${encodeURIComponent(
        error.response?.data?.message || error.message || 'Payment verification failed'
      )}`
    );
  }
};

// Webhook handler
const paymentWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers['verif-hash'] || req.headers['Verif-Hash'];
    
    // Verify signature
    if (!signature || signature !== secretHash) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Parse payload
    const payload = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body;

    console.log("✅ Webhook received for:", payload.event);

    // Handle charge completion
    if (payload.event === 'charge.completed') {
      const { tx_ref, status, amount, currency, id: transactionId } = payload.data;

      // Find transaction
      const transaction = await Transaction.findOne({ reference: tx_ref });
      if (!transaction || transaction.status === 'completed') {
        return res.status(200).end();
      }

      // Process successful payment
      if (status === 'successful') {
        const user = await User.findById(transaction.user);
        if (!user) {
          console.error("User not found for transaction:", tx_ref);
          return res.status(404).end();
        }

        // Update user balance
        const previousBalance = user.walletBalance;
        user.walletBalance += Number(amount);
        await user.save();

        // Update transaction
        transaction.status = 'completed';
        transaction.newBalance = user.walletBalance;
        transaction.currency = currency;
        transaction.metadata = {
          ...transaction.metadata,
          flutterwaveId: transactionId,
          webhookVerifiedAt: new Date()
        };
        await transaction.save();

        // Add notification
        user.notifications.push({
          message: `Wallet credited with ${formatCurrency(amount, currency)}`,
          type: 'wallet',
          link: '/wallet'
        });
        await user.save();

        console.log(`💰 Wallet top-up completed for ${user.email}`);
      } else {
        // Mark failed transaction
        transaction.status = 'failed';
        await transaction.save();
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ 
      message: "Webhook processing failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get wallet balance
const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('walletBalance fullName email phoneNumber');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      status: 'success',
      data: {
        balance: user.walletBalance,
        formattedBalance: formatCurrency(user.walletBalance),
        user: {
          name: user.fullName,
          email: user.email,
          phone: user.phoneNumber
        }
      }
    });
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ 
      message: 'Failed to retrieve wallet balance',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (type) filter.type = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    // Format transactions with human-readable dates and amounts
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      formattedAmount: formatCurrency(tx.amount, tx.currency),
      formattedDate: new Date(tx.createdAt).toLocaleString(),
      formattedPreviousBalance: formatCurrency(tx.previousBalance),
      formattedNewBalance: formatCurrency(tx.newBalance)
    }));

    res.json({
      status: 'success',
      data: formattedTransactions,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: total > skip + transactions.length,
      }
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ 
      message: 'Failed to retrieve transactions',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  topUpWallet,
  verifyTopUp,
  paymentWebhook,
  getWalletBalance,
  getWalletTransactions
};