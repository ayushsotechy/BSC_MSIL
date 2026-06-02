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


const ROW_DEFINITIONS = {
  'Parts and Accessories Performance': [
    {
      sNo: '13',
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
  'True Value Performance': [
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
      sNo: '15',
      parameter: 'Net Promoter Score - True Value',
      accessConditionMet: 'N',
      earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 },
      fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 },
    },
    {
      sNo: '16',
      parameter: 'POC Manpower Certification',
      accessConditionMet: 'Y | Y | Y\n(Q1 | Q2 | Q3)',
      earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
      fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
    },
    {
      sNo: '17',
      parameter: 'End of Life Vehicle Scrap Penetration (Bonus Parameter)',
      accessConditionMet: 'NA',
      earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
      fullYear: { maxPoints: 25, minPoints: 0, achieved: 0 },
    },
  ],
  'Dealer Financials': [
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
  'Dealer Infrastructure': [
    {
      sNo: '19',
      parameter: 'Upgradation of Old CI Outlets',
      accessConditionMet: 'NA',
      earlyBird: { maxPoints: 0, minPoints: -40, achieved: 0 },
      fullYear: { maxPoints: 0, minPoints: -40, achieved: 0 },
    },
    {
      sNo: '20',
      parameter: 'Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets',
      accessConditionMet: 'NA',
      earlyBird: { maxPoints: 20, minPoints: -40, achieved: 0 },
      fullYear: { maxPoints: 20, minPoints: -40, achieved: 0 },
    },
    {
      sNo: '21',
      parameter: 'Adequate Insurance Coverage & Preventive Safety Audit',
      accessConditionMet: 'NA',
      earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 },
      fullYear: { maxPoints: 0, minPoints: 0, achieved: 0 },
    },
  ],
};

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();

const getParamKey = (param) => normalizeKey(`${param?.sNo || ''}-${param?.parameter || ''}`);

const mergeMetric = (baseMetric = {}, existingMetric = {}) => ({
  ...baseMetric,
  achieved: metricValue(existingMetric, 'achieved'),
});

const mergeParameter = (baseParam, existingParam) => ({
  ...baseParam,
  ...(existingParam || {}),
  sNo: baseParam.sNo,
  parameter: baseParam.parameter,
  accessConditionMet: existingParam?.accessConditionMet ?? baseParam.accessConditionMet,
  earlyBird: mergeMetric(baseParam.earlyBird, existingParam?.earlyBird),
  fullYear: mergeMetric(baseParam.fullYear, existingParam?.fullYear),
});

const normalizeBusinessAreas = (businessAreas = []) => {
  const nextAreas = [...businessAreas];

  Object.entries(ROW_DEFINITIONS).forEach(([areaName, requiredParams]) => {
    const areaIndex = nextAreas.findIndex((area) => normalizeKey(area?.areaName) === normalizeKey(areaName));
    const existingArea = areaIndex >= 0 ? nextAreas[areaIndex] : { areaName, parameters: [] };
    const existingParams = existingArea.parameters || [];

    const usedIndexes = new Set();
    const parameters = requiredParams.map((baseParam) => {
      let existingIndex = existingParams.findIndex((param, index) => {
        if (usedIndexes.has(index)) return false;
        return getParamKey(param) === getParamKey(baseParam);
      });

      if (existingIndex === -1 && baseParam.sNo === '14a') {
        existingIndex = existingParams.findIndex((param, index) => {
          if (usedIndexes.has(index)) return false;
          return normalizeKey(param?.parameter) === normalizeKey('MSGA Performance');
        });
      }

      if (existingIndex === -1 && baseParam.sNo === '18a') {
        existingIndex = existingParams.findIndex((param, index) => {
          if (usedIndexes.has(index)) return false;
          return normalizeKey(param?.parameter) === normalizeKey('Working Capital Diversion & inadequacy')
            || String(param?.sNo || '') === '18';
        });
      }

      if (existingIndex >= 0) usedIndexes.add(existingIndex);
      return mergeParameter(baseParam, existingIndex >= 0 ? existingParams[existingIndex] : undefined);
    });

    const nextArea = {
      ...existingArea,
      areaName,
      parameters,
    };

    if (areaIndex >= 0) nextAreas[areaIndex] = nextArea;
    else nextAreas.push(nextArea);
  });

  return nextAreas;
};

