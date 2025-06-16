module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You are not authorized.",
      });
    }

    next();
  };
};
