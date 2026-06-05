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

const AREA_NAMES = [
  'Sales Performance',
  'Sales Quality Performance',
  'Service Performance',
  'Service Quality',
  'Parts & Accessories Performance',
  'True Value',
  'Dealer Financials',
  'Dealer Infrastructure',
];

const getFlatParameters = (score) => score.businessAreas.flatMap((businessArea) => businessArea.parameters);

const col = (columnName) => XLSX.utils.decode_col(columnName);

const getRangeValues = (row, startColumn, endColumn) =>
  row.slice(col(startColumn), col(endColumn) + 1);

const getCellAt = (row, columnName) => row[col(columnName)];

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
    area('Sales Performance', [
      parameter(1, 'All Models Wholesales Performance', metric(40, 0), metric(40, 0)),
      parameter(2, 'ARENA SUV Models Wholesales Performance', metric(60, 0), metric(60, 0)),
      parameter(3, 'ARENA Models New Car VAHAN Registration', metric(100, 0), metric(100, 0)),
      parameter(4, 'Maruti Suzuki Smart Finance', metric(20, 0), metric(20, 0)),
      parameter(5, 'Maruti Suzuki Rewards Enrolment', metric(10, 0), metric(10, 0)),
    ]),
    area('Sales Quality Performance', [
      parameter(6, 'Net Promoter Score - ARENA', metric(40, 0), metric(40, 0)),
      parameter(7, 'ARENA Channel Sales Manpower Certification', metric(0, 0), metric(0, 0)),
    ]),
    area('Service Performance', [
      parameter(8, 'Service to Sales Ratio', metric(60, -30), metric(60, -30)),
      parameter(9, 'Extended Warranty Penetration', metric(60, -20), metric(60, -20)),
      parameter(10, 'Customer Convenience Package Penetration', metric(35, -20), metric(35, -20)),
      parameter(11, 'True Value Vehicle Retention', metric(0, 0), metric(0, 0)),
    ]),
    area('Service Quality', [
      parameter(12, 'Net Promoter Score - Service & Bodyshop', metric(40, -20), metric(40, -20)),
      parameter(13, 'Customer Complaint Index - Service', metric(30, -10), metric(30, -10)),
      parameter(14, 'Service Manpower Certification', metric(30, 0), metric(30, 0)),
      parameter(15, 'Service Infrastructure', metric(0, 0), metric(0, 0)),
    ]),
    area('Parts & Accessories Performance', [
      parameter(16, 'MSGP Performance', metric(65, -15), metric(65, -15)),
      parameter(17, 'MSGA Performance- Showroom Acc / Veh', metric(75, -10), metric(75, -10)),
      parameter(18, 'MSGA Performance - Online Order Conversion', metric(10, 0), metric(10, 0)),
      parameter(19, 'MSGA Performance - Body Coat Penetration', metric(0, 0), metric(0, 0)),
    ]),
    area('True Value', [
      parameter(20, 'Exch. Growth', metric(60, 0), metric(60, 0)),
      parameter(21, 'Purchase Cycle Management', metric(40, 0), metric(40, 0)),
      parameter(22, 'Net Promoter Score - True Value', metric(10, 0), metric(10, 0)),
      parameter(23, 'POC Manpower Certification', metric(0, 0), metric(0, 0)),
      parameter(24, 'End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)', metric(0, 0), metric(40, 0), { excludeFromTotals: true }),
    ]),
    area('Dealer Financials', [
      parameter(25, 'Dealer Financial Ratio', metric(0, 0), metric(0, 0)),
      parameter(26, 'Working Capital Diversion & Inadequacy', metric(0, 0), metric(0, 0)),
    ]),
    area('Dealer Infrastructure', [
      parameter(27, 'ARENA & TV Infrastructure - Upgradation', metric(0, 0), metric(0, 0)),
      parameter(28, 'ARENA & TV Infrastructure - Quarterly Maintenance', metric(0, 0), metric(0, 0)),
      parameter(29, 'Charging Infrastructure (Bonus Parameter)', metric(0, 0), metric(30, 0), { excludeFromTotals: true }),
      parameter(30, 'Maruti Suzuki Driving School', metric(0, -10), metric(0, -10)),
      parameter(31, 'Adequate Insurance Coverage & Preventive Safety Audit', metric(0, 0), metric(0, 0)),
    ]),
  ],
});

