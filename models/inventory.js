const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  item: { type: String, required: true }, // e.g., "Detergent", "Stain Remover"
  category: { type: String, enum: ["chemical", "equipment", "packaging"] },
  currentStock: { type: Number, required: true },
  threshold: { type: Number, required: true }, // Reorder at this level
  unit: { type: String, required: true }, // "liters", "kg", "units"
  lastRestocked: Date,
  supplier: {
    name: String,
    contact: String
  }
}, { timestamps: true });

// Add index for low stock alerts
inventorySchema.index({ currentStock: 1, threshold: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);