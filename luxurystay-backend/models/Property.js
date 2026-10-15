const mongoose = require('mongoose');

// Singleton model — only one document ever exists (the property itself).
// Enforced by a fixed singleton: true field.
const propertySchema = new mongoose.Schema(
  {
    singleton: { type: Boolean, default: true, immutable: true },

    // ─── Identity ──────────────────────────────────────────────────────────────
    name:         { type: String, trim: true, default: 'LuxuryStay' },
    code:         { type: String, trim: true, default: 'LSME-CDA-01' },
    address:      { type: String, trim: true, default: '' },
    city:         { type: String, trim: true, default: '' },
    country:      { type: String, trim: true, default: '' },
    timezone:     { type: String, trim: true, default: 'Europe/Paris' },
    currency:     { type: String, trim: true, default: 'EUR' },
    currencySymbol: { type: String, trim: true, default: '€' },
    phone:        { type: String, trim: true, default: '' },
    email:        { type: String, trim: true, default: '' },
    website:      { type: String, trim: true, default: '' },

    // ─── Policies ──────────────────────────────────────────────────────────────
    policies: {
      checkInTime:          { type: String, default: '15:00' },  // HH:MM
      checkOutTime:         { type: String, default: '12:00' },  // HH:MM
      cancellationWindowHours: { type: Number, default: 72 },
      depositPercent:       { type: Number, default: 30, min: 0, max: 100 },
      childrenPolicy:       { type: String, trim: true, default: 'Welcome · under 12 free' },
      petsPolicy:           { type: String, trim: true, default: 'Small pets · €40 / stay' },
      extraNotes:           { type: String, trim: true, maxlength: 1000, default: '' },
    },

    // ─── Taxes ─────────────────────────────────────────────────────────────────
    taxes: {
      vatPercent:          { type: Number, default: 10, min: 0, max: 100 },
      touristTaxPerNight:  { type: Number, default: 5,  min: 0 },
      touristTaxLabel:     { type: String, trim: true, default: 'Tourist tax' },
    },

    // ─── Capacity ──────────────────────────────────────────────────────────────
    totalRooms: { type: Number, default: 142, min: 1 },
  },
  {
    timestamps: true,
  }
);

// Enforce singleton — only one document allowed
propertySchema.index({ singleton: 1 }, { unique: true });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