const PARAMETER_COLUMNS = [
  { area: 'Sales Performance', parameter: 'All Models Wholesales Performance', columns: ['All Models Wholesales Performance', 'All Models Wholesale Performance', 'All Models Wholsales Performance'] },
  { area: 'Sales Performance', parameter: 'ARENA SUV Models Wholesales Performance', columns: ['ARENA SUV Models Wholesales Performance', 'ARENA SUV Models Wholesale Performance', 'SUV Models Wholesales Performance'] },
  { area: 'Sales Performance', parameter: 'ARENA Models New Car VAHAN Registration', columns: ['ARENA Models New Car VAHAN Registration', 'New Car VAHAN Registration', 'VAHAN Registration'] },
  { area: 'Sales Performance', parameter: 'Maruti Suzuki Smart Finance', columns: ['Maruti Suzuki Smart Finance', 'Smart Finance'] },
  { area: 'Sales Performance', parameter: 'Maruti Suzuki Rewards Enrolment', columns: ['Maruti Suzuki Rewards Enrolment', 'Maruti Suzuki Rewards Enrollment', 'Rewards Enrolment'] },

  { area: 'Sales Quality Performance', parameter: 'Net Promoter Score - ARENA', columns: ['NPS', 'Net Promoter Score', 'Net Promoter Score ARENA'] },
  { area: 'Sales Quality Performance', parameter: 'ARENA Channel Sales Manpower Certification', columns: ['ARENA Channel Sales Manpower Certification'] },

  { area: 'Service Performance', parameter: 'Service to Sales Ratio', columns: ['Service to Sales Ratio'] },
  { area: 'Service Performance', parameter: 'Extended Warranty Penetration', columns: ['Extended Warranty Penetration'] },
  { area: 'Service Performance', parameter: 'Customer Convenience Package Penetration', columns: ['Customer Convenience Package Penetration', 'Customer Convenience Package'] },
  { area: 'Service Performance', parameter: 'True Value Vehicle Retention', columns: ['True Value Vehicle Retention'] },

  { area: 'Service Quality', parameter: 'Net Promoter Score - Service & Bodyshop', columns: ['Net Promoter Score - Workshop & Bodyshop', 'Net Promoter Score - Service & Bodyshop'] },
  { area: 'Service Quality', parameter: 'Customer Complaint Index - Service', columns: ['Customer Complaint Index - Service', 'Customer Complaint Index (Service)', 'Customer Complaint Index'] },
  { area: 'Service Quality', parameter: 'Service Manpower Certification', columns: ['Service Manpower Certification', 'SSQS Certified Service Manpower', 'Certified Service Manpower', 'Service Certified Manpower'] },
  { area: 'Service Quality', parameter: 'Service Infrastructure', columns: ['Service Infrastructure'] },

  { area: 'Parts & Accessories Performance', parameter: 'MSGP Performance', columns: ['MSGP Performance'] },
  { area: 'Parts & Accessories Performance', parameter: 'MSGA Performance- Showroom Acc / Veh', columns: ['MSGA Performance- Showroom Acc / Veh', 'MSGA Performance - Showroom Acc / Veh', 'MSGA  Performance- Showroom Acc / Veh', 'MSGA Performance'] },
  { area: 'Parts & Accessories Performance', parameter: 'MSGA Performance - Online Order Conversion', columns: ['MSGA Performance - Online Order Conversion'] },
  { area: 'Parts & Accessories Performance', parameter: 'MSGA Performance - Body Coat Penetration', columns: ['MSGA Performance - Body Coat Penetration'] },

  { area: 'True Value', parameter: 'Exch. Growth', columns: ['TV Business Performance - Exchange Growth', 'True Value Exch. Growth', 'Exchange Growth', 'Exch. Growth', 'TV Exchange Growth'] },
  { area: 'True Value', parameter: 'Purchase Cycle Management', columns: ['TV Business Performance - Purchase Cycle Management', 'Purchase Cycle Management', 'POC Sales Growth'] },
{
  area: 'True Value',
  parameter: 'Net Promoter Score - True Value',
  columns: [
    'NPS True Value',
    'NPS - True Value',
    'Net Promoter Score - True Value',
  ],
},
  { area: 'True Value', parameter: 'POC Manpower Certification', columns: ['POC Manpower Certification'] },
  { area: 'True Value', parameter: 'End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)', columns: ['End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)', 'POC ELV Scrap Penetration', 'ELV Penetration', 'ELV Scrap Penetration', 'ELV', 'End of Life Vehicle Scrap Penetration (Bonus Parameter)'] },

  { area: 'Dealer Financials', parameter: 'Dealer Financial Ratio', columns: ['Dealer Financial Ratio', 'Dealer Financials'] },
  { area: 'Dealer Financials', parameter: 'Working Capital Diversion & Inadequacy', columns: ['Working Capital Diversion & Inadequacy'] },

  { area: 'Dealer Infrastructure', parameter: 'ARENA & TV Infrastructure - Upgradation', columns: ['ARENA & TV Infrastructure - Upgradation'] },
  { area: 'Dealer Infrastructure', parameter: 'ARENA & TV Infrastructure - Quarterly Maintenance', columns: ['ARENA & TV Infrastructure - Quarterly Maintenance'] },
  { area: 'Dealer Infrastructure', parameter: 'Charging Infrastructure (Bonus Parameter)', columns: ['Charging Infrastructure (Bonus Parameter)', 'Charging Infrastructure - ARENA', 'Charging Infrastructure'] },
  { area: 'Dealer Infrastructure', parameter: 'Maruti Suzuki Driving School', columns: ['Maruti Suzuki Driving School', 'Driving School'] },
  { area: 'Dealer Infrastructure', parameter: 'Adequate Insurance Coverage & Preventive Safety Audit', columns: ['Adequate Insurance Coverage & Preventive Safety Audit'] },
];

