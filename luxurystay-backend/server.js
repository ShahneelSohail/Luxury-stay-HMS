const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { AppError } = require('./middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// ─── Security Headers ───────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.options('*', cors());


// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Request Logging ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LuxuryStay HMS API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
// Module 2 — Auth & Users
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Module 3 — Guests
app.use('/api/guests', require('./routes/guests'));

// Module 4 — Rooms
app.use('/api/rooms',  require('./routes/rooms'));
app.use('/api/suites', require('./routes/suites'));

// Module 5 — Reservations
app.use('/api/reservations', require('./routes/reservations'));

// Module 7 — Invoices
app.use('/api/invoices', require('./routes/invoices'));

// Module 8 — Housekeeping
app.use('/api/housekeeping', require('./routes/housekeeping'));

// Module 9 — Maintenance
app.use('/api/maintenance', require('./routes/maintenance'));

// Module 10 — Feedback & Services
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/services', require('./routes/services'));

// Module 11 — Reports
app.use('/api/reports', require('./routes/reports'));

// Module 12 — Notifications
app.use('/api/notifications', require('./routes/notifications'));

// Guest self-service portal
app.use('/api/guest', require('./routes/guestSelf'));

// Role page permissions
app.use('/api/role-permissions', require('./routes/rolePermissions'));

// Public — Contact form (no auth)
app.use('/api/contact', require('./routes/contact'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(
    `[LuxuryStay HMS] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
  );
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error(`[FATAL] Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught Exception: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[INFO] Process terminated.');
    process.exit(0);
  });
});

module.exports = app;
