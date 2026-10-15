const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'receptionist', 'housekeeping', 'service', 'guest'],
        message: 'Role must be one of: admin, manager, receptionist, housekeeping, service, guest.',
      },
      default: 'guest',
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()\/.]{7,20}$/, 'Please provide a valid phone number.'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// email unique index is already defined via `unique: true` on the field
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });

// ─── Pre-save Hook — Hash Password ───────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Role is included in the payload so the FE can decode the token
// and make routing/rendering decisions without an extra API call.
userSchema.methods.generateToken = function () {
  return jwt.sign(
    {
      id:    this._id,
      role:  this.role,
      name:  this.name,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const User = mongoose.model('User', userSchema);
module.exports = User;
