const mongoose = require('mongoose');

const ROOM_TYPES = ['deluxe_twin', 'deluxe_king', 'junior_suite', 'premier_suite', 'penthouse'];
const ROOM_STATUSES = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];
const VIEW_TYPES = ['sea_view', 'garden_view', 'city_view', 'courtyard_view', 'pool_view'];

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required.'],
      unique: true,
      trim: true,
      maxlength: [10, 'Room number cannot exceed 10 characters.'],
    },
    floor: {
      type: Number,
      required: [true, 'Floor number is required.'],
      min: [1, 'Floor must be at least 1.'],
      max: [50, 'Floor cannot exceed 50.'],
    },
    type: {
      type: String,
      required: [true, 'Room type is required.'],
      enum: {
        values: ROOM_TYPES,
        message: `Room type must be one of: ${ROOM_TYPES.join(', ')}.`,
      },
    },
    maxGuests: {
      type: Number,
      required: [true, 'Maximum guests is required.'],
      min: [1, 'Max guests must be at least 1.'],
      max: [20, 'Max guests cannot exceed 20.'],
    },
    // Seasonal rate tiers — mirrors the Settings > Room Rates table in the FE
    rates: {
      low:      { type: Number, required: [true, 'Low season rate is required.'], min: [0, 'Rate cannot be negative.'] },
      standard: { type: Number, required: [true, 'Standard rate is required.'],  min: [0, 'Rate cannot be negative.'] },
      high:     { type: Number, required: [true, 'High season rate is required.'], min: [0, 'Rate cannot be negative.'] },
      peak:     { type: Number, required: [true, 'Peak rate is required.'],       min: [0, 'Rate cannot be negative.'] },
      weekend:  { type: Number, min: [0, 'Rate cannot be negative.'] },
    },
    status: {
      type: String,
      enum: {
        values: ROOM_STATUSES,
        message: `Status must be one of: ${ROOM_STATUSES.join(', ')}.`,
      },
      default: 'available',
    },
    view: {
      type: String,
      enum: {
        values: VIEW_TYPES,
        message: `View must be one of: ${VIEW_TYPES.join(', ')}.`,
      },
    },
    smokingAllowed: {
      type: Boolean,
      default: false,
    },
    amenities: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    images: {
      type: [String],
      default: [],
    },
    suiteType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suite',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastStatusChange: {
      type: Date,
      default: null,
    },
    statusNote: {
      type: String,
      trim: true,
      maxlength: [300, 'Status note cannot exceed 300 characters.'],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
roomSchema.index({ status: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1, type: 1 });
roomSchema.index({ floor: 1, status: 1 });
roomSchema.index({ isActive: 1, status: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
// Display-friendly type label matching the FE RoomCard labels
roomSchema.virtual('typeLabel').get(function () {
  const labels = {
    deluxe_twin:   'Deluxe Twin',
    deluxe_king:   'Deluxe King',
    junior_suite:  'Junior Suite',
    premier_suite: 'Premier Suite',
    penthouse:     'Penthouse',
  };
  return labels[this.type] || this.type;
});

// Pre-save hook — record when status changes
roomSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.lastStatusChange = new Date();
  }
  next();
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;
