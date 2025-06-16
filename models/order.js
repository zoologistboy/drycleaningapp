const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["wash", "iron", "dry clean", "fold", "stain removal", "other"],
  },
  quantity: {
    type: Number,
    default: 1,
  },
  pricePerUnit: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    services: [serviceSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled", "delivered"],
      default: "pending",
    },
    deliveryType: {
      type: String,
      enum: ["pickup", "dropoff", "walk-in"],
      default: "walk-in",
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // assuming staff are in User collection
      default: null,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "card", "cash", "transfer"],
      default: "cash",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);


// {
//   "user": "ObjectId('...')",
//   "services": [
//     {
//       "name": "dry clean",
//       "quantity": 2,
//       "pricePerUnit": 1500
//     },
//     {
//       "name": "iron",
//       "quantity": 3,
//       "pricePerUnit": 500
//     }
//   ],
//   "totalAmount": 4500,
//   "deliveryType": "pickup",
//   "deliveryAddress": {
//     "street": "12 Kings Road",
//     "city": "Lagos",
//     "state": "Lagos",
//     "postalCode": "100001"
//   },
//   "status": "processing",
//   "isPaid": true
// }

