const XLSX = require('xlsx');
const BscScore = require('../models/BscScore.model');
const { parseBscWorkbookWithMetadata } = require('../utils/bscExcelParser');

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

const metricTotal = (area, period, key = 'achieved') => {
  const total = area?.[`${period}Total`];
  if (total && typeof total === 'object') return toNumber(metricValue(total, key));
  if (key === 'achieved' && total !== undefined && total !== null && total !== '') {
    return toNumber(total);
  }

  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + (param?.excludeFromTotals ? 0 : toNumber(metricValue(param?.[period], key))),
      0
    );
  }

  return 0;
};

const normalizeTotalMetric = (area, period) => ({
  maxPoints: metricTotal(area, period, 'maxPoints'),
  minPoints: metricTotal(area, period, 'minPoints'),
  achieved: metricTotal(area, period, 'achieved'),
});

const getBand = (score) => score?.fullYear?.band || score?.earlyBird?.band || 'NO BAND';

const getYearScore = (score) => score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '';

const parseFiscalYearNumber = (fiscalYear) => {
  const text = String(fiscalYear || '').trim();
  const fullYearMatch = text.match(/\b(20\d{2})\b/);
  if (fullYearMatch) return Number(fullYearMatch[1]);

  const fyMatch = text.match(/fy\s*(\d{2})\s*[-/]\s*(\d{2})/i);
  if (fyMatch) return 2000 + Number(fyMatch[2]);

  return null;
};

const getPreviousFiscalYearCandidates = (fiscalYear) => {
  const yearNumber = parseFiscalYearNumber(fiscalYear);
  if (!yearNumber) return [];

  const previousYear = yearNumber - 1;
  const previousShort = String(previousYear).slice(-2);
  const currentShort = String(yearNumber).slice(-2);

  return [
    String(previousYear),
    `FY ${previousShort}-${currentShort}`,
    `FY${previousShort}-${currentShort}`,
  ];
};