const EARLY_BIRD_TOTAL_COLUMNS = [
  { area: 'Sales Performance', columns: ['Sales & Marketing Performance', 'Sales and Marketing Performance', 'Sales Performance'] },
  { area: 'Sales Quality Performance', columns: ['Sales Quality Performance'] },
  { area: 'Service Performance', columns: ['Service Performance'] },
  { area: 'Service Quality', columns: ['Service Quality Performance', 'Service Quality'] },
  { area: 'Parts & Accessories Performance', columns: ['Parts & Accessories Performance', 'Parts and Accessories Performance'] },
  { area: 'True Value', columns: ['True Value Performance', 'True Value'] },
  { area: 'Dealer Financials', columns: ['Dealer Financials'] },
  { area: 'Dealer Infrastructure', columns: ['Dealer Infrastructure'] },
];

const getSheetRows = (workbook, sheetNames) => {
  const sheetName = workbook.SheetNames.find((name) =>
    sheetNames.some((expected) => normalize(name) === normalize(expected))
  );

  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const rowFive = rows[4] || [];
  const hasTemplateHeader = rowFive.some((value) => normalize(value) === normalize('BSC Parent Dealer Code')) &&
    rowFive.some((value) => normalize(value) === normalize('All Models Wholesales Performance'));

  if (hasTemplateHeader) {
    const templateColumnCount = XLSX.utils.decode_col('AI') + 1;
    const headers = rowFive.slice(0, templateColumnCount);

    return rows.slice(5).map((row) =>
      headers.reduce((record, header, index) => {
        if (header !== '') record[header] = row[index] ?? '';
        return record;
      }, {})
    );
  }

  return XLSX.utils.sheet_to_json(worksheet, {
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

const getZone = (row) =>
  String(getCell(row, ['Zone']) || '').trim();

const getWorksheetRows = (workbook, sheetNames) => {
  const sheetName = workbook.SheetNames.find((name) =>
    sheetNames.some((expected) => normalize(name) === normalize(expected))
  );

  if (!sheetName) return null;

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  });
};

const getWorksheetData = (workbook, sheetNames) => {
  const sheetName = workbook.SheetNames.find((name) =>
    sheetNames.some((expected) => normalize(name) === normalize(expected))
  );

  if (!sheetName) return null;

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  const displayRows = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row = [];

    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[address];
      row[columnIndex] = cell ? (cell.w ?? cell.v ?? '') : '';
    }

    displayRows[rowIndex] = row;
  }

  return { rows, displayRows };
};

