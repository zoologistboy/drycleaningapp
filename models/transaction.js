// const mongoose = require("mongoose");

// const transactionSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   amount: { type: Number, required: true },
//   type: { 
//     type: String, 
//     enum: ["payment", "refund", "topup", "withdrawal"],
//     required: true 
//   },
//   method: { type: String, enum: ["card", "wallet", "cash", "transfer"] },
//   reference: { type: String, required: true, unique: true },
//   order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
//   status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" }
// }, { timestamps: true });

// module.exports = mongoose.model("Transaction", transactionSchema);

// models/transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['topup', 'payment', 'refund', 'withdrawal'], required: true },
  method: { type: String, enum: ['card', 'bank', 'wallet', 'cash'], required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  previousBalance: { type: Number, required: true },
  newBalance: { type: Number, required: true },
  description: String,
  metadata: Object
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);