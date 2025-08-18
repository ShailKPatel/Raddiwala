const express = require('express');
const multer = require('multer');
const path = require('path');
const Customer = require('../models/Customer');
const Address = require('../models/Address');
const PickupRequest = require('../models/PickupRequest');
const CompletedTransaction = require('../models/CompletedTransaction');
const { requireCustomer, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pictures/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'customer-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get customer profile
router.get('/profile', requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).populate('addresses');
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update customer profile
router.put('/profile', requireCustomer, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const customer = await Customer.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    ).populate('addresses');

    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload profile picture
router.post('/profile-picture', requireCustomer, (req, res) => {
  upload.single('profilePicture')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File uploaded:', req.file);

      const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

      const customer = await Customer.findByIdAndUpdate(
        req.user._id,
        { profilePicture: profilePictureUrl },
        { new: true }
      );

      console.log('Customer updated:', customer);

      res.json({
        message: 'Profile picture updated successfully',
        profilePictureUrl: profilePictureUrl
      });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ message: 'Failed to upload profile picture: ' + error.message });
    }
  });
});

// Add address
router.post('/addresses', requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    
    if (customer.addresses.length >= 3) {
      return res.status(400).json({ message: 'Maximum 3 addresses allowed' });
    }

    const address = new Address(req.body);
    await address.save();

    customer.addresses.push(address._id);
    await customer.save();

    await customer.populate('addresses');
    res.status(201).json(customer.addresses);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update address
router.put('/addresses/:addressId', requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    
    if (!customer.addresses.includes(req.params.addressId)) {
      return res.status(403).json({ message: 'Address not found or access denied' });
    }

    const address = await Address.findByIdAndUpdate(
      req.params.addressId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(address);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete address
router.delete('/addresses/:addressId', requireCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    
    if (!customer.addresses.includes(req.params.addressId)) {
      return res.status(403).json({ message: 'Address not found or access denied' });
    }

    await Address.findByIdAndDelete(req.params.addressId);
    customer.addresses = customer.addresses.filter(
      addr => addr.toString() !== req.params.addressId
    );
    await customer.save();

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete address' });
  }
});

// Get customer's pickup requests
router.get('/pickup-requests', requireCustomer, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { customerId: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const requests = await PickupRequest.find(filter)
      .populate('addressId')
      .populate('acceptedBidId')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pickup requests' });
  }
});

// Get pending pickup requests (with bids)
router.get('/pickup-requests/pending', requireCustomer, async (req, res) => {
  try {
    const requests = await PickupRequest.find({
      customerId: req.user._id,
      status: 'open'
    })
    .populate('addressId')
    .populate({
      path: 'acceptedBidId',
      populate: {
        path: 'raddiwalaId',
        select: 'name ratings shopAddress',
        populate: {
          path: 'shopAddress'
        }
      }
    })
    .sort({ createdAt: -1 });

    // Get bids for each request
    const Bid = require('../models/Bid');
    const requestsWithBids = await Promise.all(
      requests.map(async (request) => {
        const bids = await Bid.find({ pickupRequestId: request._id })
          .populate({
            path: 'raddiwalaId',
            select: 'name ratings shopAddress',
            populate: {
              path: 'shopAddress'
            }
          })
          .sort({ createdAt: -1 });
        
        return {
          ...request.toObject(),
          bids
        };
      })
    );

    res.json(requestsWithBids);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

// Get completed transactions
router.get('/completed-transactions', requireCustomer, async (req, res) => {
  try {
    const transactions = await CompletedTransaction.find({ customerId: req.user._id })
      .populate('pickupRequestId')
      .populate('raddiwalaId', 'name ratings')
      .sort({ completedAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch completed transactions' });
  }
});

// Rate raddiwala
router.post('/rate-raddiwala/:transactionId', requireCustomer, async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const transaction = await CompletedTransaction.findOne({
      _id: req.params.transactionId,
      customerId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.customerRating.rating) {
      return res.status(400).json({ message: 'Already rated this transaction' });
    }

    await transaction.addCustomerRating(rating, review);

    // Update raddiwala's rating
    const Raddiwala = require('../models/Raddiwala');
    const raddiwala = await Raddiwala.findById(transaction.raddiwalaId);
    await raddiwala.updateRating(rating);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Delete account
router.delete('/account', requireCustomer, async (req, res) => {
  try {
    // Soft delete - mark as inactive
    await Customer.findByIdAndUpdate(req.user._id, { isActive: false });
    
    // Clear cookie
    res.clearCookie('token');
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

module.exports = router;
