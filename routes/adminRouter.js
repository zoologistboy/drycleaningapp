const express = require("express");
const adminRouter = express.Router();
const {
  getAllOrders,
  assignOrderToStaff,
  updateOrderStatus,
  getAllUsers,
  createStaffAccount,
  getDashboardStats,
  getRevenueAnalytics,
  getStaffPerformance,
  checkLowStock,
  restockInventory,
//   updateOrderStatusAdmin
} = require("../controllers/admin");
const isLoggedIn = require("../middleware/isLoggedin");
const {isAdmin} = require("../middleware/isAdmin")


// router.use(isLoggedIn, isAdmin);

// Order Management
adminRouter.get("/orders", isLoggedIn, isAdmin, getAllOrders);
adminRouter.patch("/orders/:id/status", isLoggedIn, isAdmin, updateOrderStatus);
adminRouter.patch("/orders/:id/assign", isLoggedIn, isAdmin, assignOrderToStaff);

// User Management
adminRouter.get("/users",isLoggedIn, isAdmin, getAllUsers);
adminRouter.post("/users/staff", createStaffAccount);

// Analytics
adminRouter.get("/stats", isLoggedIn, isAdmin, getDashboardStats);
adminRouter.get("/analytics/revenue", isLoggedIn, isAdmin, getRevenueAnalytics);
adminRouter.get("/staff/performance", getStaffPerformance);

adminRouter.get("/inventory/low-stock", checkLowStock);
adminRouter.post("/inventory/restock", restockInventory);



module.exports = adminRouter;