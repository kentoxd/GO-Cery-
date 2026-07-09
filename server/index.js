require('dotenv').config();

const express = require('express');
const path = require('path');
const { initFirebaseAdmin } = require('./services/firebase-admin');

const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

initFirebaseAdmin();

app.use('/api/webhooks/paymongo', webhookRoutes);

app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'gocery-api' });
});

app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Go! Cery API running at http://localhost:${PORT}`);
});
