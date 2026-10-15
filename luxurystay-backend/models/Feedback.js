const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
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
    // Granular sub-ratings — FE displays overall as the star rating
    ratings: {
      overall:    { type: Number, required: [true, 'Overall rating is required.'], min: 1, max: 5 },
      cleanliness:{ type: Number, min: 1, max: 5 },
      service:    { type: Number, min: 1, max: 5 },
      comfort:    { type: Number, min: 1, max: 5 },
      value:      { type: Number, min: 1, max: 5 },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters.'],
    },
    // NPS score (0–10) — FE stats bar shows aggregate NPS
    npsScore: {
      type: Number,
      min: [0, 'NPS score must be between 0 and 10.'],
      max: [10, 'NPS score must be between 0 and 10.'],
      default: null,
    },
    // Staff response to the feedback
    staffResponse: {
      type: String,
      trim: true,
      maxlength: [1000, 'Staff response cannot exceed 1000 characters.'],
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    // Action flag — drives the "Action items" FE stat counter
    actionRequired: {
      type: Boolean,
      default: false,
    },
    actionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Action note cannot exceed 500 characters.'],
    },
    actionedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actionedAt: {
      type: Date,
      default: null,
    },
    isPublic: {
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

// ─── Virtuals ─────────────────────────────────────────────────────────────────
feedbackSchema.virtual('averageRating').get(function () {
  const r = this.ratings;
  const scores = [r.cleanliness, r.service, r.comfort, r.value].filter(Boolean);
  if (!scores.length) return r.overall;
  return +((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1));
});

feedbackSchema.virtual('npsCategory').get(function () {
  if (this.npsScore === null || this.npsScore === undefined) return null;
  if (this.npsScore >= 9) return 'promoter';
  if (this.npsScore >= 7) return 'passive';
  return 'detractor';
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
feedbackSchema.index({ guest: 1 });
feedbackSchema.index({ reservation: 1 }, { unique: true });
feedbackSchema.index({ 'ratings.overall': -1 });
feedbackSchema.index({ actionRequired: 1 });
feedbackSchema.index({ createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
