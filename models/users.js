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
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
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
    notifications: [
      {
        message: { type: String },
        seen: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedAt: {
      type: Date, // optional soft-delete field
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
