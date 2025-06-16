const express = require("express")
const authRouter = express.Router()
const {signup, login, verifyEmail} = require("../controllers/auth");
const profilePicture = require("../config/multer");

authRouter.post("/signup", profilePicture.single("profilePicture"), signup);
authRouter.post("/login", login)
authRouter.post("/verify/:token", verifyEmail)

module.exports = authRouter