/**
 * server/index.js — Express app entry point.
 * Run locally with: npm start
 * Deployed via api.js as a Firebase Cloud Function.
 */
const express = require('express');
const cors = require('cors');

const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');

const app = express();

const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'https://go--cery.web.app',
  'https://go--cery.firebaseapp.com'
];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  }
}));

app.use(express.json());

app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'Go! Cery API running' }));

if (require.main === module) {
  require('dotenv').config();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Go! Cery API listening on http://localhost:${PORT}`));
}

module.exports = app;
