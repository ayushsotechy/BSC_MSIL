import React, { useMemo } from 'react';
import './BscScoreSheet.css';

const toDisplayValue = (value) => (value === null || value === undefined ? '' : value);

const toNumberOrValue = (value) => {
  if (value === '') return '';
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
};

const cloneScore = (score) => ({
  ...score,
  earlyBird: { ...(score?.earlyBird || {}) },
  fullYear: { ...(score?.fullYear || {}) },
  businessAreas: (score?.businessAreas || []).map((area) => ({
    ...area,
    earlyBirdTotal: area?.earlyBirdTotal,
    fullYearTotal: area?.fullYearTotal,
    parameters: (area?.parameters || []).map((param) => ({
      ...param,
      earlyBird: { ...(param?.earlyBird || {}) },
      fullYear: { ...(param?.fullYear || {}) },
    })),
  })),
});

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

const getDecimalPlaces = (value) => {
  const textValue = String(value ?? '').trim();
  if (!textValue || !textValue.includes('.')) return 0;
  return textValue.split('.')[1]?.replace(/0+$/, '').length || 0;
};

const formatParameterAchieved = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return getDecimalPlaces(value) >= 2 ? numericValue.toFixed(1) : String(value);
};

const formatTotalPoints = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;

  return String(Math.round(numericValue));
};

const MONTH_SHORT_NAMES = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

const getEvaluationPeriod = (score) => {
  const rawMonth = String(score?.month || '').trim();
  if (rawMonth.includes("'")) return rawMonth;

  const month = MONTH_SHORT_NAMES[rawMonth.toLowerCase()] || rawMonth.slice(0, 3) || 'Month';
  const yearText = String(score?.fiscalYear || '').trim();
  const fullYearMatch = yearText.match(/\b(20\d{2})\b/);
  const fyMatch = yearText.match(/fy\s*\d{2}\s*[-/]\s*(\d{2})/i);
  const yearSuffix = fullYearMatch ? fullYearMatch[1].slice(-2) : fyMatch?.[1] || '';

  return yearSuffix ? `${month}'${yearSuffix}` : month;
};

const getProvisionalScoreMax = (score, summary) => {
  const scoreText = String(score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '');
  const denominator = scoreText.includes('/') ? Number(scoreText.split('/').pop()) : 0;
  return denominator || summary?.maxPoints || 0;
};


