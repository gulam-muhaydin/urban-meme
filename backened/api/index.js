import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createDb } from '../db.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/hello', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Serverless backend working 🚀"
  });
});

// Helpers
function sanitizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function userResponse(u) {
  if (!u) return null;
  const { password: _pw, ...rest } = u;
  return rest;
}

// AUTH
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await createDb();
    const normalizedEmail = sanitizeEmail(email);
    const user = db.data.users && db.data.users[normalizedEmail];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse(user),
    });
  } catch (error) {
    console.error('Auth Login Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Backward-compat login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await createDb();
    const normalizedEmail = sanitizeEmail(email);
    const user = db.data.users && db.data.users[normalizedEmail];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse(user),
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await createDb();
    const normalizedEmail = sanitizeEmail(email);

    if (db.data.users && db.data.users[normalizedEmail]) {
      return res.status(400).json({ error: "Email already registered" });
    }

    db.data.users[normalizedEmail] = {
      name,
      email: normalizedEmail,
      phone,
      password,
      planId: null,
      planAmount: null,
      paymentNumber: null,
      paymentSlip: null,
      paymentSubmitted: false,
      approved: false,
      referralCode: null,
      loginHistory: [],
      security: { pin: null, twoFactor: false },
      createdAt: new Date().toISOString(),
    };
    await db.write();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: userResponse(db.data.users[normalizedEmail]),
    });
  } catch (error) {
    console.error('Auth Signup Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Backward-compat register
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await createDb();
    const normalizedEmail = sanitizeEmail(email);

    if (db.data.users && db.data.users[normalizedEmail]) {
      return res.status(400).json({ error: "Email already registered" });
    }

    db.data.users[normalizedEmail] = {
      name,
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
      approved: false,
      paymentSubmitted: false,
    };
    await db.write();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: userResponse(db.data.users[normalizedEmail]),
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PAYMENT SUBMISSIONS
app.post('/api/payment-submissions', async (req, res) => {
  try {
    const { email, name, phone, planId, planAmount, slipBase64 } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail || !name || !phone || !planId || !planAmount || !slipBase64) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await createDb();
    const user = db.data.users[normalizedEmail];
    if (user) {
      user.paymentSubmitted = true;
      user.paymentNumber = phone;
      user.paymentSlip = slipBase64 ? 'uploaded' : null;
    }
    db.data.pendingPayments.push({
      email: normalizedEmail,
      name,
      phone,
      planId,
      planAmount,
      slipBase64,
      submittedAt: new Date().toISOString(),
    });
    await db.write();

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Payment Submission Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ADMIN
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required" });
    }
    const db = await createDb();
    const normalizedEmail = sanitizeEmail(email);
    const admin = db.data.users[normalizedEmail];
    if (admin && normalizedEmail === 'admin@watchearn.com' && admin.password === password) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.get('/api/admin/pending', async (req, res) => {
  try {
    const db = await createDb();
    return res.status(200).json({ pending: db.data.pendingPayments || [] });
  } catch (error) {
    console.error('Admin Pending Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/admin/approve', async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email is required" });
    }
    const db = await createDb();
    const user = db.data.users[normalizedEmail];
    if (user) {
      user.approved = true;
      user.paymentSubmitted = false;
    }
    db.data.pendingPayments = (db.data.pendingPayments || []).filter(p => sanitizeEmail(p.email) !== normalizedEmail);
    await db.write();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Admin Approve Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/admin/reject', async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = sanitizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email is required" });
    }
    const db = await createDb();
    const user = db.data.users[normalizedEmail];
    if (user) {
      user.paymentSubmitted = false;
      user.paymentSlip = null;
    }
    db.data.pendingPayments = (db.data.pendingPayments || []).filter(p => sanitizeEmail(p.email) !== normalizedEmail);
    await db.write();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Admin Reject Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const db = await createDb();
    const users = Object.values(db.data.users || {}).map(u => ({
      ...userResponse(u),
      points: (db.data.points && db.data.points[sanitizeEmail(u.email)]) || 0,
    }));
    return res.status(200).json({ users });
  } catch (error) {
    console.error('Admin Users Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// USER POINTS
app.post('/api/users/:email/points', async (req, res) => {
  try {
    const email = sanitizeEmail(req.params.email);
    const { amount } = req.body || {};
    const delta = parseInt(amount, 10);
    if (!email || isNaN(delta)) {
      return res.status(400).json({ error: "Invalid email or amount" });
    }
    const db = await createDb();
    db.data.points[email] = (db.data.points[email] || 0) + delta;
    await db.write();
    return res.status(200).json({ ok: true, points: db.data.points[email] });
  } catch (error) {
    console.error('Points Update Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// VIDEO PROGRESS
app.get('/api/users/:email/video-progress', async (req, res) => {
  try {
    const email = sanitizeEmail(req.params.email);
    const db = await createDb();
    const vp = db.data.videoProgress[email] || { date: null, ids: [] };
    return res.status(200).json(vp);
  } catch (error) {
    console.error('Video Progress Get Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/api/users/:email/video-progress', async (req, res) => {
  try {
    const email = sanitizeEmail(req.params.email);
    const { videoId } = req.body || {};
    const id = parseInt(videoId, 10);
    if (!email || isNaN(id)) {
      return res.status(400).json({ error: "Invalid email or videoId" });
    }
    const db = await createDb();
    const today = new Date().toDateString();
    const vp = db.data.videoProgress[email] || { date: today, ids: [] };
    if (vp.date !== today) {
      vp.date = today;
      vp.ids = [];
    }
    if (!vp.ids.includes(id)) {
      vp.ids.push(id);
    }
    db.data.videoProgress[email] = vp;
    await db.write();
    return res.status(200).json({ ok: true, progress: vp });
  } catch (error) {
    console.error('Video Progress Update Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('WebX Backend is running!');
});

// Catch-all route for undefined routes to prevent 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found. Please check your URL."
  });
});

// Export the app for Vercel
export default app;

// For local development
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
