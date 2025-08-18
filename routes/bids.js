const express = require('express');
const Bid = require('../models/Bid');
const PickupRequest = require('../models/PickupRequest');
const CompletedTransaction = require('../models/CompletedTransaction');
const Raddiwala = require('../models/Raddiwala');
const { requireRaddiwala } = require('../middleware/auth');

const router = express.Router();

// Place a bid
router.post('/', requireRaddiwala, async (req, res) => {
  try {
    const { pickupRequestId, itemRates, proposedPickupTime, notes } = req.body;

    // Validate required fields
    if (!pickupRequestId || !itemRates || !proposedPickupTime) {
      return res.status(400).json({ 
        message: 'Pickup request ID, item rates, and proposed pickup time are required' 
      });
    }

    // Check if raddiwala can place bid
    const raddiwala = await Raddiwala.findById(req.user._id);
    await raddiwala.checkAndResetMonthlyCount();
    
    if (!raddiwala.canPlaceBid()) {
      return res.status(403).json({ 
        message: 'Monthly pickup limit exceeded. Please upgrade to premium.',
        monthlyPickups: raddiwala.monthlyPickupsCount,
        isPremium: raddiwala.isPremiumUser
      });
    }

    // Validate pickup request
    const pickupRequest = await PickupRequest.findById(pickupRequestId)
      .populate('addressId')
      .populate('customerId');

    if (!pickupRequest) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }

    if (pickupRequest.status !== 'open') {
      return res.status(400).json({ message: 'Pickup request is no longer open' });
    }

    // Check if raddiwala is in same city
    const raddiwalaWithAddress = await Raddiwala.findById(req.user._id).populate('shopAddress');
    if (raddiwalaWithAddress.shopAddress.city !== pickupRequest.addressId.city) {
      return res.status(400).json({ message: 'Can only bid on requests in your city' });
    }

    // Check if bid already exists
    const existingBid = await Bid.findOne({
      pickupRequestId,
      raddiwalaId: req.user._id
    });

    if (existingBid) {
      return res.status(400).json({ message: 'You have already placed a bid for this request' });
    }

    // Create bid
    const bid = new Bid({
      pickupRequestId,
      raddiwalaId: req.user._id,
      itemRates,
      proposedPickupTime,
      notes
    });

    // Calculate estimated amount
    bid.calculateEstimatedAmount(pickupRequest.weightCategory);
    
    await bid.save();
    await bid.populate({
      path: 'raddiwalaId',
      select: 'name ratings shopAddress',
      populate: {
        path: 'shopAddress'
      }
    });

    // Send notification to customer
    const emailService = require('../utils/emailService');
    await emailService.sendNotification(
      pickupRequest.customerId.email,
      'New Bid Received - RaddiWala',
      `You have received a new bid for your pickup request. Please check your dashboard to review and accept bids.`
    );

    res.status(201).json(bid);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already placed a bid for this request' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Update bid (only if not accepted)
router.put('/:id', requireRaddiwala, async (req, res) => {
  try {
    const { itemRates, proposedPickupTime, notes } = req.body;

    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Verify ownership
    if (bid.raddiwalaId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can't update if already accepted
    if (bid.isAccepted) {
      return res.status(400).json({ message: 'Cannot update accepted bid' });
    }

    // Check if pickup request is still open
    const pickupRequest = await PickupRequest.findById(bid.pickupRequestId);
    if (pickupRequest.status !== 'open') {
      return res.status(400).json({ message: 'Pickup request is no longer open' });
    }

    // Update bid
    if (itemRates) bid.itemRates = itemRates;
    if (proposedPickupTime) bid.proposedPickupTime = proposedPickupTime;
    if (notes !== undefined) bid.notes = notes;

    // Recalculate estimated amount
    bid.calculateEstimatedAmount(pickupRequest.weightCategory);
    
    await bid.save();
    await bid.populate({
      path: 'raddiwalaId',
      select: 'name ratings shopAddress',
      populate: {
        path: 'shopAddress'
      }
    });

    res.json(bid);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete bid (only if not accepted)
router.delete('/:id', requireRaddiwala, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id);
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Verify ownership
    if (bid.raddiwalaId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can't delete if already accepted
    if (bid.isAccepted) {
      return res.status(400).json({ message: 'Cannot delete accepted bid' });
    }

    await Bid.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bid deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete bid' });
  }
});

// Mark pickup as completed
router.post('/:id/complete', requireRaddiwala, async (req, res) => {
  try {
    const { actualWeight, totalAmount } = req.body;

    const bid = await Bid.findById(req.params.id)
      .populate('pickupRequestId')
      .populate('raddiwalaId');
    
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Verify ownership
    if (bid.raddiwalaId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if bid is accepted
    if (!bid.isAccepted) {
      return res.status(400).json({ message: 'Bid is not accepted' });
    }

    // Check if pickup request is in accepted status
    if (bid.pickupRequestId.status !== 'accepted') {
      return res.status(400).json({ message: 'Pickup request is not in accepted status' });
    }

    // Update pickup request status to completed
    await bid.pickupRequestId.updateStatus('completed');

    // Create completed transaction
    const transaction = new CompletedTransaction({
      pickupRequestId: bid.pickupRequestId._id,
      customerId: bid.pickupRequestId.customerId,
      raddiwalaId: req.user._id,
      totalAmount: totalAmount || bid.totalEstimatedAmount,
      actualWeight
    });

    await transaction.save();

    // Increment raddiwala's pickup count
    await bid.raddiwalaId.incrementPickupCount();

    // Send notification to customer
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(bid.pickupRequestId.customerId);
    
    const emailService = require('../utils/emailService');
    await emailService.sendNotification(
      customer.email,
      'Pickup Completed - RaddiWala',
      `Your pickup has been completed successfully. Please rate your experience with the raddiwala.`
    );

    res.json({ 
      message: 'Pickup marked as completed successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to complete pickup' });
  }
});

// Get bid details
router.get('/:id', requireRaddiwala, async (req, res) => {
  try {
    const bid = await Bid.findById(req.params.id)
      .populate({
        path: 'pickupRequestId',
        populate: [
          { path: 'customerId', select: 'name ratings phone' },
          { path: 'addressId' }
        ]
      })
      .populate({
        path: 'raddiwalaId',
        select: 'name ratings shopAddress',
        populate: {
          path: 'shopAddress'
        }
      });

    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Verify ownership
    if (bid.raddiwalaId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(bid);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bid details' });
  }
});

module.exports = router;
