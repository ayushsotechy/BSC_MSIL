import React from 'react';
import './BscScoreSheet.css';

const cloneScore = (score) => ({
  ...score,
  earlyBird: { ...(score.earlyBird || {}) },
  fullYear: { ...(score.fullYear || {}) },
  businessAreas: (score.businessAreas || []).map((area) => ({
    ...area,
    parameters: (area.parameters || []).map((param) => ({
      ...param,
      earlyBird: { ...(param.earlyBird || {}) },
      fullYear: { ...(param.fullYear || {}) },
    })),
  })),
});

const BscScoreSheet = ({ score, editable = false, onChange }) => {
  if (!score) return null;

  const emitChange = (updater) => {
    if (!editable || !onChange) return;

    const nextScore = cloneScore(score);
    updater(nextScore);
    onChange(nextScore);
  };

  const inputValue = (value) => value ?? '';

  const renderInput = (value, onInputChange, className = '') => (
    <input
      className={`bsc-sheet__input ${className}`.trim()}
      type="text"
      value={inputValue(value)}
      onChange={(event) => onInputChange(event.target.value)}
    />
  );

  return (
    <div className="bsc-sheet">
      {/* Title */}
      <div className="bsc-sheet__title">
        BSC {score.fiscalYear} PROVISIONAL SCORE SHEET (Till {score.month})
      </div>

      {/* Summary Card */}
      <div className="bsc-summary">
        <table className="bsc-summary__table">
          <tbody>
            <tr>
              <td className="bsc-summary__label" colSpan="1">Region</td>
              <td className="bsc-summary__value" colSpan="3">
                {editable ? renderInput(score.region, (value) => emitChange((nextScore) => { nextScore.region = value; })) : score.region}
              </td>
            </tr>
            <tr>
              <td className="bsc-summary__label">Dealer Name</td>
              <td className="bsc-summary__value" colSpan="3">
                {editable ? renderInput(score.dealerName, (value) => emitChange((nextScore) => { nextScore.dealerName = value; })) : score.dealerName}
              </td>
            </tr>
            <tr>
              <td className="bsc-summary__label">Early Bird Provisional Score</td>
              <td className="bsc-summary__value">
                {editable ? renderInput(score.earlyBird?.provisionalScore, (value) => emitChange((nextScore) => { nextScore.earlyBird.provisionalScore = value; })) : score.earlyBird?.provisionalScore}
              </td>
              <td className="bsc-summary__label bsc-summary__label--dark">Full Year Provisional Score</td>
              <td className="bsc-summary__value">
                {editable ? renderInput(score.fullYear?.provisionalScore, (value) => emitChange((nextScore) => { nextScore.fullYear.provisionalScore = value; })) : score.fullYear?.provisionalScore}
              </td>
            </tr>
            <tr>
              <td className="bsc-summary__label">Early Bird Provisional Qualification</td>
              <td className="bsc-summary__value">
                {editable ? renderInput(score.earlyBird?.qualification, (value) => emitChange((nextScore) => { nextScore.earlyBird.qualification = value; })) : score.earlyBird?.qualification}
              </td>
              <td className="bsc-summary__label bsc-summary__label--dark">Full Year Provisional Score%</td>
              <td className="bsc-summary__value">
                {editable ? renderInput(score.fullYear?.provisionalScorePercent, (value) => emitChange((nextScore) => { nextScore.fullYear.provisionalScorePercent = value; })) : score.fullYear?.provisionalScorePercent}
              </td>
            </tr>
            <tr>
              <td className="bsc-summary__label">Early Bird Provisional Band</td>
              <td className="bsc-summary__value bsc-summary__value--bold">
                {editable ? renderInput(score.earlyBird?.band, (value) => emitChange((nextScore) => { nextScore.earlyBird.band = value; })) : score.earlyBird?.band}
              </td>
              <td className="bsc-summary__label bsc-summary__label--dark">Full Year Band</td>
              <td className="bsc-summary__value bsc-summary__value--bold">
                {editable ? renderInput(score.fullYear?.band, (value) => emitChange((nextScore) => { nextScore.fullYear.band = value; })) : score.fullYear?.band}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Detailed Score Table */}
      <div className="bsc-detail">
        <table className="bsc-detail__table">
          <thead>
            <tr className="bsc-detail__header-row">
              <th rowSpan="2" className="bsc-detail__th bsc-detail__th--left">Business Area</th>
              <th rowSpan="2" className="bsc-detail__th">S.No.</th>
              <th rowSpan="2" className="bsc-detail__th">Parameter</th>
              <th rowSpan="2" className="bsc-detail__th">Access Condition Met</th>
              <th colSpan="3" className="bsc-detail__th bsc-detail__th--group">EARLY BIRD EVALUATION</th>
              <th colSpan="3" className="bsc-detail__th bsc-detail__th--group bsc-detail__th--group2">FULL YEAR EVALUATION</th>
            </tr>
            <tr className="bsc-detail__subheader-row">
              <th className="bsc-detail__th bsc-detail__th--sub">Max Points</th>
              <th className="bsc-detail__th bsc-detail__th--sub">Min Points</th>
              <th className="bsc-detail__th bsc-detail__th--sub">Min Archived</th>
              <th className="bsc-detail__th bsc-detail__th--sub bsc-detail__th--sub2">Max Points</th>
              <th className="bsc-detail__th bsc-detail__th--sub bsc-detail__th--sub2">Min Points</th>
              <th className="bsc-detail__th bsc-detail__th--sub bsc-detail__th--sub2">Min Archived</th>
            </tr>
          </thead>
          <tbody>
            {score.businessAreas?.map((area, aIdx) =>
              area.parameters?.map((param, pIdx) => (
                <tr key={`${aIdx}-${pIdx}`} className="bsc-detail__row">
                  {pIdx === 0 && (
                    <td
                      className="bsc-detail__td bsc-detail__td--area"
                      rowSpan={area.parameters.length + 1}
                    >
                      {editable ? renderInput(area.areaName, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].areaName = value; }), 'bsc-sheet__input--dark bsc-sheet__input--area') : area.areaName}
                    </td>
                  )}
                  <td className="bsc-detail__td bsc-detail__td--center">
                    {editable ? renderInput(param.sNo, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].sNo = value; }), 'bsc-sheet__input--center') : param.sNo}
                  </td>
                  <td className="bsc-detail__td">
                    {editable ? renderInput(param.parameter, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].parameter = value; })) : param.parameter}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--center">
                    {editable ? renderInput(param.accessConditionMet, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].accessConditionMet = value; }), 'bsc-sheet__input--center') : param.accessConditionMet}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb">
                    {editable ? renderInput(param.earlyBird?.maxPoints, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].earlyBird.maxPoints = value; }), 'bsc-sheet__input--center') : param.earlyBird?.maxPoints}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb">
                    {editable ? renderInput(param.earlyBird?.minPoints, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].earlyBird.minPoints = value; }), 'bsc-sheet__input--center') : param.earlyBird?.minPoints}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb">
                    {editable ? renderInput(param.earlyBird?.minArchived, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].earlyBird.minArchived = value; }), 'bsc-sheet__input--center') : param.earlyBird?.minArchived}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy">
                    {editable ? renderInput(param.fullYear?.maxPoints, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].fullYear.maxPoints = value; }), 'bsc-sheet__input--center') : param.fullYear?.maxPoints}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy">
                    {editable ? renderInput(param.fullYear?.minPoints, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].fullYear.minPoints = value; }), 'bsc-sheet__input--center') : param.fullYear?.minPoints}
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy">
                    {editable ? renderInput(param.fullYear?.minArchived, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].parameters[pIdx].fullYear.minArchived = value; }), 'bsc-sheet__input--center') : param.fullYear?.minArchived}
                  </td>
                </tr>
              )).concat(
                // Area total row
                <tr key={`total-${aIdx}`} className="bsc-detail__row bsc-detail__row--total">
                  <td className="bsc-detail__td" colSpan="3">
                    <strong>{area.areaName} Total</strong>
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb">
                    <strong>{editable ? renderInput(area.earlyBirdTotal, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].earlyBirdTotal = value; }), 'bsc-sheet__input--dark bsc-sheet__input--center') : area.earlyBirdTotal}</strong>
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb"></td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--eb"></td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy">
                    <strong>{editable ? renderInput(area.fullYearTotal, (value) => emitChange((nextScore) => { nextScore.businessAreas[aIdx].fullYearTotal = value; }), 'bsc-sheet__input--dark bsc-sheet__input--center') : area.fullYearTotal}</strong>
                  </td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy"></td>
                  <td className="bsc-detail__td bsc-detail__td--num bsc-detail__td--fy"></td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BscScoreSheet;
