const mongoose = require('mongoose');

const TIERS = ['none', 'argent', 'or', 'etoile'];

const guestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters.'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      match: [/^\+?[\d\s\-()\/.]{7,20}$/, 'Please provide a valid phone number.'],
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [60, 'Nationality cannot exceed 60 characters.'],
    },
    idType: {
      type: String,
      enum: {
        values: ['passport', 'national_id', 'driving_license', 'other'],
        message: 'ID type must be one of: passport, national_id, driving_license, other.',
      },
    },
    idNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'ID number cannot exceed 50 characters.'],
    },
    address: {
      street:  { type: String, trim: true },
      city:    { type: String, trim: true },
      state:   { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
    preferences: {
      roomType:    { type: String, trim: true },
      floorLevel:  { type: String, trim: true },
      smoking:     { type: Boolean, default: false },
      extraPillow: { type: Boolean, default: false },
      earlyCheckIn:{ type: Boolean, default: false },
      lateCheckOut:{ type: Boolean, default: false },
      notes:       { type: String, trim: true, maxlength: [500, 'Preference notes cannot exceed 500 characters.'] },
    },
    totalStays: {
      type: Number,
      default: 0,
      min: [0, 'Total stays cannot be negative.'],
    },
    // Loyalty tier — drives FE badge: Argent / Or / Étoile
    tier: {
      type: String,
      enum: { values: TIERS, message: `Tier must be one of: ${TIERS.join(', ')}.` },
      default: 'none',
    },
    // Cumulative revenue from all paid invoices — shown as "Lifetime" in guest registry
    lifetimeSpend: {
      type: Number,
      default: 0,
      min: [0, 'Lifetime spend cannot be negative.'],
    },
    // Legacy VIP flag — kept for backwards compatibility; Étoile tier implies VIP status
    isVIP: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
guestSchema.index({ lastName: 1, firstName: 1 });
guestSchema.index({ tier: 1 });
guestSchema.index({ isVIP: 1 });
guestSchema.index({ lifetimeSpend: -1 });
guestSchema.index({ nationality: 1 });
guestSchema.index({
  firstName: 'text',
  lastName:  'text',
  email:     'text',
  phone:     'text',
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────
guestSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Tier display label matching FE chip text
guestSchema.virtual('tierLabel').get(function () {
  const labels = { none: null, argent: 'Argent', or: 'Or', etoile: 'Étoile' };
  return labels[this.tier] || null;
});

// ─── Pre-save: keep isVIP in sync with tier ───────────────────────────────────
guestSchema.pre('save', function (next) {
  if (this.isModified('tier')) {
    this.isVIP = this.tier === 'etoile';
  }
  next();
});

// ─── Tier thresholds ──────────────────────────────────────────────────────────
// etoile : €15,000+ lifetime OR 15+ stays
// or     : €5,000+  lifetime OR 8+  stays
// argent : €1,000+  lifetime OR 3+  stays
function deriveTier(lifetimeSpend, totalStays) {
  if (lifetimeSpend >= 15000 || totalStays >= 15) return 'etoile';
  if (lifetimeSpend >= 5000  || totalStays >= 8)  return 'or';
  if (lifetimeSpend >= 1000  || totalStays >= 3)  return 'argent';
  return 'none';
}

// ─── Static: recalculate visits, lifetime spend, tier for one guest ───────────
guestSchema.statics.recalcStats = async function (guestId) {
  const Reservation = mongoose.model('Reservation');
  const Invoice     = mongoose.model('Invoice');

  const [totalStays, paidInvoices] = await Promise.all([
    Reservation.countDocuments({ guest: guestId, status: 'checked-out' }),
    Invoice.find({ guest: guestId, paymentStatus: 'paid' }, 'totalAmount').lean(),
  ]);

  const lifetimeSpend = +paidInvoices
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
    .toFixed(2);

  const tier  = deriveTier(lifetimeSpend, totalStays);
  const isVIP = tier === 'etoile';

  return this.findByIdAndUpdate(
    guestId,
    { totalStays, lifetimeSpend, tier, isVIP },
    { new: true, runValidators: false }
  );
};

const Guest = mongoose.model('Guest', guestSchema);
module.exports = Guest;
