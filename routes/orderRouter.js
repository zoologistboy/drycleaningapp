const express = require("express");
const orderRouter = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus
} = require("../controllers/order");
const isLoggedIn = require("../middleware/isLoggedin");
const {isStaffOrAdmin} = require("../middleware/isAdmin");

// Create a new order
orderRouter.post("/", isLoggedIn, createOrder);

// Get all orders for the current user
orderRouter.get("/my-orders", isLoggedIn, getUserOrders);

// Get specific order details
orderRouter.get("/:orderId", isLoggedIn, getOrderDetails);

// Cancel an order (user only)
orderRouter.patch("/:orderId/cancel", isLoggedIn, cancelOrder);

// Update order status (staff/admin only)
orderRouter.patch("/:orderId/status", isLoggedIn, isStaffOrAdmin, updateOrderStatus);

module.exports = orderRouter;