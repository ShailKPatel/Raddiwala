const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  pickupRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupRequest',
    required: true
  },
  raddiwalaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Raddiwala',
    required: true
  },
  itemRates: [{
    wasteType: {
      type: String,
      required: true
    },
    pricePerKg: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  proposedPickupTime: {
    type: String,
    required: true,
    trim: true
  },
  isAccepted: {
    type: Boolean,
    default: false
  },
  totalEstimatedAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Calculate total estimated amount based on weight category and rates
bidSchema.methods.calculateEstimatedAmount = function(weightCategory) {
  // Simple estimation based on weight category midpoint
  const weightMap = {
    "0–2 kg": 1,
    "2–5 kg": 3.5,
    "5–10 kg": 7.5,
    "10–20 kg": 15,
    "20–30 kg": 25,
    "30–50 kg": 40,
    "50+ kg": 60
  };
  
  const estimatedWeight = weightMap[weightCategory] || 1;
  const rate = this.itemRates[0]?.pricePerKg || 0;
  this.totalEstimatedAmount = estimatedWeight * rate;
  
  return this.totalEstimatedAmount;
};

// Prevent multiple bids from same raddiwala for same request
bidSchema.index({ pickupRequestId: 1, raddiwalaId: 1 }, { unique: true });

// Index for efficient queries
bidSchema.index({ pickupRequestId: 1, createdAt: -1 });
bidSchema.index({ raddiwalaId: 1, isAccepted: 1 });

module.exports = mongoose.model('Bid', bidSchema);
