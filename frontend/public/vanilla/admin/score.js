(function () {
  const API_BASE_URL = window.BSC_API_BASE_URL || 'http://localhost:5001/api';
  const params = new URLSearchParams(window.location.search);
  const scoreId = params.get('id');
  const mode = params.get('mode') === 'edit' ? 'edit' : 'view';
  let currentScore = null;

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

  const elements = {
    userName: document.getElementById('navbar-user-name'),
    userCode: document.getElementById('navbar-user-code'),
    logoutButton: document.getElementById('logout-button'),
    backButton: document.getElementById('back-button'),
    loading: document.getElementById('score-loading'),
    content: document.getElementById('score-content'),
    pageTitle: document.getElementById('score-page-title'),
    editButton: document.getElementById('edit-button'),
    scoreSheetButton: document.getElementById('score-sheet-button'),
    reviewSheetButton: document.getElementById('review-sheet-button'),
    toastRegion: document.getElementById('toast-region'),
  };

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('bsc_user') || 'null');
    } catch (error) {
      return null;
    }
  }

  function ensureAdmin() {
    const user = getStoredUser();
    if (!user || user.role !== 'admin') {
      window.location.replace('/login');
      return null;
    }
    return user;
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type || 'info'}`;
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }

  async function apiGet(path) {
    const token = localStorage.getItem('bsc_token');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to fetch score sheet.');
    return data;
  }

  async function apiPut(path, payload) {
    const token = localStorage.getItem('bsc_token');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to save score sheet.');
    return data;
  }

  function valueOf(value) {
    return value === null || value === undefined || value === '' ? '' : value;
  }

  function metricValue(metric, key) {
    if (metric && typeof metric === 'object') {
      if (key === 'achieved') return metric.achieved ?? metric.pointsAchieved ?? 0;
      return metric[key] ?? 0;
    }
    return metric ?? 0;
  }

  function toNumber(value) {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  }

  function decimalPlaces(value) {
    const text = String(value ?? '').trim();
    if (!text.includes('.')) return 0;
    return text.split('.')[1]?.replace(/0+$/, '').length || 0;
  }

  function formatAchieved(value) {
    if (value === null || value === undefined || value === '') return '';
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return value;
    return decimalPlaces(value) >= 2 ? numberValue.toFixed(1) : String(value);
  }

  function formatTotal(value) {
    if (value === null || value === undefined || value === '') return '';
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return value;
    return String(Math.round(numberValue));
  }

  function getTotalValue(area, period, key) {
    const total = area?.[`${period}Total`];
    if (total !== undefined && total !== null && total !== '') {
      if (total && typeof total === 'object') return metricValue(total, key);
      if (key === 'achieved') return toNumber(total);
    }

    return (area?.parameters || []).reduce((sum, param) => {
      if (param?.excludeFromTotals) return sum;
      return sum + toNumber(metricValue(param?.[period], key));
    }, 0);
  }

  function summarizePeriod(score, period) {
    const explicitTotal = score?.[period]?.total;
    if (explicitTotal && typeof explicitTotal === 'object') {
      return {
        maxPoints: metricValue(explicitTotal, 'maxPoints'),
        minPoints: metricValue(explicitTotal, 'minPoints'),
        achieved: metricValue(explicitTotal, 'achieved'),
      };
    }

    const businessAreas = score?.businessAreas || [];
    return {
      maxPoints: businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'maxPoints')), 0),
      minPoints: businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'minPoints')), 0),
      achieved: businessAreas.reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'achieved')), 0),
    };
  }

  function getEvaluationPeriod(score) {
    const rawMonth = String(score?.month || '').trim();
    if (rawMonth.includes("'")) return rawMonth;
    const month = MONTH_SHORT_NAMES[rawMonth.toLowerCase()] || rawMonth.slice(0, 3) || 'Month';
    const yearText = String(score?.fiscalYear || '').trim();
    const fullYearMatch = yearText.match(/\b(20\d{2})\b/);
    const fyMatch = yearText.match(/fy\s*\d{2}\s*[-/]\s*(\d{2})/i);
    const yearSuffix = fullYearMatch ? fullYearMatch[1].slice(-2) : fyMatch?.[1] || '';
    return yearSuffix ? `${month}'${yearSuffix}` : month;
  }

  function getProvisionalScoreMax(score, summary) {
    const scoreText = String(score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '');
    const denominator = scoreText.includes('/') ? Number(scoreText.split('/').pop()) : 0;
    return denominator || summary?.maxPoints || 0;
  }

  function appendCell(row, text, className, attrs = {}) {
    const cell = document.createElement(attrs.header ? 'th' : 'td');
    cell.textContent = valueOf(text);
    if (className) cell.className = className;
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== 'header') cell.setAttribute(key, value);
    });
    row.appendChild(cell);
    return cell;
  }

  function makeEditableInput(value, onInput) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = valueOf(value);
    input.className = 'score-edit-input';
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function appendEditableCell(row, text, className, onInput, attrs = {}) {
    if (mode !== 'edit') return appendCell(row, text, className, attrs);

    const cell = document.createElement(attrs.header ? 'th' : 'td');
    if (className) cell.className = `${className} editable-cell`;
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== 'header') cell.setAttribute(key, value);
    });
    cell.appendChild(makeEditableInput(text, onInput));
    row.appendChild(cell);
    return cell;
  }

  function makeReadOnlyInput(value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = valueOf(value);
    input.readOnly = true;
    return input;
  }

  function renderTopFields(container, score) {
    const grid = document.createElement('div');
    grid.className = 'score-top-grid';
    [
      ['BSC Parent Dealer Code', score.dealerCode],
      ['Region', score.region],
      ['Dealer Name', score.dealerName],
    ].forEach(([labelText, value]) => {
      const field = document.createElement('div');
      field.className = 'score-top-field';
      const label = document.createElement('label');
      label.textContent = labelText;
      field.appendChild(label);
      field.appendChild(makeReadOnlyInput(value));
      grid.appendChild(field);
    });
    container.appendChild(grid);
  }

  function setSummaryValue(score, period, field, value) {
    score[period] = { ...(score[period] || {}), [field]: value };
  }

  function renderInfoTable(container, score, earlySummary, fullSummary) {
    const table = document.createElement('table');
    table.className = 'info-table';
    const body = document.createElement('tbody');
    const rows = [
      [['Region', score.region, '', '']],
      [['Dealer Name', score.dealerName, '', '']],
      [['Fiscal Year', score.fiscalYear, 'Month', score.month]],
      [['Early Bird Provisional Score', score.earlyBird?.provisionalScore || `${earlySummary.achieved}/${earlySummary.maxPoints}`, 'Full Year Provisional Score', score.fullYear?.provisionalScore || `${fullSummary.achieved}/${fullSummary.maxPoints}`, 'earlyBird', 'provisionalScore', 'fullYear', 'provisionalScore']],
      [['Early Bird Provisional Qualification', score.earlyBird?.qualification, 'Full Year Provisional Score %', score.fullYear?.provisionalScorePercent || '', 'earlyBird', 'qualification', 'fullYear', 'provisionalScorePercent']],
      [['Early Bird Provisional Band', score.earlyBird?.band, 'Full Year Band', score.fullYear?.band, 'earlyBird', 'band', 'fullYear', 'band']],
    ];

    rows.forEach(([cells], index) => {
      const row = document.createElement('tr');
      appendCell(row, cells[0], 'header-label');
      const firstValue = appendCell(row, cells[1], 'value-cell');
      if (index === 1) firstValue.colSpan = 3;
      if (index < 2) {
        if (index === 0) appendCell(row, '', 'value-cell', { colspan: '2' });
      } else {
        appendCell(row, cells[2], 'header-label');
        if (index >= 3) {
          appendEditableCell(row, cells[3], 'value-cell', (value) => setSummaryValue(score, cells[6], cells[7], value));
        } else {
          appendCell(row, cells[3], 'value-cell');
        }
      }
      if (index >= 3) {
        firstValue.textContent = '';
        if (mode === 'edit') {
          firstValue.classList.add('editable-cell');
          firstValue.appendChild(makeEditableInput(cells[1], (value) => setSummaryValue(score, cells[4], cells[5], value)));
        } else {
          firstValue.textContent = valueOf(cells[1]);
        }
      }
      body.appendChild(row);
    });

    table.appendChild(body);
    container.appendChild(table);
  }

  function renderScoreTable(container, score, earlySummary, fullSummary) {
    const wrap = document.createElement('div');
    wrap.className = 'score-table-wrap';
    const table = document.createElement('table');
    table.className = 'score-table';
    const thead = document.createElement('thead');
    const header1 = document.createElement('tr');
    appendCell(header1, 'Business Area', 'bg-primary', { header: true, rowspan: '2' });
    appendCell(header1, 'S.No.', 'bg-primary', { header: true, rowspan: '2' });
    appendCell(header1, 'Parameter', 'bg-primary', { header: true, rowspan: '2' });
    appendCell(header1, 'EARLY BIRD EVALUATION', 'period-header period-header--early', { header: true, colspan: '3' });
    appendCell(header1, 'FULL YEAR EVALUATION', 'period-header period-header--full', { header: true, colspan: '3' });
    thead.appendChild(header1);

    const header2 = document.createElement('tr');
    ['Max Points', 'Min Points', 'Points Achieved'].forEach((text) => {
      appendCell(header2, text, 'period-subheader period-subheader--early', { header: true });
    });
    ['Max Points', 'Min Points', 'Points Achieved'].forEach((text) => {
      appendCell(header2, text, 'period-subheader period-subheader--full', { header: true });
    });
    thead.appendChild(header2);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    (score.businessAreas || []).forEach((area) => {
      const params = area.parameters || [];
      params.forEach((param, index) => {
        const row = document.createElement('tr');
        if (index === 0) {
          appendCell(row, area.areaName, 'business-area-cell', { rowspan: String(Math.max(params.length, 1)) });
        }
        appendCell(row, param.sNo, 'center-text');
        appendCell(row, param.parameter, '');
        appendCell(row, metricValue(param.earlyBird, 'maxPoints'), 'center-text period-cell--early bold-band');
        appendCell(row, metricValue(param.earlyBird, 'minPoints'), 'center-text period-cell--early bold-band');
        appendEditableCell(row, formatAchieved(metricValue(param.earlyBird, 'achieved')), 'center-text period-cell--early bold-band', (value) => {
          param.earlyBird = { ...(param.earlyBird || {}), achieved: Number.isNaN(Number(value)) ? value : Number(value) };
        });
        appendCell(row, metricValue(param.fullYear, 'maxPoints'), 'center-text period-cell--full bold-band');
        appendCell(row, metricValue(param.fullYear, 'minPoints'), 'center-text period-cell--full bold-band');
        appendEditableCell(row, formatAchieved(metricValue(param.fullYear, 'achieved')), 'center-text period-cell--full bold-band', (value) => {
          param.fullYear = { ...(param.fullYear || {}), achieved: Number.isNaN(Number(value)) ? value : Number(value) };
        });
        tbody.appendChild(row);
      });

      const subtotal = document.createElement('tr');
      subtotal.className = 'subtotal-row';
      appendCell(subtotal, `${area.areaName} Total`, 'right-text', { colspan: '3' });
      ['earlyBird', 'fullYear'].forEach((period) => {
        ['maxPoints', 'minPoints', 'achieved'].forEach((field) => {
          const className = `center-text bold-band subtotal-period--${period === 'earlyBird' ? 'early' : 'full'} ${field === 'achieved' ? 'subtotal-period--achieved' : ''}`;
          appendEditableCell(subtotal, formatTotal(getTotalValue(area, period, field)), className, (value) => {
            const key = `${period}Total`;
            area[key] = {
              ...(area[key] && typeof area[key] === 'object' ? area[key] : {}),
              maxPoints: getTotalValue(area, period, 'maxPoints'),
              minPoints: getTotalValue(area, period, 'minPoints'),
              achieved: getTotalValue(area, period, 'achieved'),
              [field]: Number.isNaN(Number(value)) ? value : Number(value),
            };
          });
        });
      });
      tbody.appendChild(subtotal);
    });

    const grandTotal = document.createElement('tr');
    grandTotal.className = 'grand-total-row';
    appendCell(grandTotal, 'TOTAL', 'right-text', { colspan: '3' });
    [['earlyBird', earlySummary], ['fullYear', fullSummary]].forEach(([period, summary]) => {
      ['maxPoints', 'minPoints', 'achieved'].forEach((field) => {
        const className = `center-text bold-band subtotal-period--${period === 'earlyBird' ? 'early' : 'full'} ${field === 'achieved' ? 'subtotal-period--achieved' : ''}`;
        appendEditableCell(grandTotal, formatTotal(summary[field]), className, (value) => {
          score[period] = {
            ...(score[period] || {}),
            total: {
              ...(score[period]?.total && typeof score[period].total === 'object' ? score[period].total : summary),
              [field]: Number.isNaN(Number(value)) ? value : Number(value),
            },
          };
        });
      });
    });
    tbody.appendChild(grandTotal);

    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderNote(container, score, fullSummary) {
    const note = document.createElement('div');
    note.className = 'bsc-note';
    const period = getEvaluationPeriod(score);
    const maxPoints = getProvisionalScoreMax(score, fullSummary);
    note.innerHTML = `
      <p><strong>Note :</strong></p>
      <p>1. Evaluation till ${period} has been done out of ${maxPoints} Points excluding parameter norms related to ARENA &amp; TV Manpower Certification, True Value Retention, Service Infrastructure, MSGA (Norm C), Dealer Financials, ARENA &amp; TV Sales Infrastructure and Adequate Insurance Coverage &amp; Preventive Safety Audit parameters.</p>
      <p>2. Vertical's score cannot be higher than the total maximum points of that vertical or less than zero for Sales &amp; Marketing Performance and Sales Quality, True Value Performance (excluding ELV), Service Performance and Service Quality and Parts and Accessories.</p>
    `;
    container.appendChild(note);
  }

  function renderScore(score) {
    const earlySummary = summarizePeriod(score, 'earlyBird');
    const fullSummary = summarizePeriod(score, 'fullYear');
    elements.content.innerHTML = '';
    renderTopFields(elements.content, score);
    renderInfoTable(elements.content, score, earlySummary, fullSummary);
    renderScoreTable(elements.content, score, earlySummary, fullSummary);
    renderNote(elements.content, score, fullSummary);
  }

  async function saveScore() {
    if (!currentScore) return;
    elements.editButton.disabled = true;
    elements.editButton.textContent = 'Saving...';
    try {
      const response = await apiPut(`/bsc/score/${encodeURIComponent(scoreId)}`, currentScore);
      currentScore = response.data || currentScore;
      showToast(response.message || 'Score sheet saved successfully.', 'success');
      window.location.href = `./score.html?id=${encodeURIComponent(scoreId)}&mode=view`;
    } catch (error) {
      showToast(error.message || 'Failed to save score sheet.', 'error');
      elements.editButton.disabled = false;
      elements.editButton.textContent = 'Save';
    }
  }

  function bindShellEvents() {
    elements.logoutButton.addEventListener('click', () => {
      localStorage.removeItem('bsc_token');
      localStorage.removeItem('bsc_user');
      sessionStorage.removeItem('bsc_safe_route_history');
      window.location.href = '/login';
    });
    elements.backButton.addEventListener('click', () => {
      window.location.href = '/vanilla/admin/';
    });
    document.querySelectorAll('[data-placeholder]').forEach((button) => {
      button.addEventListener('click', () => showToast('This section will be converted in a later iteration.', 'info'));
    });
  }

  async function init() {
    const user = ensureAdmin();
    if (!user) return;
    elements.userName.textContent = user.dealerName || user.name || 'Admin';
    elements.userCode.textContent = user.dealerCode || user.role || 'ADMIN';
    elements.pageTitle.textContent = mode === 'edit' ? 'Edit BSC Score page' : 'View BSC Score page';
    bindShellEvents();

    if (!scoreId) {
      elements.loading.textContent = 'Score id is missing.';
      return;
    }

    try {
      const response = await apiGet(`/bsc/score/${encodeURIComponent(scoreId)}`);
      currentScore = response.data;
      renderScore(currentScore);
      elements.loading.hidden = true;
      elements.content.hidden = false;
      elements.editButton.textContent = mode === 'edit' ? 'Save' : 'Edit';
      elements.editButton.addEventListener('click', () => {
        if (mode === 'edit') saveScore();
        else window.location.href = `./score.html?id=${encodeURIComponent(scoreId)}&mode=edit`;
      });
      elements.scoreSheetButton.addEventListener('click', () => {
        showToast('PDF export for the vanilla score view will be converted in a later iteration.', 'info');
      });
      elements.reviewSheetButton.addEventListener('click', () => {
        showToast('Review sheet download will be converted in a later iteration.', 'info');
      });
    } catch (error) {
      elements.loading.textContent = error.message || 'Failed to load score sheet.';
      showToast(elements.loading.textContent, 'error');
    }
  }

  init();
})();
