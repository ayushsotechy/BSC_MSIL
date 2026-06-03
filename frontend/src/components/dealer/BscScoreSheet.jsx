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
  'Sales & Marketing Performance': [
    { sNo: '1', parameter: 'All Models Wholesales Performance', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
    { sNo: '2', parameter: 'ARENA SUV Models Wholesales Performance', earlyBird: { maxPoints: 60, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: 0, achieved: 0 } },
    { sNo: '3', parameter: 'ARENA Models New Car VAHAN Registration', earlyBird: { maxPoints: 100, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 100, minPoints: 0, achieved: 0 } },
    { sNo: '4', parameter: 'Maruti Suzuki Smart Finance', earlyBird: { maxPoints: 20, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 20, minPoints: 0, achieved: 0 } },
    { sNo: '5', parameter: 'Maruti Suzuki Rewards Enrolment', earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 } },
  ],
  'Sales Quality Performance': [
    { sNo: '6', parameter: 'Net Promoter Score - ARENA', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
  ],
  'Service Performance': [
    { sNo: '7', parameter: 'Service to Sales Ratio', earlyBird: { maxPoints: 60, minPoints: -30, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: -30, achieved: 0 } },
    { sNo: '8', parameter: 'Extended Warranty Penetration', earlyBird: { maxPoints: 60, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: -20, achieved: 0 } },
    { sNo: '9', parameter: 'Customer Convenience Package Penetration', earlyBird: { maxPoints: 35, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 35, minPoints: -20, achieved: 0 } },
  ],
  'Service Quality Performance': [
    { sNo: '10', parameter: 'Net Promoter Score - Service & Bodyshop', earlyBird: { maxPoints: 40, minPoints: -20, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: -20, achieved: 0 } },
    { sNo: '11', parameter: 'Customer Complaint Index - Service', earlyBird: { maxPoints: 30, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: -10, achieved: 0 } },
    { sNo: '12', parameter: 'Service Manpower Certification', earlyBird: { maxPoints: 30, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: 0, achieved: 0 } },
  ],
  'Parts and Accessories Performance': [
    { sNo: '13', parameter: 'MSGP Performance', earlyBird: { maxPoints: 65, minPoints: -15, achieved: 0 }, fullYear: { maxPoints: 65, minPoints: -15, achieved: 0 } },
    { sNo: '14', parameter: 'MSGA Performance', earlyBird: { maxPoints: 85, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 85, minPoints: -10, achieved: 0 } },
  ],
  'True Value Performance': [
    { sNo: '15a', parameter: 'TV Business Performance - Exchange Growth', earlyBird: { maxPoints: 60, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 60, minPoints: 0, achieved: 0 } },
    { sNo: '15b', parameter: 'TV Business Performance - Purchase Cycle Management', earlyBird: { maxPoints: 40, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 } },
    { sNo: '16', parameter: 'Net Promoter Score - True Value', earlyBird: { maxPoints: 10, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 10, minPoints: 0, achieved: 0 } },
    { sNo: '17', parameter: 'End of Life Vehicle Scrap Penetration (Bonus Parameter)', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 40, minPoints: 0, achieved: 0 }, excludeFromTotals: true },
  ],
  'Dealer Infrastructure': [
    { sNo: '18', parameter: 'Charging Infrastructure - ARENA (Bonus Parameter)', earlyBird: { maxPoints: 0, minPoints: 0, achieved: 0 }, fullYear: { maxPoints: 30, minPoints: 0, achieved: 0 }, excludeFromTotals: true },
    { sNo: '19', parameter: 'Maruti Suzuki Driving School', earlyBird: { maxPoints: 0, minPoints: -10, achieved: 0 }, fullYear: { maxPoints: 0, minPoints: -10, achieved: 0 } },
  ],
};

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();

const getParamKey = (param) => normalizeKey(`${param?.sNo || ''}-${param?.parameter || ''}`);

const AREA_ALIASES = {
  'Sales & Marketing Performance': ['Sales Performance', 'Sales and Marketing Performance'],
};

const PARAMETER_ALIASES = {
  'All Models Wholesales Performance': ['All Models Wholesale Performance'],
  'ARENA SUV Models Wholesales Performance': ['ARENA SUV Models Wholesale Performance'],
  'Customer Convenience Package Penetration': ['Customer Convenience Package'],
  'Customer Complaint Index - Service': ['Customer Complaint Index (Service)'],
  'Service Manpower Certification': ['SSQS Certified Service Manpower'],
  'TV Business Performance - Purchase Cycle Management': ['TV Business Performance - POC Sales Growth'],
  'Charging Infrastructure - ARENA (Bonus Parameter)': ['Upgradation of Old CI Outlets'],
  'Maruti Suzuki Driving School': ['Quarterly Maintenance of AFNA CI Main, E/R and New CTV Outlets'],
};

const mergeMetric = (baseMetric = {}, existingMetric = {}) => ({
  ...baseMetric,
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

      if (existingIndex === -1 && baseParam.parameter === 'MSGA Performance') {
        existingIndex = existingParams.findIndex((param, index) => {
          if (usedIndexes.has(index)) return false;
          return normalizeKey(param?.parameter).startsWith(normalizeKey('MSGA Performance'));
        });
      }

      if (existingIndex === -1 && baseParam.parameter === 'Charging Infrastructure - ARENA (Bonus Parameter)') {
        existingIndex = existingParams.findIndex((param, index) => {
          if (usedIndexes.has(index)) return false;
          return String(param?.sNo || '') === '18';
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

  if (key === 'achieved' && total !== undefined && total !== null && total !== '') {
    if (total && typeof total === 'object') return metricValue(total, key);
    return toNumber(total);
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
                  <td colSpan="3" className="right-text">{area.areaName} Total</td>
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
            <td colSpan="3" className="right-text">TOTAL</td>
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
