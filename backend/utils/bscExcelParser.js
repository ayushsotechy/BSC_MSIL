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

const metric = (maxPoints, minPoints, achieved = 0) => ({
  maxPoints,
  minPoints,
  achieved,
});

const parameter = (sNo, text, earlyBird, fullYear, options = {}) => ({
  sNo,
  parameter: text,
  accessConditionMet: '',
  earlyBird,
  fullYear,
  excludeFromTotals: Boolean(options.excludeFromTotals),
});

const area = (areaName, parameters) => ({
  areaName,
  parameters,
  earlyBirdTotal: 0,
  fullYearTotal: 0,
});

const createBaseScore = ({ dealerCode, dealerName, region, fiscalYear, month }) => ({
  dealerCode,
  dealerName,
  region,
  fiscalYear: fiscalYear || 'FY 26-27',
  month: month || "Apr'26",
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
    area('Sales & Marketing Performance', [
      parameter(1, 'All Models Wholesales Performance', metric(40, 0), metric(40, 0)),
      parameter(2, 'ARENA SUV Models Wholesales Performance', metric(60, 0), metric(60, 0)),
      parameter(3, 'ARENA Models New Car VAHAN Registration', metric(100, 0), metric(100, 0)),
      parameter(4, 'Maruti Suzuki Smart Finance', metric(20, 0), metric(20, 0)),
      parameter(5, 'Maruti Suzuki Rewards Enrolment', metric(10, 0), metric(10, 0)),
    ]),
    area('Sales Quality Performance', [
      parameter(6, 'Net Promoter Score - ARENA', metric(40, 0), metric(40, 0)),
    ]),
    area('Service Performance', [
      parameter(7, 'Service to Sales Ratio', metric(60, -30), metric(60, -30)),
      parameter(8, 'Extended Warranty Penetration', metric(60, -20), metric(60, -20)),
      parameter(9, 'Customer Convenience Package Penetration', metric(35, -20), metric(35, -20)),
    ]),
    area('Service Quality Performance', [
      parameter(10, 'Net Promoter Score - Service & Bodyshop', metric(40, -20), metric(40, -20)),
      parameter(11, 'Customer Complaint Index - Service', metric(30, -10), metric(30, -10)),
      parameter(12, 'Service Manpower Certification', metric(30, 0), metric(30, 0)),
    ]),
    area('Parts and Accessories Performance', [
      parameter(13, 'MSGP Performance', metric(65, -15), metric(65, -15)),
      parameter(14, 'MSGA Performance', metric(85, -10), metric(85, -10)),
    ]),
    area('True Value Performance', [
      parameter('15a', 'TV Business Performance - Exchange Growth', metric(60, 0), metric(60, 0)),
      parameter('15b', 'TV Business Performance - Purchase Cycle Management', metric(40, 0), metric(40, 0)),
      parameter(16, 'Net Promoter Score - True Value', metric(10, 0), metric(10, 0)),
      parameter(17, 'End of Life Vehicle Scrap Penetration (Bonus Parameter)', metric(0, 0), metric(40, 0), { excludeFromTotals: true }),
    ]),
    area('Dealer Infrastructure', [
      parameter(18, 'Charging Infrastructure - ARENA (Bonus Parameter)', metric(0, 0), metric(30, 0), { excludeFromTotals: true }),
      parameter(19, 'Maruti Suzuki Driving School', metric(0, -10), metric(0, -10)),
    ]),
  ],
});

