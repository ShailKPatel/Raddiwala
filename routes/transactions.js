const express = require('express');
const CompletedTransaction = require('../models/CompletedTransaction');
const { verifyToken, requireCustomer, requireRaddiwala } = require('../middleware/auth');

const router = express.Router();

// Get transaction details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const transaction = await CompletedTransaction.findById(req.params.id)
      .populate('pickupRequestId')
      .populate('customerId', 'name email ratings')
      .populate('raddiwalaId', 'name email ratings');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access permissions
    const isCustomer = req.userRole === 'customer' && 
                      transaction.customerId._id.toString() === req.user._id.toString();
    const isRaddiwala = req.userRole === 'raddiwala' && 
                       transaction.raddiwalaId._id.toString() === req.user._id.toString();

    if (!isCustomer && !isRaddiwala) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transaction details' });
  }
});

// Get all transactions for a user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.userRole === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.userRole === 'raddiwala') {
      filter.raddiwalaId = req.user._id;
    }

    if (status) {
      filter.paymentStatus = status;
    }

    const transactions = await CompletedTransaction.find(filter)
      .populate('pickupRequestId')
      .populate('customerId', 'name ratings')
      .populate('raddiwalaId', 'name ratings')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CompletedTransaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

// Add customer rating to transaction
router.post('/:id/customer-rating', requireCustomer, async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const transaction = await CompletedTransaction.findOne({
      _id: req.params.id,
      customerId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.customerRating.rating) {
      return res.status(400).json({ message: 'You have already rated this transaction' });
    }

    await transaction.addCustomerRating(rating, review);

    // Update raddiwala's overall rating
    const Raddiwala = require('../models/Raddiwala');
    const raddiwala = await Raddiwala.findById(transaction.raddiwalaId);
    await raddiwala.updateRating(rating);

    res.json({ 
      message: 'Rating submitted successfully',
      transaction: await CompletedTransaction.findById(req.params.id)
        .populate('raddiwalaId', 'name ratings')
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Add raddiwala rating to transaction
router.post('/:id/raddiwala-rating', requireRaddiwala, async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const transaction = await CompletedTransaction.findOne({
      _id: req.params.id,
      raddiwalaId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.raddiwalaRating.rating) {
      return res.status(400).json({ message: 'You have already rated this transaction' });
    }

    await transaction.addRaddiwalaRating(rating, review);

    // Update customer's overall rating
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(transaction.customerId);
    await customer.updateRating(rating);

    res.json({ 
      message: 'Rating submitted successfully',
      transaction: await CompletedTransaction.findById(req.params.id)
        .populate('customerId', 'name ratings')
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// Update transaction payment status (for admin use)
router.put('/:id/payment-status', verifyToken, async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['pending', 'completed', 'disputed'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const transaction = await CompletedTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check access permissions
    const isCustomer = req.userRole === 'customer' && 
                      transaction.customerId.toString() === req.user._id.toString();
    const isRaddiwala = req.userRole === 'raddiwala' && 
                       transaction.raddiwalaId.toString() === req.user._id.toString();

    if (!isCustomer && !isRaddiwala) {
      return res.status(403).json({ message: 'Access denied' });
    }

    transaction.paymentStatus = paymentStatus;
    await transaction.save();

    res.json({ 
      message: 'Payment status updated successfully',
      transaction
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update payment status' });
  }
});

// Get transaction statistics
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    let filter = {};
    if (req.userRole === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.userRole === 'raddiwala') {
      filter.raddiwalaId = req.user._id;
    }

    const stats = await CompletedTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' },
          averageCustomerRating: { $avg: '$customerRating.rating' },
          averageRaddiwalaRating: { $avg: '$raddiwalaRating.rating' }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      averageAmount: 0,
      averageCustomerRating: 0,
      averageRaddiwalaRating: 0
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transaction statistics' });
  }
});

module.exports = router;
