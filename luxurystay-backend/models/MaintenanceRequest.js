const mongoose = require('mongoose');

const CATEGORIES = ['plumbing', 'electrical', 'ac', 'hvac', 'furniture', 'technology', 'structural', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES   = ['open', 'assigned', 'in-progress', 'resolved'];

const statusLogSchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note:      { type: String, trim: true, maxlength: 300 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const maintenanceRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      index: true,
    },
    // Room ref — optional so common areas (Lobby, Spa) can use `location` string instead
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    // Free-text location for non-room areas (Lobby, Spa, Pool, Rooftop, etc.)
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters.'],
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reported by is required.'],
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      enum: { values: CATEGORIES, message: `Category must be one of: ${CATEGORIES.join(', ')}.` },
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    photos: {
      type: [String],
      default: [],
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: `Priority must be one of: ${PRIORITIES.join(', ')}.` },
      default: 'medium',
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `Status must be one of: ${STATUSES.join(', ')}.` },
      default: 'open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Resolution details
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Resolution note cannot exceed 500 characters.'],
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Full status audit trail — shown as timeline on the request detail view
    statusLog: {
      type: [statusLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Display location: room number if populated, otherwise the free-text location string
maintenanceRequestSchema.virtual('displayLocation').get(function () {
  if (this.room && typeof this.room === 'object' && this.room.roomNumber) {
    return `Room ${this.room.roomNumber}`;
  }
  return this.location || 'Unspecified';
});

// Resolution time in hours — used for the FE "Avg. resolution" stat
maintenanceRequestSchema.virtual('resolutionHours').get(function () {
  if (!this.resolvedAt || !this.createdAt) return null;
  return +((this.resolvedAt - this.createdAt) / (1000 * 60 * 60)).toFixed(1);
});

// ─── Pre-save hook — auto-generate requestId ──────────────────────────────────
maintenanceRequestSchema.pre('save', async function (next) {
  if (this.requestId) return next();

  const last = await mongoose.model('MaintenanceRequest')
    .findOne({}, { requestId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextSeq = 100;
  if (last?.requestId) {
    const match = last.requestId.match(/^MR-(\d+)$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }

  this.requestId = `MR-${nextSeq}`;
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
maintenanceRequestSchema.index({ status: 1 });
maintenanceRequestSchema.index({ priority: 1 });
maintenanceRequestSchema.index({ room: 1 });
maintenanceRequestSchema.index({ assignedTo: 1 });
maintenanceRequestSchema.index({ category: 1 });
maintenanceRequestSchema.index({ status: 1, priority: -1 });
maintenanceRequestSchema.index({ createdAt: -1 });
maintenanceRequestSchema.index({ resolvedAt: 1 });

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
module.exports = MaintenanceRequest;
