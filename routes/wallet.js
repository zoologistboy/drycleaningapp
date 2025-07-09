const express = require('express');
const walletRouter = express.Router();

const {
  paymentWebhook,
  topUpWallet,
  getWalletBalance,
  getWalletTransactions,
  verifyTopUp,
  initiateFlutterwavePayment,
  verifyFlutterwavePayment
} = require('../controllers/wallet');

const isLoggedIn = require('../middleware/isLoggedin');

// Wallet operations
walletRouter.get('/balance', isLoggedIn, getWalletBalance);
walletRouter.get('/transactions', isLoggedIn, getWalletTransactions);

// Top-up operations
walletRouter.post('/topup', isLoggedIn, topUpWallet);
// walletRouter.post('/topup', isLoggedIn, topUpWallet);
walletRouter.get('/verify', verifyTopUp);
walletRouter.post('/webhook', paymentWebhook);

// Flutterwave-specific
walletRouter.post('/flutterwave/initiate', isLoggedIn, initiateFlutterwavePayment);
walletRouter.get('/flutterwave/verify', verifyFlutterwavePayment); // This route is called via redirect from Flutterwave

module.exports = walletRouter;
