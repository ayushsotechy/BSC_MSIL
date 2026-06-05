import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/common/Navbar';
import BscScoreSheet from '../../components/dealer/BscScoreSheet';
import bscService from '../../services/bsc.service';
import useSafeBackNavigation from '../../hooks/useSafeBackNavigation';
import { buildVendorScorePdfRows } from '../../data/vendorBscData';
import './DealerDashboard.css';

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const sanitizeFilePart = (value) => String(value || 'BSC').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

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
        'EB Max',
        'EB Min',
        'EB Achieved',
        'FY Max',
        'FY Min',
        'FY Achieved',
      ]],
      body: buildVendorScorePdfRows(score),
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 36, halign: 'center' },
        2: { cellWidth: 240 },
        3: { cellWidth: 48, halign: 'center' },
        4: { cellWidth: 48, halign: 'center' },
        5: { cellWidth: 58, halign: 'center' },
        6: { cellWidth: 48, halign: 'center' },
        7: { cellWidth: 48, halign: 'center' },
        8: { cellWidth: 58, halign: 'center' },
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
  const goBackSafely = useSafeBackNavigation('/dealer/dashboard');
  const [selectedScore, setSelectedScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('score'); // 'score' | 'review'
  const [tabHistory, setTabHistory] = useState([]);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    const fetchDealerScore = async () => {
      if (!user?.dealerCode) {
        setSelectedScore(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = { dealerCode: user.dealerCode };
        if (month) params.month = month;
        if (year) params.fiscalYear = year;

        const response = await bscService.getScores(params);
        const scores = response.data || [];
        setSelectedScore(scores[0] || null);
      } catch (error) {
        console.error('Failed to fetch dealer BSC score', error);
        setSelectedScore(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDealerScore();
  }, [month, year, user?.dealerCode]);

  const showDealerTab = (tab) => {
    setActiveTab((currentTab) => {
      if (currentTab !== tab) {
        setTabHistory((history) => [...history, currentTab]);
      }

      return tab;
    });
  };

  const handleSidebarBack = () => {
    if (tabHistory.length) {
      const previousTab = tabHistory[tabHistory.length - 1];
      setTabHistory((history) => history.slice(0, -1));
      setActiveTab(previousTab);
      return;
    }

    goBackSafely();
  };

  return (
    <div className="dealer-dashboard login-page">
      <Navbar />

      <div className="dealer-shell">
        <aside className="dealer-sidebar">
          <button
            className={`sidebar-btn ${activeTab === 'score' ? 'sidebar-btn--active' : ''}`}
            onClick={() => showDealerTab('score')}
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
            onClick={() => showDealerTab('nsc')}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>View NSC</span>
          </button>

          <button className="dealer-sidebar__back" type="button" onClick={handleSidebarBack}>
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
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      aria-label="Select month"
                      className="bsc-filters__input"
                    >
                      <option value="">Latest Month</option>
                      {MONTH_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bsc-filters__field bsc-filters__field--month">
                  <label>Year</label>
                  <div className="bsc-filters__input-wrap">
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      aria-label="Select year"
                      className="bsc-filters__input"
                      placeholder="Latest Year"
                    />
                  </div>
                </div>

                <button
                  className={`bsc-action-btn ${activeTab === 'score' ? 'bsc-action-btn--active' : ''}`}
                  onClick={() => {
                    showDealerTab('score');
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
                  onClick={() => showDealerTab('review')}
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
                <input type="text" value={selectedScore?.dealerCode || user?.dealerCode || ''} readOnly className="bsc-dealer-input" />
              </div>
              <div className="bsc-dealer-field">
                <label>Region</label>
                <input type="text" value={selectedScore?.region || user?.region || ''} readOnly className="bsc-dealer-input" />
              </div>
              <div className="bsc-dealer-field">
                <label>Dealer Name</label>
                <input type="text" value={selectedScore?.dealerName || user?.dealerName || ''} readOnly className="bsc-dealer-input" />
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
