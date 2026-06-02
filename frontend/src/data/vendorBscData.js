const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

export const DEFAULT_VENDOR_KEY = 'maruti';

const metric = (maxPoints, minPoints, pointsAchieved) => ({
  maxPoints,
  minPoints,
  pointsAchieved,
});

const parameter = (sNo, text, accessConditionMet, earlyBird, fullYear) => ({
  sNo,
  parameter: text,
  accessConditionMet,
  earlyBird,
  fullYear,
});

const area = (areaName, earlyBirdTotal, fullYearTotal, parameters) => ({
  areaName,
  earlyBirdTotal,
  fullYearTotal,
  parameters,
});

const createMarutiScoreTemplate = () => ({
  summaryMaxPoints: 960,
  fiscalYear: 'FY 25-26',
  month: "Dec'25",
  earlyBird: {
    provisionalScore: '601/960',
    provisionalScorePercent: '62.6%',
    qualification: 'N',
    band: 'SILVER',
  },
  fullYear: {
    provisionalScore: '572/960',
    provisionalScorePercent: '59.6%',
    qualification: 'N',
    band: 'BRONZE',
  },
  businessAreas: [
    area('Sales Performance', metric(220, 0, 150), metric(220, 0, 133), [
      parameter(1, 'All Models Wholesale Performance', 'N I Y I N\n(Q1 I Q2 I Q3)', metric(100, 0, 50), metric(100, 0, 33)),
      parameter(2, 'ARENA Models New Car VAHAN Registration', 'Y', metric(100, 0, 100), metric(100, 0, 100)),
      parameter(3, 'Maruti Suzuki Smart Finance', 'N', metric(20, 0, 0), metric(20, 0, 0)),
    ]),
    area('Sales Quality Performance', metric(140, 0, 35), metric(140, 0, 40), [
      parameter(4, 'Net Promoter Score - ARENA', '7\n(No of Months\nAchieved)', metric(40, 0, 23), metric(40, 0, 28)),
      parameter(5, 'ARENA Channel Sales Manpower Certification', '3\n(No. of Qtrs\nAchieved)', metric(100, 0, 12), metric(100, 0, 12)),
    ]),
    area('Service Performance', metric(140, -80, 123), metric(140, -80, 76), [
      parameter(6, 'Service to Sales Ratio', 'Y', metric(60, -30, 60), metric(60, -30, 60)),
      parameter(7, 'Extended Warranty Penetration', 'Y', metric(50, -30, 55), metric(50, -30, 8)),
      parameter(8, 'Customer Convenience Package', 'Y', metric(30, -20, 8), metric(30, -20, 8)),
    ]),
    area('Service Quality Performance', metric(170, -40, 100), metric(170, -40, 100), [
      parameter(9, 'Net Promoter Score - Service & Bodyshop', 'Y', metric(50, -20, 60), metric(50, -20, 60)),
      parameter(10, 'Customer Complaint Index (Service)', 'NA', metric(40, -20, 40), metric(40, -20, 40)),
      parameter(11, 'SSQS Certified Service Manpower', 'Y', metric(40, 0, 0), metric(40, 0, 0)),
      parameter(12, 'Service Infrastructure', 'NA', metric(40, 0, 0), metric(40, 0, 0)),
    ]),
    area('Parts and Accessories Performance', metric(150, -20, 145), metric(150, -20, 150), [
      parameter(13, 'MSGP Performance', 'NA', metric(60, -10, 60), metric(60, -10, 60)),
      parameter(14, 'MSGA Performance', 'NA\nNorm A (H1 | H2)\nNorm B (Tier I)\nNorm C\nNorm D', metric(90, -10, 85), metric(90, -10, 90)),
    ]),
    area('True Value Performance', metric(120, 0, 30), metric(120, 0, 55), [
      parameter('14a', 'TV Business Performance - Exchange Growth', 'NA', metric(80, 0, 0), metric(80, 0, 0)),
      parameter('14b', 'TV Business Performance - POC Sales Growth', 'NA', metric(30, 0, 30), metric(30, 0, 30)),
      parameter(15, 'Net Promoter Score - True Value', 'N', metric(10, 0, 0), metric(10, 0, 0)),
      parameter(16, 'POC Manpower Certification', 'Y | Y | Y\n(Q1 | Q2 | Q3)', metric(0, 0, 0), metric(0, 0, 0)),
      parameter(17, 'End of Life Vehicle Scrap Penetration (Bonus Parameter)', 'NA', metric(0, 0, 0), metric(25, 0, 25)),
    ]),
    area('Dealer Financials', metric(0, -50, 0), metric(0, -75, 0), [
      parameter(18, 'Working Capital Diversion & inadequacy', 'NA', metric(0, -50, 0), metric(0, -75, 0)),
    ]),
    area('Dealer Infrastructure', metric(20, -80, 18), metric(20, -80, 18), [
      parameter(19, 'Upgradation of Old CI Outlets', 'NA', metric(0, -40, 18), metric(0, -40, 0)),
      parameter(20, 'Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets', 'NA', metric(20, -40, 0), metric(20, -40, 18)),
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

export const calculateVendorSummary = (score) => {
  const totalMax = Number(score?.summaryMaxPoints || 0);

  const summarize = (period) => {
    const achieved = (score?.businessAreas || []).reduce(
      (total, item) => total + Number(item?.[`${period}Total`]?.pointsAchieved || 0),
      0,
    );

    const max = totalMax || (score?.businessAreas || []).reduce(
      (total, item) => total + Number(item?.[`${period}Total`]?.maxPoints || 0),
      0,
    );

    const percent = max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%';

    return {
      provisionalScore: `${achieved}/${max || 0}`,
      provisionalScorePercent: percent,
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
        item.accessConditionMet || '',
        String(item.earlyBird?.maxPoints ?? ''),
        String(item.earlyBird?.minPoints ?? ''),
        String(item.earlyBird?.pointsAchieved ?? ''),
        String(item.fullYear?.maxPoints ?? ''),
        String(item.fullYear?.minPoints ?? ''),
        String(item.fullYear?.pointsAchieved ?? ''),
      ]);
    });

    rows.push([
      `${businessArea.areaName} Total`,
      '',
      '',
      '',
      String(businessArea.earlyBirdTotal?.maxPoints ?? ''),
      String(businessArea.earlyBirdTotal?.minPoints ?? ''),
      String(businessArea.earlyBirdTotal?.pointsAchieved ?? ''),
      String(businessArea.fullYearTotal?.maxPoints ?? ''),
      String(businessArea.fullYearTotal?.minPoints ?? ''),
      String(businessArea.fullYearTotal?.pointsAchieved ?? ''),
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
