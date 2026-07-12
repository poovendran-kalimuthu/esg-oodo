require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Module Routes ──────────────────────────────────────────────────────────────
const authRoutes          = require('./modules/auth/auth.routes');
const csrRoutes           = require('./modules/csr/csr.routes');
const participationRoutes = require('./modules/participation/participation.routes');
const trainingRoutes      = require('./modules/training/training.routes');
const diversityRoutes     = require('./modules/diversity/diversity.routes');
const feedbackRoutes      = require('./modules/feedback/feedback.routes');
const socialRoutes        = require('./modules/social/social.routes');
const reportsRoutes       = require('./modules/reports/reports.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const gamificationRoutes  = require('./modules/gamification/gamification.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & Parsing ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static Uploads ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    app: process.env.APP_NAME || 'EcoSphere Social Module',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/csr',           csrRoutes);
app.use('/api/participation', participationRoutes);
app.use('/api/training',      trainingRoutes);
app.use('/api/diversity',     diversityRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/social',        socialRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gamification',  gamificationRoutes);

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  🌿 EcoSphere Social Module API`);
  console.log(`  🚀 Server  : http://localhost:${PORT}`);
  console.log(`  🏥 Health  : http://localhost:${PORT}/api/health`);
  console.log(`  🌍 Env     : ${process.env.NODE_ENV}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

module.exports = app;
