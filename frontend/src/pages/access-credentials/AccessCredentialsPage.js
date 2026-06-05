import React, { useMemo, useState } from 'react';
import Navbar from '../../components/common/Navbar';
import useSafeBackNavigation from '../../hooks/useSafeBackNavigation';
import '../../pages/dealer/DealerDashboard.css';
import './AccessCredentialsPage.css';

const INITIAL_ROWS = [
  { id: 1, dealer: '', mailId: '', password: '' },
  { id: 2, dealer: '', mailId: '', password: '' },
  { id: 3, dealer: '', mailId: '', password: '' },
  { id: 4, dealer: '', mailId: '', password: '' },
  { id: 5, dealer: '', mailId: '', password: '' },
  { id: 6, dealer: '', mailId: '', password: '' },
];

const AccessCredentialsPage = ({ dashboardPath = '/msil/dashboard' }) => {
  const goBackSafely = useSafeBackNavigation(dashboardPath);
  const ZONES = ['South', 'West', 'North', 'East', 'Central'];
  const REGIONS = ['South 1', 'South 2', 'West 1', 'North 3', 'East 2', 'Central'];

  const [zone, setZone] = useState('');
  const [region, setRegion] = useState('');
  const [dealer, setDealer] = useState('');
  const [month, setMonth] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [rows, setRows] = useState(() => INITIAL_ROWS);

  const monthInputId = useMemo(() => `access-credentials-month-${dashboardPath.replace(/\W+/g, '-')}`, [dashboardPath]);

  const updateRow = (rowId, field, value) => {
    setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  const handleAddClick = () => {
    setIsAdding((current) => {
      if (!current) {
        setRows((existingRows) => [...existingRows, { id: existingRows.length + 1, dealer: '', mailId: '', password: '' }]);
      }

      return !current;
    });
  };

  return (
    <div className="access-credentials-dashboard login-page">
      <Navbar />

      <div className="access-credentials-shell">
        <aside className="access-credentials-sidebar">
          <button className="access-credentials-sidebar__btn" type="button" onClick={goBackSafely}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 8a4 4 0 1 1 0 8h-2a4 4 0 1 1 0-8z" />
              <path d="M14 8h2a4 4 0 0 1 0 8h-2" />
            </svg>
            <span>View BSC</span>
          </button>

          <button className="access-credentials-sidebar__btn" type="button" onClick={goBackSafely}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 18h16" />
              <path d="M7 14l3-10 4 14 3-8 2 4" />
            </svg>
            <span>View NSC</span>
          </button>

          <button className="access-credentials-sidebar__btn access-credentials-sidebar__btn--active" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="12" rx="2" />
              <path d="M8 16v4" />
              <path d="M16 16v4" />
              <path d="M7 10h10" />
            </svg>
            <span>Access Credentials</span>
          </button>

          <button className="access-credentials-sidebar__back" type="button" onClick={goBackSafely}>
            <span className="access-credentials-sidebar__back-icon">↩</span>
            <span>Back</span>
          </button>
        </aside>

        <main className="access-credentials-main">
          <section className="access-credentials-panel">
            <div className="access-credentials-filter-panel">
              <div className="access-credentials-title-row">
                <h2 className="access-credentials-title">Dealer Access Credentials</h2>
                <button className="access-credentials-add-btn" type="button" onClick={handleAddClick}>
                  {isAdding ? 'Save' : 'Add'}
                  <span className="access-credentials-add-btn__icon">+</span>
                </button>
              </div>

              <div className="access-credentials-filter-grid">
                <label className="access-credentials-field">
                  <span>Zone</span>
                  <select value={zone} onChange={(event) => setZone(event.target.value)} className="access-credentials-input">
                    <option value="">Select zone</option>
                    {ZONES.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </label>

                <label className="access-credentials-field">
                  <span>Region</span>
                  <select value={region} onChange={(event) => setRegion(event.target.value)} className="access-credentials-input">
                    <option value="">Select region</option>
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>

                <label className="access-credentials-field">
                  <span>Dealer</span>
                  <input value={dealer} onChange={(event) => setDealer(event.target.value)} className="access-credentials-input" type="text" />
                </label>

                <label className="access-credentials-field access-credentials-field--month">
                  <span>Month</span>
                  <div className="access-credentials-month-wrap">
                    <input id={monthInputId} value={month} onChange={(event) => setMonth(event.target.value)} className="access-credentials-input access-credentials-input--month" type="month" />
                    <button
                      className="access-credentials-month-iconBtn"
                      type="button"
                      aria-label="Open month picker"
                      onClick={() => {
                        const input = document.getElementById(monthInputId);
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

            <div className="access-credentials-table-shell">
              <div className="access-credentials-table-frame">
                <table className="access-credentials-table">
                  <thead>
                    <tr>
                      <th>Sl No.</th>
                      <th>Dealer</th>
                      <th>Mail ID</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>
                          <input
                            className="access-credentials-table__input"
                            type="text"
                            value={row.dealer}
                            onChange={(event) => updateRow(row.id, 'dealer', event.target.value)}
                            readOnly={!isAdding}
                            placeholder={isAdding ? 'Enter dealer' : ' '}
                          />
                        </td>
                        <td>
                          <input
                            className="access-credentials-table__input"
                            type="text"
                            value={row.mailId}
                            onChange={(event) => updateRow(row.id, 'mailId', event.target.value)}
                            readOnly={!isAdding}
                            placeholder={isAdding ? 'Enter mail id' : ' '}
                          />
                        </td>
                        <td>
                          <input
                            className="access-credentials-table__input"
                            type="text"
                            value={row.password}
                            onChange={(event) => updateRow(row.id, 'password', event.target.value)}
                            readOnly={!isAdding}
                            placeholder={isAdding ? 'Enter password' : ' '}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AccessCredentialsPage;
