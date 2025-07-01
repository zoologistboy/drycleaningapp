const Order = require("../models/order");
const User = require("../models/user");
const Transaction = require("../models/transaction")

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { services, deliveryType, deliveryAddress, notes, paymentMethod } = req.body;

    // Calculate total amount based on service price and quantity
    const totalAmount = services.reduce(
      (sum, service) => sum + (service.pricePerUnit * service.quantity),
      0
    );

    // Check if the user has enough wallet balance (if paying by wallet)
    if (paymentMethod === "wallet") {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      if (user.walletBalance < totalAmount) {
        return res.status(400).json({
          status: "error",
          message: "Insufficient wallet balance",
        });
      }

      user.walletBalance -= totalAmount;
      await user.save();
    }

    // Create new order
    const order = await Order.create({
      user: req.user._id,
      services,
      totalAmount,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      isPaid: paymentMethod !== "cash", // Paid if not cash
      notes,
    });

    // Save notification to user in DB
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          message: `Order #${order._id} placed successfully`,
          type: "order",
          link: `/orders/${order._id}`,
        },
      },
    });

    // Emit real-time notification to the user (via socket)
    try {
      const io = req.app.get("io");
      io.to(`user_${order.user}`).emit("notification", {
        message: `Your order #${order._id} is now ${order.status}`,
        type: "order",
        link: `/orders/${order._id}`,
      });
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr.message);
      // Optional: don't block the flow on socket error
    }

    // In your order status update logic
      

    // Respond to client
    res.status(201).json({
      status: "success",
      data: order,
    });

    if (newStatus === "completed") {
        await adminController.updateInventoryAfterOrder(order._id);
        
        // Record transaction if paid
        if (order.isPaid) {
          await Transaction.create({
            user: order.user,
            amount: order.totalAmount,
            type: "payment",
            method: order.paymentMethod,
            reference: `ORDER-${order._id}`,
            order: order._id
          });
        }
      }
  } catch (err) {
    console.error("Order creation error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};


// Get orders for logged-in user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort("-createdAt");
    res.json({ status: "success", results: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = { getUserOrders, createOrder}