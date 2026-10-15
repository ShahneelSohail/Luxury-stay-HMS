const mongoose = require('mongoose');

const STATUSES = ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'];
const SOURCES  = ['direct', 'travel_agent', 'concierge', 'online_agent'];

// Snapshot of the details entered at booking time — never changes after creation
const bookingContactSchema = new mongoose.Schema(
  {
    firstName:   { type: String, trim: true, default: '' },
    lastName:    { type: String, trim: true, default: '' },
    email:       { type: String, trim: true, default: '' },
    phone:       { type: String, trim: true, default: '' },
    nationality: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const addOnSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    price:   { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required.'],
    },
    // Immutable snapshot of details entered at booking time
    bookingContact: { type: bookingContactSchema, default: () => ({}) },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required.'],
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required.'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required.'],
    },
    adults: {
      type: Number,
      required: [true, 'Number of adults is required.'],
      min: [1, 'At least 1 adult is required.'],
      max: [20, 'Adults cannot exceed 20.'],
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Children cannot be negative.'],
      max: [20, 'Children cannot exceed 20.'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `Status must be one of: ${STATUSES.join(', ')}.` },
      default: 'pending',
    },
    // Booking source — matches FE check-in list "Source" column
    source: {
      type: String,
      enum: { values: SOURCES, message: `Source must be one of: ${SOURCES.join(', ')}.` },
      default: 'direct',
    },
    // Estimated arrival time string, e.g. "14:00" — shown in FE arrivals list
    eta: {
      type: String,
      trim: true,
      match: [/^([0-1]\d|2[0-3]):[0-5]\d$/, 'ETA must be in HH:MM format.'],
    },
    // Vehicle / plate — from FE check-in form field
    vehicle: {
      type: String,
      trim: true,
      maxlength: [30, 'Vehicle/plate cannot exceed 30 characters.'],
    },
    addOns: {
      type: [addOnSchema],
      default: [],
    },
    // Per-reservation preferences noted at booking — FE check-in step shows these as checkboxes
    stayPreferences: {
      type: [String],
      default: [],
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special requests cannot exceed 1000 characters.'],
    },
    // Internal concierge notes — shown in FE "Concierge notes" card
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required.'],
      min: [0, 'Total amount cannot be negative.'],
    },
    // Deposit tracking — FE public booking shows "Pay 30% now"
    depositAmount: {
      type: Number,
      default: 0,
      min: [0, 'Deposit cannot be negative.'],
    },
    depositPaid: {
      type: Boolean,
      default: false,
    },
    // Free-cancellation deadline — FE confirmation shows "Free cancellation through X date"
    cancellationDeadline: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required.'],
    },

    // ── Check-in / out fields (populated by Module 6 controllers) ──────────────
    checkInTime:  { type: Date,    default: null },
    checkOutTime: { type: Date,    default: null },
    keyIssued:    { type: Boolean, default: false },
    idVerified:   { type: Boolean, default: false },

    // Departure checklist — mirrors the FE checkout step checkboxes
    departureChecklist: {
      miniBarVerified:      { type: Boolean, default: false },
      safeEmptied:          { type: Boolean, default: false },
      keysReturned:         { type: Boolean, default: false },
      damageAssessment:     { type: Boolean, default: false },
      lostAndFoundCleared:  { type: Boolean, default: false },
      transferDispatched:   { type: Boolean, default: false },
    },

    // Financial adjustment applied at checkout (early departure credit or overdue charge)
    checkoutAdjustment: {
      type:     { type: String, enum: ['credit', 'charge', 'none'], default: 'none' },
      nights:   { type: Number, default: 0 },   // nights early OR days overdue
      amount:   { type: Number, default: 0 },
      waived:   { type: Boolean, default: false },
      waivedBy: { type: String, default: null },
      reason:   { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
reservationSchema.virtual('nights').get(function () {
  if (!this.checkInDate || !this.checkOutDate) return null;
  return Math.ceil(
    (new Date(this.checkOutDate) - new Date(this.checkInDate)) / (1000 * 60 * 60 * 24)
  );
});

reservationSchema.virtual('addOnsTotal').get(function () {
  return (this.addOns || []).reduce((sum, a) => sum + (a.price || 0), 0);
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
reservationSchema.index({ guest: 1 });
reservationSchema.index({ room: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ checkInDate: 1 });
reservationSchema.index({ checkOutDate: 1 });
reservationSchema.index({ status: 1, checkInDate: 1 });
reservationSchema.index({ room: 1, status: 1, checkInDate: 1, checkOutDate: 1 });
reservationSchema.index({ createdBy: 1 });

// ─── Auto-generate bookingId ──────────────────────────────────────────────────
reservationSchema.pre('save', async function (next) {
  if (this.bookingId) return next();

  const dateStr = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const count = await mongoose.model('Reservation').countDocuments({
    bookingId: { $regex: `^LS-${dateStr}-` },
  });

  this.bookingId = `LS-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  next();
});

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
