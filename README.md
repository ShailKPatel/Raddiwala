# ♻️ Raddiwala

A marketplace connecting households with nearby **scrap collectors (raddiwalas)** in real time. Inspired by ride-hailing and food delivery apps, Raddiwala helps you schedule pickups, compare bids, and contribute to sustainable recycling.

---

## 🚀 Features

### 👥 User Roles
- **Customer**: Upload raddi (scrap) details, receive bids, accept and rate collectors.
- **Raddiwala**: View nearby requests, bid with pricing and timing, fulfill pickups, and build trust through ratings.

### 🧾 Customer Workflow
1. Upload photo(s) of raddi
2. Select waste type & weight category
3. Submit pickup request with optional time window
4. Review and compare bids (rate + time)
5. Accept a bid and rate post-pickup

### 🧑‍🔧 Raddiwala Workflow
1. Browse active pickup requests
2. Submit bids with per-kg pricing & time slots
3. Get notified when accepted
4. Complete pickup and request a rating

### ⚖️ Bid & Rating System
- Customers compare bids on:
  - Price per kg
  - Pickup flexibility
  - Raddiwala’s average rating
- Two-way post-pickup ratings increase reliability

---

## 🛠 Tech Stack

### 🖥 Frontend
- React + Tailwind CSS / Material UI
- React Router for navigation
- Redux Toolkit / Context API (state management)
- React Hook Form for handling inputs
- Image upload (Base64 or Cloudinary)

### 🔧 Backend
- Node.js + Express.js
- REST API or GraphQL
- JWT-based Auth for both roles
- File uploads via Multer
- Geolocation support for local filtering

### 🗄️ Database
- MongoDB with Mongoose

**Collections:**
- `users` (customers & raddiwalas)
- `pickupRequests`
- `bids`
- `ratings`
- `transactions`
- `subscriptions`

---

## 💰 Monetization Plan
- No commission model
- Ad support (Google Ads or partnerships)
- ₹30/month plan for high-volume raddiwalas
- Premium listings or early bid access

---

## 🔮 Future Roadmap
- KYC-based raddiwala verification
- Bulk pickups (for schools/offices)
- Partner with recycling centers
- "Carbon saved" counter (green impact)
- Admin dashboard for moderation
- Mobile App (React Native or Flutter)

---

## 📦 Installation (for Developers)

```bash
# Clone the repository
git clone https://github.com/yourusername/raddiwala.git
cd raddiwala

# Backend setup
cd server
npm install
npm start

# Frontend setup
cd ../client
npm install
npm start
