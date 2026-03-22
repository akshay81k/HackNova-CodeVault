const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const submissionRoutes = require('./routes/submissions');
const verifyRoutes = require('./routes/verify');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HackNova API is running', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || process.env.MONGO_CONNECTION_STRING;

if (!mongoUri) {
  console.error('❌ FATAL: Neither MONGO_URI nor MONGO_CONNECTION_STRING is defined in environment variables.');
} else {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('✅ MongoDB connected');
      // On Vercel, app.listen isn't strictly necessary as it injects its own listener,
      // but it's safe to keep for local dev.
      if (process.env.NODE_ENV !== 'production') {
        const server = app.listen(PORT, () => {
          console.log(`🚀 HackNova API running on http://localhost:${PORT}`);
        });
        server.timeout = 600000;
      }
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      // Removed process.exit(1) to prevent Vercel 500 Invocation crashes on cold start.
    });
}

// Required for Vercel properly routing to your Express app
module.exports = app;
