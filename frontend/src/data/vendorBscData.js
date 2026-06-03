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
