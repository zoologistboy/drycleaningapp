// controllers/wallet.js
const User = require("../models/user");

const topUpWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user._id);

    user.walletBalance += amount;
    await user.save();

    res.json({ 
      status: "success", 
      newBalance: user.walletBalance 
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
module.exports = {topUpWallet}