(function () {
  const API_BASE_URL = window.BSC_API_BASE_URL || 'http://localhost:5001/api';
  const PAGE_SIZE = 10;
  const MONTHS = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March',
  ];

  const state = {
    activeSection: 'bsc',
    rows: [],
    credentials: [],
    msilPersons: [],
    zones: [],
    regions: [],
    page: 1,
    credentialsPage: 1,
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
    pageTitle: document.getElementById('msil-page-title'),
    masterPanel: document.getElementById('master-panel'),
    credentialsPanel: document.getElementById('credentials-panel'),
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
    credentialSearch: document.getElementById('credential-search'),
    credentialsTableBody: document.getElementById('credentials-table-body'),
    credentialsTableCount: document.getElementById('credentials-table-count'),
    credentialsPagination: document.getElementById('credentials-pagination'),
    toastRegion: document.getElementById('toast-region'),
  };

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('bsc_user') || 'null');
    } catch (error) {
      return null;
    }
  }

  function ensureMsil() {
    const user = getStoredUser();
    if (!user || user.role !== 'msil') {
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
    if (!response.ok) throw new Error(data.message || 'Failed to fetch data.');
    return data;
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeAccessControl(payload) {
    const data = payload?.data?.data || payload?.data || payload || {};
    return {
      zones: Array.isArray(data.zones) ? data.zones.map((item) => item.name || item).filter(Boolean) : [],
      regions: Array.isArray(data.regions) ? data.regions.map((item) => item.name || item).filter(Boolean) : [],
      msilPersons: Array.isArray(data.msilPersons)
        ? data.msilPersons.map((person) => ({
          id: String(person.id || person._id || person.name || ''),
          _id: String(person._id || person.id || ''),
          name: person.name || '',
          mailId: person.mailId || person.email || '',
        }))
        : [],
      credentials: Array.isArray(data.dealerCredentials)
        ? data.dealerCredentials.map((credential) => ({
          id: String(credential.id || credential._id || credential.dealerCode || ''),
          dealerCode: credential.dealerCode || '',
          dealerName: credential.dealerName || credential.dealerCode || '',
          mailId: credential.mailId || '',
          password: credential.password || '',
          zone: credential.zone?.name || credential.zone || '',
          region: credential.region?.name || credential.region || '',
          msilPersons: (credential.msilPersons || []).map((person) => String(person)),
        }))
        : [],
    };
  }

  function uniqueValues(values) {
    return [...new Map(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()];
  }

  function findLoggedInMsil(user, msilPersons) {
    const userKeys = [
      user.id,
      user._id,
      user.dealerCode,
      user.name,
      user.dealerName,
      user.mailId,
      user.email,
    ].map(normalizeKey).filter(Boolean);

    return msilPersons.find((person) => {
      const personKeys = [person.id, person._id, person.name, person.mailId].map(normalizeKey);
      return personKeys.some((key) => userKeys.includes(key));
    }) || null;
  }

  function credentialBelongsToMsil(credential, person, user) {
    const personKeys = [
      person?.id,
      person?._id,
      person?.name,
      person?.mailId,
      user.id,
      user._id,
      user.dealerCode,
      user.name,
      user.dealerName,
      user.mailId,
    ].map(normalizeKey).filter(Boolean);

    return (credential.msilPersons || [])
      .map(normalizeKey)
      .some((key) => personKeys.includes(key));
  }

  function getCredential(row) {
    const rowCode = normalizeKey(row?.dealerCode);
    return state.credentials.find((credential) => normalizeKey(credential.dealerCode) === rowCode) || {};
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

    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function setupFilters() {
    fillSelect(elements.zoneFilter, state.zones, 'All Zones');
    fillSelect(elements.regionFilter, state.regions, 'All Regions');
    fillSelect(elements.monthFilter, MONTHS, 'All Months');
    fillSelect(elements.yearFilter, getAvailableYears(state.rows), 'All Years');
  }

  function getAvailableYears(rows) {
    const currentYear = new Date().getFullYear();
    const nearbyYears = Array.from({ length: 16 }, (_, index) => String(currentYear + 5 - index));
    return uniqueValues([
      ...(rows || []).map((row) => row.fiscalYear),
      ...nearbyYears,
    ])
      .sort((first, second) => Number(second) - Number(first));
  }

  function getFilteredRows() {
    const filters = state.filters;
    return state.rows.filter((row) => {
      const credential = getCredential(row);
      const rowZone = credential.zone || row.zone || '';
      const rowRegion = credential.region || row.region || '';
      const dealerText = `${row.dealerName || ''} ${row.dealerCode || ''}`.toLowerCase();

      return (
        (!filters.zone || normalizeKey(rowZone) === normalizeKey(filters.zone)) &&
        (!filters.region || normalizeKey(rowRegion).includes(normalizeKey(filters.region))) &&
        (!filters.dealer || dealerText.includes(filters.dealer.toLowerCase())) &&
        (!filters.month || normalizeKey(row.month) === normalizeKey(filters.month)) &&
        (!filters.year || normalizeKey(row.fiscalYear).includes(normalizeKey(filters.year)))
      );
    });
  }

  function formatYearScore(row) {
    const score = row.fullYear?.score ?? row.yearScore ?? row.fullYearProvisionalScore ?? '';
    return score === '' || score === null || score === undefined ? '-' : `${score}`;
  }

  function appendCell(row, text, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text ?? '';
    row.appendChild(cell);
    return cell;
  }

  function renderRows() {
    const filtered = getFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const startIndex = (state.page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    elements.tableBody.innerHTML = '';
    elements.table.hidden = !pageRows.length;
    elements.tableLoading.hidden = Boolean(pageRows.length);
    if (!pageRows.length) {
      elements.tableLoading.textContent = 'No assigned dealer scorecards found.';
    }

    pageRows.forEach((row, index) => {
      const credential = getCredential(row);
      const tableRow = document.createElement('tr');
      [
        String(startIndex + index + 1),
        credential.zone || row.zone || '-',
        credential.region || row.region || '-',
        row.dealerName || row.dealerCode || '-',
        row.month || '-',
        row.fiscalYear || '-',
        row.lastYearBand || 'N/A',
        row.currentYearBand || row.fullYear?.band || 'NO BAND',
        formatYearScore(row),
      ].forEach((value) => appendCell(tableRow, value));

      const actionCell = document.createElement('td');
      const viewButton = document.createElement('button');
      viewButton.className = 'row-action row-action--view';
      viewButton.type = 'button';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        window.location.href = `../admin/score.html?id=${encodeURIComponent(row._id || row.id)}&mode=view`;
      });
      actionCell.appendChild(viewButton);
      tableRow.appendChild(actionCell);
      elements.tableBody.appendChild(tableRow);
    });

    const visibleStart = filtered.length ? startIndex + 1 : 0;
    const visibleEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);
    elements.tableCount.textContent = `Showing ${visibleStart}-${visibleEnd} of ${filtered.length} dealers`;
    renderPagination(elements.pagination, state.page, totalPages, filtered.length, (page) => {
      state.page = page;
      renderRows();
    });
  }

  function getMsilName(personId) {
    const match = state.msilPersons.find((person) =>
      normalizeKey(person.id) === normalizeKey(personId) || normalizeKey(person._id) === normalizeKey(personId)
    );
    return match?.name || match?.mailId || personId || '-';
  }

  function renderCredentialRows() {
    const search = normalizeKey(elements.credentialSearch?.value);
    const rows = state.credentials.filter((credential) =>
      `${credential.dealerCode || ''} ${credential.dealerName || ''} ${credential.mailId || ''}`.toLowerCase().includes(search)
    );
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.credentialsPage = Math.min(state.credentialsPage, totalPages);
    const startIndex = (state.credentialsPage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(startIndex, startIndex + PAGE_SIZE);

    elements.credentialsTableBody.innerHTML = '';
    pageRows.forEach((credential, index) => {
      const row = document.createElement('tr');
      appendCell(row, startIndex + index + 1);
      appendCell(row, credential.dealerCode || '-', 'readonly-cell');
      appendCell(row, credential.mailId || '-', 'readonly-cell');
      appendCell(row, credential.password || '-', 'readonly-cell');
      appendCell(row, credential.zone || '-', 'readonly-cell');
      appendCell(row, credential.region || '-', 'readonly-cell');
      const msilCell = document.createElement('td');
      const list = document.createElement('div');
      list.className = 'assigned-msil-list';
      (credential.msilPersons || []).forEach((personId) => {
        const pill = document.createElement('span');
        pill.className = 'assigned-msil-pill';
        pill.textContent = getMsilName(personId);
        list.appendChild(pill);
      });
      if (!list.children.length) list.textContent = '-';
      msilCell.appendChild(list);
      row.appendChild(msilCell);
      elements.credentialsTableBody.appendChild(row);
    });

    const visibleStart = rows.length ? startIndex + 1 : 0;
    const visibleEnd = Math.min(startIndex + PAGE_SIZE, rows.length);
    elements.credentialsTableCount.textContent = `Showing ${visibleStart}-${visibleEnd} of ${rows.length} dealers`;
    renderPagination(elements.credentialsPagination, state.credentialsPage, totalPages, rows.length, (page) => {
      state.credentialsPage = page;
      renderCredentialRows();
    });
  }

  function renderPagination(container, currentPage, totalPages, totalCount, onPageChange) {
    container.innerHTML = '';
    if (!totalCount) return;

    const makeButton = (label, page, disabled, active) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      if (active) button.classList.add('active');
      button.addEventListener('click', () => onPageChange(page));
      container.appendChild(button);
    };

    makeButton('Prev', Math.max(1, currentPage - 1), currentPage === 1, false);
    const visiblePages = [...new Set([
      1,
      Math.max(1, currentPage - 1),
      currentPage,
      Math.min(totalPages, currentPage + 1),
      totalPages,
    ])].sort((a, b) => a - b);

    let previous = 0;
    visiblePages.forEach((page) => {
      if (page - previous > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
      }
      makeButton(String(page), page, false, page === currentPage);
      previous = page;
    });
    makeButton('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages, false);
  }

  function setActiveSection(section) {
    state.activeSection = section;
    document.querySelectorAll('[data-section]').forEach((button) => {
      button.classList.toggle('sidebar-item--active', button.dataset.section === section);
    });
    elements.masterPanel.hidden = !['bsc', 'nsc'].includes(section);
    elements.credentialsPanel.hidden = section !== 'credentials';
    elements.pageTitle.textContent = section === 'nsc'
      ? 'View NSC Master Data'
      : section === 'credentials'
        ? 'Dealer Access Credentials'
        : 'View BSC Master Data';
    state.page = 1;
    if (section === 'credentials') renderCredentialRows();
    if (['bsc', 'nsc'].includes(section)) renderRows();
  }

  function bindEvents() {
    elements.logoutButton.addEventListener('click', () => {
      localStorage.removeItem('bsc_token');
      localStorage.removeItem('bsc_user');
      sessionStorage.removeItem('bsc_safe_route_history');
      window.location.href = '/login';
    });
    document.getElementById('back-button').addEventListener('click', () => {
      window.history.length > 1 ? window.history.back() : window.location.assign('/login');
    });
    document.querySelectorAll('[data-section]').forEach((button) => {
      button.addEventListener('click', () => setActiveSection(button.dataset.section));
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
    elements.credentialSearch.addEventListener('input', () => {
      state.credentialsPage = 1;
      renderCredentialRows();
    });
  }

  async function init() {
    const user = ensureMsil();
    if (!user) return;

    elements.userName.textContent = user.dealerName || user.name || 'MSIL';
    elements.userCode.textContent = user.mailId || user.dealerCode || 'MSIL';
    bindEvents();

    try {
      const [scoreResponse, accessResponse] = await Promise.all([
        apiGet('/bsc/score?summary=true'),
        apiGet('/access-control'),
      ]);
      const accessData = normalizeAccessControl(accessResponse);
      const currentMsil = findLoggedInMsil(user, accessData.msilPersons);
      const assignedCredentials = accessData.credentials.filter((credential) =>
        credentialBelongsToMsil(credential, currentMsil, user)
      );
      const assignedDealerCodes = new Set(assignedCredentials.map((credential) => normalizeKey(credential.dealerCode)));

      state.msilPersons = accessData.msilPersons;
      state.credentials = assignedCredentials;
      state.rows = (Array.isArray(scoreResponse.data) ? scoreResponse.data : [])
        .filter((row) => assignedDealerCodes.has(normalizeKey(row.dealerCode)));
      state.zones = uniqueValues([
        ...state.credentials.map((credential) => credential.zone),
        ...state.rows.map((row) => row.zone),
      ]);
      state.regions = uniqueValues([
        ...state.credentials.map((credential) => credential.region),
        ...state.rows.map((row) => row.region),
      ]);

      setupFilters();
      setActiveSection('bsc');
    } catch (error) {
      elements.table.hidden = true;
      elements.tableLoading.hidden = false;
      elements.tableLoading.textContent = error.message || 'Failed to load assigned dealer data.';
      showToast(elements.tableLoading.textContent, 'error');
    }
  }

  init();
})();
