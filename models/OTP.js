const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true,
    length: 4
  },
  purpose: {
    type: String,
    enum: ['signup', 'login', 'email_change'],
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'raddiwala'],
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 300 // 5 minutes
  }
}, {
  timestamps: true
});

// Generate 4-digit OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Verify OTP
otpSchema.methods.verify = function(inputOTP) {
  if (this.isUsed) {
    throw new Error('OTP already used');
  }
  
  if (this.otp !== inputOTP) {
    throw new Error('Invalid OTP');
  }
  
  this.isUsed = true;
  return this.save();
};

// Index for efficient queries
otpSchema.index({ email: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
