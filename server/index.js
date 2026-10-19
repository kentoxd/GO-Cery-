/**
 * server/index.js — Express app entry point.
 * Run locally with: npm start
 * Deploy it to any Node host (for example Render) - see PAYMENTS.md.
 */
const express = require('express');
const cors = require('cors');

const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const paymentsRouter = require('./routes/payments');
const webhooksRouter = require('./routes/webhooks');

const app = express();

const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://go--cery.web.app',
  'https://go--cery.firebaseapp.com',
  // The Android app (Capacitor) runs from these origins.
  'https://localhost',
  'http://localhost',
  'capacitor://localhost'
].concat((process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean));
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));

// The webhook needs the raw body to check PayMongo's signature, so it goes BEFORE express.json().
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());

app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payments', paymentsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'Go! Cery API running' }));

if (require.main === module) {
  require('dotenv').config();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Go! Cery API listening on http://localhost:${PORT}`));
}

module.exports = app;