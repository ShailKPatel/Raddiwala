const express = require('express');
const Subscription = require('../models/Subscription');
const Raddiwala = require('../models/Raddiwala');
const { requireRaddiwala } = require('../middleware/auth');

const router = express.Router();

// Get subscription details
router.get('/', requireRaddiwala, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      raddiwalaId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    const raddiwala = await Raddiwala.findById(req.user._id);
    await raddiwala.checkAndResetMonthlyCount();

    let subscriptionStatus = {
      hasActiveSubscription: false,
      subscription: null,
      monthlyPickups: raddiwala.monthlyPickupsCount,
      canPlaceBids: raddiwala.canPlaceBid(),
      needsPremium: raddiwala.monthlyPickupsCount >= 50 && !raddiwala.isPremiumUser
    };

    if (subscription) {
      await subscription.checkAndExpire();
      subscriptionStatus.hasActiveSubscription = subscription.isValid();
      subscriptionStatus.subscription = subscription;
    }

    res.json(subscriptionStatus);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscription details' });
  }
});

// Purchase/Extend subscription
router.post('/purchase', requireRaddiwala, async (req, res) => {
  try {
    const { paymentMethod = 'online', transactionId } = req.body;

    const raddiwala = await Raddiwala.findById(req.user._id);

    // Check if there's an active subscription
    let subscription = await Subscription.findOne({ 
      raddiwalaId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    if (subscription && subscription.isValid()) {
      // Extend existing subscription
      await subscription.extend(30);
    } else {
      // Create new subscription
      subscription = new Subscription({
        raddiwalaId: req.user._id,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
        pricePaid: 30,
        paymentMethod,
        transactionId
      });
      await subscription.save();
    }

    // Update raddiwala premium status
    raddiwala.isPremiumUser = true;
    await raddiwala.save();

    // Send confirmation email
    const emailService = require('../utils/emailService');
    await emailService.sendNotification(
      raddiwala.email,
      'Premium Subscription Activated - RaddiWala',
      `Your premium subscription has been activated successfully. You can now place unlimited bids for the next 30 days. Subscription expires on ${subscription.expiryDate.toDateString()}.`
    );

    res.json({
      message: 'Subscription purchased successfully',
      subscription,
      expiryDate: subscription.expiryDate
    });
  } catch (error) {
    console.error('Subscription purchase error:', error);
    res.status(500).json({ message: 'Failed to purchase subscription', error: error.message });
  }
});

// Get subscription history
router.get('/history', requireRaddiwala, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ raddiwalaId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subscription history' });
  }
});

// Cancel subscription (mark as inactive)
router.post('/cancel', requireRaddiwala, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      raddiwalaId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    subscription.isActive = false;
    await subscription.save();

    // Update raddiwala premium status
    const raddiwala = await Raddiwala.findById(req.user._id);
    raddiwala.isPremiumUser = false;
    await raddiwala.save();

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// Check subscription status (for internal use)
router.get('/status', requireRaddiwala, async (req, res) => {
  try {
    const raddiwala = await Raddiwala.findById(req.user._id);
    await raddiwala.checkAndResetMonthlyCount();

    const subscription = await Subscription.findOne({ 
      raddiwalaId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    let isValid = false;
    if (subscription) {
      await subscription.checkAndExpire();
      isValid = subscription.isValid();
      
      // Update raddiwala premium status based on subscription validity
      if (!isValid && raddiwala.isPremiumUser) {
        raddiwala.isPremiumUser = false;
        await raddiwala.save();
      }
    }

    res.json({
      isPremium: isValid,
      monthlyPickups: raddiwala.monthlyPickupsCount,
      canPlaceBids: raddiwala.canPlaceBid(),
      subscription: subscription || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check subscription status' });
  }
});

module.exports = router;
