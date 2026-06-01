import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import BscScoreSheet from '../../components/dealer/BscScoreSheet';
import './DealerDashboard.css';

const DEMO_BSC_SCORE = {
  _id: 'demo-bsc-score',
  dealerCode: '124',
  dealerName: 'Sanvit Automotives',
  region: 'South 2',
  fiscalYear: 'FY 25-26',
  month: "Dec'25",
  earlyBird: {
    provisionalScore: '601/960',
    provisionalScorePercent: '62.6%',
    qualification: 'N',
    band: 'SILVER',
  },
  fullYear: {
    provisionalScore: '601/960',
    provisionalScorePercent: '62.6%',
    qualification: 'N',
    band: 'SILVER',
  },
  businessAreas: [
    {
      areaName: 'Sales Performance',
      earlyBirdTotal: 100,
      fullYearTotal: 100,
      parameters: [
        {
          sNo: 1,
          parameter: 'All Models Whole Sales Performance',
          accessConditionMet: 'Y I N I N (Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, minArchived: 50 },
          fullYear: { maxPoints: 100, minPoints: 0, minArchived: 50 },
        },
        {
          sNo: 1,
          parameter: 'All Models Whole Sales Performance',
          accessConditionMet: 'Y I N I N (Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, minArchived: 50 },
          fullYear: { maxPoints: 100, minPoints: 0, minArchived: 50 },
        },
        {
          sNo: 1,
          parameter: 'All Models Whole Sales Performance',
          accessConditionMet: 'Y I N I N (Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, minArchived: 50 },
          fullYear: { maxPoints: 100, minPoints: 0, minArchived: 50 },
        },
      ],
    },
    {
      areaName: 'Sales Quality Performance',
      earlyBirdTotal: 100,
      fullYearTotal: 100,
      parameters: [
        {
          sNo: 1,
          parameter: 'All Models Whole Sales Performance',
          accessConditionMet: 'Y I N I N (Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, minArchived: 50 },
          fullYear: { maxPoints: 100, minPoints: 0, minArchived: 50 },
        },
        {
          sNo: 1,
          parameter: 'All Models Whole Sales Performance',
          accessConditionMet: 'Y I N I N (Q1 I Q2 I Q3)',
          earlyBird: { maxPoints: 100, minPoints: 0, minArchived: 50 },
          fullYear: { maxPoints: 100, minPoints: 0, minArchived: 50 },
        },
      ],
    },
  ],
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDemoMonth = (monthValue) => {
  if (!monthValue) return DEMO_BSC_SCORE.month;

  const [yearPart, monthPart] = monthValue.split('-');
  const monthIndex = Number(monthPart) - 1;

  if (!yearPart || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return DEMO_BSC_SCORE.month;
  }

  const shortYear = yearPart.slice(-2);
  return `${MONTH_NAMES[monthIndex]}'${shortYear}`;
};

const buildDemoScoreForMonth = (monthValue) => ({
  ...DEMO_BSC_SCORE,
  month: formatDemoMonth(monthValue),
});

const sanitizeFilePart = (value) => String(value || 'BSC').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

const formatDetailRows = (score) => {
  const rows = [];

  score.businessAreas?.forEach((area) => {
    area.parameters?.forEach((param) => {
      rows.push([
        area.areaName,
        String(param.sNo || ''),
        param.parameter || '',
        param.accessConditionMet || '',
        String(param.earlyBird?.maxPoints ?? ''),
        String(param.earlyBird?.minPoints ?? ''),
        String(param.earlyBird?.minArchived ?? ''),
        String(param.fullYear?.maxPoints ?? ''),
        String(param.fullYear?.minPoints ?? ''),
        String(param.fullYear?.minArchived ?? ''),
      ]);
    });

    rows.push([
      `${area.areaName} Total`,
      '',
      '',
      '',
      String(area.earlyBirdTotal ?? ''),
      '',
      '',
      String(area.fullYearTotal ?? ''),
      '',
      '',
    ]);
  });

  return rows;
};

const downloadScorePdf = (score) => {
  if (!score) return;

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const title = `BSC ${score.fiscalYear} PROVISIONAL SCORE SHEET (Till ${score.month})`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, pageWidth / 2, 36, { align: 'center' });

    autoTable(doc, {
      startY: 56,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        valign: 'middle',
        lineColor: [210, 220, 245],
        lineWidth: 0.6,
      },
      headStyles: {
        fillColor: [63, 94, 208],
        textColor: [255, 255, 255],
        halign: 'center',
      },
      body: [
        ['Region', score.region || ''],
        ['Dealer Name', score.dealerName || ''],
        ['Early Bird Provisional Score', score.earlyBird?.provisionalScore || ''],
        ['Early Bird Provisional Qualification', score.earlyBird?.qualification || ''],
        ['Early Bird Provisional Band', score.earlyBird?.band || ''],
        ['Full Year Provisional Score', score.fullYear?.provisionalScore || ''],
        ['Full Year Provisional Score%', score.fullYear?.provisionalScorePercent || ''],
        ['Full Year Band', score.fullYear?.band || ''],
      ],
      columnStyles: {
        0: { fillColor: [63, 94, 208], textColor: 255, cellWidth: 220 },
        1: { fillColor: [250, 251, 255] },
      },
      margin: { left: 24, right: 24 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      theme: 'grid',
      margin: { left: 24, right: 24, bottom: 24 },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 5,
        valign: 'middle',
        lineColor: [220, 226, 242],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [63, 94, 208],
        textColor: 255,
        halign: 'center',
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [65, 75, 96],
      },
      alternateRowStyles: {
        fillColor: [247, 249, 255],
      },
      head: [[
        'Business Area',
        'S.No.',
        'Parameter',
        'Access Condition Met',
        'EB Max',
        'EB Min',
        'EB Archived',
        'FY Max',
        'FY Min',
        'FY Archived',
      ]],
      body: formatDetailRows(score),
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 36, halign: 'center' },
        2: { cellWidth: 170 },
        3: { cellWidth: 130 },
        4: { cellWidth: 42, halign: 'center' },
        5: { cellWidth: 42, halign: 'center' },
        6: { cellWidth: 46, halign: 'center' },
        7: { cellWidth: 42, halign: 'center' },
        8: { cellWidth: 42, halign: 'center' },
        9: { cellWidth: 46, halign: 'center' },
      },
      didParseCell: (hookData) => {
        const { cell, row, column } = hookData;
        if (row.raw?.[0]?.includes('Total')) {
          cell.styles.fillColor = [63, 94, 208];
          cell.styles.textColor = 255;
          cell.styles.fontStyle = 'bold';
        }

        if (column.index === 0 && row.section === 'body' && !String(row.raw?.[0] || '').includes('Total')) {
          cell.styles.fillColor = [63, 94, 208];
          cell.styles.textColor = 255;
        }
      },
    });

    const filename = `BSC_${sanitizeFilePart(score.dealerCode)}_${sanitizeFilePart(score.fiscalYear)}_${sanitizeFilePart(score.month)}.pdf`;
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch (error) {
    console.error('Failed to download BSC score sheet', error);
  }
};

