import React, { useRef, useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import BscScoreSheet from '../../components/dealer/BscScoreSheet';
import bscService from '../../services/bsc.service';
import { buildVendorBscScore, getVendorBscData } from '../../data/vendorBscData';
import './AdminDashboard.css';
import '../../pages/dealer/DealerDashboard.css';
import '../msil/MsilDashboard.css';

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

const cloneScoreForDealer = (dealer, vendorKey = 'maruti') =>
  buildVendorBscScore({
    vendorKey,
    dealerId: dealer._id === 'new' ? 0 : dealer._id || 0,
    dealerCodeOffset: 200,
    dealerName: dealer.dealerName || dealer.dealerParent || '',
    region: dealer.region || '',
    fiscalYear: getVendorBscData(vendorKey).scoreTemplate.fiscalYear,
    month: getVendorBscData(vendorKey).scoreTemplate.month,
  });

const metricValue = (metric, key) => {
  if (metric && typeof metric === 'object') {
    if (key === 'achieved') return metric.achieved ?? metric.pointsAchieved ?? 0;
    return metric[key] ?? 0;
  }
  return metric ?? 0;
};

const metricTotal = (area, period, key) => {
  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + (Number(metricValue(param?.[period], key)) || 0),
      0,
    );
  }

  const total = area?.[`${period}Total`];
  if (total && typeof total === 'object') return metricValue(total, key);
  if (key === 'achieved') return Number(total) || 0;

  return 0;
};

const normalizeMetric = (metric = {}) => ({
  maxPoints: Number(metricValue(metric, 'maxPoints')) || 0,
  minPoints: Number(metricValue(metric, 'minPoints')) || 0,
  achieved: Number(metricValue(metric, 'achieved')) || 0,
});

const normalizeScoreForApi = (score) => ({
  dealerCode: String(score?.dealerCode || '').trim(),
  dealerName: String(score?.dealerName || '').trim(),
  region: String(score?.region || '').trim(),
  fiscalYear: String(score?.fiscalYear || '').trim(),
  month: String(score?.month || '').trim(),
  provisionalType: score?.provisionalType || 'provisional',
  earlyBird: {
    provisionalScore: `${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'achieved')) || 0), 0)}/${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'maxPoints')) || 0), 0)}`,
    provisionalScorePercent: (() => {
      const achieved = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'achieved')) || 0), 0);
      const max = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'maxPoints')) || 0), 0);
      return max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%';
    })(),
    qualification: score?.earlyBird?.qualification || 'N',
    band: score?.earlyBird?.band || '',
  },
  fullYear: {
    provisionalScore: `${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'achieved')) || 0), 0)}/${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'maxPoints')) || 0), 0)}`,
    provisionalScorePercent: (() => {
      const achieved = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'achieved')) || 0), 0);
      const max = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'maxPoints')) || 0), 0);
      return max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%';
    })(),
    qualification: score?.fullYear?.qualification || 'N',
    band: score?.fullYear?.band || '',
  },
  businessAreas: (score?.businessAreas || []).map((area) => ({
    areaName: area?.areaName || '',
    earlyBirdTotal: Number(metricTotal(area, 'earlyBird', 'achieved')) || 0,
    fullYearTotal: Number(metricTotal(area, 'fullYear', 'achieved')) || 0,
    parameters: (area?.parameters || []).map((param) => ({
      sNo: param?.sNo,
      parameter: param?.parameter || param?.name || '',
      accessConditionMet: param?.accessConditionMet || param?.condition || '',
      earlyBird: normalizeMetric(param?.earlyBird || {
        maxPoints: param?.ebMax,
        minPoints: param?.ebMin,
        achieved: param?.ebAchieved,
      }),
      fullYear: normalizeMetric(param?.fullYear || {
        maxPoints: param?.fyMax,
        minPoints: param?.fyMin,
        achieved: param?.fyAchieved,
      }),
    })),
  })),
});

