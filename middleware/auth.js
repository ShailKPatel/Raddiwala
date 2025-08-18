const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Raddiwala = require('../models/Raddiwala');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth Debug - Path:', req.path);
      console.log('Auth Debug - Token exists:', !!token);
      console.log('Auth Debug - All cookies:', req.cookies);
      console.log('Auth Debug - Cookie header:', req.headers.cookie);
      if (token) {
        console.log('Auth Debug - Token preview:', token.substring(0, 20) + '...');
      }
    }

    if (!token) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      } else {
        return res.redirect('/login');
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user based on role
    let user;
    if (decoded.role === 'customer') {
      user = await Customer.findById(decoded.userId).populate('addresses');
    } else if (decoded.role === 'raddiwala') {
      user = await Raddiwala.findById(decoded.userId).populate('shopAddress');
    }

    if (!user || !user.isActive) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Invalid token or user not found.' });
      } else {
        return res.redirect('/login');
      }
    }

    req.user = user;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ message: 'Invalid token.' });
    } else {
      res.redirect('/login');
    }
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Check if it's an API request or page request
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Authentication required.' });
      } else {
        return res.redirect('/login');
      }
    }

    if (!roles.includes(req.userRole)) {
      // Check if it's an API request or page request
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          message: 'Access denied. Insufficient permissions.',
          requiredRole: roles,
          userRole: req.userRole
        });
      } else {
        return res.status(403).send(`
          <html>
            <head><title>Access Denied</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Access Denied</h1>
              <p>You don't have permission to access this page.</p>
              <p>Required role: ${roles.join(' or ')}</p>
              <p>Your role: ${req.userRole}</p>
              <a href="/" style="color: #2c5530;">Go to Home</a>
            </body>
          </html>
        `);
      }
    }

    next();
  };
};

// Customer only access
const requireCustomer = [verifyToken, requireRole(['customer'])];

// Raddiwala only access
const requireRaddiwala = [verifyToken, requireRole(['raddiwala'])];

// Optional authentication (for pages that work with or without login)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user;
      if (decoded.role === 'customer') {
        user = await Customer.findById(decoded.userId).populate('addresses');
      } else if (decoded.role === 'raddiwala') {
        user = await Raddiwala.findById(decoded.userId).populate('shopAddress');
      }

      if (user && user.isActive) {
        req.user = user;
        req.userRole = decoded.role;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  requireRole,
  requireCustomer,
  requireRaddiwala,
  optionalAuth
};
