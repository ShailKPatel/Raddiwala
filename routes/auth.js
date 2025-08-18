const express = require('express');
const validator = require('validator');
const Customer = require('../models/Customer');
const Raddiwala = require('../models/Raddiwala');
const Address = require('../models/Address');
const OTP = require('../models/OTP');
const emailService = require('../utils/emailService');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

// Send OTP for login/signup
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose, role } = req.body;

    // Validate input
    if (!email || !purpose || !role) {
      return res.status(400).json({ message: 'Email, purpose, and role are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email' });
    }

    if (!['signup', 'login', 'email_change'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose' });
    }

    if (!['customer', 'raddiwala'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if email exists for the role
    const existingCustomer = await Customer.findOne({ email });
    const existingRaddiwala = await Raddiwala.findOne({ email });

    if (purpose === 'signup') {
      if (existingCustomer || existingRaddiwala) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    } else if (purpose === 'login') {
      if (role === 'customer' && !existingCustomer) {
        return res.status(400).json({ message: 'No customer account found with this email' });
      }
      if (role === 'raddiwala' && !existingRaddiwala) {
        return res.status(400).json({ message: 'No raddiwala account found with this email' });
      }
      // Check for cross-role conflicts
      if (role === 'customer' && existingRaddiwala) {
        return res.status(400).json({ message: 'Email registered as Raddiwala. Please use correct role.' });
      }
      if (role === 'raddiwala' && existingCustomer) {
        return res.status(400).json({ message: 'Email registered as Customer. Please use correct role.' });
      }
    }

    // Generate and save OTP
    const otpCode = OTP.generateOTP();
    
    // Remove any existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose, role });

    const otp = new OTP({
      email,
      otp: otpCode,
      purpose,
      role
    });

    await otp.save();

    // Send OTP via email
    const emailResult = await emailService.sendOTP(email, otpCode, purpose);

    res.json({
      message: 'OTP sent successfully',
      developmentOTP: process.env.DEVELOPMENT_MODE === 'true' ? otpCode : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP and complete signup
router.post('/signup', async (req, res) => {
  try {
    const { email, otp, role, name, phone, shopAddress } = req.body;

    // Validate input
    if (!email || !otp || !role || !name || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (role === 'raddiwala' && !shopAddress) {
      return res.status(400).json({ message: 'Shop address is required for Raddiwala' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ 
      email, 
      purpose: 'signup', 
      role,
      isUsed: false 
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await otpRecord.verify(otp);

    // Create user based on role
    let user;
    if (role === 'customer') {
      user = new Customer({
        name,
        email,
        phone
      });
    } else if (role === 'raddiwala') {
      // Create shop address first
      const address = new Address(shopAddress);
      await address.save();

      user = new Raddiwala({
        name,
        email,
        phone,
        shopAddress: address._id
      });
    }

    await user.save();

    // Generate token
    const token = generateToken(user._id, role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🍪 Cookie set for user:', user.name, 'Role:', role);
      console.log('🍪 Token preview:', token.substring(0, 20) + '...');
    }

    // Always redirect for form submissions, return JSON for API calls
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: role
        },
        token
      });
    } else {
      // Form submission - redirect based on role
      if (role === 'customer') {
        res.redirect('/customer/dashboard');
      } else {
        res.redirect('/raddiwala/dashboard');
      }
    }

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Failed to create account' });
  }
});

// Verify OTP and login
router.post('/login', async (req, res) => {
  try {
    const { email, otp, role } = req.body;

    // Validate input
    if (!email || !otp || !role) {
      return res.status(400).json({ message: 'Email, OTP, and role are required' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ 
      email, 
      purpose: 'login', 
      role,
      isUsed: false 
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await otpRecord.verify(otp);

    // Find user
    let user;
    if (role === 'customer') {
      user = await Customer.findOne({ email }).populate('addresses');
    } else if (role === 'raddiwala') {
      user = await Raddiwala.findOne({ email }).populate('shopAddress');
    }

    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'User not found or inactive' });
    }

    // Generate token
    const token = generateToken(user._id, role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🍪 Login cookie set for user:', user.name, 'Role:', role);
      console.log('🍪 Login token preview:', token.substring(0, 20) + '...');
    }

    // Always redirect for form submissions, return JSON for API calls
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: role
        },
        token
      });
    } else {
      // Form submission - redirect based on role
      if (role === 'customer') {
        res.redirect('/customer/dashboard');
      } else {
        res.redirect('/raddiwala/dashboard');
      }
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.userRole,
      profileImageUrl: req.user.profileImageUrl,
      ratings: req.user.ratings
    }
  });
});

module.exports = router;
