# RaddiWala

RaddiWala is a full-stack (MERN) platform that digitizes the traditional scrap-selling process. It connects customers with scrap collectors (Raddiwalas), enabling photo uploads, bidding, scheduling, and a trust-driven rating system.

## Features

### Role-based Authentication
- Email + OTP login system (no passwords needed)
- Secure JWT-based session management

### Customer Workflow
- Upload photos of scrap with type and weight category
- Submit pickup requests with location details
- Receive and compare competitive bids
- Accept preferred bids and schedule pickups
- Rate Raddiwalas after service completion

### Raddiwala Workflow
- Browse available pickup requests in your area
- Place competitive bids with pricing and timing
- Get notified when bids are accepted
- Complete pickups and rate customers
- Track earnings and performance metrics

### Bidding System
- Compare offers by price, pickup flexibility, and ratings
- Transparent competition ensuring fair market value
- Real-time bid notifications and updates

### Rating & Trust System
- Mutual ratings for customers and Raddiwalas
- Ensures reliability and accountability
- Build reputation over time

### Subscription Model
- Free tier: Up to 50 pickups per month
- Premium plan: Unlimited access for ₹30/month
- Automatic billing and subscription management

## Tech Stack

**Frontend:** Pug Templates + Vanilla JavaScript
**Backend:** Node.js + Express.js
**Database:** MongoDB with Mongoose ODM
**Authentication:** JWT + Cookie-based sessions
**File Upload:** Multer for image handling
**Email Service:** Nodemailer for OTP delivery
**Utilities:** Validator, Chalk, Cookie-parser

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd RaddiWala
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/raddiwala
   JWT_SECRET=your_jwt_secret_key

   # Email configuration (optional for development)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   DEVELOPMENT_MODE=true
   ```

4. **Start the application:**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

5. **Access the application:**
   - Main application: http://localhost:5000
   - Debug panel: http://localhost:5000/api/debug

## Usage

### Getting Started
1. Visit http://localhost:5000 to access the welcome page
2. Sign up as either a Customer or Raddiwala
3. Verify your email with the OTP sent to your inbox
4. Complete your profile setup
5. Start using the platform based on your role

### For Customers
1. Navigate to "Sell Scrap" to create pickup requests
2. Upload photos and specify scrap details
3. Wait for Raddiwalas to place bids
4. Review and accept the best offer
5. Rate the service after pickup completion

### For Raddiwalas
1. Browse "Ongoing Requests" to find opportunities
2. Place competitive bids on suitable requests
3. Complete accepted pickups professionally
4. Build your reputation through customer ratings
5. Upgrade to Premium for unlimited access

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Customer Routes
- `GET /customer/dashboard` - Customer dashboard
- `POST /api/pickup-requests` - Create pickup request
- `GET /api/pickup-requests/pending` - Get pending requests
- `POST /api/bids/:bidId/accept` - Accept a bid

### Raddiwala Routes
- `GET /raddiwala/dashboard` - Raddiwala dashboard
- `GET /api/pickup-requests/ongoing` - Browse requests
- `POST /api/bids` - Place a bid
- `POST /api/transactions/complete` - Complete pickup

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Check the debug panel at `/api/debug`
- Review server logs for error details

---

**RaddiWala** - Connecting communities through sustainable scrap collection
