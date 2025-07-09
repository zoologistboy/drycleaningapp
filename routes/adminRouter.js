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
  getRecentTransactions
//   updateOrderStatusAdmin
} = require("../controllers/admin");
const isLoggedIn = require("../middleware/isLoggedin");
// const {} = require("../middleware/")


// router.use(isLoggedIn, );

// Order Management
adminRouter.get("/orders", isLoggedIn, getAllOrders);
adminRouter.patch("/orders/:id/status", isLoggedIn, updateOrderStatus);
adminRouter.patch("/orders/:id/assign", isLoggedIn, assignOrderToStaff);

// User Management
adminRouter.get("/users",isLoggedIn, getAllUsers);
adminRouter.post("/users/staff", createStaffAccount);
adminRouter.get("/transactions", isLoggedIn, getRecentTransactions);


// Analytics
adminRouter.get("/stats", isLoggedIn, getDashboardStats);
adminRouter.get("/analytics/revenue", isLoggedIn, getRevenueAnalytics);
adminRouter.get("/staff/performance", getStaffPerformance);

adminRouter.get("/inventory/low-stock", checkLowStock);
adminRouter.post("/inventory/restock", restockInventory);



module.exports = adminRouter;