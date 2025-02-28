const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  businessUnit: {
    type: String,
    required: true
  },
  costCenter: {
    type: String
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  usageBreakdown: [{
    username: String,
    userId: String,
    usageMinutes: Number,
    cost: Number,
    team: String,
    repository: String
  }],
  billingPeriodStart: {
    type: Date,
    required: true
  },
  billingPeriodEnd: {
    type: Date,
    required: true
  },
  billingDate: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentReference: {
    type: String
  },
  notes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

billingSchema.index({ organization: 1, month: 1, year: 1 }, { unique: true });
billingSchema.index({ businessUnit: 1 });
billingSchema.index({ billingPeriodStart: 1, billingPeriodEnd: 1 });

module.exports = mongoose.model('Billing', billingSchema);