const express = require("express");
const paymentRouter = express.Router();
const {
  initiatePayment,
  paymentWebhook
} = require("../controllers/payment");
const isLoggedIn = require("../middleware/isLoggedin");

paymentRouter.post("/initiate", isLoggedIn, initiatePayment);
paymentRouter.post("/webhook", paymentWebhook); // No auth for webhooks!

module.exports = paymentRouter;