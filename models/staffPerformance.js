const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  period: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
  date: { type: Date, required: true },
  ordersCompleted: { type: Number, default: 0 },
  avgProcessingTime: { type: Number }, // in minutes
  customerRating: { type: Number, min: 1, max: 5 },
  issuesReported: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("StaffPerformance", performanceSchema);