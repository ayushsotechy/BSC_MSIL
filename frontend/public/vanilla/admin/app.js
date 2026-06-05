(function () {
  const API_BASE_URL = window.BSC_API_BASE_URL || 'http://localhost:5001/api';
  const PAGE_SIZE = 10;
  const MONTHS = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March',
  ];

  const state = {
    rows: [],
    credentials: [],
    zones: [],
    regions: [],
    page: 1,
    filters: {
      zone: '',
      region: '',
      dealer: '',
      month: '',
      year: '',
    },
  };

  const elements = {
    userName: document.getElementById('navbar-user-name'),
    userCode: document.getElementById('navbar-user-code'),
    logoutButton: document.getElementById('logout-button'),
    zoneFilter: document.getElementById('zone-filter'),
    regionFilter: document.getElementById('region-filter'),
    dealerFilter: document.getElementById('dealer-filter'),
    monthFilter: document.getElementById('month-filter'),
    yearFilter: document.getElementById('year-filter'),
    table: document.getElementById('bsc-table'),
    tableBody: document.getElementById('bsc-table-body'),
    tableLoading: document.getElementById('table-loading'),
    tableCount: document.getElementById('table-count'),
    pagination: document.getElementById('pagination'),
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

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch data.');
    }
    return data;
  }

  function normalizeAccessControl(payload) {
    const data = payload?.data || payload || {};
    return {
      zones: Array.isArray(data.zones) ? data.zones.map((item) => item.name || item).filter(Boolean) : [],
      regions: Array.isArray(data.regions) ? data.regions.map((item) => item.name || item).filter(Boolean) : [],
      credentials: Array.isArray(data.dealerCredentials)
        ? data.dealerCredentials.map((credential) => ({
          dealerCode: credential.dealerCode || '',
          zone: credential.zone?.name || credential.zone || '',
          region: credential.region?.name || credential.region || '',
        }))
        : [],
    };
  }

  function getCredential(row) {
    const rowCode = String(row?.dealerCode || '').trim().toLowerCase();
    return state.credentials.find((credential) =>
      String(credential.dealerCode || '').trim().toLowerCase() === rowCode
    ) || {};
  }

  function uniqueValues(values) {
    return [...new Map(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()];
  }

  function fillSelect(select, values, firstLabel) {
    const current = select.value;
    select.innerHTML = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = firstLabel;
    select.appendChild(first);

    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value === current)) {
      select.value = current;
    }
  }

  function setupFilters() {
    fillSelect(elements.zoneFilter, state.zones, 'All Zones');
    fillSelect(elements.regionFilter, state.regions, 'All Regions');
    fillSelect(elements.monthFilter, MONTHS, 'All Months');
  }

  function getFilteredRows() {
    const filters = state.filters;
    return state.rows.filter((row) => {
      const credential = getCredential(row);
      const rowZone = credential.zone || row.zone || '';
      const rowRegion = credential.region || row.region || '';
      const dealerText = `${row.dealerName || ''} ${row.dealerCode || ''}`.toLowerCase();

      return (
        (!filters.zone || String(rowZone).toLowerCase() === filters.zone.toLowerCase()) &&
        (!filters.region || String(rowRegion).toLowerCase().includes(filters.region.toLowerCase())) &&
        (!filters.dealer || dealerText.includes(filters.dealer.toLowerCase())) &&
        (!filters.month || String(row.month || '').toLowerCase() === filters.month.toLowerCase()) &&
        (!filters.year || String(row.fiscalYear || '').toLowerCase().includes(filters.year.toLowerCase()))
      );
    });
  }

  function formatYearScore(row) {
    const score = row.fullYear?.score ?? row.yearScore ?? row.fullYearProvisionalScore ?? '';
    return score === '' || score === null || score === undefined ? '-' : `${score}`;
  }

  function renderRows() {
    const filtered = getFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const startIndex = (state.page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    elements.tableBody.innerHTML = '';

    if (!pageRows.length) {
      elements.table.hidden = true;
      elements.tableLoading.hidden = false;
      elements.tableLoading.textContent = 'No BSC Master Data found.';
    } else {
      elements.table.hidden = false;
      elements.tableLoading.hidden = true;
    }

    pageRows.forEach((row, index) => {
      const credential = getCredential(row);
      const tableRow = document.createElement('tr');
      const cells = [
        String(startIndex + index + 1),
        credential.zone || row.zone || '-',
        credential.region || row.region || '-',
        row.dealerName || row.dealerCode || '-',
        row.month || '-',
        row.fiscalYear || '-',
        row.lastYearBand || 'N/A',
        row.currentYearBand || row.fullYear?.band || 'NO BAND',
        formatYearScore(row),
      ];

      cells.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        tableRow.appendChild(cell);
      });

      const actionCell = document.createElement('td');
      const actionGroup = document.createElement('div');
      actionGroup.className = 'row-actions';

      const editButton = document.createElement('button');
      editButton.className = 'row-action row-action--edit';
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => {
        showToast('Edit score page will be converted in the next dashboard iteration.', 'info');
      });

      const viewButton = document.createElement('button');
      viewButton.className = 'row-action row-action--view';
      viewButton.type = 'button';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        showToast('Score detail page will be converted in the next dashboard iteration.', 'info');
      });

      actionGroup.appendChild(editButton);
      actionGroup.appendChild(viewButton);
      actionCell.appendChild(actionGroup);
      tableRow.appendChild(actionCell);
      elements.tableBody.appendChild(tableRow);
    });

    const visibleStart = filtered.length ? startIndex + 1 : 0;
    const visibleEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);
    elements.tableCount.textContent = `Showing ${visibleStart}-${visibleEnd} of ${filtered.length} dealers`;
    renderPagination(filtered.length, totalPages);
  }

  function renderPagination(totalCount, totalPages) {
    elements.pagination.innerHTML = '';
    if (!totalCount) return;

    const makeButton = (label, page, disabled, active) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      if (active) button.classList.add('active');
      button.addEventListener('click', () => {
        state.page = page;
        renderRows();
      });
      elements.pagination.appendChild(button);
    };

    makeButton('Prev', Math.max(1, state.page - 1), state.page === 1, false);

    const visiblePages = [...new Set([
      1,
      Math.max(1, state.page - 1),
      state.page,
      Math.min(totalPages, state.page + 1),
      totalPages,
    ])].sort((a, b) => a - b);

    let previous = 0;
    visiblePages.forEach((page) => {
      if (page - previous > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        elements.pagination.appendChild(ellipsis);
      }
      makeButton(String(page), page, false, page === state.page);
      previous = page;
    });

    makeButton('Next', Math.min(totalPages, state.page + 1), state.page === totalPages, false);
  }

  function bindEvents() {
    elements.logoutButton.addEventListener('click', () => {
      localStorage.removeItem('bsc_token');
      localStorage.removeItem('bsc_user');
      sessionStorage.removeItem('bsc_safe_route_history');
      window.location.href = '/login';
    });

    [
      ['zone', elements.zoneFilter],
      ['region', elements.regionFilter],
      ['dealer', elements.dealerFilter],
      ['month', elements.monthFilter],
      ['year', elements.yearFilter],
    ].forEach(([key, element]) => {
      element.addEventListener('input', () => {
        state.filters[key] = element.value.trim();
        state.page = 1;
        renderRows();
      });
      element.addEventListener('change', () => {
        state.filters[key] = element.value.trim();
        state.page = 1;
        renderRows();
      });
    });

    document.querySelectorAll('[data-placeholder]').forEach((button) => {
      button.addEventListener('click', () => {
        showToast('This dashboard section will be converted in a later iteration.', 'info');
      });
    });

    document.getElementById('back-button').addEventListener('click', () => {
      window.history.length > 1 ? window.history.back() : window.location.assign('/vanilla/admin/');
    });

    document.getElementById('azure-button').addEventListener('click', () => {
      showToast('Azure document browser placeholder. Link/API will be connected later.', 'info');
    });
    document.getElementById('upload-button').addEventListener('click', () => {
      showToast('Excel upload will be converted in a later iteration.', 'info');
    });
    document.getElementById('add-button').addEventListener('click', () => {
      showToast('Add BSC score will be converted in a later iteration.', 'info');
    });
  }

  async function init() {
    const user = ensureAdmin();
    if (!user) return;

    elements.userName.textContent = user.dealerName || user.name || 'Admin';
    elements.userCode.textContent = user.dealerCode || user.role || 'ADMIN';
    bindEvents();

    try {
      const [scoreResponse, accessResponse] = await Promise.all([
        apiGet('/bsc/score?summary=true'),
        apiGet('/access-control'),
      ]);
      const accessData = normalizeAccessControl(accessResponse);
      state.rows = Array.isArray(scoreResponse.data) ? scoreResponse.data : [];
      state.credentials = accessData.credentials;
      state.zones = accessData.zones.length
        ? accessData.zones
        : uniqueValues(state.credentials.map((credential) => credential.zone));
      state.regions = accessData.regions.length
        ? accessData.regions
        : uniqueValues(state.credentials.map((credential) => credential.region));
      setupFilters();
      renderRows();
    } catch (error) {
      elements.table.hidden = true;
      elements.tableLoading.hidden = false;
      elements.tableLoading.textContent = error.message || 'Failed to load BSC master data.';
      showToast(elements.tableLoading.textContent, 'error');
    }
  }

  init();
})();
