const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    profilePicture: {
      type: String,
      default: "https://res.cloudinary.com/demo/image/upload/v1690000000/default-avatar.jpg", // update to your placeholder or Cloudinary default
    },
    role: {
      type: String,
      enum: ["user", "admin", "staff"],
      default: "user",
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationExp: {
      type: Date,
    },
    resetToken: {
      type: String,
    },
    resetTokenExp: {
      type: Date,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    // In user model
    notifications: [{
      message: String,
      type: { type: String, enum: ["order", "payment", "promotion"] },
      read: { type: Boolean, default: false },
      link: String, // e.g., "/orders/123"
      createdAt: { type: Date, default: Date.now }
    }],
    deletedAt: {
      type: Date, // optional soft-delete field
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
