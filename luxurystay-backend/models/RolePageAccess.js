const mongoose = require('mongoose');

const rolePageAccessSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'manager', 'receptionist', 'housekeeping', 'service'],
    },
    pages: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RolePageAccess', rolePageAccessSchema);
