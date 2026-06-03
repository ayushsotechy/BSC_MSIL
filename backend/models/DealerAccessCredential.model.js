const mongoose = require('mongoose');

const dealerAccessCredentialSchema = new mongoose.Schema(
  {
    dealerCode: { type: String, required: true, trim: true, unique: true },
    dealerName: { type: String, trim: true, default: '' },
    mailId: { type: String, trim: true, lowercase: true, default: '' },
    password: { type: String, required: true },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessZone' },
    region: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRegion' },
    msilPersons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MsilAccess' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dealerAccessCredentialSchema.index({ mailId: 1 }, { sparse: true });

module.exports = mongoose.model('DealerAccessCredential', dealerAccessCredentialSchema);
