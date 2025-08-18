const mongoose = require('mongoose');

const completedTransactionSchema = new mongoose.Schema({
  pickupRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupRequest',
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  raddiwalaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raddiwala',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  actualWeight: {
    type: Number,
    min: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  customerRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: 300
    },
    ratedAt: Date
  },
  raddiwalaRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: 300
    },
    ratedAt: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'disputed'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Add customer rating
completedTransactionSchema.methods.addCustomerRating = function(rating, review = '') {
  this.customerRating = {
    rating,
    review,
    ratedAt: new Date()
  };
  return this.save();
};

// Add raddiwala rating
completedTransactionSchema.methods.addRaddiwalaRating = function(rating, review = '') {
  this.raddiwalaRating = {
    rating,
    review,
    ratedAt: new Date()
  };
  return this.save();
};

// Index for efficient queries
completedTransactionSchema.index({ customerId: 1, completedAt: -1 });
completedTransactionSchema.index({ raddiwalaId: 1, completedAt: -1 });
completedTransactionSchema.index({ completedAt: -1 });

module.exports = mongoose.model('CompletedTransaction', completedTransactionSchema);
