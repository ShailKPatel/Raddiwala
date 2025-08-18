const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PickupRequest = require('../models/PickupRequest');
const Bid = require('../models/Bid');
const { requireCustomer, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/pickup-photos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pickup-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create pickup request
router.post('/', requireCustomer, upload.array('photos', 5), async (req, res) => {
  try {
    let { wasteType, wasteTypes, weightCategory, description, addressId, timeWindow } = req.body;

    // Handle both old wasteType and new wasteTypes format
    if (wasteTypes && typeof wasteTypes === 'string') {
      try {
        wasteTypes = JSON.parse(wasteTypes);
      } catch (e) {
        wasteTypes = [wasteTypes];
      }
    }

    // Use wasteTypes if available, otherwise fall back to wasteType
    const finalWasteTypes = wasteTypes && wasteTypes.length > 0 ? wasteTypes : (wasteType ? [wasteType] : []);

    // Validate required fields
    if (!finalWasteTypes.length || !weightCategory || !addressId) {
      return res.status(400).json({
        message: 'Waste type, weight category, and address are required'
      });
    }

    // Validate photos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one photo is required' });
    }

    // Validate address belongs to customer
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(req.user._id);
    if (!customer.addresses.includes(addressId)) {
      return res.status(403).json({ message: 'Invalid address' });
    }

    // Create photo URLs
    const photos = req.files.map(file => `/uploads/pickup-photos/${file.filename}`);

    const pickupRequest = new PickupRequest({
      customerId: req.user._id,
      photos,
      wasteType: finalWasteTypes, // Now supports multiple waste types
      weightCategory,
      description,
      addressId,
      timeWindow
    });

    await pickupRequest.save();
    await pickupRequest.populate(['customerId', 'addressId']);

    res.status(201).json(pickupRequest);
  } catch (error) {
    // Clean up uploaded files if request fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Failed to delete file:', err);
        });
      });
    }
    
    res.status(400).json({ message: error.message });
  }
});

// Get pickup request details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const request = await PickupRequest.findById(req.params.id)
      .populate('customerId', 'name ratings')
      .populate('addressId')
      .populate({
        path: 'acceptedBidId',
        populate: {
          path: 'raddiwalaId',
          select: 'name ratings'
        }
      });

    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Check access permissions
    const isCustomer = req.userRole === 'customer' && request.customerId._id.toString() === req.user._id.toString();
    const isRaddiwala = req.userRole === 'raddiwala';
    
    if (!isCustomer && !isRaddiwala) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pickup request' });
  }
});

// Get bids for a pickup request
router.get('/:id/bids', requireCustomer, async (req, res) => {
  try {
    const request = await PickupRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Verify ownership
    if (request.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bids = await Bid.find({ pickupRequestId: req.params.id })
      .populate({
        path: 'raddiwalaId',
        select: 'name ratings shopAddress',
        populate: {
          path: 'shopAddress'
        }
      })
      .sort({ createdAt: -1 });

    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
});

// Accept a bid
router.post('/:id/accept-bid', requireCustomer, async (req, res) => {
  try {
    const { bidId } = req.body;

    const request = await PickupRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Verify ownership
    if (request.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if request is still open
    if (request.status !== 'open') {
      return res.status(400).json({ message: 'Pickup request is no longer open' });
    }

    const bid = await Bid.findById(bidId).populate('raddiwalaId');
    if (!bid || bid.pickupRequestId.toString() !== req.params.id) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Update request status
    await request.updateStatus('accepted', bidId);
    
    // Mark bid as accepted
    bid.isAccepted = true;
    await bid.save();

    // Send notification to raddiwala
    const emailService = require('../utils/emailService');
    await emailService.sendNotification(
      bid.raddiwalaId.email,
      'Bid Accepted - RaddiWala',
      `Congratulations! Your bid for pickup request has been accepted. Please contact the customer for pickup details.`
    );

    res.json({ message: 'Bid accepted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept bid' });
  }
});

// Cancel pickup request
router.post('/:id/cancel', requireCustomer, async (req, res) => {
  try {
    const request = await PickupRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Verify ownership
    if (request.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can't cancel if bid is already accepted
    if (request.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot cancel request with accepted bid' });
    }

    await request.updateStatus('cancelled');

    res.json({ message: 'Pickup request cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel pickup request' });
  }
});

// Update pickup request
router.put('/:id', requireCustomer, async (req, res) => {
  try {
    const { description, timeWindow } = req.body;
    
    const request = await PickupRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    // Verify ownership
    if (request.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only update if status is open
    if (request.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update request that is not open' });
    }

    request.description = description || request.description;
    request.timeWindow = timeWindow || request.timeWindow;
    
    await request.save();
    await request.populate(['customerId', 'addressId']);

    res.json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
