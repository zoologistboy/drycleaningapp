const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

const isLoggedIn = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. If no token, reject access
    if (!token) {
      return res.status(403).json({
        status: "error",
        message: "You need a token to access this page. Please log in.",
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, process.env.jwt_secret); // 🔁 Use `JWT_SECRET` (case sensitive)
    // console.log("Decoded JWT:", decoded);

    // 4. Find user by ID in token
    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "This token does not belong to a valid user.",
      });
    }

    // 5. Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
};

module.exports = isLoggedIn;
