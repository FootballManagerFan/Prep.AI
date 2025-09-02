# ⚡ Prep.AI Quick Start - Get Ready for Hosting!

## 🎯 **Immediate Next Steps (This Week)**

### **1. Set Up Environment Variables**
```bash
# In your Prep.AI directory, create .env file
touch .env

# Add these essential variables:
OPENAI_API_KEY=your_openai_key_here
JWT_SECRET=your_super_secret_jwt_key_here
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_here
```

### **2. Install Required Dependencies**
```bash
npm install jsonwebtoken bcryptjs mongoose stripe express-rate-limit helmet
```

### **3. Create Basic User Model**
Create `src/models/User.js`:
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  subscription: { type: String, default: 'free' },
  problemsSolved: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
```

### **4. Add Basic Security Middleware**
Add to your `src/server/index.js`:
```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### **5. Create Login/Register Routes**
Add these routes to your server:
```javascript
// Auth routes
app.post('/api/register', async (req, res) => {
  // User registration logic
});

app.post('/api/login', async (req, res) => {
  // User login logic
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  // Get user profile
});
```

---

## 🚀 **Week 1 Goals**

### **Day 1-2: Authentication System**
- [ ] User registration endpoint
- [ ] User login endpoint
- [ ] JWT token generation
- [ ] Password hashing

### **Day 3-4: Database Connection**
- [ ] MongoDB connection setup
- [ ] User model working
- [ ] Basic CRUD operations
- [ ] Error handling

### **Day 5-7: Frontend Pages**
- [ ] Login page (`/login`)
- [ ] Registration page (`/register`)
- [ ] User dashboard (`/dashboard`)
- [ ] Navigation updates

---

## 🔐 **Authentication Flow**

```
User Registration:
1. User fills form → POST /api/register
2. Validate email/password
3. Hash password with bcrypt
4. Save to MongoDB
5. Generate JWT token
6. Return success + token

User Login:
1. User submits credentials → POST /api/login
2. Find user by email
3. Compare password with bcrypt
4. Generate JWT token
5. Return token + user data

Protected Routes:
1. Check Authorization header
2. Verify JWT token
3. Extract user ID
4. Allow/deny access
```

---

## 🗄️ **Database Setup (MongoDB Atlas)**

### **1. Create MongoDB Atlas Account**
- Go to [mongodb.com/atlas](https://mongodb.com/atlas)
- Sign up for free account
- Create new cluster (free tier)

### **2. Get Connection String**
- Click "Connect" on your cluster
- Choose "Connect your application"
- Copy the connection string
- Replace `<password>` with your database password

### **3. Add to .env**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prepai?retryWrites=true&w=majority
```

---

## 💰 **Payment Setup (Stripe)**

### **1. Create Stripe Account**
- Go to [stripe.com](https://stripe.com)
- Sign up for account
- Get your API keys

### **2. Add to .env**
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### **3. Install Stripe**
```bash
npm install stripe
```

---

## 🎨 **Quick UI Components**

### **Login Form (use existing styles)**
```html
<div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
  <h2 class="text-2xl font-bold text-center mb-6">Login to Prep.AI</h2>
  <form id="loginForm">
    <input type="email" placeholder="Email" class="w-full p-3 border rounded mb-4" required>
    <input type="password" placeholder="Password" class="w-full p-3 border rounded mb-6" required>
    <button type="submit" class="w-full bg-orange-500 text-white p-3 rounded hover:bg-orange-600">
      Login
    </button>
  </form>
</div>
```

---

## 🚨 **Critical Security Notes**

1. **Never commit .env files** - Add to .gitignore
2. **Use strong JWT secrets** - Generate random strings
3. **Hash all passwords** - Use bcrypt with salt rounds 10+
4. **Rate limit API endpoints** - Prevent abuse
5. **Validate all inputs** - Sanitize user data

---

## 📱 **Mobile-First Approach**

- Use Tailwind's responsive classes
- Test on mobile devices
- Ensure touch-friendly buttons
- Optimize loading times

---

## 🎯 **Success Checklist**

- [ ] Users can register and login
- [ ] JWT tokens working
- [ ] Database connected
- [ ] Basic security in place
- [ ] Login/register pages styled
- [ ] Navigation updated
- [ ] Environment variables set
- [ ] Dependencies installed

---

**Ready to build? Start with the authentication system and we'll have users logging in by the end of the week! 🚀**
