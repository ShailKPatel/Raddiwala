const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

    // Check if HTML page is requested
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      // Render HTML debug page
      return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RaddiWala Debug Page</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #1a4d3a, #2d7a5f); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { display: inline-block; padding: 5px 10px; border-radius: 5px; font-weight: bold; }
        .status.connected { background: #d4edda; color: #155724; }
        .status.disconnected { background: #f8d7da; color: #721c24; }
        .collection-section { margin-bottom: 30px; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; }
        .collection-name { font-weight: bold; color: #1a4d3a; font-size: 1.1rem; margin-bottom: 15px; }
        .recent-entries { margin-top: 10px; }
        .entry-item { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
        .entry-id { font-family: monospace; font-size: 0.8rem; color: #6c757d; margin-bottom: 5px; }
        .entry-details { font-size: 0.9rem; color: #495057; margin-bottom: 5px; }
        .entry-date { font-size: 0.8rem; color: #6c757d; }
        .no-entries { color: #6c757d; font-style: italic; padding: 10px; text-align: center; }
        .pages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .page-item { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #1a4d3a; }
        .page-name { font-weight: bold; color: #1a4d3a; }
        .page-path { color: #666; font-family: monospace; }
        .danger-zone { background: #fff5f5; border: 2px solid #fed7d7; border-radius: 10px; padding: 20px; margin-top: 30px; }
        .danger-title { color: #c53030; font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
        .hard-reset-btn { background: #e53e3e; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 1rem; cursor: pointer; transition: all 0.3s; }
        .hard-reset-btn:hover { background: #c53030; transform: translateY(-1px); }
        .hard-reset-btn:disabled { background: #a0a0a0; cursor: not-allowed; transform: none; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; border-radius: 5px; margin: 10px 0; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px 0; border-radius: 5px; margin: 10px 0; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RaddiWala Debug Dashboard</h1>
            <p>Development Environment - Database & System Status</p>
        </div>

        <div class="card">
            <h2>Database Status</h2>
            <p><strong>Status:</strong> <span class="status ${debugData.database.connected ? 'connected' : 'disconnected'}">${debugData.database.status}</span></p>
            <p><strong>Host:</strong> ${debugData.database.host || 'N/A'}</p>
            <p><strong>Database:</strong> ${debugData.database.name || 'N/A'}</p>
        </div>

        <div class="card">
            <h2>Collections Overview</h2>
            ${Object.entries(debugData.collections).map(([name, data]) => `
                <div class="collection-section">
                    <h3 class="collection-name">${name.charAt(0).toUpperCase() + name.slice(1)} (${data.count} entries)</h3>
                    <div class="recent-entries">
                        ${data.latest && data.latest.length > 0 ?
                            data.latest.map(entry => `
                                <div class="entry-item">
                                    <div class="entry-id">ID: ${entry._id.toString().slice(-8)}</div>
                                    <div class="entry-details">
                                        ${name === 'customers' || name === 'raddiwalas' ?
                                            `<strong>${entry.name || 'N/A'}</strong> - ${entry.email || 'N/A'}` :
                                        name === 'addresses' ?
                                            `${entry.line}, ${entry.area}, ${entry.city} - ${entry.pincode}` :
                                        name === 'pickupRequests' ?
                                            `Status: ${entry.status} - Amount: ₹${entry.totalEstimatedAmount || 0} - Customer: ${entry.customerId?.name || 'N/A'}` :
                                        name === 'bids' ?
                                            `Amount: ₹${entry.totalEstimatedAmount || 0} - ${entry.isAccepted ? 'Accepted' : 'Pending'} - RaddiWala: ${entry.raddiwalaId?.name || 'N/A'}` :
                                        name === 'transactions' ?
                                            `Amount: ₹${entry.finalAmount || 0} - Status: ${entry.status}` :
                                        name === 'subscriptions' ?
                                            `Plan: ${entry.plan} - Status: ${entry.status} - ${entry.startDate ? new Date(entry.startDate).toLocaleDateString() : 'N/A'}` :
                                        name === 'otps' ?
                                            `Email: ${entry.email} - Purpose: ${entry.purpose} - ${entry.isUsed ? 'Used' : 'Unused'}` :
                                            'Entry details'
                                        }
                                    </div>
                                    <div class="entry-date">${new Date(entry.createdAt).toLocaleString()}</div>
                                </div>
                            `).join('') :
                            '<div class="no-entries">No entries found</div>'
                        }
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="card">
            <h2>Available Pages</h2>
            <div class="pages-grid">
                ${debugData.pages.map(page => `
                    <div class="page-item">
                        <div class="page-name">${page.name}</div>
                        <div class="page-path"><a href="${page.path}" target="_blank">${page.path}</a></div>
                        <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">${page.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="danger-zone">
            <div class="danger-title">Danger Zone</div>
            <div class="warning">
                <strong>Warning:</strong> The hard reset will permanently delete ALL data and uploaded images. This action cannot be undone!
            </div>
            <p><strong>Hard Reset will:</strong></p>
            <ul>
                <li>Delete all images from uploads folder</li>
                <li>Clear all database collections (customers, raddiwalas, addresses, pickup requests, bids, transactions, subscriptions, OTPs)</li>
                <li>Keep table structures intact</li>
            </ul>
            <button class="hard-reset-btn" onclick="performHardReset()">HARD RESET</button>
            <div id="resetResult"></div>
        </div>


    </div>

    <script>
        async function performHardReset() {
            const confirmed = confirm('DANGER: This will delete ALL data and images permanently!\\n\\nAre you absolutely sure you want to proceed?');
            if (!confirmed) return;

            const doubleConfirm = confirm('FINAL WARNING: This action CANNOT be undone!\\n\\nType "DELETE EVERYTHING" in the next prompt to confirm.');
            if (!doubleConfirm) return;

            const finalConfirm = prompt('Type "DELETE EVERYTHING" to confirm:');
            if (finalConfirm !== 'DELETE EVERYTHING') {
                alert('Hard reset cancelled - confirmation text did not match.');
                return;
            }

            const btn = document.querySelector('.hard-reset-btn');
            const resultDiv = document.getElementById('resetResult');

            btn.disabled = true;
            btn.textContent = 'Resetting...';
            resultDiv.innerHTML = '<div class="warning">Hard reset in progress...</div>';

            try {
                const response = await fetch('/api/debug/hard-reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const result = await response.json();

                if (result.success) {
                    resultDiv.innerHTML = \`
                        <div class="success">
                            <strong>Hard Reset Completed!</strong><br>
                            Deleted \${result.deleted.images} images<br>
                            Deleted \${result.deleted.databaseEntries} database entries<br>
                            <small>Timestamp: \${result.timestamp}</small>
                        </div>
                    \`;
                    setTimeout(() => location.reload(), 3000);
                } else {
                    resultDiv.innerHTML = \`<div class="error"><strong>Hard Reset Failed:</strong> \${result.message}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="error"><strong>Error:</strong> \${error.message}</div>\`;
            } finally {
                btn.disabled = false;
                btn.textContent = 'HARD RESET';
            }
        }
    </script>
</body>
</html>
      `);
    }

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

// Hard Reset - Delete all data and images (Development only)
router.post('/hard-reset', async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Hard reset not allowed in production'
      });
    }

    console.log('HARD RESET INITIATED - Deleting all data and images...');

    // Delete all images from uploads folder
    const uploadsPath = path.join(__dirname, '../public/uploads');
    let deletedImages = 0;

    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      for (const file of files) {
        const filePath = path.join(uploadsPath, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          deletedImages++;
        }
      }
    }

    // Delete all entries from all collections
    const deleteResults = await Promise.all([
      Customer.deleteMany({}),
      Raddiwala.deleteMany({}),
      Address.deleteMany({}),
      PickupRequest.deleteMany({}),
      Bid.deleteMany({}),
      CompletedTransaction.deleteMany({}),
      Subscription.deleteMany({}),
      OTP.deleteMany({})
    ]);

    const totalDeleted = deleteResults.reduce((sum, result) => sum + result.deletedCount, 0);

    console.log('HARD RESET COMPLETED');
    console.log(`Deleted ${deletedImages} images`);
    console.log(`Deleted ${totalDeleted} database entries`);

    res.json({
      success: true,
      message: 'Hard reset completed successfully',
      deleted: {
        images: deletedImages,
        databaseEntries: totalDeleted,
        collections: {
          customers: deleteResults[0].deletedCount,
          raddiwalas: deleteResults[1].deletedCount,
          addresses: deleteResults[2].deletedCount,
          pickupRequests: deleteResults[3].deletedCount,
          bids: deleteResults[4].deletedCount,
          transactions: deleteResults[5].deletedCount,
          subscriptions: deleteResults[6].deletedCount,
          otps: deleteResults[7].deletedCount
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('HARD RESET FAILED:', error);
    res.status(500).json({
      success: false,
      message: 'Hard reset failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
