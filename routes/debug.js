const express = require('express');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Raddiwala = require('../models/Raddiwala');
const Address = require('../models/Address');
const PickupRequest = require('../models/PickupRequest');
const Bid = require('../models/Bid');
const CompletedTransaction = require('../models/CompletedTransaction');
const Subscription = require('../models/Subscription');
const OTP = require('../models/OTP');

const router = express.Router();

// Debug page - show all collections and their latest entries
router.get('/', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    // Get latest 5 entries from each collection
    const [
      customers,
      raddiwalas,
      addresses,
      pickupRequests,
      bids,
      transactions,
      subscriptions,
      otps
    ] = await Promise.all([
      Customer.find().sort({ createdAt: -1 }).limit(5).populate('addresses'),
      Raddiwala.find().sort({ createdAt: -1 }).limit(5).populate('shopAddress'),
      Address.find().sort({ createdAt: -1 }).limit(5),
      PickupRequest.find().sort({ createdAt: -1 }).limit(5).populate(['customerId', 'addressId']),
      Bid.find().sort({ createdAt: -1 }).limit(5).populate(['pickupRequestId', 'raddiwalaId']),
      CompletedTransaction.find().sort({ createdAt: -1 }).limit(5).populate(['customerId', 'raddiwalaId']),
      Subscription.find().sort({ createdAt: -1 }).limit(5).populate('raddiwalaId'),
      OTP.find().sort({ createdAt: -1 }).limit(5)
    ]);

    // Get collection counts
    const counts = {
      customers: await Customer.countDocuments(),
      raddiwalas: await Raddiwala.countDocuments(),
      addresses: await Address.countDocuments(),
      pickupRequests: await PickupRequest.countDocuments(),
      bids: await Bid.countDocuments(),
      transactions: await CompletedTransaction.countDocuments(),
      subscriptions: await Subscription.countDocuments(),
      otps: await OTP.countDocuments()
    };

    // Available pages/routes
    const pages = [
      { name: 'Welcome Page', path: '/', description: 'Landing page' },
      { name: 'Login Page', path: '/login', description: 'User login with OTP' },
      { name: 'Signup Page', path: '/signup', description: 'User registration with OTP' },
      { name: 'Customer Dashboard', path: '/customer/dashboard', description: 'Customer main page' },
      { name: 'Sell Scrap', path: '/customer/sell-scrap', description: 'Create pickup request' },
      { name: 'Pending Pickups', path: '/customer/pending-pickups', description: 'View and manage pending requests' },
      { name: 'Completed Pickups', path: '/customer/completed-pickups', description: 'View completed transactions' },
      { name: 'Customer Profile', path: '/customer/profile', description: 'Manage customer profile' },
      { name: 'Raddiwala Dashboard', path: '/raddiwala/dashboard', description: 'Raddiwala main page' },
      { name: 'Ongoing Requests', path: '/raddiwala/ongoing-requests', description: 'View and bid on requests' },
      { name: 'Pending Pickups', path: '/raddiwala/pending-pickups', description: 'Manage accepted bids' },
      { name: 'Completed Pickups', path: '/raddiwala/completed-pickups', description: 'View completed transactions' },
      { name: 'Subscription', path: '/raddiwala/subscription', description: 'Manage premium subscription' },
      { name: 'Raddiwala Profile', path: '/raddiwala/profile', description: 'Manage raddiwala profile' },
      { name: 'Debug Page', path: '/api/debug', description: 'This debug page' }
    ];

    const debugData = {
      database: {
        status: dbStatusText[dbStatus],
        connected: dbStatus === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      collections: {
        customers: { count: counts.customers, latest: customers },
        raddiwalas: { count: counts.raddiwalas, latest: raddiwalas },
        addresses: { count: counts.addresses, latest: addresses },
        pickupRequests: { count: counts.pickupRequests, latest: pickupRequests },
        bids: { count: counts.bids, latest: bids },
        transactions: { count: counts.transactions, latest: transactions },
        subscriptions: { count: counts.subscriptions, latest: subscriptions },
        otps: { count: counts.otps, latest: otps }
      },
      pages: pages,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        developmentMode: process.env.DEVELOPMENT_MODE === 'true'
      },
      timestamp: new Date().toISOString()
    };

    res.json(debugData);
  } catch (error) {
    res.status(500).json({
      error: 'Debug page error',
      message: error.message,
      database: {
        status: 'Error',
        connected: false
      }
    });
  }
});

// Get specific collection data
router.get('/collection/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    let Model;
    switch (name.toLowerCase()) {
      case 'customers':
        Model = Customer;
        break;
      case 'raddiwalas':
        Model = Raddiwala;
        break;
      case 'addresses':
        Model = Address;
        break;
      case 'pickuprequests':
        Model = PickupRequest;
        break;
      case 'bids':
        Model = Bid;
        break;
      case 'transactions':
        Model = CompletedTransaction;
        break;
      case 'subscriptions':
        Model = Subscription;
        break;
      case 'otps':
        Model = OTP;
        break;
      default:
        return res.status(400).json({ message: 'Invalid collection name' });
    }

    const data = await Model.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Model.countDocuments();

    res.json({
      collection: name,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
      data
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Clear collection (for testing)
router.delete('/collection/:name', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Not allowed in production' });
    }

    const { name } = req.params;
    
    let Model;
    switch (name.toLowerCase()) {
      case 'customers':
        Model = Customer;
        break;
      case 'raddiwalas':
        Model = Raddiwala;
        break;
      case 'addresses':
        Model = Address;
        break;
      case 'pickuprequests':
        Model = PickupRequest;
        break;
      case 'bids':
        Model = Bid;
        break;
      case 'transactions':
        Model = CompletedTransaction;
        break;
      case 'subscriptions':
        Model = Subscription;
        break;
      case 'otps':
        Model = OTP;
        break;
      default:
        return res.status(400).json({ message: 'Invalid collection name' });
    }

    const result = await Model.deleteMany({});
    
    res.json({
      message: `Cleared ${name} collection`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Database health check
router.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const isConnected = dbStatus === 1;

    if (isConnected) {
      // Test database operation
      await Customer.findOne().limit(1);
    }

    res.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      database: {
        connected: isConnected,
        readyState: dbStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
