const mongoose = require('mongoose');
const validator = require('validator');

const raddiwalaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  shopAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  isPremiumUser: {
    type: Boolean,
    default: false
  },
  monthlyPickupsCount: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  ratings: {
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalStars: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  role: {
    type: String,
    default: 'raddiwala',
    immutable: true
  }
}, {
  timestamps: true
});

// Reset monthly pickups count on 1st of every month
raddiwalaSchema.methods.checkAndResetMonthlyCount = function() {
  const now = new Date();
  const lastReset = new Date(this.lastResetDate);
  
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.monthlyPickupsCount = 0;
    this.lastResetDate = now;
    return this.save();
  }
  return Promise.resolve(this);
};

// Increment pickup count
raddiwalaSchema.methods.incrementPickupCount = function() {
  this.monthlyPickupsCount += 1;
  return this.save();
};

// Calculate average rating
raddiwalaSchema.methods.updateRating = function(newRating) {
  this.ratings.totalStars += newRating;
  this.ratings.totalRatings += 1;
  this.ratings.avgRating = this.ratings.totalStars / this.ratings.totalRatings;
  return this.save();
};

// Check if can place bid (premium or under 50 pickups)
raddiwalaSchema.methods.canPlaceBid = function() {
  return this.isPremiumUser || this.monthlyPickupsCount < 50;
};

// Index for email lookup and location-based queries
raddiwalaSchema.index({ email: 1 });
raddiwalaSchema.index({ shopAddress: 1 });

module.exports = mongoose.model('Raddiwala', raddiwalaSchema);