const isWideTemplateRows = (rows) => {
  const headerRow = rows?.[4] || [];
  return normalize(headerRow[col('C')]) === normalize('BSC Parent Dealer Code') &&
    normalize(headerRow[col('E')]) === normalize('All Models Wholesales Performance');
};

const applyMetricRange = (score, row, period, key, startColumn, endColumn) => {
  const values = getRangeValues(row, startColumn, endColumn);
  getFlatParameters(score).forEach((param, index) => {
    param[period] = {
      ...(param[period] || {}),
      [key]: toNumber(values[index]),
    };
  });
};

const applyAreaTotalRange = (score, row, period, key, startColumn, endColumn) => {
  const values = getRangeValues(row, startColumn, endColumn);

  score.businessAreas.forEach((businessArea, index) => {
    const totalKey = `${period}Total`;
    const existingTotal = businessArea[totalKey];
    const totalMetric = existingTotal && typeof existingTotal === 'object'
      ? existingTotal
      : { achieved: toNumber(existingTotal), maxPoints: 0, minPoints: 0 };

    businessArea[totalKey] = {
      ...totalMetric,
      [key]: toNumber(values[index]),
    };
  });

  return toNumber(values[AREA_NAMES.length]);
};

const applyWideTemplatePeriod = (score, row, period, displayRow = row) => {
  if (period === 'fullYear') {
    applyMetricRange(score, row, period, 'achieved', 'E', 'AI');
    const achievedGrand = applyAreaTotalRange(score, row, period, 'achieved', 'BJ', 'BR');

    applyMetricRange(score, row, period, 'maxPoints', 'BT', 'CX');
    const maxGrand = applyAreaTotalRange(score, row, period, 'maxPoints', 'DA', 'DI');
    const maxSectionGrand = toNumber(getCellAt(row, 'CY'));

    applyMetricRange(score, row, period, 'minPoints', 'DK', 'EO');
    applyAreaTotalRange(score, row, period, 'minPoints', 'ER', 'EZ');

    const scoreValue = String(getCellAt(displayRow, 'AK') || getCellAt(row, 'AK') || achievedGrand).trim();
    const denominator = maxGrand || maxSectionGrand || 0;

    score.fullYear = {
      ...(score.fullYear || {}),
      provisionalScore: `${scoreValue}/${denominator}`,
      provisionalScorePercent: String(getCellAt(displayRow, 'AL') || getCellAt(row, 'AL') || '').trim(),
      qualification: score.fullYear?.qualification || 'N',
      band: String(getCellAt(displayRow, 'AM') || getCellAt(row, 'AM') || 'NO BAND').trim(),
    };
  } else {
    applyMetricRange(score, row, period, 'achieved', 'E', 'AI');
    const achievedGrand = applyAreaTotalRange(score, row, period, 'achieved', 'AP', 'AX');

    applyMetricRange(score, row, period, 'maxPoints', 'AZ', 'CD');
    const maxGrand = applyAreaTotalRange(score, row, period, 'maxPoints', 'CG', 'CO');
    const maxSectionGrand = toNumber(getCellAt(row, 'CE'));

    applyMetricRange(score, row, period, 'minPoints', 'CQ', 'DU');
    applyAreaTotalRange(score, row, period, 'minPoints', 'DX', 'EF');

    const scoreValue = String(getCellAt(displayRow, 'AK') || getCellAt(row, 'AK') || achievedGrand).trim();
    const denominator = maxGrand || maxSectionGrand || 0;

    score.earlyBird = {
      ...(score.earlyBird || {}),
      provisionalScore: `${scoreValue}/${denominator}`,
      provisionalScorePercent: String(getCellAt(displayRow, 'AL') || getCellAt(row, 'AL') || '').trim(),
      qualification: String(getCellAt(displayRow, 'AM') || getCellAt(row, 'AM') || 'N').trim(),
      band: String(getCellAt(displayRow, 'AN') || getCellAt(row, 'AN') || 'NO BAND').trim(),
    };
  }
};

const createWideTemplateScore = (row, index, options = {}) => ({
  ...createBaseScore({
    dealerCode: String(getCellAt(row, 'C') || `DEALER-${index + 1}`).trim(),
    dealerName: String(getCellAt(row, 'D') || '').trim(),
    region: String(getCellAt(row, 'B') || '').trim(),
    fiscalYear: options.fiscalYear,
    month: options.month,
  }),
  zone: String(getCellAt(row, 'A') || '').trim(),
});

