const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['booking', 'housekeeping', 'maintenance', 'service', 'feedback', 'system'],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Polymorphic reference to the entity that triggered this notification
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedModel: {
      type: String,
      enum: ['Reservation', 'HousekeepingTask', 'MaintenanceRequest', 'ServiceRequest', 'Feedback', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast "my unread notifications" queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
