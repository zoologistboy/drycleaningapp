const express = require("express");
const authRouter = express.Router();
const {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail,
  updateProfile,
  getProfile
} = require("../controllers/auth");
const profilePicture = require("../config/multer");
const isLoggedIn = require("../middleware/isLoggedin");

authRouter.post("/signup", profilePicture.single("profilePicture"), signup);
authRouter.post("/login", login);

// ✅ GET route for verifying email
authRouter.get("/verify/:token", verifyEmail);

authRouter.get("/profile", isLoggedIn, getProfile)


// ✅ POST route for resending email (uses body not URL)
authRouter.post("/resend-verification", resendVerificationEmail);
authRouter.put('/update-profile', isLoggedIn, profilePicture.single("profilePicture"), updateProfile);

module.exports = authRouter;
