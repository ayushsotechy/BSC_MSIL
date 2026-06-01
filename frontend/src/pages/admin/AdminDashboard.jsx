import React, { useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import BscScoreSheet from '../../components/dealer/BscScoreSheet';
import './AdminDashboard.css';
import '../../pages/dealer/DealerDashboard.css';
import '../msil/MsilDashboard.css';

const BASE_SCORE = {
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
      ],
    },
  ],
};

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

const MASTER_ROWS = [
  { id: 1, zone: 'South', region: 'South 2', dealerParent: 'Sanvit Automotives', username: 'SANVIT124', role: 'Dealer', status: 'Active' },
  { id: 2, zone: 'West', region: 'West 1', dealerParent: 'Metro Suzuki', username: 'METRO087', role: 'Dealer', status: 'Active' },
  { id: 3, zone: 'North', region: 'North 3', dealerParent: 'North Star Motors', username: 'NORTH203', role: 'Dealer', status: 'Inactive' },
  { id: 4, zone: 'East', region: 'East 2', dealerParent: 'Cityline Auto', username: 'CITY109', role: 'Dealer', status: 'Active' },
  { id: 5, zone: 'South', region: 'South 1', dealerParent: 'Prime Wheels', username: 'PRIME422', role: 'Dealer', status: 'Active' },
  { id: 6, zone: 'Central', region: 'Central', dealerParent: 'Apex Mobility', username: 'APEX317', role: 'Dealer', status: 'Active' },
];

