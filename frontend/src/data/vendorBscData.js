const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

export const DEFAULT_VENDOR_KEY = 'maruti';

const metric = (maxPoints, minPoints, pointsAchieved = 0) => ({
  maxPoints,
  minPoints,
  pointsAchieved,
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
  earlyBirdTotal: metric(0, 0, 0),
  fullYearTotal: metric(0, 0, 0),
  parameters,
});

const createMarutiScoreTemplate = () => ({
  summaryMaxPoints: 785,
  fiscalYear: 'FY 26-27',
  month: "Apr'26",
  earlyBird: {
    provisionalScore: '0/785',
    provisionalScorePercent: '0.0%',
    qualification: 'N',
    band: 'NO BAND',
  },
  fullYear: {
    provisionalScore: '0/785',
    provisionalScorePercent: '0.0%',
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

export const VENDOR_BSC_DATA = {
  maruti: {
    label: 'Maruti Suzuki',
    scoreTemplate: createMarutiScoreTemplate(),
  },
};

export const getVendorBscData = (vendorKey = DEFAULT_VENDOR_KEY) =>
  VENDOR_BSC_DATA[vendorKey] || VENDOR_BSC_DATA[DEFAULT_VENDOR_KEY];

const metricValue = (metricObject, key) => {
  if (key === 'achieved') return metricObject?.achieved ?? metricObject?.pointsAchieved ?? 0;
  return metricObject?.[key] ?? 0;
};

const totalMetric = (businessArea, period, key) =>
  (businessArea.parameters || []).reduce(
    (total, item) => total + (item.excludeFromTotals ? 0 : Number(metricValue(item?.[period], key) || 0)),
    0,
  );

export const calculateVendorSummary = (score) => {
  const summarize = (period) => {
    const achieved = (score?.businessAreas || []).reduce(
      (total, item) => total + totalMetric(item, period, 'achieved'),
      0,
    );

    const max = Number(score?.summaryMaxPoints || 0) || (score?.businessAreas || []).reduce(
      (total, item) => total + totalMetric(item, period, 'maxPoints'),
      0,
    );

    return {
      provisionalScore: `${achieved}/${max || 0}`,
      provisionalScorePercent: max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%',
      qualification: score?.[period]?.qualification || 'N',
      band: score?.[period]?.band || '',
    };
  };

  return {
    earlyBird: summarize('earlyBird'),
    fullYear: summarize('fullYear'),
  };
};

export const buildVendorScorePdfRows = (score) => {
  const rows = [];

  (score?.businessAreas || []).forEach((businessArea) => {
    (businessArea.parameters || []).forEach((item) => {
      rows.push([
        businessArea.areaName,
        String(item.sNo || ''),
        item.parameter || '',
        String(metricValue(item.earlyBird, 'maxPoints')),
        String(metricValue(item.earlyBird, 'minPoints')),
        String(metricValue(item.earlyBird, 'achieved')),
        String(metricValue(item.fullYear, 'maxPoints')),
        String(metricValue(item.fullYear, 'minPoints')),
        String(metricValue(item.fullYear, 'achieved')),
      ]);
    });

    rows.push([
      `${businessArea.areaName} Total`,
      '',
      '',
      String(totalMetric(businessArea, 'earlyBird', 'maxPoints')),
      String(totalMetric(businessArea, 'earlyBird', 'minPoints')),
      String(totalMetric(businessArea, 'earlyBird', 'achieved')),
      String(totalMetric(businessArea, 'fullYear', 'maxPoints')),
      String(totalMetric(businessArea, 'fullYear', 'minPoints')),
      String(totalMetric(businessArea, 'fullYear', 'achieved')),
    ]);
  });

  return rows;
};

export const buildVendorBscScore = ({
  vendorKey = DEFAULT_VENDOR_KEY,
  dealerId,
  dealerCodeOffset = 200,
  dealerName,
  region,
  fiscalYear,
  month,
}) => {
  const template = cloneDeep(getVendorBscData(vendorKey).scoreTemplate);
  const summary = calculateVendorSummary(template);

  return {
    _id: `vendor-${vendorKey}-${dealerId}`,
    vendorKey,
    dealerCode: String(dealerCodeOffset + dealerId),
    dealerName,
    region,
    fiscalYear: fiscalYear || template.fiscalYear,
    month: month || template.month,
    ...template,
    earlyBird: { ...template.earlyBird, ...summary.earlyBird },
    fullYear: { ...template.fullYear, ...summary.fullYear },
  };
};