const findPreviousYearBand = async ({ dealerCode, fiscalYear, excludeId }) => {
  const previousFiscalYears = getPreviousFiscalYearCandidates(fiscalYear);
  if (!dealerCode || !previousFiscalYears.length) return 'N/A';

  const query = {
    dealerCode,
    fiscalYear: { $in: previousFiscalYears },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const previousScore = await BscScore.findOne(query).sort({ createdAt: -1 });
  return previousScore ? getBand(previousScore) : 'N/A';
};

const withScoreMetadata = async (payload, options = {}) => ({
  ...payload,
  previousYearBand: payload.previousYearBand && payload.previousYearBand !== 'N/A'
    ? payload.previousYearBand
    : options.skipPreviousLookup
      ? 'N/A'
    : await findPreviousYearBand({
      dealerCode: payload.dealerCode,
      fiscalYear: payload.fiscalYear,
      excludeId: options.excludeId,
    }),
  currentYearBand: payload.currentYearBand || getBand(payload),
  yearScore: payload.yearScore || getYearScore(payload),
});

const normalizeBscPayload = (payload) => {
  const normalized = {
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
      total: payload?.earlyBird?.total,
      band: payload?.earlyBird?.band || '',
    },
    fullYear: {
      provisionalScore: payload?.fullYear?.provisionalScore || '',
      provisionalScorePercent: payload?.fullYear?.provisionalScorePercent || '',
      qualification: payload?.fullYear?.qualification || 'N',
      total: payload?.fullYear?.total,
      band: payload?.fullYear?.band || '',
    },
    businessAreas: (payload?.businessAreas || []).map((area) => ({
      areaName: area?.areaName || '',
      earlyBirdTotal: normalizeTotalMetric(area, 'earlyBird'),
      fullYearTotal: normalizeTotalMetric(area, 'fullYear'),
      parameters: (area?.parameters || []).map((param) => ({
        sNo: param?.sNo,
        parameter: param?.parameter || param?.name || '',
        accessConditionMet: param?.accessConditionMet || param?.condition || '',
        excludeFromTotals: Boolean(param?.excludeFromTotals),
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
  };

  normalized.previousYearBand = payload?.previousYearBand || '';
  normalized.currentYearBand = payload?.currentYearBand || getBand(normalized);
  normalized.yearScore = payload?.yearScore || getYearScore(normalized);

  return normalized;
};

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

    const shouldReturnSummary = ['1', 'true', 'yes'].includes(String(req.query.summary || '').toLowerCase());
    const scoreQuery = BscScore.find(query).sort({ createdAt: -1 });
    if (shouldReturnSummary) {
      scoreQuery.select('-businessAreas');
    }

    const scores = await scoreQuery;

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
      ['Business Area', 'S.No.', 'Parameter', 'EARLY BIRD EVALUATION', '', '', 'FULL YEAR EVALUATION', '', ''],
      ['', '', '', 'Max Points', 'Min Points', 'Points Achieved', 'Max Points', 'Min Points', 'Points Achieved'],
    ];

    const detailRows = [];
    score.businessAreas.forEach((area) => {
      area.parameters.forEach((param, idx) => {
        detailRows.push([
          idx === 0 ? area.areaName : '',
          param.sNo,
          param.parameter,
          param.earlyBird.maxPoints,
          param.earlyBird.minPoints,
          param.earlyBird.achieved,
          param.fullYear.maxPoints,
          param.fullYear.minPoints,
          param.fullYear.achieved,
        ]);
      });
      detailRows.push([
        `${area.areaName} Total`,
        '',
        '',
        metricTotal(area, 'earlyBird', 'maxPoints'),
        metricTotal(area, 'earlyBird', 'minPoints'),
        metricTotal(area, 'earlyBird', 'achieved'),
        metricTotal(area, 'fullYear', 'maxPoints'),
        metricTotal(area, 'fullYear', 'minPoints'),
        metricTotal(area, 'fullYear', 'achieved'),
      ]);
      detailRows.push([]); 
    });

    const ws2 = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
    ws2['!cols'] = [
      { wch: 25 }, { wch: 6 }, { wch: 45 },
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
    const payload = await withScoreMetadata(normalizeBscPayload(req.body));
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
    const payload = await withScoreMetadata(normalizeBscPayload(req.body), {
      excludeId: req.params.id,
    });

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
const uploadBscExcel = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'Please upload an Excel file.' });
    }

    const { fiscalYear, month } = req.body;

    const parsed = parseBscWorkbookWithMetadata(req.file.buffer, {
      fiscalYear,
      month,
    });
    const scores = parsed.scores || [];

    if (!scores.length) {
      return res.status(400).json({ message: 'No valid dealer rows found in Excel.' });
    }

    const enrichedScores = await Promise.all(
      scores.map((score) => withScoreMetadata(normalizeBscPayload(score), { skipPreviousLookup: true }))
    );

    res.json({
      success: true,
      message: 'Excel parsed successfully.',
      count: enrichedScores.length,
      data: enrichedScores,
      accessCredentials: parsed.accessCredentials || [],
    });
  } catch (error) {
    next(error);
  }
};
const bulkSaveBscScores = async (req, res, next) => {
  try {
    const scores = req.body?.scores || [];
    const shouldUpsert = req.body?.upsert !== false;

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ message: 'No scorecards received for saving.' });
    }

    const payloads = await Promise.all(
      scores.map((rawScore) => withScoreMetadata(normalizeBscPayload(rawScore), { skipPreviousLookup: true }))
    );
    const operations = payloads
      .filter((payload) => payload.dealerCode && payload.fiscalYear && payload.month)
      .map((payload) => ({
        updateOne: {
          filter: {
            dealerCode: payload.dealerCode,
            fiscalYear: payload.fiscalYear,
            month: payload.month,
          },
          update: { $set: payload },
          upsert: shouldUpsert,
        },
      }));

    if (!operations.length) {
      return res.status(400).json({ message: 'No valid scorecards received for saving.' });
    }

    const result = await BscScore.bulkWrite(operations, { ordered: false });
    const savedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    const matchedCount = result.matchedCount || 0;
    const skippedCount = shouldUpsert ? 0 : Math.max(0, operations.length - savedCount);

    res.json({
      success: true,
      message: `${savedCount} scorecards saved successfully.`,
      count: savedCount,
      matchedCount,
      upsertedCount: result.upsertedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      skippedCount,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getBscScore,
  getBscScoreById,
  downloadScoreSheet,
  createBscScore,
  updateBscScore,
  uploadBscExcel,
  bulkSaveBscScores,
};
