const mongoose = require('mongoose');

const bscParameterSchema = new mongoose.Schema({
  sNo: { type: mongoose.Schema.Types.Mixed, required: true }, // Changed to Mixed to support '14a', '14b'
  parameter: { type: String, required: true },
  accessConditionMet: { type: String }, 
  excludeFromTotals: { type: Boolean, default: false },
  earlyBird: {
    maxPoints: { type: Number, default: 0 },
    minPoints: { type: Number, default: 0 },
    minArchived: { type: Number, default: 0 },
    achieved: { type: Number, default: 0 }, // <-- Editable
  },
  fullYear: {
    maxPoints: { type: Number, default: 0 },
    minPoints: { type: Number, default: 0 },
    minArchived: { type: Number, default: 0 },
    achieved: { type: Number, default: 0 }, // <-- Editable
  },
}, { _id: false }); // Prevents Mongoose from creating an _id for every single parameter

const businessAreaSchema = new mongoose.Schema({
  areaName: { type: String, required: true },
  parameters: [bscParameterSchema],
  earlyBirdTotal: { type: mongoose.Schema.Types.Mixed, default: 0 },
  fullYearTotal: { type: mongoose.Schema.Types.Mixed, default: 0 },
}, { _id: false });

const bscScoreSchema = new mongoose.Schema(
  {
    dealerCode: {
      type: String,
      required: true,
      ref: 'User',
    },
    dealerName: { type: String, required: true }, // Editable
    region: { type: String, required: true },     // Editable
    fiscalYear: { type: String, required: true }, 
    month: { type: String, required: true }, 
    previousYearBand: { type: String, default: 'N/A' },
    currentYearBand: { type: String, default: '' },
    yearScore: { type: String, default: '' },
    provisionalType: {
      type: String,
      enum: ['provisional', 'final'],
      default: 'provisional',
    },

    earlyBird: {
      provisionalScore: { type: String }, 
      provisionalScorePercent: { type: String },
      qualification: { type: String, enum: ['Y', 'N'], default: 'N' },
      total: { type: mongoose.Schema.Types.Mixed, default: undefined },
      band: {
        type: String,
        enum: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'NO BAND', ''],
        default: '',
      },
    },
    fullYear: {
      provisionalScore: { type: String },
      provisionalScorePercent: { type: String },
      qualification: { type: String, enum: ['Y', 'N'], default: 'N' },
      total: { type: mongoose.Schema.Types.Mixed, default: undefined },
      band: {
        type: String,
        enum: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'NO BAND', ''],
        default: '',
      },
    },

    businessAreas: [businessAreaSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

bscScoreSchema.index({ dealerCode: 1, fiscalYear: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('BscScore', bscScoreSchema);
