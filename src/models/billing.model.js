const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
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
    cost: Number
  }],
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índice composto para evitar duplicatas de faturamento para a mesma organização no mesmo mês/ano
billingSchema.index({ organization: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Billing', billingSchema);