const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Set view engine to Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/raddiwala', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.green(`MongoDB Connected: ${conn.connection.host}`));
  } catch (error) {
    console.error(chalk.red('MongoDB connection error:', error));
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/raddiwalas', require('./routes/raddiwalas'));
app.use('/api/pickup-requests', require('./routes/pickupRequests'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/debug', require('./routes/debug'));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Import auth middleware
const { optionalAuth, requireCustomer, requireRaddiwala } = require('./middleware/auth');

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Welcome page route
app.get('/', optionalAuth, (req, res) => {
  res.render('welcome', {
    title: 'RaddiWala - Connecting You with Scrap Collectors',
    user: req.user || null
  });
});

// Login page
app.get('/login', optionalAuth, (req, res) => {
  // If already logged in, redirect to appropriate dashboard
  if (req.user) {
    if (req.userRole === 'customer') {
      return res.redirect('/customer/dashboard');
    } else {
      return res.redirect('/raddiwala/dashboard');
    }
  }
  res.render('login');
});

// Signup page
app.get('/signup', optionalAuth, (req, res) => {
  // If already logged in, redirect to appropriate dashboard
  if (req.user) {
    if (req.userRole === 'customer') {
      return res.redirect('/customer/dashboard');
    } else {
      return res.redirect('/raddiwala/dashboard');
    }
  }
  res.render('signup');
});

// Customer routes

app.get('/customer/dashboard', requireCustomer, (req, res) => {
  console.log('Customer dashboard accessed by:', req.user?.name);
  res.render('customer/dashboard', { user: req.user });
});

app.get('/customer/sell-scrap', requireCustomer, (req, res) => {
  res.render('customer/sell-scrap', { user: req.user });
});

app.get('/customer/pending-pickups', requireCustomer, (req, res) => {
  res.render('customer/pending-pickups', { user: req.user });
});

app.get('/customer/completed-pickups', requireCustomer, (req, res) => {
  res.render('customer/completed-pickups', { user: req.user });
});

app.get('/customer/profile', requireCustomer, (req, res) => {
  res.render('customer/profile', { user: req.user });
});

// Raddiwala routes
app.get('/raddiwala/dashboard', requireRaddiwala, (req, res) => {
  res.render('raddiwala/dashboard', { user: req.user });
});

app.get('/raddiwala/ongoing-requests', requireRaddiwala, (req, res) => {
  res.render('raddiwala/ongoing-requests', { user: req.user });
});

app.get('/raddiwala/pending-pickups', requireRaddiwala, (req, res) => {
  res.render('raddiwala/pending-pickups', { user: req.user });
});

app.get('/raddiwala/completed-pickups', requireRaddiwala, (req, res) => {
  res.render('raddiwala/completed-pickups', { user: req.user });
});

app.get('/raddiwala/subscription', requireRaddiwala, (req, res) => {
  res.render('raddiwala/subscription', { user: req.user });
});

app.get('/raddiwala/profile', requireRaddiwala, (req, res) => {
  res.render('raddiwala/profile', { user: req.user });
});

// Logout route
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/raddiwalas', require('./routes/raddiwalas'));
app.use('/api/pickup-requests', require('./routes/pickupRequests'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/debug', require('./routes/debug'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(chalk.red('Error:', err.stack));
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(chalk.blue(`Server running on port ${PORT}`));
  console.log(chalk.yellow(`Environment: ${process.env.NODE_ENV || 'development'}`));
});

module.exports = app;
