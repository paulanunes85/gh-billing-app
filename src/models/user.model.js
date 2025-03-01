const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false // Tornando a senha opcional para permitir login apenas via GitHub
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  username: {
    type: String,
    sparse: true
  },
  avatar: {
    type: String
  },
  accessToken: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'viewer'],
    default: 'viewer'
  },
  organizations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  }],
  lastLogin: {
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

// Atualizar o timestamp antes de salvar
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);