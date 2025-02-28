const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  githubId: {
    type: String,
    required: true,
    unique: true
  },
  login: {
    type: String,
    required: true,
    trim: true
  },
  businessUnit: {
    type: String,
    trim: true,
    default: 'Default'
  },
  costCenter: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatarUrl: {
    type: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  tokenExpiresAt: {
    type: Date
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

module.exports = mongoose.model('Organization', organizationSchema);