const PARAMETER_COLUMNS = [
  { area: 'Sales & Marketing Performance', parameter: 'All Models Wholesales Performance', columns: ['All Models Wholesales Performance', 'All Models Wholesale Performance', 'All Models Wholsales Performance'] },
  { area: 'Sales & Marketing Performance', parameter: 'ARENA SUV Models Wholesales Performance', columns: ['ARENA SUV Models Wholesales Performance', 'ARENA SUV Models Wholesale Performance', 'SUV Models Wholesales Performance'] },
  { area: 'Sales & Marketing Performance', parameter: 'ARENA Models New Car VAHAN Registration', columns: ['ARENA Models New Car VAHAN Registration', 'New Car VAHAN Registration', 'VAHAN Registration'] },
  { area: 'Sales & Marketing Performance', parameter: 'Maruti Suzuki Smart Finance', columns: ['Maruti Suzuki Smart Finance', 'Smart Finance'] },
  { area: 'Sales & Marketing Performance', parameter: 'Maruti Suzuki Rewards Enrolment', columns: ['Maruti Suzuki Rewards Enrolment', 'Maruti Suzuki Rewards Enrollment', 'Rewards Enrolment'] },

  { area: 'Sales Quality Performance', parameter: 'Net Promoter Score - ARENA', columns: ['NPS', 'Net Promoter Score', 'Net Promoter Score ARENA'] },

  { area: 'Service Performance', parameter: 'Service to Sales Ratio', columns: ['Service to Sales Ratio'] },
  { area: 'Service Performance', parameter: 'Extended Warranty Penetration', columns: ['Extended Warranty Penetration'] },
  { area: 'Service Performance', parameter: 'Customer Convenience Package Penetration', columns: ['Customer Convenience Package Penetration', 'Customer Convenience Package'] },

  { area: 'Service Quality Performance', parameter: 'Net Promoter Score - Service & Bodyshop', columns: ['Net Promoter Score - Workshop & Bodyshop', 'Net Promoter Score - Service & Bodyshop'] },
  { area: 'Service Quality Performance', parameter: 'Customer Complaint Index - Service', columns: ['Customer Complaint Index - Service', 'Customer Complaint Index (Service)', 'Customer Complaint Index'] },
  { area: 'Service Quality Performance', parameter: 'Service Manpower Certification', columns: ['Service Manpower Certification', 'SSQS Certified Service Manpower', 'Certified Service Manpower', 'Service Certified Manpower'] },

  { area: 'Parts and Accessories Performance', parameter: 'MSGP Performance', columns: ['MSGP Performance'] },
  { area: 'Parts and Accessories Performance', parameter: 'MSGA Performance', columns: ['MSGA Performance'] },

  { area: 'True Value Performance', parameter: 'TV Business Performance - Exchange Growth', columns: ['TV Business Performance - Exchange Growth', 'True Value Exch. Growth', 'Exchange Growth', 'Exch. Growth', 'TV Exchange Growth'] },
  { area: 'True Value Performance', parameter: 'TV Business Performance - Purchase Cycle Management', columns: ['TV Business Performance - Purchase Cycle Management', 'Purchase Cycle Management', 'POC Sales Growth'] },
{
  area: 'True Value Performance',
  parameter: 'Net Promoter Score - True Value',
  columns: [
    'NPS True Value',
    'NPS - True Value',
    'Net Promoter Score - True Value',
  ],
},
  { area: 'True Value Performance', parameter: 'End of Life Vehicle Scrap Penetration (Bonus Parameter)', columns: ['POC ELV Scrap Penetration', 'ELV Penetration', 'ELV Scrap Penetration'] },

  { area: 'Dealer Infrastructure', parameter: 'Charging Infrastructure - ARENA (Bonus Parameter)', columns: ['Charging Infrastructure - ARENA', 'Charging Infrastructure'] },
  { area: 'Dealer Infrastructure', parameter: 'Maruti Suzuki Driving School', columns: ['Maruti Suzuki Driving School', 'Driving School'] },
];

const EARLY_BIRD_TOTAL_COLUMNS = [
  { area: 'Sales & Marketing Performance', columns: ['Sales & Marketing Performance', 'Sales and Marketing Performance', 'Sales Performance'] },
  { area: 'Sales Quality Performance', columns: ['Sales Quality Performance'] },
  { area: 'Service Performance', columns: ['Service Performance'] },
  { area: 'Service Quality Performance', columns: ['Service Quality Performance'] },
  { area: 'Parts and Accessories Performance', columns: ['Parts & Accessories Performance', 'Parts and Accessories Performance'] },
  { area: 'True Value Performance', columns: ['True Value Performance'] },
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
    if (param?.excludeFromTotals) return sum;
    return sum + toNumber(param?.[period]?.achieved);
  }, 0);

const calculateAreaMetricTotal = (area, period, key) =>
  (area.parameters || []).reduce((sum, param) => {
    if (param?.excludeFromTotals) return sum;
    return sum + toNumber(param?.[period]?.[key]);
  }, 0);

const calculateGrandMetricTotal = (score, period, key) =>
  score.businessAreas.reduce(
    (sum, area) => sum + calculateAreaMetricTotal(area, period, key),
    0
  );

const applyFullYearTotals = (score) => {
  score.businessAreas = score.businessAreas.map((area) => ({
    ...area,
    fullYearTotal: calculateAreaTotal(area, 'fullYear'),
  }));

  const grandTotal = score.businessAreas.reduce(
    (sum, area) => sum + toNumber(area.fullYearTotal),
    0
  );
  const maxTotal = calculateGrandMetricTotal(score, 'fullYear', 'maxPoints');

  score.fullYear = {
    ...(score.fullYear || {}),
    provisionalScore: `${grandTotal}/${maxTotal}`,
    provisionalScorePercent: maxTotal ? `${Math.round((grandTotal / maxTotal) * 100)}%` : '0%',
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

  score.businessAreas = score.businessAreas.map((area) => ({
    ...area,
    earlyBirdTotal: calculateAreaTotal(area, 'earlyBird'),
  }));

  const grandTotal = score.businessAreas.reduce(
    (sum, area) => sum + toNumber(area.earlyBirdTotal),
    0
  );
  const maxTotal = calculateGrandMetricTotal(score, 'earlyBird', 'maxPoints');

  score.earlyBird = {
    ...(score.earlyBird || {}),
    provisionalScore: `${grandTotal}/${maxTotal}`,
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