const cloneScoreForDealer = (dealer) => ({
  _id: `admin-demo-${dealer.id}`,
  dealerCode: String(200 + dealer.id),
  fiscalYear: dealer.role === 'Admin' ? 'FY 25-26' : BASE_SCORE.fiscalYear,
  month: BASE_SCORE.month,
  ...cloneScore(BASE_SCORE),
  dealerName: dealer.dealerParent,
  region: dealer.region,
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
    console.error('Failed to download admin score sheet', error);
  }
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [zone, setZone] = useState('');
  const [region, setRegion] = useState('');
  const [dealer, setDealer] = useState('');
  const [month, setMonth] = useState('');
  const monthInputRef = useRef(null);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [draftScore, setDraftScore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const tableRows = useMemo(() => MASTER_ROWS, []);

  const openDealerScore = (row, editing = false) => {
    const score = cloneScoreForDealer(row);
    setSelectedDealer({ row, score });
    setDraftScore(cloneScore(score));
    setIsEditing(editing);
  };

  const handleSaveScore = () => {
    if (!selectedDealer || !draftScore) return;

    setSelectedDealer((current) => (current ? { ...current, score: cloneScore(draftScore) } : current));
    setIsEditing(false);
  };

  const activeScore = draftScore || selectedDealer?.score;

  if (selectedDealer) {
    return (
      <div className="dealer-dashboard login-page">
        <Navbar />

        <div className="dealer-shell">
          <aside className="dealer-sidebar">
            <button className="sidebar-btn sidebar-btn--active" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>View BSC</span>
            </button>

            <button className="sidebar-btn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>View NSC</span>
            </button>

            <button className="sidebar-btn" type="button" onClick={() => navigate('/admin/access-credentials')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="12" rx="2" />
                <path d="M8 16v4" />
                <path d="M16 16v4" />
                <path d="M7 10h10" />
              </svg>
              <span>Access Credentials</span>
            </button>

            <button className="dealer-sidebar__back" type="button" onClick={() => setSelectedDealer(null)}>
              <span className="dealer-sidebar__back-icon">↩</span>
              <span>Back</span>
            </button>
          </aside>

          <main className="dealer-main">
            <div className="dealer-panel">
              <div className="dealer-main__header dealer-main__header--stacked">
                <h2 className="dealer-main__title">
                  {isEditing ? 'Edit BSC Score page' : 'View BSC Score page'}
                </h2>
                <div className="admin-editor-actions">
                  {isEditing ? (
                    <>
                      <button className="admin-action-btn admin-action-btn--save" type="button" onClick={handleSaveScore}>
                        Save
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </button>
                      <button className="admin-action-btn admin-action-btn--cancel" type="button" onClick={() => { setDraftScore(cloneScore(selectedDealer.score)); setIsEditing(false); }}>
                        Cancel
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <button className="admin-action-btn admin-action-btn--edit" type="button" onClick={() => setIsEditing(true)}>
                      Edit
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="bsc-filters-panel">
                <div className="bsc-filters">
                  <div className="bsc-filters__field bsc-filters__field--month">
                    <label>Month</label>
                    <div className="bsc-filters__input-wrap">
                      <input ref={monthInputRef} value={month} onChange={(e) => setMonth(e.target.value)} className="bsc-filters__input" type="month" />
                      <button
                        className="bsc-filters__cal-button"
                        type="button"
                        aria-label="Open month picker"
                        onClick={() => {
                          const input = monthInputRef.current;
                          if (!input) return;
                          if (typeof input.showPicker === 'function') input.showPicker();
                          else input.focus();
                        }}
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

                  <button className="bsc-action-btn bsc-action-btn--active" type="button" onClick={() => downloadScorePdf(activeScore)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Score Sheet
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  <button className="bsc-action-btn bsc-action-btn--review" type="button">
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
                  <input type="text" value={activeScore.dealerCode} readOnly={!isEditing} onChange={(event) => setDraftScore((current) => ({ ...current, dealerCode: event.target.value }))} className="bsc-dealer-input" />
                </div>
                <div className="bsc-dealer-field">
                  <label>Region</label>
                  <input type="text" value={activeScore.region} readOnly={!isEditing} onChange={(event) => setDraftScore((current) => ({ ...current, region: event.target.value }))} className="bsc-dealer-input" />
                </div>
                <div className="bsc-dealer-field">
                  <label>Dealer Name</label>
                  <input type="text" value={activeScore.dealerName} readOnly={!isEditing} onChange={(event) => setDraftScore((current) => ({ ...current, dealerName: event.target.value }))} className="bsc-dealer-input" />
                </div>
              </div>

              <BscScoreSheet score={activeScore} editable={isEditing} onChange={setDraftScore} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="msil-dashboard login-page">
      <Navbar />

      <div className="msil-shell">
        <aside className="msil-sidebar">
          <button className="msil-sidebar__btn msil-sidebar__btn--active" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 8a4 4 0 1 1 0 8h-2a4 4 0 1 1 0-8z" />
              <path d="M14 8h2a4 4 0 0 1 0 8h-2" />
            </svg>
            <span>View BSC</span>
          </button>

          <button className="msil-sidebar__btn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 18h16" />
              <path d="M7 14l3-10 4 14 3-8 2 4" />
            </svg>
            <span>View NSC</span>
          </button>

            <button className="msil-sidebar__btn" type="button" onClick={() => navigate('/admin/access-credentials')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="12" rx="2" />
              <path d="M8 16v4" />
              <path d="M16 16v4" />
              <path d="M7 10h10" />
            </svg>
            <span>Access Credentials</span>
          </button>

          <button className="msil-sidebar__back" type="button">
            <span className="msil-sidebar__back-icon">↩</span>
            <span>Back</span>
          </button>
        </aside>

        <main className="msil-main">
          <section className="msil-panel">
            <h2 className="msil-title">View BSC Master Data</h2>

            <div className="msil-filter-panel">
              <div className="msil-filter-grid">
                <label className="msil-field">
                  <span>Zone</span>
                  <input value={zone} onChange={(e) => setZone(e.target.value)} className="msil-input" type="text" />
                </label>

                <label className="msil-field">
                  <span>Region</span>
                  <input value={region} onChange={(e) => setRegion(e.target.value)} className="msil-input" type="text" />
                </label>

                <label className="msil-field">
                  <span>Dealer</span>
                  <input value={dealer} onChange={(e) => setDealer(e.target.value)} className="msil-input" type="text" />
                </label>

                <label className="msil-field msil-field--month">
                  <span>Month</span>
                  <div className="msil-month-wrap">
                    <input ref={monthInputRef} value={month} onChange={(e) => setMonth(e.target.value)} className="msil-input msil-input--month" type="month" />
                    <button
                      className="msil-month-iconBtn"
                      type="button"
                      aria-label="Open month picker"
                      onClick={() => {
                        const input = monthInputRef.current;
                        if (!input) return;
                        if (typeof input.showPicker === 'function') input.showPicker();
                        else input.focus();
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="msil-table-shell">
              <table className="msil-table">
                <thead>
                  <tr>
                    <th>Sl No.</th>
                    <th>Region</th>
                    <th>Dealer Parent</th>
                    <th>Last Year Band</th>
                    <th>Current Year Band</th>
                    <th>Year</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.region}</td>
                      <td>{row.dealerParent}</td>
                      <td>{row.lastYearBand}</td>
                      <td>{row.currentYearBand}</td>
                      <td>{row.year}</td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-action-btn admin-action-btn--edit" type="button" onClick={() => openDealerScore(row, true)}>
                            Edit
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button className="admin-action-btn admin-action-btn--view" type="button" onClick={() => openDealerScore(row, false)}>
                            View
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;