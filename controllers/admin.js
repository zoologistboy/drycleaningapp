const Order = require("../models/order");
const User = require("../models/user");
const StaffPerformance = require("../models/staffPerformance");
const Inventory = require("../models/inventory");
// const Notification = require("../models/notification"); // If using separate model

// ==================== ORDER MANAGEMENT ====================

/**
 * Get all orders with filtering and pagination
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, dateFrom, dateTo } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(query)
      .populate("user", "fullName email phoneNumber")
      .populate("assignedStaff", "fullName")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.json({
      status: "success",
      results: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: orders
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Update order status (Admin override)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["processing", "completed", "delivered", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value"
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("user", "fullName email");

    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Send notification to user
    await Notification.create({
      user: order.user._id,
      message: `Your order #${order._id} status updated to ${status}`,
      type: "order",
      link: `/orders/${order._id}`
    });

    res.json({ status: "success", data: order });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Assign order to staff member
 */
const assignOrderToStaff = async (req, res) => {
  try {
    const { staffId } = req.body;

    // Verify staff exists
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") {
      return res.status(400).json({
        status: "error",
        message: "Invalid staff member"
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        assignedStaff: staffId,
        status: "processing" 
      },
      { new: true }
    ).populate("assignedStaff", "fullName");

    // Notify staff member
    await Notification.create({
      user: staffId,
      message: `You've been assigned Order #${order._id}`,
      type: "assignment",
      link: `/admin/orders/${order._id}`
    });

    

    res.json({ status: "success", data: order });

    // In assignOrderToStaff
      const io = req.app.get("io");
      io.to(`staff_${staffId}`).emit("new_assignment", {
        orderId: order._id,
        customerName: order.user.fullName
      });

  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// ==================== USER MANAGEMENT ====================

/**
 * Get all users with filtering
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query)
      .select("-password -verificationToken -resetToken")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      status: "success",
      results: users.length,
      total,
      data: users
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Create staff/admin account
 */
const createStaffAccount = async (req, res) => {
  try {
    const { email, fullName, password, role } = req.body;

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Role must be either admin or staff"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      fullName,
      password: hashedPassword,
      role,
      isVerified: true // Skip verification for staff
    });

    res.status(201).json({
      status: "success",
      data: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// ==================== DASHBOARD ANALYTICS ====================

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalUsers,
      monthlyRevenue,
      staffCount
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "completed" }),
      User.countDocuments({ role: "user" }),
      Order.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),
      User.countDocuments({ role: "staff" })
    ]);

    res.json({
      status: "success",
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalUsers,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        staffCount
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Get revenue analytics (last 6 months)
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueData = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          _id: 0,
          month: { $concat: [
            { $toString: "$_id.year" },
            "-",
            { $toString: "$_id.month" }
          ]},
          totalRevenue: 1,
          orderCount: 1
        }
      }
    ]);

    res.json({ status: "success", data: revenueData });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Process Refund for an Order
 */
const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      return res.status(404).json({ status: "error", message: "Order not found" });
    }

    // Validate refund amount
    if (amount > order.totalAmount) {
      return res.status(400).json({
        status: "error",
        message: "Refund amount cannot exceed order total"
      });
    }

    // Update order
    order.refund = {
      requested: true,
      processed: true,
      amount,
      reason,
      processedAt: new Date(),
      processedBy: req.user._id
    };
    await order.save();

    // Credit user's wallet
    await User.findByIdAndUpdate(order.user._id, {
      $inc: { walletBalance: amount }
    });

    // Create transaction record (see next section)
    await Transaction.create({
      user: order.user._id,
      amount,
      type: "refund",
      reference: `REFUND-${orderId}-${Date.now()}`,
      order: orderId
    });

    // Notify user
    await Notification.create({
      user: order.user._id,
      message: `Refund of ₦${amount} processed for Order #${orderId}`,
      type: "payment",
      link: `/orders/${orderId}`
    });

    res.json({ status: "success", data: order });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Get All Pending Refund Requests
 */
const getPendingRefunds = async (req, res) => {
  try {
    const refunds = await Order.find({
      "refund.requested": true,
      "refund.processed": false
    }).populate("user", "fullName email");

    res.json({ status: "success", data: refunds });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};



/**
 * Log Staff Performance (Automated Nightly Job)
 */
const logStaffPerformance = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const staffMembers = await User.find({ role: "staff" });

  for (const staff of staffMembers) {
    const completedOrders = await Order.find({
      assignedStaff: staff._id,
      status: "completed",
      updatedAt: { 
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
      }
    });

    const processingTimes = completedOrders.map(order => 
      (order.completedAt - order.updatedAt) / (1000 * 60) // Convert to minutes
    );

    await StaffPerformance.create({
      staff: staff._id,
      period: "daily",
      date: yesterday,
      ordersCompleted: completedOrders.length,
      avgProcessingTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length || 0,
      // customerRating would come from feedback system
    });
  }
};

/**
 * Get Staff Performance Report
 */
const getStaffPerformance = async (req, res) => {
  try {
    const { staffId, period = "monthly", months = 6 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const query = { 
      period,
      date: { $gte: cutoffDate } 
    };
    if (staffId) query.staff = staffId;

    const performanceData = await StaffPerformance.find(query)
      .populate("staff", "fullName")
      .sort("-date");

    res.json({ status: "success", data: performanceData });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};



/**
 * Check Low Stock Items
 */
const checkLowStock = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 10;

    const lowStockItems = await Inventory.find({
      currentStock: { $lte: threshold }
    });

    if (lowStockItems.length > 0) {
      // Create admin alert
      await Notification.create({
        user: req.user._id,
        message: `Low stock alert: ${lowStockItems.map(i => i.item).join(", ")}`,
        type: "inventory",
        urgent: true
      });
    }

    res.json({ status: "success", data: lowStockItems });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

/**
 * Update Inventory After Order Completion
 */
const updateInventoryAfterOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  
  // Example: Deduct detergent usage (500ml per kg of laundry)
  if (order.services.some(s => s.name === "wash")) {
    const washServices = order.services.filter(s => s.name === "wash");
    const totalKg = washServices.reduce((sum, s) => sum + s.quantity, 0);
    const detergentUsed = totalKg * 0.5; // 500ml per kg

    await Inventory.findOneAndUpdate(
      { item: "Detergent" },
      { $inc: { currentStock: -detergentUsed } }
    );
  }
};

/**
 * Restock Inventory
 */
const restockInventory = async (req, res) => {
  try {
    const { itemId, quantity, supplier } = req.body;

    const inventoryItem = await Inventory.findByIdAndUpdate(
      itemId,
      {
        $inc: { currentStock: quantity },
        lastRestocked: new Date(),
        "supplier.name": supplier?.name,
        "supplier.contact": supplier?.contact
      },
      { new: true }
    );

    res.json({ status: "success", data: inventoryItem });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

const Transaction = require("../models/transaction");

const getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "fullName email");

    res.json({
      status: "success",
      data: transactions
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};



module.exports = {
    getRevenueAnalytics,
    getDashboardStats,
    createStaffAccount,
    getAllUsers,
    assignOrderToStaff,
    updateOrderStatus,
    getAllOrders,
    processRefund,
    getPendingRefunds,
    getStaffPerformance,
    logStaffPerformance,
    restockInventory,
    updateInventoryAfterOrder,
    checkLowStock,
    getRecentTransactions

}


