const Order = require('../models/order');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const { updateInventoryAfterOrder } = require('../controllers/admin');

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { services, deliveryType, deliveryAddress, notes, paymentMethod } = req.body;

    // Validate required fields
    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ 
        status: "error", 
        message: "At least one service is required" 
      });
    }

    if (!deliveryType || !deliveryAddress) {
      return res.status(400).json({ 
        status: "error", 
        message: "Delivery type and address are required" 
      });
    }

    // Calculate total amount
    const totalAmount = services.reduce(
      (sum, service) => sum + (service.pricePerUnit * service.quantity),
      0
    );

    // Check wallet balance if paying by wallet
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

      // Deduct from wallet
      user.walletBalance -= totalAmount;
      await user.save();
    }

    // Create new order
    const order = await Order.create({
      user: req.user._id,
      services: services.map(service => ({
        serviceId: service.id,
        name: service.name,
        pricePerUnit: service.pricePerUnit,
        quantity: service.quantity,
        description: service.description
      })),
      totalAmount,
      deliveryType,
      deliveryAddress,
      paymentMethod,
      isPaid: paymentMethod !== "cash",
      notes,
      status: 'pending'
    });

    // Add notification to user
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          message: `Order #${order._id} placed successfully`,
          type: "order",
          link: `/orders/${order._id}`,
          read: false,
          createdAt: new Date()
        },
      },
    });

    // Emit real-time notification
    try {
      const io = req.app.get("io");
      io.to(`user_${order.user}`).emit("notification", {
        message: `Your order #${order._id} has been placed`,
        type: "order",
        link: `/orders/${order._id}`,
        createdAt: new Date()
      });
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr.message);
    }

    res.status(201).json({
      status: "success",
      data: order,
    });

  } catch (err) {
    console.error("Order creation error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// Get all orders for the current user
const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: orders
    });
  } catch (err) {
    console.error("Get user orders error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// Get specific order details
const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Verify the requesting user owns the order (unless admin)
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        status: "error", 
        message: "Unauthorized to view this order" 
      });
    }

    res.status(200).json({
      status: "success",
      data: order
    });
  } catch (err) {
    console.error("Get order details error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// Cancel an order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Verify the requesting user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        status: "error", 
        message: "Unauthorized to cancel this order" 
      });
    }

    // Check if order can be cancelled (only pending or processing orders)
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        status: "error",
        message: `Order cannot be cancelled in its current state (${order.status})`
      });
    }

    // Refund wallet if payment was by wallet
    if (order.paymentMethod === 'wallet' && order.isPaid) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { walletBalance: order.totalAmount }
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Add notification
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          message: `Order #${order._id} has been cancelled`,
          type: "order",
          link: `/orders/${order._id}`,
          read: false,
          createdAt: new Date()
        },
      },
    });

    // Emit real-time notification
    try {
      const io = req.app.get("io");
      io.to(`user_${order.user}`).emit("notification", {
        message: `Your order #${order._id} has been cancelled`,
        type: "order",
        link: `/orders/${order._id}`,
        createdAt: new Date()
      });
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr.message);
    }

    res.status(200).json({
      status: "success",
      data: order
    });

  } catch (err) {
    console.error("Cancel order error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// Update order status (staff/admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({
        status: "error",
        message: "New status is required"
      });
    }

    const validStatuses = ['pending', 'processing', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value"
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true }
    ).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Add notification to user
    await User.findByIdAndUpdate(order.user._id, {
      $push: {
        notifications: {
          message: `Order #${order._id} status updated to ${newStatus}`,
          type: "order",
          link: `/orders/${order._id}`,
          read: false,
          createdAt: new Date()
        },
      },
    });

    // Emit real-time notification
    try {
      const io = req.app.get("io");
      io.to(`user_${order.user._id}`).emit("notification", {
        message: `Your order #${order._id} is now ${newStatus}`,
        type: "order",
        link: `/orders/${order._id}`,
        createdAt: new Date()
      });
    } catch (socketErr) {
      console.error("Socket emit failed:", socketErr.message);
    }

    // Handle completed order
    if (newStatus === "completed") {
      await updateInventoryAfterOrder(order._id);
      
      // Record transaction if paid
      if (order.isPaid) {
        await Transaction.create({
          user: order.user._id,
          amount: order.totalAmount,
          type: "payment",
          method: order.paymentMethod,
          reference: `ORDER-${order._id}`,
          order: order._id,
          status: "completed",
          createdAt: new Date()
        });
      }
    }

    res.status(200).json({
      status: "success",
      data: order
    });

  } catch (err) {
    console.error("Order status update error:", err.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus
};

