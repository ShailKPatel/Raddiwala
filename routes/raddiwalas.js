const express = require('express');
const validator = require('validator');
const multer = require('multer');
const path = require('path');
const Raddiwala = require('../models/Raddiwala');
const Address = require('../models/Address');
const PickupRequest = require('../models/PickupRequest');
const Bid = require('../models/Bid');
const CompletedTransaction = require('../models/CompletedTransaction');
const Subscription = require('../models/Subscription');
const { requireRaddiwala } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pictures/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'raddiwala-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
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

// Get raddiwala profile
router.get('/profile', requireRaddiwala, async (req, res) => {
  try {
    const raddiwala = await Raddiwala.findById(req.user._id).populate('shopAddress');
    
    // Check and reset monthly count if needed
    await raddiwala.checkAndResetMonthlyCount();
    
    res.json(raddiwala);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update raddiwala profile
router.put('/profile', requireRaddiwala, async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Check if phone number is already in use by another user
    if (phone) {
      const Customer = require('../models/Customer');
      const existingCustomer = await Customer.findOne({ phone });
      const existingRaddiwala = await Raddiwala.findOne({
        phone,
        _id: { $ne: req.user._id }
      });

      if (existingCustomer || existingRaddiwala) {
        return res.status(400).json({
          message: 'This phone number is already registered with another account'
        });
      }
    }

    const raddiwala = await Raddiwala.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    ).populate('shopAddress');

    res.json(raddiwala);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload profile picture
router.post('/profile-picture', requireRaddiwala, (req, res) => {
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

      const raddiwala = await Raddiwala.findByIdAndUpdate(
        req.user._id,
        { profilePicture: profilePictureUrl },
        { new: true }
      );

      console.log('Raddiwala updated:', raddiwala);

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

// Update shop address
router.put('/shop-address', requireRaddiwala, async (req, res) => {
  try {
    const raddiwala = await Raddiwala.findById(req.user._id);
    
    const address = await Address.findByIdAndUpdate(
      raddiwala.shopAddress,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(address);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get ongoing pickup requests (in same city)
router.get('/pickup-requests/ongoing', requireRaddiwala, async (req, res) => {
  try {
    const raddiwala = await Raddiwala.findById(req.user._id).populate('shopAddress');
    
    // Check if can place bids
    if (!raddiwala.canPlaceBid()) {
      return res.status(403).json({ 
        message: 'Monthly pickup limit exceeded. Please upgrade to premium.',
        monthlyPickups: raddiwala.monthlyPickupsCount,
        isPremium: raddiwala.isPremiumUser
      });
    }

    // Find requests in same city
    const cityAddresses = await Address.find({ city: raddiwala.shopAddress.city });
    const addressIds = cityAddresses.map(addr => addr._id);

    const requests = await PickupRequest.find({
      addressId: { $in: addressIds },
      status: 'open',
      isActive: true
    })
    .populate('customerId', 'name ratings')
    .populate('addressId')
    .sort({ createdAt: -1 });

    // Check which requests already have bids from this raddiwala
    const requestsWithBidStatus = await Promise.all(
      requests.map(async (request) => {
        const existingBid = await Bid.findOne({
          pickupRequestId: request._id,
          raddiwalaId: req.user._id
        });

        return {
          ...request.toObject(),
          hasMyBid: !!existingBid
        };
      })
    );

    res.json(requestsWithBidStatus);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pickup requests' });
  }
});

// Get raddiwala's bids
router.get('/bids', requireRaddiwala, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { raddiwalaId: req.user._id };
    
    if (status === 'accepted') {
      filter.isAccepted = true;
    } else if (status === 'pending') {
      filter.isAccepted = false;
    }

    const bids = await Bid.find(filter)
      .populate({
        path: 'pickupRequestId',
        populate: [
          { path: 'customerId', select: 'name ratings' },
          { path: 'addressId' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
});

// Get pending pickups (accepted bids not completed)
router.get('/pickups/pending', requireRaddiwala, async (req, res) => {
  try {
    const bids = await Bid.find({
      raddiwalaId: req.user._id,
      isAccepted: true
    })
    .populate({
      path: 'pickupRequestId',
      match: { status: 'accepted' },
      populate: [
        { path: 'customerId', select: 'name phone ratings' },
        { path: 'addressId' }
      ]
    })
    .sort({ createdAt: -1 });

    // Filter out null pickupRequestId (where match failed)
    const validBids = bids.filter(bid => bid.pickupRequestId);

    res.json(validBids);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending pickups' });
  }
});

// Get completed transactions
router.get('/completed-transactions', requireRaddiwala, async (req, res) => {
  try {
    const transactions = await CompletedTransaction.find({ raddiwalaId: req.user._id })
      .populate('pickupRequestId')
      .populate('customerId', 'name ratings')
      .sort({ completedAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch completed transactions' });
  }
});

// Rate customer
router.post('/rate-customer/:transactionId', requireRaddiwala, async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const transaction = await CompletedTransaction.findOne({
      _id: req.params.transactionId,
      raddiwalaId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.raddiwalaRating.rating) {
      return res.status(400).json({ message: 'Already rated this transaction' });
    }

    await transaction.addRaddiwalaRating(rating, review);

    // Update customer's rating
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(transaction.customerId);
    await customer.updateRating(rating);

    res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Get subscription status
router.get('/subscription', requireRaddiwala, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      raddiwalaId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    if (subscription) {
      await subscription.checkAndExpire();
    }

    res.json({
      hasActiveSubscription: subscription ? subscription.isValid() : false,
      subscription: subscription || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscription status' });
  }
});

// Delete account
router.delete('/account', requireRaddiwala, async (req, res) => {
  try {
    // Soft delete - mark as inactive
    await Raddiwala.findByIdAndUpdate(req.user._id, { isActive: false });
    
    // Clear cookie
    res.clearCookie('token');
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// Send OTP for email change
router.post('/send-email-otp', requireRaddiwala, async (req, res) => {
  console.log('RaddiWala send-email-otp endpoint hit');
  try {
    const { newEmail } = req.body;
    console.log('New email request:', newEmail);

    if (!newEmail) {
      return res.status(400).json({ message: 'New email is required' });
    }

    if (!validator.isEmail(newEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email' });
    }

    // Check if email is already in use
    const Customer = require('../models/Customer');
    const existingCustomer = await Customer.findOne({ email: newEmail });
    const existingRaddiwala = await Raddiwala.findOne({ email: newEmail });

    if (existingCustomer || existingRaddiwala) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Generate and save OTP
    const OTP = require('../models/OTP');
    const otpCode = OTP.generateOTP();

    // Remove any existing OTPs for this email and purpose
    await OTP.deleteMany({ email: newEmail, purpose: 'email_change', role: 'raddiwala' });

    const otp = new OTP({
      email: newEmail,
      otp: otpCode,
      purpose: 'email_change',
      role: 'raddiwala'
    });

    await otp.save();

    // Send OTP via email
    const emailService = require('../utils/emailService');
    await emailService.sendOTP(newEmail, otpCode, 'email_change');

    res.json({
      message: 'OTP sent successfully',
      devOTP: process.env.DEVELOPMENT_MODE === 'true' ? otpCode : undefined
    });

  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP and update email
router.post('/verify-email-otp', requireRaddiwala, async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({ message: 'New email and OTP are required' });
    }

    // Verify OTP
    const OTP = require('../models/OTP');
    const otpRecord = await OTP.findOne({
      email: newEmail,
      purpose: 'email_change',
      role: 'raddiwala',
      isUsed: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await otpRecord.verify(otp);

    // Update raddiwala email
    const raddiwala = await Raddiwala.findByIdAndUpdate(
      req.user._id,
      { email: newEmail },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Email updated successfully',
      email: raddiwala.email
    });

  } catch (error) {
    console.error('Verify email OTP error:', error);
    if (error.message === 'Invalid OTP' || error.message === 'OTP already used') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to update email' });
  }
});

module.exports = router;
