const XLSX = require('xlsx');
const BscScore = require('../models/BscScore.model');

const metricValue = (metric, key) => {
  if (metric && typeof metric === 'object') {
    if (key === 'achieved') return metric.achieved ?? metric.pointsAchieved ?? 0;
    return metric[key] ?? 0;
  }
  return metric ?? 0;
};

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? 0 : numericValue;
};

const normalizeMetric = (metric = {}) => ({
  maxPoints: toNumber(metricValue(metric, 'maxPoints')),
  minPoints: toNumber(metricValue(metric, 'minPoints')),
  achieved: toNumber(metricValue(metric, 'achieved')),
});

const metricTotal = (area, period) => {
  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + toNumber(metricValue(param?.[period], 'achieved')),
      0
    );
  }

  const total = area?.[`${period}Total`];
  if (total && typeof total === 'object') return toNumber(metricValue(total, 'achieved'));
  if (total !== undefined && total !== null) {
    return toNumber(total);
  }

  return 0;
};

const normalizeBscPayload = (payload) => ({
  dealerCode: String(payload?.dealerCode || '').trim(),
  dealerName: String(payload?.dealerName || '').trim(),
  region: String(payload?.region || '').trim(),
  fiscalYear: String(payload?.fiscalYear || '').trim(),
  month: String(payload?.month || '').trim(),
  provisionalType: payload?.provisionalType || 'provisional',
  earlyBird: {
    provisionalScore: payload?.earlyBird?.provisionalScore || '',
    provisionalScorePercent: payload?.earlyBird?.provisionalScorePercent || '',
    qualification: payload?.earlyBird?.qualification || 'N',
    band: payload?.earlyBird?.band || '',
  },
  fullYear: {
    provisionalScore: payload?.fullYear?.provisionalScore || '',
    provisionalScorePercent: payload?.fullYear?.provisionalScorePercent || '',
    qualification: payload?.fullYear?.qualification || 'N',
    band: payload?.fullYear?.band || '',
  },
  businessAreas: (payload?.businessAreas || []).map((area) => ({
    areaName: area?.areaName || '',
    earlyBirdTotal: metricTotal(area, 'earlyBird'),
    fullYearTotal: metricTotal(area, 'fullYear'),
    parameters: (area?.parameters || []).map((param) => ({
      sNo: param?.sNo,
      parameter: param?.parameter || param?.name || '',
      accessConditionMet: param?.accessConditionMet || param?.condition || '',
      earlyBird: normalizeMetric(param?.earlyBird || {
        maxPoints: param?.ebMax,
        minPoints: param?.ebMin,
        achieved: param?.ebAchieved,
      }),
      fullYear: normalizeMetric(param?.fullYear || {
        maxPoints: param?.fyMax,
        minPoints: param?.fyMin,
        achieved: param?.fyAchieved,
      }),
    })),
  })),
});

