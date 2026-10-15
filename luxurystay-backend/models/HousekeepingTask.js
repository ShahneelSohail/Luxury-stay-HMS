const mongoose = require('mongoose');

const TASK_TYPES = [
  'departure_clean',
  'arrival_prep',
  'linen_refresh',
  'turn_down',
  'deep_clean',
  'maintenance_followup',
  'inspection',
  'other',
];

const STATUSES   = ['queued', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Human-readable labels matching FE card display
const TASK_TYPE_LABELS = {
  departure_clean:     'Departure clean',
  arrival_prep:        'Arrival prep',
  linen_refresh:       'Linen refresh',
  turn_down:           'Turn-down service',
  deep_clean:          'Deep clean',
  maintenance_followup:'Maintenance follow-up',
  inspection:          'Inspection',
  other:               'Other',
};

const housekeepingTaskSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required.'],
    },
    taskType: {
      type: String,
      enum: { values: TASK_TYPES, message: `Task type must be one of: ${TASK_TYPES.join(', ')}.` },
      default: 'other',
    },
    // Custom title — defaults to taskType label if omitted
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters.'],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: `Status must be one of: ${STATUSES.join(', ')}.` },
      default: 'queued',
    },
    priority: {
      type: String,
      enum: { values: PRIORITIES, message: `Priority must be one of: ${PRIORITIES.join(', ')}.` },
      default: 'medium',
    },
    // Scheduled completion time — maps to FE "eta" field shown on each card
    scheduledFor: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
    },
    // Issue observed during the task — triggers a maintenance flag
    reportedIssue: {
      type: String,
      trim: true,
      maxlength: [500, 'Reported issue cannot exceed 500 characters.'],
    },
    issueReportedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required.'],
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
housekeepingTaskSchema.virtual('taskTypeLabel').get(function () {
  return TASK_TYPE_LABELS[this.taskType] || this.taskType;
});

// Display title: custom title if set, otherwise the type label
housekeepingTaskSchema.virtual('displayTitle').get(function () {
  return this.title || TASK_TYPE_LABELS[this.taskType] || this.taskType;
});

// Duration in minutes between scheduledFor and completedAt
housekeepingTaskSchema.virtual('durationMinutes').get(function () {
  if (!this.scheduledFor || !this.completedAt) return null;
  return Math.round((this.completedAt - this.scheduledFor) / (1000 * 60));
});

// ─── Pre-save hook — set completedAt when status becomes completed ─────────────
housekeepingTaskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
housekeepingTaskSchema.index({ room: 1 });
housekeepingTaskSchema.index({ assignedTo: 1 });
housekeepingTaskSchema.index({ status: 1 });
housekeepingTaskSchema.index({ priority: 1 });
housekeepingTaskSchema.index({ status: 1, priority: -1 });
housekeepingTaskSchema.index({ scheduledFor: 1 });
housekeepingTaskSchema.index({ createdAt: -1 });

const HousekeepingTask = mongoose.model('HousekeepingTask', housekeepingTaskSchema);
module.exports = HousekeepingTask;