const AdminDashboard = ({ readOnly = false }) => {
  const [activeTab, setActiveTab] = useState('bsc');
  const [zone, setZone] = useState('');
  const [region, setRegion] = useState('');
  const [dealer, setDealer] = useState('');
  const [month, setMonth] = useState('');
  const monthInputRef = useRef(null);
  
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [draftScore, setDraftScore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Database State
  const [tableRows, setTableRows] = useState([]);
  const [nscRows, setNscRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMasterData = async () => {
    try {
      setIsLoading(true);
      const response = await bscService.getScores();
      const dbData = response.data || [];
      setTableRows(dbData);
      setNscRows(dbData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch exactly from DB
  useEffect(() => {
    if (!selectedDealer) {
      fetchMasterData();
    }
  }, [activeTab, selectedDealer]);

  const openDealerScore = (row, editing = false, tab = 'bsc') => {
    // If it's coming from MongoDB, it is already a fully formed scorecard
    // so we don't need to 'cloneScoreForDealer' the master template over it.
    const score = cloneScore(row); 
    setActiveTab(tab);
    setSelectedDealer({ row, score });
    setDraftScore(score);
    setIsEditing(editing);
  };

  const handleAddNewScore = () => {
    if (readOnly) return;
    // Generate an empty master template for a new entry
    const blankRow = { _id: 'new', dealerName: '', region: '' };
    const score = cloneScoreForDealer(blankRow);
    setSelectedDealer({ row: blankRow, score });
    setDraftScore(cloneScore(score));
    setIsEditing(true);
  };

  const handleSaveScore = async () => {
    if (!selectedDealer || !draftScore) return;

    try {
      const payload = normalizeScoreForApi(draftScore);
      
      const response = selectedDealer.row._id === 'new'
        ? await bscService.createScore(payload)
        : await bscService.updateScore(selectedDealer.row._id, payload);
      
      const savedScore = response.data || { ...payload, _id: selectedDealer.row._id };
      setSelectedDealer((current) => (current ? { ...current, row: savedScore, score: cloneScore(savedScore) } : current));
      setDraftScore(cloneScore(savedScore));
      setIsEditing(false);
      alert('Scorecard saved successfully!');
      await fetchMasterData();
    } catch (error) {
      console.error('Failed to save', error);
      alert(error.response?.data?.message || 'Failed to save data. Check console.');
    }
  };

  const activeScore = draftScore || selectedDealer?.score;

  const showMasterTab = (tab) => {
    setActiveTab(tab);
    setSelectedDealer(null);
    setDraftScore(null);
    setIsEditing(false);
  };

  // ----- INDIVIDUAL DEALER VIEW (Triggered after clicking View/Edit) -----
  if (selectedDealer) {
    return (
      <div className="dealer-dashboard login-page">
        <Navbar />
        <div className="dealer-shell">
          <aside className="dealer-sidebar">
            <button className={`sidebar-btn ${activeTab === 'bsc' ? 'sidebar-btn--active' : ''}`} type="button" onClick={() => showMasterTab('bsc')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              <span>View BSC</span>
            </button>
            <button className={`sidebar-btn ${activeTab === 'nsc' ? 'sidebar-btn--active' : ''}`} type="button" onClick={() => showMasterTab('nsc')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              <span>View NSC</span>
            </button>
            <button className="dealer-sidebar__back" type="button" onClick={() => showMasterTab('bsc')}>
              <span className="dealer-sidebar__back-icon">↩</span><span>Back</span>
            </button>
          </aside>

          <main className="dealer-main">
            <div className="dealer-panel">
              <div className="dealer-main__header dealer-main__header--stacked">
              <h2 className="dealer-main__title">
                  {isEditing && !readOnly ? `Edit ${activeTab === 'nsc' ? 'NSC' : 'BSC'} Score page` : `View ${activeTab === 'nsc' ? 'NSC' : 'BSC'} Score page`}
                </h2>
                {!readOnly && (
                <div className="admin-editor-actions">
                  {isEditing ? (
                    <>
                      <button className="admin-action-btn admin-action-btn--save" type="button" onClick={handleSaveScore}>
                        Save <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
                      </button>
                      <button className="admin-action-btn admin-action-btn--cancel" type="button" onClick={() => { 
                        if (selectedDealer.row._id === 'new') showMasterTab(activeTab); 
                        else { setDraftScore(cloneScore(selectedDealer.score)); setIsEditing(false); }
                      }}>
                        Cancel <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                      </button>
                    </>
                  ) : (
                    <button className="admin-action-btn admin-action-btn--edit" type="button" onClick={() => setIsEditing(true)}>
                      Edit <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                  )}
                </div>
                )}
              </div>
              <BscScoreSheet score={activeScore} editable={!readOnly && isEditing} onChange={setDraftScore} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ----- DIRECTORY SUMMARY VIEW (Master Table) -----
  return (
    <div className="msil-dashboard login-page">
      <Navbar />

      <div className="msil-shell">
        <aside className="msil-sidebar">
           <button className={`msil-sidebar__btn ${activeTab === 'bsc' ? 'msil-sidebar__btn--active' : ''}`} type="button" onClick={() => showMasterTab('bsc')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 8a4 4 0 1 1 0 8h-2a4 4 0 1 1 0-8z" /><path d="M14 8h2a4 4 0 0 1 0 8h-2" /></svg>
            <span>View BSC</span>
          </button>
          <button className={`msil-sidebar__btn ${activeTab === 'nsc' ? 'msil-sidebar__btn--active' : ''}`} type="button" onClick={() => showMasterTab('nsc')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 18h16" /><path d="M7 14l3-10 4 14 3-8 2 4" /></svg>
            <span>View NSC</span>
          </button>
        </aside>

        <main className="msil-main">
          <section className="msil-panel">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="msil-title" style={{ margin: 0 }}>
                {activeTab === 'nsc' ? 'View NSC Master Data' : 'View BSC Master Data'}
              </h2>
              
              {!readOnly && (
              <button 
                className="admin-action-btn admin-action-btn--save" 
                style={{ padding: '10px 16px', background: '#4a6ee0', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                onClick={handleAddNewScore}
              >
                + Add New {activeTab === 'nsc' ? 'NSC' : 'BSC'} Score
              </button>
              )}
            </div>

            {/* FILTER PANEL */}
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

            {/* NSC DATA TABLE */}
            {activeTab === 'nsc' ? (
              <div className="msil-table-shell">
                <table className="msil-table">
                  <thead>
                    <tr><th>Sl No.</th><th>Region</th><th>Dealer Name</th><th>Last Year Band</th><th>Current Year Band</th><th>Year</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading Data...</td></tr>
                    ) : nscRows.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No NSC Master Data found in database.</td></tr>
                    ) : (
                      nscRows.map((row, index) => (
                        <tr key={row._id || index}>
                          <td>{index + 1}</td> 
                          <td>{row.region || '-'}</td>
                          <td>{row.dealerName || '-'}</td>
                          <td>{row.fullYear?.band || '-'}</td>
                          <td>{row.earlyBird?.band || '-'}</td>
                          <td>{row.fiscalYear || '-'}</td>
                          <td>
                            <div className="admin-actions">
                              {!readOnly && <button className="admin-action-btn admin-action-btn--edit" type="button" onClick={() => openDealerScore(row, true, 'nsc')}>Edit</button>}
                              <button className="admin-action-btn admin-action-btn--view" type="button" onClick={() => openDealerScore(row, false, 'nsc')}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* BSC DATA TABLE */
              <div className="msil-table-shell">
                <table className="msil-table">
                  <thead>
                    <tr><th>Sl No.</th><th>Region</th><th>Dealer Name</th><th>Dealer Code</th><th>Role</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Loading Data...</td></tr>
                    ) : tableRows.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No BSC Master Data found in database.</td></tr>
                    ) : (
                      tableRows.map((row, index) => (
                        <tr key={row._id || index}>
                          <td>{index + 1}</td>
                          <td>{row.region || '-'}</td>
                          <td>{row.dealerName || '-'}</td>
                          <td>{row.dealerCode || '-'}</td>
                          <td>Dealer</td>
                          <td>Active</td>
                          <td>
                            <div className="admin-actions">
                              {!readOnly && <button className="admin-action-btn admin-action-btn--edit" type="button" onClick={() => openDealerScore(row, true, 'bsc')}>Edit</button>}
                              <button className="admin-action-btn admin-action-btn--view" type="button" onClick={() => openDealerScore(row, false, 'bsc')}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
