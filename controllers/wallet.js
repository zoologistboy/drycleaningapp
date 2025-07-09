// controllers/wallet.js
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const dotenv = require("dotenv")
dotenv.config()


const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);

const topUpWallet = async (req, res) => {
  try {
    const { amount, paymentMethod = 'card' } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ status: "error", message: "Invalid amount" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    const txRef = `TOPUP-${uuidv4()}`;

    const paymentData = {
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: "http://localhost:5173/wallet/verify", // frontend route to handle verification
      customer: {
        email: user.email,
        name: user.fullName,
      },
      customizations: {
        title: "Wallet Top-Up",
        description: `Top up of ₦${amount}`,
      }
    };

    const response = await flw.PaymentInitiation.initialize(paymentData);
    if (response.status !== 'success') {
      return res.status(500).json({ status: "error", message: "Failed to initiate payment" });
    }

    // Save transaction with pending status
    await Transaction.create({
      user: user._id,
      amount,
      type: "topup",
      method: paymentMethod,
      reference: txRef,
      status: "pending",
      previousBalance: user.walletBalance,
      newBalance: user.walletBalance, // unchanged for now
      description: `Wallet top-up initiated via ${paymentMethod}`
    });

    res.json({ status: "success", paymentLink: response.data.link });
  } catch (err) {
    console.error("Top-up error:", err);
    res.status(500).json({ status: "error", message: "Could not initiate top-up" });
  }
};




const initiateFlutterwavePayment = async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const txRef = `TOPUP-${uuidv4()}`;

    const flutterwaveRes = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      {
        tx_ref: txRef,
        amount,
        currency: 'NGN',
        redirect_url: 'http://localhost:5173/wallet/verify',
        customer: {
          email: user.email,
          name: user.fullName,
        },
        customizations: {
          title: 'Wallet Top-up',
          description: `Top-up with ₦${amount}`,
          logo: 'https://your-logo-url.com/logo.png', //3550
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const paymentLink = flutterwaveRes.data.data.link;

    res.status(200).json({
      status: 'success',
      link: paymentLink,
    });
  } catch (error) {
    console.error('Flutterwave error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to initiate payment' });
  }
};

// Verify payment and top-up wallet
const verifyFlutterwavePayment = async (req, res) => {
  const { transaction_id } = req.query;

  try {
    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;

    if (data.status === 'successful') {
      const user = await User.findOne({ email: data.customer.email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const previousBalance = user.walletBalance;
      user.walletBalance += Number(data.amount);
      await user.save();

      const transaction = await Transaction.create({
        user: user._id,
        amount: data.amount,
        type: 'topup',
        method: 'flutterwave',
        reference: data.tx_ref,
        status: 'completed',
        previousBalance,
        newBalance: user.walletBalance,
        description: `Flutterwave top-up`,
      });

      await User.findByIdAndUpdate(user._id, {
        $push: {
          notifications: {
            message: `Your wallet was credited with ₦${data.amount.toLocaleString()}`,
            type: 'wallet',
            link: '/wallet',
            read: false,
            createdAt: new Date(),
          },
        },
      });

      return res.redirect(`http://localhost:5173/wallet?status=success`);
    }

    return res.redirect(`http://localhost:5173/wallet?status=failed`);
  } catch (err) {
    console.error('Verification error:', err.message);
    res.status(500).send('Payment verification failed');
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

const verifyTopUp = async (req, res) => {
  try {
    const { transaction_id } = req.query;

    const response = await flw.Transaction.verify({ id: transaction_id });
    const { status, tx_ref, amount } = response.data;

    const transaction = await Transaction.findOne({ reference: tx_ref });
    if (!transaction || transaction.status === 'completed') {
      return res.redirect('/wallet?verified=already'); // Frontend route
    }

    if (status === "successful") {
      const user = await User.findById(transaction.user);
      const prevBalance = user.walletBalance;
      user.walletBalance += amount;
      await user.save();

      transaction.status = "completed";
      transaction.newBalance = user.walletBalance;
      transaction.previousBalance = prevBalance;
      await transaction.save();

      return res.redirect('/wallet?verified=success');
    }

    transaction.status = "failed";
    await transaction.save();
    return res.redirect('/wallet?verified=failed');
  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect('/wallet?verified=error');
  }
};

// 
// const paymentWebhook = async (req, res) => {
//   try {
//     const secretHash = process.env.FLW_SECRET_HASH;
//     const signature = req.headers['verif-hash'];

//     let payload;

//     // ✅ If req.body is a Buffer (from express.raw), parse it
//     if (Buffer.isBuffer(req.body)) {
//       const rawBody = req.body.toString('utf8');
//       payload = JSON.parse(rawBody);
//     } else {
//       // ✅ If it's already parsed JSON (e.g., during curl testing)
//       payload = req.body;
//     }

//     if (!signature || signature !== secretHash) {
//       console.log("🚫 Invalid signature");
//       return res.status(401).end();
//     }

//     console.log("✅ Webhook payload:", payload);

//     const { tx_ref, status, amount } = payload;
//     const orderId = tx_ref?.split("_")[1];

//     if (status === "successful" && orderId) {
//       await Order.findByIdAndUpdate(orderId, { isPaid: true });
//       console.log("✅ Order marked as paid:", orderId);
//     }

//     res.status(200).end();
//   } catch (err) {
//     console.error("❌ Webhook Error:", err);
//     res.status(500).json({ message: "something went wrong", errorName: err.name });
//   }
// };
const paymentWebhook = async (req, res) => {
  console.log("hereee");
  
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers['verif-hash'] || req.headers['Verif-Hash'] || req.headers['verif_hash'];
;

    console.log("Signature from header:", signature);
    console.log("Secret hash from env:", secretHash);


    if (!signature || signature !== secretHash) {
      console.log("❌ Invalid signature");
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Parse raw buffer
    const raw = req.body.toString('utf8');
    const payload = JSON.parse(raw);

    console.log('✅ Webhook payload received:', payload);

    const { tx_ref, status, amount } = payload;

    // Example: handle topup
    if (status === 'successful') {
      const transaction = await Transaction.findOne({ reference: tx_ref });
      if (!transaction || transaction.status === 'completed') {
        return res.status(200).end();
      }

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
    }

    res.status(200).end();
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ message: "Something went wrong", errorName: err.name });
  }
};






module.exports = {
  initiateFlutterwavePayment,
  verifyFlutterwavePayment,
  getWalletBalance,
  getWalletTransactions,
  verifyTopUp,
  topUpWallet,
  paymentWebhook
};