const getTotalValue = (area, period, key) => {
  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + toNumber(metricValue(param?.[period], key)),
      0,
    );
  }

  const total = area?.[`${period}Total`];
  if (total && typeof total === 'object') return metricValue(total, key);
  if (key === 'achieved') return toNumber(total);

  return 0;
};

const summarizePeriod = (businessAreas, period) => {
  const maxPoints = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'maxPoints')), 0);
  const minPoints = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'minPoints')), 0);
  const achieved = businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'achieved')), 0);
  const percent = maxPoints ? `${((achieved / maxPoints) * 100).toFixed(1)}%` : '0.0%';

  return { maxPoints, minPoints, achieved, percent };
};

const recalculateScore = (score) => {
  const nextScore = cloneScore(score);

  nextScore.businessAreas = normalizeBusinessAreas(nextScore.businessAreas);

  nextScore.businessAreas = (nextScore.businessAreas || []).map((area) => ({
    ...area,
    earlyBirdTotal: getTotalValue(area, 'earlyBird', 'achieved'),
    fullYearTotal: getTotalValue(area, 'fullYear', 'achieved'),
  }));

  const earlyBirdSummary = summarizePeriod(nextScore.businessAreas, 'earlyBird');
  const fullYearSummary = summarizePeriod(nextScore.businessAreas, 'fullYear');

  nextScore.earlyBird = {
    ...(nextScore.earlyBird || {}),
    provisionalScore: `${earlyBirdSummary.achieved}/${earlyBirdSummary.maxPoints}`,
    provisionalScorePercent: earlyBirdSummary.percent,
  };

  nextScore.fullYear = {
    ...(nextScore.fullYear || {}),
    provisionalScore: `${fullYearSummary.achieved}/${fullYearSummary.maxPoints}`,
    provisionalScorePercent: fullYearSummary.percent,
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

  if (!scoreData || !scoreData.businessAreas) {
    return <div className="bsc-empty">No BSC score data available.</div>;
  }

  const earlyBirdSummary = summarizePeriod(scoreData.businessAreas, 'earlyBird');
  const fullYearSummary = summarizePeriod(scoreData.businessAreas, 'fullYear');

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
            readOnly={!editable}
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
            readOnly={!editable}
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
            readOnly={!editable}
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
                readOnly={!editable}
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
                readOnly={!editable}
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
                readOnly={!editable}
                placeholder="FY 25-26"
              />
            </td>
            <td className="header-label">Month</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(scoreData.month)}
                onChange={(e) => handleTextChange('month', e.target.value)}
                readOnly={!editable}
                placeholder="Dec'25"
              />
            </td>
          </tr>
          <tr>
            <td className="header-label">Early Bird Provisional Score</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(`${earlyBirdSummary.achieved}/${earlyBirdSummary.maxPoints}`)}
                onChange={(e) => handleSummaryChange('earlyBird', 'provisionalScore', e.target.value)}
                readOnly
              />
            </td>
            <td className="header-label">Full Year Provisional Score</td>
            <td className="editable-bg">
              <input
                type="text"
                value={toDisplayValue(`${fullYearSummary.achieved}/${fullYearSummary.maxPoints}`)}
                onChange={(e) => handleSummaryChange('fullYear', 'provisionalScore', e.target.value)}
                readOnly
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
                value={toDisplayValue(fullYearSummary.percent)}
                onChange={(e) => handleSummaryChange('fullYear', 'provisionalScorePercent', e.target.value)}
                readOnly
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
            <th rowSpan="2" className="bg-primary">Access Condition Met</th>
            <th colSpan="3" className="bg-secondary">EARLY BIRD EVALUATION</th>
            <th colSpan="3" className="bg-secondary">FULL YEAR EVALUATION</th>
          </tr>
          <tr>
            <th className="bg-primary">Max Points</th>
            <th className="bg-primary">Min Points</th>
            <th className="bg-primary">Points Achieved</th>
            <th className="bg-primary">Max Points</th>
            <th className="bg-primary">Min Points</th>
            <th className="bg-primary">Points Achieved</th>
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
                    <td className="center-text" style={{ whiteSpace: 'pre-wrap', padding: '8px' }}>
                      {toDisplayValue(param.accessConditionMet)}
                    </td>

                    {/* Early Bird - Static Max/Min */}
                    <td className="center-text bg-light bold-band">
                      {toDisplayValue(metricValue(param.earlyBird, 'maxPoints'))}
                    </td>
                    <td className="center-text bg-light bold-band">
                      {toDisplayValue(metricValue(param.earlyBird, 'minPoints'))}
                    </td>
                    
                    {/* Early Bird - EDITABLE Points Achieved */}
                    <td className={`center-text ${editable ? 'editable-cell' : ''}`}>
                      {editable ? (
                        <input
                          type="number"
                          value={toDisplayValue(metricValue(param.earlyBird, 'achieved'))}
                          onChange={(e) => handleScoreChange(aIndex, pIndex, 'earlyBird', 'achieved', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', border: '1px solid #a5b4fc' }}
                        />
                      ) : (
                        <span className="bold-band">{toDisplayValue(metricValue(param.earlyBird, 'achieved'))}</span>
                      )}
                    </td>

                    {/* Full Year - Static Max/Min */}
                    <td className="center-text bg-light bold-band">
                      {toDisplayValue(metricValue(param.fullYear, 'maxPoints'))}
                    </td>
                    <td className="center-text bg-light bold-band">
                      {toDisplayValue(metricValue(param.fullYear, 'minPoints'))}
                    </td>
                    
                    {/* Full Year - EDITABLE Points Achieved */}
                    <td className={`center-text ${editable ? 'editable-cell' : ''}`}>
                      {editable ? (
                        <input
                          type="number"
                          value={toDisplayValue(metricValue(param.fullYear, 'achieved'))}
                          onChange={(e) => handleScoreChange(aIndex, pIndex, 'fullYear', 'achieved', e.target.value)}
                          style={{ width: '60px', textAlign: 'center', padding: '6px', borderRadius: '4px', border: '1px solid #a5b4fc' }}
                        />
                      ) : (
                        <span className="bold-band">{toDisplayValue(metricValue(param.fullYear, 'achieved'))}</span>
                      )}
                    </td>
                  </tr>
                ))}

                <tr className="subtotal-row">
                  <td colSpan="4" className="right-text">{area.areaName} Total</td>
                  <td className="center-text bold-band">{areaEbMaxTotal}</td>
                  <td className="center-text bold-band">{areaEbMinTotal}</td>
                  <td className="center-text bold-band bg-secondary text-white">{areaEbAchievedTotal}</td>
                  <td className="center-text bold-band">{areaFyMaxTotal}</td>
                  <td className="center-text bold-band">{areaFyMinTotal}</td>
                  <td className="center-text bold-band bg-secondary text-white">{areaFyAchievedTotal}</td>
                </tr>
              </React.Fragment>
            );
          })}

          <tr className="grand-total-row">
            <td colSpan="4" className="right-text">TOTAL</td>
            <td className="center-text bold-band">{earlyBirdSummary.maxPoints}</td>
            <td className="center-text bold-band">{earlyBirdSummary.minPoints}</td>
            <td className="center-text highlight-total" style={{ fontSize: '15px' }}>{earlyBirdSummary.achieved}</td>
            <td className="center-text bold-band">{fullYearSummary.maxPoints}</td>
            <td className="center-text bold-band">{fullYearSummary.minPoints}</td>
            <td className="center-text highlight-total" style={{ fontSize: '15px' }}>{fullYearSummary.achieved}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default BscScoreSheet;