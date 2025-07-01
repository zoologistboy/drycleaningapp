const express = require("express");
const orderRouter = express.Router();
const {
  createOrder,
  getUserOrders,
//   cancelOrder,
//   updateOrderStatus
} = require("../controllers/order");
const isLoggedIn = require("../middleware/isLoggedin");

orderRouter.post("/", isLoggedIn, createOrder);
orderRouter.get("/my-orders", isLoggedIn, getUserOrders);
// orderRouter.patch("/:id/cancel", isLoggedIn, cancelOrder);
// orderRouter.patch("/:id/status", isLoggedIn, updateOrderStatus); // For staff/admin

module.exports = orderRouter;