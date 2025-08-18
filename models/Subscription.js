const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  raddiwalaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raddiwala',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  pricePaid: {
    type: Number,
    required: true,
    default: 30
  },
  isActive: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'upi'],
    default: 'online'
  },
  transactionId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Check if subscription is still valid
subscriptionSchema.methods.isValid = function() {
  return this.isActive && new Date() <= this.expiryDate;
};

// Extend subscription by 30 days
subscriptionSchema.methods.extend = function(additionalDays = 30) {
  if (this.isValid()) {
    // If still valid, extend from current expiry
    this.expiryDate = new Date(this.expiryDate.getTime() + (additionalDays * 24 * 60 * 60 * 1000));
  } else {
    // If expired, start from today
    this.startDate = new Date();
    this.expiryDate = new Date(Date.now() + (additionalDays * 24 * 60 * 60 * 1000));
  }
  this.isActive = true;
  return this.save();
};

// Auto-expire subscription
subscriptionSchema.methods.checkAndExpire = function() {
  if (new Date() > this.expiryDate) {
    this.isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

// Index for efficient queries
subscriptionSchema.index({ raddiwalaId: 1, isActive: 1 });
subscriptionSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
