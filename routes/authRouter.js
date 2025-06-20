const express = require("express");
const authRouter = express.Router();
const {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail
} = require("../controllers/auth");
const profilePicture = require("../config/multer");

authRouter.post("/signup", profilePicture.single("profilePicture"), signup);
authRouter.post("/login", login);

// ✅ GET route for verifying email
authRouter.get("/verify/:token", verifyEmail);


// ✅ POST route for resending email (uses body not URL)
authRouter.post("/resend-verification", resendVerificationEmail);

module.exports = authRouter;
