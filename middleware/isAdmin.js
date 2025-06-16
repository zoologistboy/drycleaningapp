// middlewares/roleAuth.js

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admins only.',
    });
  }
  next();
};

const isStaffOrAdmin = (req, res, next) => {
  if (req.user?.role !== 'staff' && req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Staff or Admins only.',
    });
  }
  next();
};

module.exports = { isAdmin, isStaffOrAdmin };
