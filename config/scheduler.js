const cron = require("node-cron");
const Order = require("../models/order");
const Notification = require("../models/notification");

// Every hour check for delayed orders
cron.schedule("0 * * * *", async () => {
  const delayedOrders = await Order.find({
    status: "processing",
    updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24+ hours old
  });

  delayedOrders.forEach(async (order) => {
    order.status = "delayed";
    await order.save();
    
    await Notification.create({
      user: order.user,
      message: `Order #${order._id} is delayed`,
      type: "order",
      link: `/orders/${order._id}`
    });
  });
});