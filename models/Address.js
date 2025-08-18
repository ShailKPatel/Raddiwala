const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  line: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    match: /^[1-9][0-9]{5}$/
  },
  landmark: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for location-based queries
addressSchema.index({ city: 1, pincode: 1 });

module.exports = mongoose.model('Address', addressSchema);