const ROW_DEFINITIONS = {
  'Sales Performance': [
    { sNo: '1', parameter: 'All Models Wholesales Performance', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
    { sNo: '2', parameter: 'ARENA SUV Models Wholesales Performance', earlyBird: { maxPoints: 60, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: 0, achieved: 0 } },
    { sNo: '3', parameter: 'ARENA Models New Car VAHAN Registration', earlyBird: { maxPoints: 100, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 100, minPoints: 0, achieved: 0 } },
    { sNo: '4', parameter: 'Maruti Suzuki Smart Finance', earlyBird: { maxPoints: 20, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 20, minPoints: 0, achieved: 0 } },
    { sNo: '5', parameter: 'Maruti Suzuki Rewards Enrolment', earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 } },
  ],
  'Sales Quality Performance': [
    { sNo: '6', parameter: 'Net Promoter Score - ARENA', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
    { sNo: '7', parameter: 'ARENA Channel Sales Manpower Certification', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
  'Service Performance': [
    { sNo: '8', parameter: 'Service to Sales Ratio', earlyBird: { maxPoints: 60, minPoints: -30, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: -30, achieved: 0 } },
    { sNo: '9', parameter: 'Extended Warranty Penetration', earlyBird: { maxPoints: 60, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: -20, achieved: 0 } },
    { sNo: '10', parameter: 'Customer Convenience Package Penetration', earlyBird: { maxPoints: 35, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 35, minPoints: -20, achieved: 0 } },
    { sNo: '11', parameter: 'True Value Vehicle Retention', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
  'Service Quality': [
    { sNo: '12', parameter: 'Net Promoter Score - Service & Bodyshop', earlyBird: { maxPoints: 40, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: -20, achieved: 0 } },
    { sNo: '13', parameter: 'Customer Complaint Index - Service', earlyBird: { maxPoints: 30, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: -10, achieved: 0 } },
    { sNo: '14', parameter: 'Service Manpower Certification', earlyBird: { maxPoints: 30, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: 0, achieved: 0 } },
    { sNo: '15', parameter: 'Service Infrastructure', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
  'Parts & Accessories Performance': [
    { sNo: '16', parameter: 'MSGP Performance', earlyBird: { maxPoints: 65, minPoints: -15, achieved: 0 }, fullYear: { maxPoints: 65, minPoints: -15, achieved: 0 } },
    { sNo: '17', parameter: 'MSGA Performance- Showroom Acc / Veh', earlyBird: { maxPoints: 75, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 75, minPoints: -10, achieved: 0 } },
    { sNo: '18', parameter: 'MSGA Performance - Online Order Conversion', earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 } },
    { sNo: '19', parameter: 'MSGA Performance - Body Coat Penetration', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
  'True Value': [
    { sNo: '20', parameter: 'Exch. Growth', earlyBird: { maxPoints: 60, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: 0, achieved: 0 } },
    { sNo: '21', parameter: 'Purchase Cycle Management', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
    { sNo: '22', parameter: 'Net Promoter Score - True Value', earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 } },
    { sNo: '23', parameter: 'POC Manpower Certification', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
    { sNo: '24', parameter: 'End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 }, excludeFromTotals: true },
  ],
  'Dealer Financials': [
    { sNo: '25', parameter: 'Dealer Financial Ratio', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
    { sNo: '26', parameter: 'Working Capital Diversion & Inadequacy', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
  'Dealer Infrastructure': [
    { sNo: '27', parameter: 'ARENA & TV Infrastructure - Upgradation', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
    { sNo: '28', parameter: 'ARENA & TV Infrastructure - Quarterly Maintenance', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
    { sNo: '29', parameter: 'Charging Infrastructure (Bonus Parameter)', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: 0, achieved: 0 }, excludeFromTotals: true },
    { sNo: '30', parameter: 'Maruti Suzuki Driving School', earlyBird: { maxPoints: 0, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: -10, achieved: 0 } },
    { sNo: '31', parameter: 'Adequate Insurance Coverage & Preventive Safety Audit', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 } },
  ],
};

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();

const getParamKey = (param) => normalizeKey(`${param?.sNo || ''}-${param?.parameter || ''}`);

const AREA_ALIASES = {
  'Sales Performance': ['Sales & Marketing Performance', 'Sales and Marketing Performance'],
  'Service Quality': ['Service Quality Performance'],
  'Parts & Accessories Performance': ['Parts and Accessories Performance'],
  'True Value': ['True Value Performance'],
};

const PARAMETER_ALIASES = {
  'All Models Wholesales Performance': ['All Models Wholesale Performance'],
  'ARENA SUV Models Wholesales Performance': ['ARENA SUV Models Wholesale Performance'],
  'Customer Convenience Package Penetration': ['Customer Convenience Package'],
  'Customer Complaint Index - Service': ['Customer Complaint Index (Service)'],
  'Service Manpower Certification': ['SSQS Certified Service Manpower'],
  'MSGA Performance- Showroom Acc / Veh': ['MSGA Performance - Showroom Acc / Veh', 'MSGA  Performance- Showroom Acc / Veh', 'MSGA Performance'],
  'Exch. Growth': ['TV Business Performance - Exchange Growth', 'True Value Exch. Growth', 'Exchange Growth', 'TV Exchange Growth'],
  'Purchase Cycle Management': ['TV Business Performance - Purchase Cycle Management', 'TV Business Performance - POC Sales Growth', 'POC Sales Growth'],
  'End of Life Vehicle Scrap Penetration - ARENA (Bonus Parameter)': ['End of Life Vehicle Scrap Penetration (Bonus Parameter)', 'POC ELV Scrap Penetration', 'ELV Penetration'],
  'Charging Infrastructure (Bonus Parameter)': ['Charging Infrastructure - ARENA (Bonus Parameter)', 'Charging Infrastructure - ARENA', 'Upgradation of Old CI Outlets'],
  'Maruti Suzuki Driving School': ['Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets'],
};

const mergeMetric = (baseMetric = {}, existingMetric = {}) => ({
  ...baseMetric,
  maxPoints: existingMetric?.maxPoints ?? baseMetric.maxPoints ?? 0,
  minPoints: existingMetric?.minPoints ?? baseMetric.minPoints ?? 0,
  achieved: metricValue(existingMetric, 'achieved'),
});

const mergeParameter = (baseParam, existingParam) => ({
  ...baseParam,
  ...(existingParam || {}),
  sNo: baseParam.sNo,
  parameter: baseParam.parameter,
  accessConditionMet: existingParam?.accessConditionMet ?? baseParam.accessConditionMet ?? '',
  excludeFromTotals: Boolean(baseParam.excludeFromTotals || existingParam?.excludeFromTotals),
  earlyBird: mergeMetric(baseParam.earlyBird, existingParam?.earlyBird),
  fullYear: mergeMetric(baseParam.fullYear, existingParam?.fullYear),
});

const normalizeBusinessAreas = (businessAreas = []) => {
  return Object.entries(ROW_DEFINITIONS).map(([areaName, requiredParams]) => {
    const possibleAreaNames = [areaName, ...(AREA_ALIASES[areaName] || [])];
    const existingArea = businessAreas.find((area) =>
      possibleAreaNames.some((name) => normalizeKey(area?.areaName) === normalizeKey(name))
    ) || { areaName, parameters: [] };
    const existingParams = existingArea.parameters || [];

    const usedIndexes = new Set();
    const parameters = requiredParams.map((baseParam) => {
      let existingIndex = existingParams.findIndex((param, index) => {
        if (usedIndexes.has(index)) return false;
        if (getParamKey(param) === getParamKey(baseParam)) return true;

        const possibleParamNames = [baseParam.parameter, ...(PARAMETER_ALIASES[baseParam.parameter] || [])];
        return possibleParamNames.some((name) => normalizeKey(param?.parameter) === normalizeKey(name));
      });

      if (existingIndex === -1 && baseParam.parameter === 'Charging Infrastructure (Bonus Parameter)') {
        existingIndex = existingParams.findIndex((param, index) => {
          if (usedIndexes.has(index)) return false;
          return String(param?.sNo || '') === '18' || String(param?.sNo || '') === '29';
        });
      }

      if (existingIndex >= 0) usedIndexes.add(existingIndex);
      return mergeParameter(baseParam, existingIndex >= 0 ? existingParams[existingIndex] : undefined);
    });

    return {
      ...existingArea,
      areaName,
      parameters,
    };
  });
};

const getTotalValue = (area, period, key) => {
  const total = area?.[`${period}Total`];

  if (total !== undefined && total !== null && total !== '') {
    if (total && typeof total === 'object') return metricValue(total, key);
    if (key === 'achieved') return toNumber(total);
  }

  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + (param?.excludeFromTotals ? 0 : toNumber(metricValue(param?.[period], key))),
      0,
    );
  }

  return 0;
};

const getTotalMetric = (area, period) => {
  const total = area?.[`${period}Total`];

  if (total && typeof total === 'object') {
    return {
      maxPoints: metricValue(total, 'maxPoints'),
      minPoints: metricValue(total, 'minPoints'),
      achieved: metricValue(total, 'achieved'),
    };
  }

  if (total !== undefined && total !== null && total !== '') {
    return {
      maxPoints: getTotalValue(area, period, 'maxPoints'),
      minPoints: getTotalValue(area, period, 'minPoints'),
      achieved: toNumber(total),
    };
  }

  return {
    maxPoints: getTotalValue(area, period, 'maxPoints'),
    minPoints: getTotalValue(area, period, 'minPoints'),
    achieved: getTotalValue(area, period, 'achieved'),
  };
};

const summarizePeriod = (businessAreas, period) => {
  const maxPoints = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'maxPoints')), 0);
  const minPoints = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'minPoints')), 0);
  const achieved = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'achieved')), 0);
  const percent = maxPoints ? `${((achieved / maxPoints) * 100).toFixed(1)}%` : '0.0%';

  return { maxPoints, minPoints, achieved, percent };
};

const getPeriodSummary = (score, businessAreas, period) => {
  const calculatedSummary = summarizePeriod(businessAreas, period);
  const explicitTotal = score?.[period]?.total;

  if (explicitTotal && typeof explicitTotal === 'object') {
    return {
      maxPoints: metricValue(explicitTotal, 'maxPoints'),
      minPoints: metricValue(explicitTotal, 'minPoints'),
      achieved: metricValue(explicitTotal, 'achieved'),
      percent: calculatedSummary.percent,
    };
  }

  return calculatedSummary;
};

const recalculateScore = (score) => {
  const nextScore = cloneScore(score);

  nextScore.businessAreas = normalizeBusinessAreas(nextScore.businessAreas);

  nextScore.businessAreas = (nextScore.businessAreas || []).map((area) => ({
    ...area,
    earlyBirdTotal: area.earlyBirdTotal ?? getTotalMetric(area, 'earlyBird'),
    fullYearTotal: area.fullYearTotal ?? getTotalMetric(area, 'fullYear'),
  }));

  const earlyBirdSummary = getPeriodSummary(nextScore, nextScore.businessAreas, 'earlyBird');
  const fullYearSummary = getPeriodSummary(nextScore, nextScore.businessAreas, 'fullYear');

  nextScore.earlyBird = {
    ...(nextScore.earlyBird || {}),
    total: nextScore.earlyBird?.total || {
      maxPoints: earlyBirdSummary.maxPoints,
      minPoints: earlyBirdSummary.minPoints,
      achieved: earlyBirdSummary.achieved,
    },
    provisionalScore: nextScore.earlyBird?.provisionalScore || `${earlyBirdSummary.achieved}/${earlyBirdSummary.maxPoints}`,
    provisionalScorePercent: nextScore.earlyBird?.provisionalScorePercent || earlyBirdSummary.percent,
  };

  nextScore.fullYear = {
    ...(nextScore.fullYear || {}),
    total: nextScore.fullYear?.total || {
      maxPoints: fullYearSummary.maxPoints,
      minPoints: fullYearSummary.minPoints,
      achieved: fullYearSummary.achieved,
    },
    provisionalScore: nextScore.fullYear?.provisionalScore || `${fullYearSummary.achieved}/${fullYearSummary.maxPoints}`,
    provisionalScorePercent: nextScore.fullYear?.provisionalScorePercent || fullYearSummary.percent,
  };

  return nextScore;
};

const BscScoreSheet = ({ score, editable = false, onChange }) => {
  const scoreData = useMemo(() => recalculateScore(score || {}), [score]);

  const updateScore = (updater) => {
    if (!editable || typeof onChange !== 'function') return;
    const nextScore = cloneScore(scoreData);
    updater(nextScore);
    onChange(recalculateScore(nextScore));
  };

  const handleTextChange = (field, value) => {
    updateScore((nextScore) => {
      nextScore[field] = value;
    });
  };

  const handleSummaryChange = (period, field, value) => {
    updateScore((nextScore) => {
      nextScore[period] = { ...(nextScore[period] || {}), [field]: value };
    });
  };

  const handleScoreChange = (areaIndex, paramIndex, period, field, value) => {
    updateScore((nextScore) => {
      const param = nextScore.businessAreas[areaIndex].parameters[paramIndex];
      param[period] = {
        ...(param[period] || {}),
        [field]: field === 'achieved' || field === 'maxPoints' || field === 'minPoints'
          ? toNumberOrValue(value)
          : value,
      };
    });
  };

  const handleAreaTotalChange = (areaIndex, period, field, value) => {
    updateScore((nextScore) => {
      const area = nextScore.businessAreas[areaIndex];
      const totalKey = `${period}Total`;
      area[totalKey] = {
        ...getTotalMetric(area, period),
        ...(area[totalKey] && typeof area[totalKey] === 'object' ? area[totalKey] : {}),
        [field]: toNumberOrValue(value),
      };
    });
  };

  const handleGrandTotalChange = (period, field, value) => {
    updateScore((nextScore) => {
      const currentSummary = getPeriodSummary(nextScore, nextScore.businessAreas, period);
      nextScore[period] = {
        ...(nextScore[period] || {}),
        total: {
          maxPoints: metricValue(nextScore[period]?.total || currentSummary, 'maxPoints'),
          minPoints: metricValue(nextScore[period]?.total || currentSummary, 'minPoints'),
          achieved: metricValue(nextScore[period]?.total || currentSummary, 'achieved'),
          [field]: toNumberOrValue(value),
        },
      };
    });
  };

  if (!scoreData || !scoreData.businessAreas) {
    return <div className="bsc-empty">No BSC score data available.</div>;
  }

  const earlyBirdSummary = getPeriodSummary(scoreData, scoreData.businessAreas, 'earlyBird');
  const fullYearSummary = getPeriodSummary(scoreData, scoreData.businessAreas, 'fullYear');
  const evaluationPeriod = getEvaluationPeriod(scoreData);
  const noteMaxPoints = getProvisionalScoreMax(scoreData, fullYearSummary);

  return (
    <div className="bsc-container">
      <div className="top-control-bar" style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
            BSC Parent Dealer Code
          </label>
          <input
            type="text"
            value={toDisplayValue(scoreData.dealerCode)}
            onChange={(e) => handleTextChange('dealerCode', e.target.value)}
            readOnly
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            placeholder="e.g. 202"
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
            Region
          </label>
          <input
            type="text"
            value={toDisplayValue(scoreData.region)}
            onChange={(e) => handleTextChange('region', e.target.value)}
            readOnly
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            placeholder="e.g. West 1"
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px' }}>
            Dealer Name
          </label>
          <input
            type="text"
            value={toDisplayValue(scoreData.dealerName)}
            onChange={(e) => handleTextChange('dealerName', e.target.value)}
            readOnly
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            placeholder="e.g. Metro Suzuki"
          />
        </div>
      </div>

      <table className="info-table">
        <tbody>
          <tr>
            <td className="header-label">Region</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.region)}
                onChange={(e) => handleTextChange('region', e.target.value)}
                readOnly
                placeholder="Enter Region..."
              />
            </td>
            <td colSpan="2" className="empty-cell"></td>
          </tr>
          <tr>
            <td className="header-label">Dealer Name</td>
            <td colSpan="3" className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.dealerName)}
                onChange={(e) => handleTextChange('dealerName', e.target.value)}
                readOnly
                placeholder="Enter Dealer Name..."
                style={{ width: '100%' }}
              />
            </td>
          </tr>
          <tr>
            <td className="header-label">Fiscal Year</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.fiscalYear)}
                onChange={(e) => handleTextChange('fiscalYear', e.target.value)}
                readOnly
                placeholder="FY 25-26"
              />
            </td>
            <td className="header-label">Month</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.month)}
                onChange={(e) => handleTextChange('month', e.target.value)}
                readOnly
                placeholder="Dec'25"
              />
            </td>
          </tr>
          <tr>
            <td className="header-label">Early Bird Provisional Score</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.earlyBird?.provisionalScore || `${earlyBirdSummary.achieved}/${earlyBirdSummary.maxPoints}`)}
                onChange={(e) => handleSummaryChange('earlyBird', 'provisionalScore', e.target.value)}
                readOnly={!editable}
              />
            </td>
            <td className="header-label">Full Year Provisional Score</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.fullYear?.provisionalScore || `${fullYearSummary.achieved}/${fullYearSummary.maxPoints}`)}
                onChange={(e) => handleSummaryChange('fullYear', 'provisionalScore', e.target.value)}
                readOnly={!editable}
              />
            </td>
          </tr>
          <tr>
            <td className="header-label">Early Bird Provisional Qualification</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.earlyBird?.qualification)}
                onChange={(e) => handleSummaryChange('earlyBird', 'qualification', e.target.value)}
                readOnly={!editable}
              />
            </td>
            <td className="header-label">Full Year Provisional Score %</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.fullYear?.provisionalScorePercent || fullYearSummary.percent)}
                onChange={(e) => handleSummaryChange('fullYear', 'provisionalScorePercent', e.target.value)}
                readOnly={!editable}
              />
            </td>
          </tr>
          <tr>
            <td className="header-label">Early Bird Provisional Band</td>
            <td className="editable-bg bold-band">
              <input
                type="text"
                value={toDisplayValue(scoreData.earlyBird?.band)}
                onChange={(e) => handleSummaryChange('earlyBird', 'band', e.target.value)}
                readOnly={!editable}
              />
            </td>
            <td className="header-label">Full Year Band</td>
            <td className="editable-bg bold-band">
              <input
                type="text"
                value={toDisplayValue(scoreData.fullYear?.band)}
                onChange={(e) => handleSummaryChange('fullYear', 'band', e.target.value)}
                readOnly={!editable}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <table className="score-table">
        <thead>
          <tr>
            <th rowSpan="2" className="bg-primary">Business Area</th>
            <th rowSpan="2" className="bg-primary">S.No.</th>
            <th rowSpan="2" className="bg-primary">Parameter</th>
            <th colSpan="3" className="period-header period-header--early">EARLY BIRD EVALUATION</th>
            <th colSpan="3" className="period-header period-header--full">FULL YEAR EVALUATION</th>
          </tr>
          <tr>
            <th className="period-subheader period-subheader--early">Max Points</th>
            <th className="period-subheader period-subheader--early">Min Points</th>
            <th className="period-subheader period-subheader--early">Points Achieved</th>
            <th className="period-subheader period-subheader--full">Max Points</th>
            <th className="period-subheader period-subheader--full">Min Points</th>
            <th className="period-subheader period-subheader--full">Points Achieved</th>
          </tr>
        </thead>
        <tbody>
          {scoreData.businessAreas.map((area, aIndex) => {
            const areaEbMaxTotal = getTotalValue(area, 'earlyBird', 'maxPoints');
            const areaEbMinTotal = getTotalValue(area, 'earlyBird', 'minPoints');
            const areaEbAchievedTotal = getTotalValue(area, 'earlyBird', 'achieved');
            const areaFyMaxTotal = getTotalValue(area, 'fullYear', 'maxPoints');
            const areaFyMinTotal = getTotalValue(area, 'fullYear', 'minPoints');
            const areaFyAchievedTotal = getTotalValue(area, 'fullYear', 'achieved');

            return (
              <React.Fragment key={`${area.areaName}-${aIndex}`}>
                {(area.parameters || []).map((param, pIndex) => (
                  <tr key={`${param.sNo}-${pIndex}`}>
                    {pIndex === 0 && (
                      <td rowSpan={area.parameters.length} className="business-area-cell">
                        {area.areaName}
                      </td>
                    )}
                    <td className="center-text">{param.sNo}</td>
                    
                    {/* STRICTLY NON-EDITABLE TEXT FIELDS (Wraps Text Naturally) */}
                    <td style={{ padding: '12px', lineHeight: '1.4' }}>
                      {toDisplayValue(param.parameter)}
                    </td>

                    {/* Early Bird - Static Max/Min */}
                    <td className="center-text period-cell period-cell--early bold-band">
                      {toDisplayValue(metricValue(param.earlyBird, 'maxPoints'))}
                    </td>
                    <td className="center-text period-cell period-cell--early bold-band">
                      {toDisplayValue(metricValue(param.earlyBird, 'minPoints'))}
                    </td>
                    
                    {/* Early Bird - EDITABLE Points Achieved */}
                    <td className={`center-text period-cell period-cell--early ${editable ? 'editable-cell' : ''}`}>
                      {editable ? (
                        <input
                          type="number"
                          value={toDisplayValue(metricValue(param.earlyBird, 'achieved'))}
                          onChange={(e) => handleScoreChange(aIndex, pIndex, 'earlyBird', 'achieved', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', border: '1px solid #a5b4fc' }}
                        />
                      ) : (
                        <span className="bold-band">{formatParameterAchieved(metricValue(param.earlyBird, 'achieved'))}</span>
                      )}
                    </td>

                    {/* Full Year - Static Max/Min */}
                    <td className="center-text period-cell period-cell--full bold-band">
                      {toDisplayValue(metricValue(param.fullYear, 'maxPoints'))}
                    </td>
                    <td className="center-text period-cell period-cell--full bold-band">
                      {toDisplayValue(metricValue(param.fullYear, 'minPoints'))}
                    </td>
                    
                    {/* Full Year - EDITABLE Points Achieved */}
                    <td className={`center-text period-cell period-cell--full ${editable ? 'editable-cell' : ''}`}>
                      {editable ? (
                        <input
                          type="number"
                          value={toDisplayValue(metricValue(param.fullYear, 'achieved'))}
                          onChange={(e) => handleScoreChange(aIndex, pIndex, 'fullYear', 'achieved', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', border: '1px solid #a5b4fc' }}
                        />
                      ) : (
                        <span className="bold-band">{formatParameterAchieved(metricValue(param.fullYear, 'achieved'))}</span>
                      )}
                    </td>
                  </tr>
                ))}

                <tr className="subtotal-row">
                  <td colSpan="3" className="right-text">{area.areaName} Total</td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--early ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaEbMaxTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'earlyBird', 'maxPoints', e.target.value)} />
                    ) : formatTotalPoints(areaEbMaxTotal)}
                  </td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--early ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaEbMinTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'earlyBird', 'minPoints', e.target.value)} />
                    ) : formatTotalPoints(areaEbMinTotal)}
                  </td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--early subtotal-period--achieved ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaEbAchievedTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'earlyBird', 'achieved', e.target.value)} />
                    ) : formatTotalPoints(areaEbAchievedTotal)}
                  </td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--full ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaFyMaxTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'fullYear', 'maxPoints', e.target.value)} />
                    ) : formatTotalPoints(areaFyMaxTotal)}
                  </td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--full ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaFyMinTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'fullYear', 'minPoints', e.target.value)} />
                    ) : formatTotalPoints(areaFyMinTotal)}
                  </td>
                  <td className={`center-text bold-band subtotal-period subtotal-period--full subtotal-period--achieved ${editable ? 'editable-cell' : ''}`}>
                    {editable ? (
                      <input type="number" value={toDisplayValue(areaFyAchievedTotal)} onChange={(e) => handleAreaTotalChange(aIndex, 'fullYear', 'achieved', e.target.value)} />
                    ) : formatTotalPoints(areaFyAchievedTotal)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}

          <tr className="grand-total-row">
            <td colSpan="3" className="right-text">TOTAL</td>
            <td className={`center-text bold-band subtotal-period subtotal-period--early ${editable ? 'editable-cell' : ''}`}>
              {editable ? (
                <input type="number" value={toDisplayValue(earlyBirdSummary.maxPoints)} onChange={(e) => handleGrandTotalChange('earlyBird', 'maxPoints', e.target.value)} />
              ) : formatTotalPoints(earlyBirdSummary.maxPoints)}
            </td>
            <td className={`center-text bold-band subtotal-period subtotal-period--early ${editable ? 'editable-cell' : ''}`}>
              {editable ? (
                <input type="number" value={toDisplayValue(earlyBirdSummary.minPoints)} onChange={(e) => handleGrandTotalChange('earlyBird', 'minPoints', e.target.value)} />
              ) : formatTotalPoints(earlyBirdSummary.minPoints)}
            </td>
            <td className={`center-text highlight-total subtotal-period subtotal-period--early subtotal-period--achieved ${editable ? 'editable-cell' : ''}`} style={{ fontSize: '15px' }}>
              {editable ? (
                <input type="number" value={toDisplayValue(earlyBirdSummary.achieved)} onChange={(e) => handleGrandTotalChange('earlyBird', 'achieved', e.target.value)} />
              ) : formatTotalPoints(earlyBirdSummary.achieved)}
            </td>
            <td className={`center-text bold-band subtotal-period subtotal-period--full ${editable ? 'editable-cell' : ''}`}>
              {editable ? (
                <input type="number" value={toDisplayValue(fullYearSummary.maxPoints)} onChange={(e) => handleGrandTotalChange('fullYear', 'maxPoints', e.target.value)} />
              ) : formatTotalPoints(fullYearSummary.maxPoints)}
            </td>
            <td className={`center-text bold-band subtotal-period subtotal-period--full ${editable ? 'editable-cell' : ''}`}>
              {editable ? (
                <input type="number" value={toDisplayValue(fullYearSummary.minPoints)} onChange={(e) => handleGrandTotalChange('fullYear', 'minPoints', e.target.value)} />
              ) : formatTotalPoints(fullYearSummary.minPoints)}
            </td>
            <td className={`center-text highlight-total subtotal-period subtotal-period--full subtotal-period--achieved ${editable ? 'editable-cell' : ''}`} style={{ fontSize: '15px' }}>
              {editable ? (
                <input type="number" value={toDisplayValue(fullYearSummary.achieved)} onChange={(e) => handleGrandTotalChange('fullYear', 'achieved', e.target.value)} />
              ) : formatTotalPoints(fullYearSummary.achieved)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="bsc-note">
        <p><strong>Note :</strong></p>
        <p>
          1. Evaluation till {evaluationPeriod} has been done out of {noteMaxPoints} Points excluding parameter norms
          related to ARENA &amp; TV Manpower Certification, True Value Retention, Service Infrastructure, MSGA (Norm C),
          Dealer Financials, ARENA &amp; TV Sales Infrastructure and Adequate Insurance Coverage &amp; Preventive Safety
          Audit parameters.
        </p>
        <p>
          2. Vertical&apos;s score cannot be higher than the total maximum points of that vertical or less than zero for
          Sales &amp; Marketing Performance and Sales Quality, True Value Performance (excluding ELV), Service Performance
          and Service Quality and Parts and Accessories.
        </p>
      </div>
    </div>
  );
};

export default BscScoreSheet;
