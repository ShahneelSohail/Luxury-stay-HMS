const mongoose = require('mongoose');

const SERVICE_TYPES = [
  'room_service',
  'wake_up_call',
  'laundry',
  'spa',
  'transport',
  'amenities',
  'dining',       // private dining / restaurant reservation — from FE check-in preference "Private dining"
  'concierge',    // general concierge request — from FE "Concierge will be in touch"
  'other',
];

const STATUSES   = ['pending', 'in-progress', 'fulfilled', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const serviceRequestSchema = new mongoose.Schema(
  {
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required.'],
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation is required.'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required.'],
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required.'],
      enum: { values: SERVICE_TYPES, message: `Service type must be one of: ${SERVICE_TYPES.join(', ')}.` },
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters.'],
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: `Priority must be one of: ${PRIORITIES.join(', ')}.` },
      default: 'medium',
    },
    // When the service should be delivered — for wake-up calls, spa bookings, dining reservations
    scheduledFor: {
      type: Date,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `Status must be one of: ${STATUSES.join(', ')}.` },
      default: 'pending',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    // Staff notes on the request
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters.'],
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
serviceRequestSchema.virtual('serviceTypeLabel').get(function () {
  const labels = {
    room_service:  'Room Service',
    wake_up_call:  'Wake-up Call',
    laundry:       'Laundry',
    spa:           'Spa & Wellness',
    transport:     'Transport',
    amenities:     'Amenities',
    dining:        'Dining',
    concierge:     'Concierge',
    other:         'Other',
  };
  return labels[this.serviceType] || this.serviceType;
});

// Response time in minutes from requestedAt to fulfilledAt
serviceRequestSchema.virtual('responseMinutes').get(function () {
  if (!this.requestedAt || !this.fulfilledAt) return null;
  return Math.round((this.fulfilledAt - this.requestedAt) / (1000 * 60));
});

// ─── Pre-save hook — set fulfilledAt when status becomes fulfilled ─────────────
serviceRequestSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'fulfilled' && !this.fulfilledAt) {
    this.fulfilledAt = new Date();
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
serviceRequestSchema.index({ guest: 1 });
serviceRequestSchema.index({ reservation: 1 });
serviceRequestSchema.index({ room: 1 });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ serviceType: 1 });
serviceRequestSchema.index({ assignedTo: 1 });
serviceRequestSchema.index({ scheduledFor: 1 });
serviceRequestSchema.index({ status: 1, priority: -1 });
serviceRequestSchema.index({ createdAt: -1 });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);
module.exports = ServiceRequest;