const DealerDashboard = () => {
  const { user } = useAuth();
  const [selectedScore, setSelectedScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('score'); // 'score' | 'review'
  const [month, setMonth] = useState('');
  const monthInputRef = useRef(null);

  useEffect(() => {
    setSelectedScore(buildDemoScoreForMonth(month));
    setLoading(false);
  }, [month]);

  return (
    <div className="dealer-dashboard login-page">
      <Navbar />

      <div className="dealer-shell">
        <aside className="dealer-sidebar">
          <button
            className={`sidebar-btn ${activeTab === 'score' ? 'sidebar-btn--active' : ''}`}
            onClick={() => setActiveTab('score')}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>View BSC</span>
          </button>

          <button
            className={`sidebar-btn ${activeTab === 'nsc' ? 'sidebar-btn--active' : ''}`}
            onClick={() => setActiveTab('nsc')}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>View NSC</span>
          </button>

          <button className="dealer-sidebar__back" type="button">
            <span className="dealer-sidebar__back-icon">↩</span>
            <span>Back</span>
          </button>
        </aside>

        <main className="dealer-main">
          <div className="dealer-panel">
            <div className="dealer-main__header">
              <h2 className="dealer-main__title">View BSC Score page</h2>
            </div>

            <div className="bsc-filters-panel">
              <div className="bsc-filters">
                <div className="bsc-filters__field bsc-filters__field--month">
                  <label>Month</label>
                  <div className="bsc-filters__input-wrap">
                    <input
                      ref={monthInputRef}
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      aria-label="Select month and year"
                      className="bsc-filters__input"
                    />
                    <button
                      type="button"
                      className="bsc-filters__cal-button"
                      onClick={() => {
                        const input = monthInputRef.current;
                        if (!input) return;

                        if (typeof input.showPicker === 'function') {
                          input.showPicker();
                        } else {
                          input.focus();
                        }
                      }}
                      aria-label="Open month picker"
                    >
                      <svg className="bsc-filters__cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  className={`bsc-action-btn ${activeTab === 'score' ? 'bsc-action-btn--active' : ''}`}
                  onClick={() => {
                    setActiveTab('score');
                    downloadScorePdf(selectedScore);
                  }}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Score Sheet
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                <button
                  className={`bsc-action-btn bsc-action-btn--review ${activeTab === 'review' ? 'bsc-action-btn--active' : ''}`}
                  onClick={() => setActiveTab('review')}
                  type="button"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16" />
                    <path d="M4 12h10" />
                    <path d="M4 17h16" />
                    <path d="M17 12l3 3 3-3" />
                  </svg>
                  Review Sheet
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bsc-dealer-fields">
              <div className="bsc-dealer-field">
                <label>BSC Parent Dealer Code</label>
                <input type="text" value={user?.dealerCode || ''} readOnly className="bsc-dealer-input" />
              </div>
              <div className="bsc-dealer-field">
                <label>Region</label>
                <input type="text" value={user?.region || ''} readOnly className="bsc-dealer-input" />
              </div>
              <div className="bsc-dealer-field">
                <label>Dealer Name</label>
                <input type="text" value={user?.dealerName || ''} readOnly className="bsc-dealer-input" />
              </div>
            </div>

            {loading ? (
              <div className="bsc-loading">Loading BSC data...</div>
            ) : selectedScore ? (
              <BscScoreSheet score={selectedScore} />
            ) : (
              <div className="bsc-empty">No BSC score data available for your account.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DealerDashboard;