const mergeWideTemplateRows = ({ earlyBirdRows, earlyBirdDisplayRows, fullYearRows, fullYearDisplayRows, fiscalYear, month }) => {
  const scoreMap = new Map();

  (fullYearRows || []).slice(5).forEach((row, rowIndex) => {
    const dealerCode = String(getCellAt(row, 'C') || '').trim();
    if (!dealerCode) return;

    const score = createWideTemplateScore(row, rowIndex, { fiscalYear, month });
    applyWideTemplatePeriod(score, row, 'fullYear', fullYearDisplayRows?.[rowIndex + 5] || row);
    scoreMap.set(dealerCode, score);
  });

  (earlyBirdRows || []).slice(5).forEach((row, rowIndex) => {
    const dealerCode = String(getCellAt(row, 'C') || '').trim();
    if (!dealerCode) return;

    const existing = scoreMap.get(dealerCode) ||
      createWideTemplateScore(row, rowIndex, { fiscalYear, month });

    if (!existing.dealerName) existing.dealerName = String(getCellAt(row, 'D') || '').trim();
    if (!existing.region) existing.region = String(getCellAt(row, 'B') || '').trim();
    if (!existing.zone) existing.zone = String(getCellAt(row, 'A') || '').trim();

    applyWideTemplatePeriod(existing, row, 'earlyBird', earlyBirdDisplayRows?.[rowIndex + 5] || row);
    scoreMap.set(dealerCode, existing);
  });

  const scores = [...scoreMap.values()];
  const accessCredentials = scores.map((score, index) => ({
    id: `excel-dealer-${index + 1}`,
    dealerCode: score.dealerCode,
    dealerName: score.dealerName || score.dealerCode,
    mailId: `dealer${index + 1}@gmail.com`,
    password: '1234',
    zone: score.zone || '',
    region: score.region || '',
    msilPersons: ['ayush'],
  }));

  return { scores, accessCredentials };
};

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
  const earlyBirdTemplateData = getWorksheetData(workbook, ['Early Bird', 'EarlyBird', 'Early Bird Points']);
  const fullYearTemplateData = getWorksheetData(workbook, ['Full Year', 'FullYear', 'Full Year Points']);

  if (isWideTemplateRows(earlyBirdTemplateData?.rows) || isWideTemplateRows(fullYearTemplateData?.rows)) {
    return mergeWideTemplateRows({
      earlyBirdRows: earlyBirdTemplateData?.rows,
      earlyBirdDisplayRows: earlyBirdTemplateData?.displayRows,
      fullYearRows: fullYearTemplateData?.rows,
      fullYearDisplayRows: fullYearTemplateData?.displayRows,
      fiscalYear: options.fiscalYear,
      month: options.month,
    }).scores;
  }

  const earlyBirdRows = getSheetRows(workbook, ['Early Bird', 'EarlyBird', 'Early Bird Points']);
  const fullYearRows = getSheetRows(workbook, ['Full Year', 'FullYear', 'Full Year Points']);

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

const parseBscWorkbookWithMetadata = (buffer, options = {}) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const earlyBirdTemplateData = getWorksheetData(workbook, ['Early Bird', 'EarlyBird', 'Early Bird Points']);
  const fullYearTemplateData = getWorksheetData(workbook, ['Full Year', 'FullYear', 'Full Year Points']);

  if (isWideTemplateRows(earlyBirdTemplateData?.rows) || isWideTemplateRows(fullYearTemplateData?.rows)) {
    return mergeWideTemplateRows({
      earlyBirdRows: earlyBirdTemplateData?.rows,
      earlyBirdDisplayRows: earlyBirdTemplateData?.displayRows,
      fullYearRows: fullYearTemplateData?.rows,
      fullYearDisplayRows: fullYearTemplateData?.displayRows,
      fiscalYear: options.fiscalYear,
      month: options.month,
    });
  }

  return {
    scores: parseBscWorkbook(buffer, options),
    accessCredentials: [],
  };
};

module.exports = {
  parseBscWorkbook,
  parseBscWorkbookWithMetadata,
};
