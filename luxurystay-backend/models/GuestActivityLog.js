const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
    index: true,
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null,
  },
  eventType: {
    type: String,
    enum: ['booking_created', 'checked_in', 'checked_out', 'booking_cancelled', 'staff_forced_available'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  performedBy: {
    type: String,
    default: 'System',
    maxlength: 100,
  },
}, { timestamps: true });

module.exports = mongoose.model('GuestActivityLog', schema);
