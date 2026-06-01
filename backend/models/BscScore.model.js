const mongoose = require('mongoose');

const bscParameterSchema = new mongoose.Schema({
  sNo: { type: Number, required: true },
  parameter: { type: String, required: true },
  accessConditionMet: { type: String }, // e.g. "Y I N I N (Q1 I Q2 I Q3)"
  earlyBird: {
    maxPoints: { type: Number, default: 0 },
    minPoints: { type: Number, default: 0 },
    minArchived: { type: Number, default: 0 },
    achieved: { type: Number, default: 0 },
  },
  fullYear: {
    maxPoints: { type: Number, default: 0 },
    minPoints: { type: Number, default: 0 },
    minArchived: { type: Number, default: 0 },
    achieved: { type: Number, default: 0 },
  },
});

const businessAreaSchema = new mongoose.Schema({
  areaName: { type: String, required: true },
  parameters: [bscParameterSchema],
  earlyBirdTotal: { type: Number, default: 0 },
  fullYearTotal: { type: Number, default: 0 },
});

const bscScoreSchema = new mongoose.Schema(
  {
    dealerCode: {
      type: String,
      required: true,
      ref: 'User',
    },
    dealerName: { type: String, required: true },
    region: { type: String, required: true },
    fiscalYear: { type: String, required: true }, // e.g. "FY 25-26"
    month: { type: String, required: true }, // e.g. "Dec'25"
    provisionalType: {
      type: String,
      enum: ['provisional', 'final'],
      default: 'provisional',
    },

    // Summary scores
    earlyBird: {
      provisionalScore: { type: String }, // e.g. "601/960"
      provisionalScorePercent: { type: String },
      qualification: { type: String, enum: ['Y', 'N'], default: 'N' },
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
      band: {
        type: String,
        enum: ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'NO BAND', ''],
        default: '',
      },
    },

    // Detailed breakdown
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

// Compound index for fast lookups
bscScoreSchema.index({ dealerCode: 1, fiscalYear: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('BscScore', bscScoreSchema);
