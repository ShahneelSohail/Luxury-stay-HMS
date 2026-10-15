const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['draft', 'open', 'partial', 'paid'];
const PAYMENT_METHODS  = ['card', 'cash', 'bank_transfer', 'online'];
const LINE_CATEGORIES  = ['room', 'dining', 'spa', 'bar', 'laundry', 'transport', 'other'];

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: { values: LINE_CATEGORIES, message: `Category must be one of: ${LINE_CATEGORIES.join(', ')}.` },
      default: 'other',
    },
    quantity:  { type: Number, required: true, min: [0, 'Quantity cannot be negative.'] },
    unitPrice: { type: Number, required: true, min: [0, 'Unit price cannot be negative.'] },
    total:     { type: Number, required: true, min: [0, 'Total cannot be negative.'] },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation is required.'],
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required.'],
    },
    // Denormalised room reference for quick display in the invoice list (FE table shows room number)
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative.'],
    },
    // VAT — FE folio shows "VAT (10%)" as a computed line
    taxRate: {
      type: Number,
      default: 10,
      min: [0, 'Tax rate cannot be negative.'],
      max: [100, 'Tax rate cannot exceed 100.'],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative.'],
    },
    // Tourist tax per night — FE folio shows "Tourist tax (€5/night)"
    touristTaxPerNight: {
      type: Number,
      default: 0,
      min: [0, 'Tourist tax cannot be negative.'],
    },
    touristTaxTotal: {
      type: Number,
      default: 0,
      min: [0, 'Tourist tax total cannot be negative.'],
    },
    // Flat discount applied before tax
    discount: {
      amount: { type: Number, default: 0, min: [0, 'Discount cannot be negative.'] },
      reason: { type: String, trim: true, maxlength: [200, 'Discount reason cannot exceed 200 characters.'] },
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total cannot be negative.'],
    },
    paymentStatus: {
      type: String,
      enum: { values: PAYMENT_STATUSES, message: `Payment status must be one of: ${PAYMENT_STATUSES.join(', ')}.` },
      default: 'draft',
    },
    paymentMethod: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.` },
      default: null,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative.'],
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
    },
    // FE has an "Email" button — track whether the folio was sent to the guest
    emailSent:   { type: Boolean, default: false },
    emailSentAt: { type: Date,    default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
invoiceSchema.virtual('balance').get(function () {
  return +(this.totalAmount - this.amountPaid).toFixed(2);
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
invoiceSchema.index({ reservation: 1 });
invoiceSchema.index({ guest: 1 });
invoiceSchema.index({ paymentStatus: 1 });
invoiceSchema.index({ createdAt: -1 });

// ─── Auto-generate invoiceNumber ──────────────────────────────────────────────
invoiceSchema.pre('save', async function (next) {
  if (this.invoiceNumber) return next();

  const last = await mongoose.model('Invoice')
    .findOne({}, { invoiceNumber: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 1;
  if (last?.invoiceNumber) {
    const match = last.invoiceNumber.match(/^INV-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }

  this.invoiceNumber = `INV-${String(nextSeq).padStart(5, '0')}`;
  next();
});

// ─── Helper: recalculate totals from line items ───────────────────────────────
invoiceSchema.methods.recalculate = function (nights = 0) {
  this.subtotal = +this.lineItems
    .reduce((sum, item) => sum + item.total, 0)
    .toFixed(2);

  const discounted = Math.max(0, this.subtotal - (this.discount?.amount || 0));
  this.taxAmount        = +(discounted * (this.taxRate / 100)).toFixed(2);
  this.touristTaxTotal  = +(this.touristTaxPerNight * nights).toFixed(2);
  this.totalAmount      = +(discounted + this.taxAmount + this.touristTaxTotal).toFixed(2);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
