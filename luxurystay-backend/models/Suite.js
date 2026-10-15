const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
  icon:  { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  vip:   { type: Boolean, default: false },
}, { _id: false });

const suiteSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, 'Slug may only contain lowercase letters, numbers, and underscores.'],
    },
    name: {
      type: String,
      required: [true, 'Suite name is required.'],
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    sqm: {
      type: Number,
      min: [1, 'sqm must be positive.'],
    },
    maxGuests: {
      type: Number,
      min: [1, 'maxGuests must be at least 1.'],
    },
    baseRate: {
      type: Number,
      min: [0, 'Base rate cannot be negative.'],
    },
    gradient: {
      type: String,
      trim: true,
      default: 'linear-gradient(140deg, #C9AE82, #A08054)',
    },
    amenities: {
      type: [amenitySchema],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

suiteSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Suite', suiteSchema);
