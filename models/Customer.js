const mongoose = require('mongoose');
const validator = require('validator');

const customerSchema = new mongoose.Schema({
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
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  profileImageUrl: {
    type: String,
    default: null
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
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
    default: 'customer',
    immutable: true
  }
}, {
  timestamps: true
});

// Validate maximum 3 addresses
customerSchema.pre('save', function(next) {
  if (this.addresses && this.addresses.length > 3) {
    return next(new Error('Maximum 3 addresses allowed'));
  }
  next();
});

// Calculate average rating
customerSchema.methods.updateRating = function(newRating) {
  this.ratings.totalStars += newRating;
  this.ratings.totalRatings += 1;
  this.ratings.avgRating = this.ratings.totalStars / this.ratings.totalRatings;
  return this.save();
};

// Index for email lookup
customerSchema.index({ email: 1 });

module.exports = mongoose.model('Customer', customerSchema);
