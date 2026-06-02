const XLSX = require('xlsx');

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace('%', '').trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
};

const getCell = (row, possibleNames) => {
  const keys = Object.keys(row || {});

  // Exact match first
  const exactKey = keys.find((key) =>
    possibleNames.some(
      (name) => normalize(key) === normalize(name)
    )
  );

  if (exactKey) {
    return row[exactKey];
  }

  // Then partial match
  const partialKey = keys.find((key) => {
    const normalizedKey = normalize(key);

    return possibleNames.some((name) => {
      const normalizedName = normalize(name);

      return (
        normalizedKey.includes(normalizedName) ||
        normalizedName.includes(normalizedKey)
      );
    });
  });

  return partialKey ? row[partialKey] : undefined;
};
const createBaseScore = ({ dealerCode, dealerName, region, fiscalYear, month }) => ({
  dealerCode,
  dealerName,
  region,
  fiscalYear: fiscalYear || 'FY 25-26',
  month: month || "Dec'25",
  provisionalType: 'provisional',

  earlyBird: {
    provisionalScore: '',
    provisionalScorePercent: '',
    qualification: 'N',
    band: 'NO BAND',
  },

  fullYear: {
    provisionalScore: '',
    provisionalScorePercent: '',
    qualification: 'N',
    band: 'NO BAND',
  },

  businessAreas: [
    {
      areaName: 'Sales Performance',
      parameters: [
        {
          sNo: 1,
          parameter: 'All Models Wholesale Performance',
          accessConditionMet: 'N I Y I N\n(Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 100, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 2,
          parameter: 'ARENA Models New Car VAHAN Registration',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 100, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 100, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 3,
          parameter: 'Maruti Suzuki Smart Finance',
          accessConditionMet: 'N',
          earlyBird: { maxPoints: 20, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 20, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Sales Quality Performance',
      parameters: [
        {
          sNo: 4,
          parameter: 'Net Promoter Score - ARENA',
          accessConditionMet: '7\n(No of Months Achieved)',
          earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 5,
          parameter: 'ARENA Channel Sales Manpower Certification',
          accessConditionMet: '3\n(No. of Qtrs Achieved)',
          earlyBird: { maxPoints: 100, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 100, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Service Performance',
      parameters: [
        {
          sNo: 6,
          parameter: 'Service to Sales Ratio',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 60, minPoints: -30, achieved: 0 },
          fullYear: { maxPoints: 60, minPoints: -30, achieved: 0 },
        },
        {
          sNo: 7,
          parameter: 'Extended Warranty Penetration',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 50, minPoints: -30, achieved: 0 },
          fullYear: { maxPoints: 50, minPoints: -30, achieved: 0 },
        },
        {
          sNo: 8,
          parameter: 'Customer Convenience Package',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 30, minPoints: -20, achieved: 0 },
          fullYear: { maxPoints: 30, minPoints: -20, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Service Quality Performance',
      parameters: [
        {
          sNo: 9,
          parameter: 'Net Promoter Score - Service & Bodyshop',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 50, minPoints: -20, achieved: 0 },
          fullYear: { maxPoints: 50, minPoints: -20, achieved: 0 },
        },
        {
          sNo: 10,
          parameter: 'Customer Complaint Index (Service)',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 40, minPoints: -20, achieved: 0 },
          fullYear: { maxPoints: 40, minPoints: -20, achieved: 0 },
        },
        {
          sNo: 11,
          parameter: 'SSQS Certified Service Manpower',
          accessConditionMet: 'Y',
          earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 12,
          parameter: 'Service Infrastructure',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Parts and Accessories Performance',
      parameters: [
        {
          sNo: 13,
          parameter: 'MSGP Performance',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 60, minPoints: -10, achieved: 0 },
          fullYear: { maxPoints: 60, minPoints: -10, achieved: 0 },
        },
        {
          sNo: '14a',
          parameter: 'MSGA Performance - Showroom Acc / Veh',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
        {
          sNo: '14b',
          parameter: 'MSGA Performance - Tyre & Battery',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
        {
          sNo: '14c',
          parameter: 'MSGA Performance - Smart EMI Penetration',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
        {
          sNo: '14d',
          parameter: 'MSGA Performance - Seat Cover & Mat',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'True Value Performance',
      parameters: [
        {
          sNo: '14a',
          parameter: 'TV Business Performance - Exchange Growth',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 80, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 80, minPoints: 0, achieved: 0 },
        },
        {
          sNo: '14b',
          parameter: 'TV Business Performance - POC Sales Growth',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 30, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 30, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 15,
          parameter: 'Net Promoter Score - True Value',
          accessConditionMet: 'N',
          earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 16,
          parameter: 'POC Manpower Certification',
          accessConditionMet: 'Y | Y | Y\n(Q1 | Q2 | Q3)',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
        {
          sNo: 17,
          parameter: 'End of Life Vehicle Scrap Penetration (Bonus Parameter)',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 25, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Dealer Financials',
      parameters: [
        {
          sNo: '18a',
          parameter: 'Working Capital Diversion & inadequacy',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: -50, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: -75, achieved: 0 },
        },
        {
          sNo: '18b',
          parameter: 'Dealer Financial Ratio',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
    {
      areaName: 'Dealer Infrastructure',
      parameters: [
        {
          sNo: 19,
          parameter: 'Upgradation of Old CI Outlets',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: -40, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: -40, achieved: 0 },
        },
        {
          sNo: 20,
          parameter: 'Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 20, minPoints: -40, achieved: 0 },
          fullYear: { maxPoints: 20, minPoints: -40, achieved: 0 },
        },
        {
          sNo: 21,
          parameter: 'Adequate Insurance Coverage & Preventive Safety Audit',
          accessConditionMet: 'NA',
          earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
          fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
        },
      ],
      earlyBirdTotal: 0,
      fullYearTotal: 0,
    },
  ],
});

const PARAMETER_COLUMNS = [
  { area: 'Sales Performance', parameter: 'All Models Wholesale Performance', columns: ['All Models Wholesale Performance', 'All Models Wholsales Performance'] },
  { area: 'Sales Performance', parameter: 'ARENA Models New Car VAHAN Registration', columns: ['New Car VAHAN Registration', 'VAHAN Registration'] },
  { area: 'Sales Performance', parameter: 'Maruti Suzuki Smart Finance', columns: ['Maruti Suzuki Smart Finance', 'Smart Finance'] },

  { area: 'Sales Quality Performance', parameter: 'Net Promoter Score - ARENA', columns: ['NPS', 'Net Promoter Score', 'Net Promoter Score ARENA'] },
  { area: 'Sales Quality Performance', parameter: 'ARENA Channel Sales Manpower Certification', columns: ['ARENA Channel Sales Manpower Certification'] },

  { area: 'Service Performance', parameter: 'Service to Sales Ratio', columns: ['Service to Sales Ratio'] },
  { area: 'Service Performance', parameter: 'Extended Warranty Penetration', columns: ['Extended Warranty Penetration'] },
  { area: 'Service Performance', parameter: 'Customer Convenience Package', columns: ['Customer Convenience Package Penetration', 'Customer Convenience Package'] },

  { area: 'Service Quality Performance', parameter: 'Net Promoter Score - Service & Bodyshop', columns: ['Net Promoter Score - Workshop & Bodyshop', 'Net Promoter Score - Service & Bodyshop'] },
  { area: 'Service Quality Performance', parameter: 'Customer Complaint Index (Service)', columns: ['Customer Complaint Index - Service', 'Customer Complaint Index (Service)', 'Customer Complaint Index'] },
  { area: 'Service Quality Performance', parameter: 'SSQS Certified Service Manpower', columns: ['SSQS Certified Service Manpower', 'Customer SSQs', 'Certified Service Manpower', 'Service Certified Manpower'] },
  { area: 'Service Quality Performance', parameter: 'Service Infrastructure', columns: ['Service Infrastructure'] },

  { area: 'Parts and Accessories Performance', parameter: 'MSGP Performance', columns: ['MSGP Performance'] },
  { area: 'Parts and Accessories Performance', parameter: 'MSGA Performance - Showroom Acc / Veh', columns: ['MSGA Performance - Showroom Acc / Veh', 'MSGA Showroom Acc/Veh', 'MSGA Showroom Acc Veh', 'Showroom Acc / Veh', 'Showroom Acc Veh'] },
  { area: 'Parts and Accessories Performance', parameter: 'MSGA Performance - Tyre & Battery', columns: ['MSGA Performance - Tyre & Battery', 'MSGA Tyre & Battery', 'Tyre & Battery'] },
  { area: 'Parts and Accessories Performance', parameter: 'MSGA Performance - Smart EMI Penetration', columns: ['MSGA Performance - Smart EMI Penetration', 'MSGA Smart EMI Penetration', 'Smart EMI Penetration'] },
  { area: 'Parts and Accessories Performance', parameter: 'MSGA Performance - Seat Cover & Mat', columns: ['MSGA Performance - Seat Cover & Mat', 'MSGA Seat Cover & Mat', 'Seat Cover & Mat'] },

  { area: 'True Value Performance', parameter: 'TV Business Performance - Exchange Growth', columns: ['True Value Exch. Growth', 'Exchange Growth', 'Exch. Growth', 'TV Exchange Growth'] },
  { area: 'True Value Performance', parameter: 'TV Business Performance - POC Sales Growth', columns: ['POC Sales Growth'] },
{
  area: 'True Value Performance',
  parameter: 'Net Promoter Score - True Value',
  columns: [
    'NPS True Value',
    'NPS - True Value',
    'Net Promoter Score - True Value',
  ],
},  { area: 'True Value Performance', parameter: 'POC Manpower Certification', columns: ['POC Manpower Certification', 'POC Manpower Certificati on'] },
  { area: 'True Value Performance', parameter: 'End of Life Vehicle Scrap Penetration (Bonus Parameter)', columns: ['POC ELV Scrap Penetration', 'ELV Penetration', 'ELV Scrap Penetration'] },

  { area: 'Dealer Financials', parameter: 'Working Capital Diversion & inadequacy', columns: ['Working Capital Diversion & Inadequacy', 'Working Capital Diversion and Inadequacy'] },
  { area: 'Dealer Financials', parameter: 'Dealer Financial Ratio', columns: ['Dealer Financial Ratio'] },

  { area: 'Dealer Infrastructure', parameter: 'Upgradation of Old CI Outlets', columns: ['ARENA & TV Infrastructure Upgradation', 'Infrastructure Upgradation', 'Upgradation'] },
  { area: 'Dealer Infrastructure', parameter: 'Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets', columns: ['ARENA & TV Infrastructure - Quarterly Maintenance', 'Quarterly Maintenance', 'ARENA TV Quarterly Maintenance'] },
  { area: 'Dealer Infrastructure', parameter: 'Adequate Insurance Coverage & Preventive Safety Audit', columns: ['Adequate Insurance Coverage & Preventive Safety Audit', 'Adequate Insurance Coverage', 'Preventive Safety Audit'] },
];

const EARLY_BIRD_TOTAL_COLUMNS = [
  { area: 'Sales Performance', columns: ['Sales Performance'] },
  { area: 'Sales Quality Performance', columns: ['Sales Quality Performance'] },
  { area: 'Service Performance', columns: ['Service Performance'] },
  { area: 'Service Quality Performance', columns: ['Service Quality Performance'] },
  { area: 'Parts and Accessories Performance', columns: ['Parts & Accessories Performance', 'Parts and Accessories Performance'] },
  { area: 'True Value Performance', columns: ['True Value Performance'] },
  { area: 'Dealer Financials', columns: ['Dealer Financials'] },
  { area: 'Dealer Infrastructure', columns: ['Dealer Infrastructure'] },
];

const getSheetRows = (workbook, sheetNames) => {
  const sheetName = workbook.SheetNames.find((name) =>
    sheetNames.some((expected) => normalize(name) === normalize(expected))
  );

  if (!sheetName) return [];

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
  });
};

const findArea = (score, areaName) =>
  score.businessAreas.find((area) => normalize(area.areaName) === normalize(areaName));

const findParam = (area, parameterName) =>
  area?.parameters?.find((param) => normalize(param.parameter) === normalize(parameterName));

const applyParameterValues = (score, row, period) => {
  PARAMETER_COLUMNS.forEach((mapping) => {
    const value = getCell(row, mapping.columns);
    if (value === undefined || value === '') return;

    const area = findArea(score, mapping.area);
    const param = findParam(area, mapping.parameter);

    if (!area) {
      console.log(`[AREA NOT FOUND ${period}]`, mapping.area);
      return;
    }

    if (!param) {
      console.log(`[PARAM NOT FOUND ${period}]`, mapping.parameter);
      return;
    }

    param[period] = {
      ...(param[period] || {}),
      achieved: toNumber(value),
    };
  });
};

const calculateAreaTotal = (area, period) =>
  (area.parameters || []).reduce((sum, param) => {
    return sum + toNumber(param?.[period]?.achieved);
  }, 0);

const applyFullYearTotals = (score) => {
  score.businessAreas = score.businessAreas.map((area) => ({
    ...area,
    fullYearTotal: calculateAreaTotal(area, 'fullYear'),
  }));

  const grandTotal = score.businessAreas.reduce(
    (sum, area) => sum + toNumber(area.fullYearTotal),
    0
  );

  score.fullYear = {
    ...(score.fullYear || {}),
    provisionalScore: String(grandTotal),
    provisionalScorePercent: '',
    qualification: 'N',
    band: 'NO BAND',
  };
};

const applyEarlyBirdTotals = (score, row) => {
  EARLY_BIRD_TOTAL_COLUMNS.forEach((mapping) => {
    const area = findArea(score, mapping.area);
    if (!area) return;

    const value = getCell(row, mapping.columns);
    if (value !== undefined && value !== '') {
      area.earlyBirdTotal = toNumber(value);
    }
  });

  const grandTotal = score.businessAreas.reduce(
    (sum, area) => sum + toNumber(area.earlyBirdTotal),
    0
  );

  score.earlyBird = {
    ...(score.earlyBird || {}),
    provisionalScore: String(grandTotal),
    provisionalScorePercent: String(
      getCell(row, [
        'Full Year Provisional Score Achievement',
        'Early Bird Provisional Score Achievement',
        'Early Bird Score Achievement',
      ]) || ''
    ),
    qualification: String(
      getCell(row, ['Early Year Band Qualification', 'Early Bird Qualification']) || 'N'
    ).trim(),
    band: String(
      getCell(row, ['Early Year Band', 'Early Bird Band']) || 'NO BAND'
    ).trim(),
  };
};

const getDealerCode = (row, fallbackIndex) =>
  String(
    getCell(row, [
      'BSC Parent Dealer Code',
      'Parent Dealer Code',
      'Dealer Code',
      'Code',
    ]) || `DEALER-${fallbackIndex + 1}`
  ).trim();

const getDealerName = (row) =>
  String(getCell(row, ['Dealer Name', 'Dealer']) || '').trim();

const getRegion = (row) =>
  String(getCell(row, ['Region']) || '').trim();

const mergeByDealerCode = ({ earlyBirdRows, fullYearRows, fiscalYear, month }) => {
  const scoreMap = new Map();

  fullYearRows.forEach((row, index) => {
    const dealerCode = getDealerCode(row, index);
    if (!dealerCode) return;

    const score = createBaseScore({
      dealerCode,
      dealerName: getDealerName(row),
      region: getRegion(row),
      fiscalYear,
      month,
    });

    applyParameterValues(score, row, 'fullYear');
    applyFullYearTotals(score);

    scoreMap.set(dealerCode, score);
  });

  earlyBirdRows.forEach((row, index) => {
    const dealerCode = getDealerCode(row, index);
    if (!dealerCode) return;

    const existing =
      scoreMap.get(dealerCode) ||
      createBaseScore({
        dealerCode,
        dealerName: getDealerName(row),
        region: getRegion(row),
        fiscalYear,
        month,
      });

    if (!existing.dealerName) existing.dealerName = getDealerName(row);
    if (!existing.region) existing.region = getRegion(row);

    applyParameterValues(existing, row, 'earlyBird');
    applyEarlyBirdTotals(existing, row);

    scoreMap.set(dealerCode, existing);
  });

  return [...scoreMap.values()];
};

const parseBscWorkbook = (buffer, options = {}) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const earlyBirdRows = getSheetRows(workbook, ['Early Bird', 'EarlyBird']);
  const fullYearRows = getSheetRows(workbook, ['Full Year', 'FullYear']);

  console.log('\n========== EXCEL DEBUG ==========');

  console.log('\nEARLY BIRD HEADERS:');
  console.log(Object.keys(earlyBirdRows[0] || {}));

  console.log('\nFULL YEAR HEADERS:');
  console.log(Object.keys(fullYearRows[0] || {}));

  console.log('\nEARLY BIRD ROW COUNT:', earlyBirdRows.length);
  console.log('FULL YEAR ROW COUNT:', fullYearRows.length);

  console.log('=================================\n');

  if (!earlyBirdRows.length && !fullYearRows.length) {
    throw new Error('Excel must contain sheets named "Early Bird" and/or "Full Year".');
  }

  return mergeByDealerCode({
    earlyBirdRows,
    fullYearRows,
    fiscalYear: options.fiscalYear,
    month: options.month,
  });
};

module.exports = {
  parseBscWorkbook,
};