// @desc    Get BSC score for dealer
// @route   GET /api/bsc/score
// @access  Private (dealer, msil, admin)
const getBscScore = async (req, res, next) => {
  try {
    const { dealerCode, month, fiscalYear } = req.query;

    let query = {};

    // Safely check if req.user exists before checking role
    if (req.user?.role === 'dealer') {
      query.dealerCode = req.user.dealerCode;
    } else if (dealerCode) {
      query.dealerCode = dealerCode;
    }

    if (month) query.month = month;
    if (fiscalYear) query.fiscalYear = fiscalYear;

    const scores = await BscScore.find(query).sort({ createdAt: -1 });

    res.json({ success: true, count: scores.length, data: scores });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single BSC score sheet
// @route   GET /api/bsc/score/:id
// @access  Private
const getBscScoreById = async (req, res, next) => {
  try {
    const score = await BscScore.findById(req.params.id);

    if (!score) {
      return res.status(404).json({ message: 'Score sheet not found' });
    }

    // Safely check req.user
    if (req.user?.role === 'dealer' && score.dealerCode !== req.user.dealerCode) {
      return res.status(403).json({ message: 'Not authorized to view this score sheet' });
    }

    res.json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
};

// @desc    Download BSC Score Sheet as Excel
// @route   GET /api/bsc/score/:id/download
// @access  Private
const downloadScoreSheet = async (req, res, next) => {
  try {
    const score = await BscScore.findById(req.params.id);

    if (!score) {
      return res.status(404).json({ message: 'Score sheet not found' });
    }

    if (req.user?.role === 'dealer' && score.dealerCode !== req.user.dealerCode) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summaryData = [
      [`BSC ${score.fiscalYear} PROVISIONAL SCORE SHEET (Till ${score.month})`],
      [],
      ['Region', score.region],
      ['Dealer Name', score.dealerName],
      [],
      [
        'Early Bird Provisional Score',
        score.earlyBird.provisionalScore,
        'Full Year Provisional Score',
        score.fullYear.provisionalScore,
      ],
      [
        'Early Bird Provisional Qualification',
        score.earlyBird.qualification,
        'Full Year Provisional Score%',
        score.fullYear.provisionalScorePercent,
      ],
      [
        'Early Bird Provisional Band',
        score.earlyBird.band,
        'Full Year Band',
        score.fullYear.band,
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['A1'] = { v: summaryData[0][0], t: 's' };
    ws1['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // ── Sheet 2: Detailed Score ───────────────────────────────────────────────
    const detailHeader = [
      ['Business Area', 'S.No.', 'Parameter', 'Access Condition Met', 'EARLY BIRD EVALUATION', '', '', 'FULL YEAR EVALUATION', '', ''],
      ['', '', '', '', 'Max Points', 'Min Points', 'Min Archived', 'Max Points', 'Min Points', 'Min Archived'],
    ];

    const detailRows = [];
    score.businessAreas.forEach((area) => {
      area.parameters.forEach((param, idx) => {
        detailRows.push([
          idx === 0 ? area.areaName : '',
          param.sNo,
          param.parameter,
          param.accessConditionMet || '',
          param.earlyBird.maxPoints,
          param.earlyBird.minPoints,
          param.earlyBird.minArchived,
          param.fullYear.maxPoints,
          param.fullYear.minPoints,
          param.fullYear.minArchived,
        ]);
      });
      detailRows.push([`${area.areaName} Total`, '', '', '', area.earlyBirdTotal, '', '', area.fullYearTotal, '', '']);
      detailRows.push([]); 
    });

    const ws2 = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
    ws2['!cols'] = [
      { wch: 25 }, { wch: 6 }, { wch: 30 }, { wch: 25 },
      { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Score Sheet');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `BSC_${score.dealerCode}_${score.fiscalYear.replace(' ', '_')}_${score.month}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Create BSC Score (MSIL / Admin)
// @route   POST /api/bsc/score
// @access  Private (msil, admin)
const createBscScore = async (req, res, next) => {
  try {
    const payload = normalizeBscPayload(req.body);
    const score = await BscScore.create({
      ...payload,
      // Temporarily removed until auth is restored
      // createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: score });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A scorecard already exists for this Dealer Code in this period.' });
    }
    console.log("MONGOOSE ERROR:", error.message);
    next(error);
  }
};

const updateBscScore = async (req, res, next) => {
  try {
    const payload = normalizeBscPayload(req.body);

    const score = await BscScore.findByIdAndUpdate(
      req.params.id,
      { 
        $set: payload,
        // Temporarily removed until auth is restored
        // updatedBy: req.user._id 
      },
      { new: true, runValidators: true }
    );

    if (!score) return res.status(404).json({ message: 'Score not found' });
    res.json({ success: true, data: score });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A scorecard already exists for this Dealer Code in this period.' });
    }
    next(error);
  }
};

module.exports = {
  getBscScore,
  getBscScoreById,
  downloadScoreSheet,
  createBscScore,
  updateBscScore,
};
