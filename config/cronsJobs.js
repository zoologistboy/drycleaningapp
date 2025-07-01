// const cron = require("node-cron");
const cron = require("node-cron")
const adminController = require("../controllers/admin");

// Daily at midnight
cron.schedule("0 0 * * *", () => {
  adminController.logStaffPerformance();
  adminController.checkLowStock();
});

// Every Monday at 6am
cron.schedule("0 6 * * 1", () => {
  // Generate weekly performance reports
});