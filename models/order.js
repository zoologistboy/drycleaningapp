const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  services: [{
    serviceId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    pricePerUnit: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    description: {
      type: String
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'dropoff'],
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryDate: {
    type: Date
  },
  deliveryTime: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'card', 'cash'],
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;