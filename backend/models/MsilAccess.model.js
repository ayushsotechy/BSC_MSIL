const mongoose = require('mongoose');

const msilAccessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mailId: { type: String, trim: true, lowercase: true, default: '' },
    password: { type: String, required: true, default: '1234' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

msilAccessSchema.index({ mailId: 1 }, { sparse: true });

module.exports = mongoose.model('MsilAccess', msilAccessSchema);
