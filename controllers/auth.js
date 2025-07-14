const userModel = require("../models/user");
// const bcrypt = require("bcrypt");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
const sendVerificationEmail = require("../services/nodemailer/sendVerificationEmail");
const generateRandomString = require("../utils/randomString");
const sendResetPasswordEmail = require("../services/nodemailer/sendResetPasswordEmail");
const generateToken = require("../utils/token");
require("dotenv").config();

const signup = async (req, res, next) => {
  const { password, email, fullName, role } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ status: "error", message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const token = generateRandomString(8);
    const verificationExp = Date.now() + 5 * 60 * 1000;

    const profilePictureUrl = req.file ? req.file.path : "";

    const user = await userModel.create({
      ...req.body,
      password: hashedPassword,
      profilePicture: profilePictureUrl,
      verificationToken: token,
      verificationExp,
      isVerified: false,
      role
    });

    await sendVerificationEmail(email, fullName.split(" ")[0], token);

    res.status(201).json({
      status: "success",
      message: "Signup successful, please check your email to verify.",
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  const { fullName, phoneNumber, address } = req.body;

  try {
    const updateData = { fullName, phoneNumber, address };

    if (req.file) {
      updateData.profilePicture = req.file.path;
    }

    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Profile updated",
      data: user,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    next(err);
  //   console.error("Error updating profile:", err);
  // res.status(500).json({
  //   message: "something went wrong",
  //   errorName: err.name,
  //   errorMessage: err.message, // Add this!
  //   stack: err.stack // Optional: for full debugging
  }
};


const verifyEmail = async (req, res, next) => {
  const { token } = req.params;
  try {
    const user = await userModel.findOne({ verificationToken: token });

    if (!user || !user.verificationExp || user.verificationExp < Date.now()) {
      return res.status(400).json({ status: "error", message: "Token invalid or expired" });
    }

    user.verificationToken = null;
    user.verificationExp = null;
    user.isVerified = true;
    await user.save();

    res.status(200).json({ status: "success", message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email or account not verified",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const accessToken = generateToken(user); // ✅ FIXED

    res.status(200).json({
      status: "success",
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role, // optional, if you need role-based access
      },
    });
  } catch (err) {
    next(err);
  }
};


const resendVerificationEmail = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(409).json({ status: "error", message: "User already verified" });
    }

    const token = generateRandomString(8);
    user.verificationToken = token;
    user.verificationExp = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendVerificationEmail(email, user.fullName.split(" ")[0], token);

    res.status(200).json({
      status: "success",
      message: "Verification email resent successfully",
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ status: "error", message: "User not found" });
    }

    const userFirstName = user.fullName.split(" ")[0]

    const token = generateRandomString(8);
    user.resetToken = token;
    user.resetTokenExp = Date.now() + 15 * 60 * 1000;
    await user.save();

    await sendResetPasswordEmail(email, userFirstName, token);
    res.status(200).json({ status: "success", message: "Reset link sent to your email" });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await userModel.findOne({ resetToken: token });

    if (!user || user.resetTokenExp < Date.now()) {
      return res.status(400).json({ status: "error", message: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExp = null;
    await user.save();

    res.status(200).json({ status: "success", message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password").populate("orders");
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    res.status(200).json({ status: "success", data: user });
  } catch (err) {
    next(err);
  }
};



module.exports = {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
};


