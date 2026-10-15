const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: [true, 'First name is required.'], maxlength: 50 },
    lastName:  { type: String, trim: true, required: [true, 'Last name is required.'],  maxlength: 50 },
    email:     { type: String, trim: true, required: [true, 'Email is required.'],      lowercase: true },
    phone:     { type: String, trim: true, default: null },
    language:  { type: String, trim: true, default: 'en' },
    subject:   { type: String, trim: true, required: [true, 'Subject is required.'],   maxlength: 150 },
    message:   { type: String, trim: true, required: [true, 'Message is required.'],   maxlength: 2000 },
    status:    { type: String, enum: ['unread', 'read', 'replied'], default: 'unread' },
    staffNote: { type: String, trim: true, maxlength: 1000, default: null },
    readBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readAt:    { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', contactSchema);
