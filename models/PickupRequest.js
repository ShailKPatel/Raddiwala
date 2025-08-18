const mongoose = require('mongoose');

const wasteTypes = [
  "Paper",
  "Cardboard", 
  "Glass",
  "Plastic Bottles & Containers",
  "Plastic Bags & Wraps",
  "Metal Cans",
  "Other Metal Items",
  "Wood",
  "Textiles & Clothes",
  "Shoes & Leather",
  "Electronics",
  "Batteries",
  "Rubber",
  "Building Materials",
  "Organic Waste",
  "Other"
];

const weightCategories = [
  "0–2 kg",
  "2–5 kg", 
  "5–10 kg",
  "10–20 kg",
  "20–30 kg",
  "30–50 kg",
  "50+ kg"
];

const pickupRequestSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  photos: [{
    type: String,
    required: true
  }],
  wasteType: [{
    type: String,
    required: true,
    enum: wasteTypes
  }],
  weightCategory: {
    type: String,
    required: true,
    enum: weightCategories
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  timeWindow: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['open', 'accepted', 'completed', 'cancelled'],
    default: 'open'
  },
  acceptedBidId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid'
  },
  statusTimestamps: {
    acceptedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  }
}, {
  timestamps: true
});

// Validate maximum 5 photos
pickupRequestSchema.pre('save', function(next) {
  if (this.photos && this.photos.length > 5) {
    return next(new Error('Maximum 5 photos allowed'));
  }
  next();
});

// Update status with timestamp
pickupRequestSchema.methods.updateStatus = function(newStatus, bidId = null) {
  this.status = newStatus;
  
  switch(newStatus) {
    case 'accepted':
      this.statusTimestamps.acceptedAt = new Date();
      if (bidId) this.acceptedBidId = bidId;
      break;
    case 'completed':
      this.statusTimestamps.completedAt = new Date();
      break;
    case 'cancelled':
      this.statusTimestamps.cancelledAt = new Date();
      this.isActive = false;
      break;
  }
  
  return this.save();
};

// Index for efficient queries
pickupRequestSchema.index({ customerId: 1, status: 1 });
pickupRequestSchema.index({ addressId: 1, status: 1 });
pickupRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);
