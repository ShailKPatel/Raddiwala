# RaddiWala Platform

A digital platform that connects customers (who want to sell scrap/raddi) with raddiwalas (scrap collectors). The system streamlines waste selling through photo uploads, bidding, pickup scheduling, and rating-based trust building.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **Frontend**: Pug templates + Vanilla JavaScript
- **Email**: Nodemailer
- **File Upload**: Multer
- **Authentication**: JWT + Cookies
- **Styling**: Custom CSS

## Features Implemented

### ✅ Core Authentication System
- Email-based OTP authentication for both customers and raddiwalas
- Role-based access control
- JWT token management with cookies
- Development mode with visible OTPs

### ✅ Database Models
- **Customer**: Profile, addresses (max 3), ratings
- **Raddiwala**: Profile, shop address, premium status, monthly pickup counter
- **Address**: Reusable address model for both customers and raddiwalas
- **PickupRequest**: Photos, waste type, weight category, status tracking
- **Bid**: Pricing, pickup time, acceptance status
- **CompletedTransaction**: Final amounts, ratings from both parties
- **Subscription**: Premium membership for raddiwalas (₹30/month after 50 pickups)
- **OTP**: Temporary codes for authentication

### ✅ Customer Features
- **Dashboard**: Stats overview, quick actions, recent activity
- **Sell Scrap**: Photo upload, waste type selection, address management
- **Pending Pickups**: View requests, review bids, accept/cancel
- **Profile Management**: Update details, manage addresses

### ✅ API Endpoints
- Authentication: `/api/auth/*`
- Customer operations: `/api/customers/*`
- Raddiwala operations: `/api/raddiwalas/*`
- Pickup requests: `/api/pickup-requests/*`
- Bidding system: `/api/bids/*`
- Transactions: `/api/transactions/*`
- Subscriptions: `/api/subscriptions/*`
- Debug panel: `/api/debug/*`

### ✅ Frontend Pages
- Welcome/Landing page
- Login/Signup with OTP verification
- Customer dashboard and management pages
- Responsive design with modern UI

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone and setup**:
   ```bash
   cd "m:\All Personal Projects\RW\Augment"
   npm install
   ```

2. **Environment Configuration**:
   Update `.env` file with your settings:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/raddiwala
   JWT_SECRET=your_jwt_secret_key_here
   
   # Email settings (optional for development)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   
   DEVELOPMENT_MODE=true
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Main site: http://localhost:5000
   - Debug panel: http://localhost:5000/api/debug

## Testing the Application

### 🚀 Quick Start Testing

**The application is currently running at http://localhost:5000**

### 1. Welcome Page Test
- Visit http://localhost:5000
- Should show attractive landing page with recycling logo
- If not logged in: Shows "Get Started" and "Login" buttons
- If logged in: Shows role-specific navigation and dashboard links

### 2. Create Customer Account
1. Go to http://localhost:5000/signup
2. Select "Customer (I want to sell scrap)" role
3. Enter email (e.g., customer@test.com) and click "Send OTP"
4. **Development Mode**: OTP will be displayed at bottom of page and in server console
5. Enter the 4-digit OTP and verify
6. Complete profile:
   - Full name (e.g., "John Customer")
   - Phone number (10-digit Indian mobile)
7. Account created! Redirects to customer dashboard

### 3. Test Customer Features
1. **Dashboard** (http://localhost:5000/customer/dashboard):
   - View stats (initially all zeros)
   - Quick action cards for navigation
   - Recent activity section

2. **Sell Scrap** (http://localhost:5000/customer/sell-scrap):
   - Upload photos (drag & drop or click to select)
   - Select waste type (Paper, Plastic, Metal, etc.)
   - Choose weight category (0-2kg, 2-5kg, etc.)
   - Add pickup address (required for first request)
   - Set preferred time window
   - Create pickup request

3. **Pending Pickups**: View created requests (initially no bids)

4. **Profile Management**: Update details, manage addresses (max 3)

### 4. Create Raddiwala Account
1. **Open new browser/incognito window** (to test different user)
2. Go to http://localhost:5000/signup
3. Select "Raddiwala (I collect scrap)" role
4. Enter different email (e.g., raddiwala@test.com)
5. Get OTP and verify
6. Complete profile with shop address:
   - Name, phone
   - **Important**: Use same city as customer for bidding to work
7. Account created! Redirects to raddiwala dashboard

### 5. Test Raddiwala Features
1. **Dashboard**: View stats, monthly pickup counter, premium status

2. **Ongoing Requests**:
   - View customer pickup requests in same city
   - Place bids with price per kg and pickup time
   - **Note**: Free users limited to 50 pickups/month

3. **Subscription**:
   - View premium benefits
   - Purchase premium (₹30/month) for unlimited pickups
   - Demo payment system

### 6. Complete Bidding Flow
1. **Raddiwala**: Place bid on customer's request
2. **Customer**: Refresh pending pickups to see new bid
3. **Customer**: Accept the bid
4. **Raddiwala**: View in "Pending Pickups", mark as completed
5. **Both**: Rate each other in "Completed Pickups"

### 7. Test Authentication & Security
- Try accessing wrong role pages (should show "Access denied")
- Test logout functionality
- Verify OTP validation
- Test email uniqueness across roles

## Development Features

### Debug Panel
Access http://localhost:5000/api/debug to see:
- Database connection status
- All collections with latest 5 entries
- Available pages/routes
- Environment information

### Development Mode
- OTPs are displayed in console and browser
- Email sending fallback to console logging
- Detailed error messages

## Database Schema

### Key Relationships
```
Customer 1:N Address
Customer 1:N PickupRequest
PickupRequest 1:N Bid
Raddiwala 1:N Bid
Raddiwala 1:1 Address (shop)
Raddiwala 1:N Subscription
PickupRequest 1:1 CompletedTransaction
```

### Business Logic
- Customers can have max 3 addresses
- Pickup requests can have max 5 photos
- Raddiwalas can place unlimited bids if premium OR <50 monthly pickups
- Monthly pickup counter resets on 1st of each month
- Premium subscription costs ₹30/month
- Both parties can rate each other after completed transactions

## File Structure
```
├── models/           # Mongoose schemas
├── routes/           # Express route handlers
├── middleware/       # Authentication & validation
├── utils/           # Email service & helpers
├── views/           # Pug templates
├── public/          # Static assets (CSS, JS, images)
├── uploads/         # File upload storage
├── server.js        # Main application file
└── package.json     # Dependencies
```

## Next Steps

### Pending Features
- [ ] Raddiwala dashboard and features
- [ ] Complete pickup flow with notifications
- [ ] Rating system implementation
- [ ] Subscription payment integration
- [ ] Advanced search and filtering
- [ ] Mobile responsiveness improvements
- [ ] Image optimization and storage
- [ ] Email template improvements
- [ ] Admin panel for monitoring

### Testing Recommendations
1. Test with multiple users in same city
2. Verify premium subscription logic
3. Test file upload limits and validation
4. Verify email notifications work
5. Test rating system after transactions
6. Check monthly pickup counter reset

## Support

For development issues:
1. Check server logs in terminal
2. Use debug panel at `/api/debug`
3. Verify MongoDB connection
4. Check browser console for frontend errors

The application is currently in development mode with comprehensive logging and debugging features enabled.
