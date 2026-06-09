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
    pageTitle: document.getElementById('admin-page-title'),
    masterPanel: document.getElementById('master-panel'),
    credentialsPanel: document.getElementById('credentials-panel'),
    controlPanel: document.getElementById('control-panel'),
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
    zoneList: document.getElementById('zone-list'),
    regionList: document.getElementById('region-list'),
    msilTableBody: document.getElementById('msil-table-body'),
    toastRegion: document.getElementById('toast-region'),
  };

  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
  uploadInput.hidden = true;
  document.body.appendChild(uploadInput);

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

  async function apiSend(method, path, payload) {
    const token = localStorage.getItem('bsc_token');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  }

  async function apiUploadBscExcel(file) {
    const token = localStorage.getItem('bsc_token');
    const formData = new FormData();
    formData.append('file', file);
    if (state.filters.year) formData.append('fiscalYear', state.filters.year);
    if (state.filters.month) formData.append('month', state.filters.month);

    const response = await fetch(`${API_BASE_URL}/bsc/upload-excel`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Excel upload failed.');
    return data;
  }

  function normalizeAccessControl(payload) {
    const data = payload?.data?.data || payload?.data || payload || {};
    return {
      zones: Array.isArray(data.zones) ? data.zones.map((item) => item.name || item).filter(Boolean) : [],
      regions: Array.isArray(data.regions) ? data.regions.map((item) => item.name || item).filter(Boolean) : [],
      msilPersons: Array.isArray(data.msilPersons)
        ? data.msilPersons.map((person) => ({
          id: person.id || person._id || person.name || '',
          _id: person._id || person.id || '',
          name: person.name || '',
          mailId: person.mailId || person.email || '',
          password: person.password || '',
        }))
        : [],
      credentials: Array.isArray(data.dealerCredentials)
        ? data.dealerCredentials.map((credential) => ({
          id: credential.id || credential._id || credential.dealerCode || '',
          _id: credential._id || credential.id || '',
          dealerCode: credential.dealerCode || '',
          dealerName: credential.dealerName || credential.dealerCode || '',
          mailId: credential.mailId || '',
          password: credential.password || '',
          zone: credential.zone?.name || credential.zone || '',
          region: credential.region?.name || credential.region || '',
          msilPersons: credential.msilPersons || [],
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

  function ensureCredentialsForScoreRows(credentials) {
    const existingCredentials = Array.isArray(credentials) ? credentials : [];
    const credentialsByCode = new Map();

    existingCredentials.forEach((credential) => {
      const dealerCode = String(credential.dealerCode || '').trim();
      if (!dealerCode) return;
      credentialsByCode.set(dealerCode.toLowerCase(), credential);
    });

    state.rows.forEach((row, index) => {
      const dealerCode = String(row.dealerCode || '').trim();
      if (!dealerCode) return;

      const key = dealerCode.toLowerCase();
      const existing = credentialsByCode.get(key);
      if (existing) {
        existing.dealerName = existing.dealerName || row.dealerName || dealerCode;
        existing.zone = existing.zone || row.zone || '';
        existing.region = existing.region || row.region || '';
        return;
      }

      credentialsByCode.set(key, {
        id: `derived-${dealerCode}`,
        _id: '',
        dealerCode,
        dealerName: row.dealerName || dealerCode,
        mailId: `dealer${index + 1}@gmail.com`,
        password: '1234',
        zone: row.zone || '',
        region: row.region || '',
        msilPersons: [],
        isDerived: true,
      });
    });

    return [...credentialsByCode.values()];
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
    fillSelect(elements.yearFilter, getAvailableYears(state.rows), 'All Years');
  }

  async function refreshDashboardData() {
    const [scoreResponse, accessResponse] = await Promise.all([
      apiGet('/bsc/score?summary=true'),
      apiGet('/access-control'),
    ]);
    state.rows = Array.isArray(scoreResponse.data) ? scoreResponse.data : [];
    syncAccessState(accessResponse);
    state.page = 1;
    renderRows();
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
        state.activeSection === 'nsc' ? (row.dealerName || row.dealerCode || '-') : (row.dealerName || row.dealerCode || '-'),
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
        window.location.href = `./score.html?id=${encodeURIComponent(row._id || row.id)}&mode=edit`;
      });

      const viewButton = document.createElement('button');
      viewButton.className = 'row-action row-action--view';
      viewButton.type = 'button';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        window.location.href = `./score.html?id=${encodeURIComponent(row._id || row.id)}&mode=view`;
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

  function syncAccessState(accessResponse) {
    const accessData = normalizeAccessControl(accessResponse);
    state.credentials = ensureCredentialsForScoreRows(accessData.credentials);
    state.msilPersons = accessData.msilPersons;
    state.zones = accessData.zones.length
      ? accessData.zones
      : uniqueValues([
        ...state.credentials.map((credential) => credential.zone),
        ...state.rows.map((row) => row.zone),
      ]);
    state.regions = accessData.regions.length
      ? accessData.regions
      : uniqueValues([
        ...state.credentials.map((credential) => credential.region),
        ...state.rows.map((row) => row.region),
      ]);
    setupFilters();
    renderAccessCredentials();
    renderAccessControl();
  }

  function makeInput(value, onInput) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function makeSelect(value, options, onChange) {
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '';
    select.appendChild(empty);
    options.forEach((optionValue) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    });
    select.value = value || '';
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  function makeMsilSelect(values, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msil-picker';
    wrapper.addEventListener('click', (event) => event.stopPropagation());

    const trigger = document.createElement('button');
    trigger.className = 'msil-picker__trigger';
    trigger.type = 'button';

    const label = document.createElement('span');
    const arrow = document.createElement('span');
    arrow.className = 'msil-picker__arrow';
    arrow.textContent = '▾';
    trigger.appendChild(label);
    trigger.appendChild(arrow);

    const menu = document.createElement('div');
    menu.className = 'msil-picker__menu';
    menu.hidden = true;
    menu.addEventListener('click', (event) => event.stopPropagation());

    const selectedValues = (values || []).map((value) => String(value));

    const updateLabel = () => {
      const selectedNames = state.msilPersons
        .filter((person) =>
          selectedValues.includes(String(person.id)) || selectedValues.includes(String(person._id))
        )
        .map((person) => person.name || person.mailId || person.id);
      label.textContent = selectedNames.length ? selectedNames.join(', ') : 'Select MSIL';
      label.title = label.textContent;
    };

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      document.querySelectorAll('.msil-picker__menu').forEach((openMenu) => {
        if (openMenu !== menu) openMenu.hidden = true;
      });
      menu.hidden = !menu.hidden;
    });

    state.msilPersons.forEach((person) => {
      const option = document.createElement('label');
      option.className = 'msil-picker__option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = person.id;
      checkbox.checked = selectedValues.includes(String(person.id)) || selectedValues.includes(String(person._id));
      checkbox.addEventListener('change', () => {
        const key = String(person.id);
        const index = selectedValues.indexOf(key);
        if (checkbox.checked && index === -1) selectedValues.push(key);
        if (!checkbox.checked && index !== -1) selectedValues.splice(index, 1);
        updateLabel();
        onChange([...selectedValues]);
      });

      const text = document.createElement('span');
      text.textContent = person.name || person.mailId || person.id;

      option.appendChild(checkbox);
      option.appendChild(text);
      menu.appendChild(option);
    });

    updateLabel();
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    return wrapper;
  }

  function appendNodeCell(row, node) {
    const cell = document.createElement('td');
    cell.appendChild(node);
    row.appendChild(cell);
  }

  function appendCell(row, text, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text ?? '';
    row.appendChild(cell);
    return cell;
  }

  function renderAccessCredentials() {
    if (!elements.credentialsTableBody) return;
    const search = String(elements.credentialSearch?.value || '').trim().toLowerCase();
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
      appendNodeCell(row, makeInput(credential.dealerCode, (value) => { credential.dealerCode = value; }));
      appendNodeCell(row, makeInput(credential.mailId, (value) => { credential.mailId = value; }));
      appendNodeCell(row, makeInput(credential.password, (value) => { credential.password = value; }));
      appendNodeCell(row, makeSelect(credential.zone, state.zones, (value) => { credential.zone = value; }));
      appendNodeCell(row, makeSelect(credential.region, state.regions, (value) => { credential.region = value; }));
      appendNodeCell(row, makeMsilSelect(credential.msilPersons, (value) => { credential.msilPersons = value; }));

      const actions = document.createElement('div');
      actions.className = 'access-row-actions';
      const save = document.createElement('button');
      save.className = 'access-row-btn access-row-btn--save';
      save.type = 'button';
      save.textContent = 'Save';
      save.addEventListener('click', () => saveDealerCredential(credential));
      const remove = document.createElement('button');
      remove.className = 'access-row-btn access-row-btn--delete';
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => deleteDealerCredential(credential));
      actions.appendChild(save);
      actions.appendChild(remove);
      appendNodeCell(row, actions);
      elements.credentialsTableBody.appendChild(row);
    });

    const visibleStart = rows.length ? startIndex + 1 : 0;
    const visibleEnd = Math.min(startIndex + PAGE_SIZE, rows.length);
    elements.credentialsTableCount.textContent = `Showing ${visibleStart}-${visibleEnd} of ${rows.length} dealers`;
    renderCredentialsPagination(rows.length, totalPages);
  }

  async function saveDealerCredential(credential) {
    try {
      const response = await apiSend('POST', '/access-control/dealer-credential', credential);
      showToast(response.message || 'Dealer credential saved.', 'success');
      syncAccessState(await apiGet('/access-control'));
    } catch (error) {
      showToast(error.message || 'Failed to save dealer credential.', 'error');
    }
  }

  async function deleteDealerCredential(credential) {
    if (!window.confirm(`Remove dealer credential ${credential.dealerCode || ''}?`)) return;
    try {
      const id = credential._id || credential.dealerCode || credential.id;
      const response = await apiSend('DELETE', `/access-control/dealer-credential/${encodeURIComponent(id)}`);
      showToast(response.message || 'Dealer credential removed.', 'success');
      syncAccessState(await apiGet('/access-control'));
    } catch (error) {
      showToast(error.message || 'Failed to remove dealer credential.', 'error');
    }
  }

  function renderNamedList(container, items, type) {
    container.innerHTML = '';
    items.forEach((name, index) => {
      const row = document.createElement('div');
      row.className = 'control-list-row';
      const input = makeInput(name, (value) => { items[index] = value; });
      const save = document.createElement('button');
      save.className = 'control-icon-btn control-icon-btn--save';
      save.type = 'button';
      save.textContent = '✓';
      save.addEventListener('click', () => saveNamedList());
      const remove = document.createElement('button');
      remove.className = 'control-icon-btn control-icon-btn--delete';
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => deleteNamedItem(type, name));
      row.appendChild(input);
      row.appendChild(save);
      row.appendChild(remove);
      container.appendChild(row);
    });
  }

  function renderAccessControl() {
    if (!elements.zoneList) return;
    renderNamedList(elements.zoneList, state.zones, 'zone');
    renderNamedList(elements.regionList, state.regions, 'region');
    renderMsilPersons();
  }

  function renderMsilPersons() {
    elements.msilTableBody.innerHTML = '';
    state.msilPersons.forEach((person, index) => {
      const row = document.createElement('tr');
      appendCell(row, index + 1);
      appendNodeCell(row, makeInput(person.name, (value) => { person.name = value; }));
      appendNodeCell(row, makeInput(person.mailId, (value) => { person.mailId = value; }));
      appendNodeCell(row, makeInput(person.password, (value) => { person.password = value; }));
      const actions = document.createElement('div');
      actions.className = 'access-row-actions';
      const save = document.createElement('button');
      save.className = 'access-row-btn access-row-btn--save';
      save.type = 'button';
      save.textContent = 'Save';
      save.addEventListener('click', () => saveMsilPerson(person));
      const remove = document.createElement('button');
      remove.className = 'access-row-btn access-row-btn--delete';
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => deleteMsilPerson(person));
      actions.appendChild(save);
      actions.appendChild(remove);
      appendNodeCell(row, actions);
      elements.msilTableBody.appendChild(row);
    });
  }

  async function saveNamedList() {
    try {
      const response = await apiSend('PUT', '/access-control', {
        zones: state.zones,
        regions: state.regions,
        msilPersons: [],
        dealerCredentials: [],
      });
      showToast(response.message || 'Access control saved.', 'success');
      syncAccessState(response);
    } catch (error) {
      showToast(error.message || 'Failed to save access control.', 'error');
    }
  }

  async function deleteNamedItem(type, value) {
    if (!window.confirm(`Remove ${type} ${value}?`)) return;
    try {
      const response = await apiSend('DELETE', `/access-control/${type}/${encodeURIComponent(value)}`);
      showToast(response.message || `${type} removed.`, 'success');
      syncAccessState(await apiGet('/access-control'));
    } catch (error) {
      showToast(error.message || `Failed to remove ${type}.`, 'error');
    }
  }

  async function saveMsilPerson(person) {
    try {
      const response = await apiSend('POST', '/access-control/msil-person', person);
      showToast(response.message || 'MSIL person saved.', 'success');
      syncAccessState(await apiGet('/access-control'));
    } catch (error) {
      showToast(error.message || 'Failed to save MSIL person.', 'error');
    }
  }

  async function deleteMsilPerson(person) {
    if (!window.confirm(`Remove MSIL person ${person.name || person.mailId || ''}?`)) return;
    try {
      const id = person._id || person.mailId || person.name || person.id;
      const response = await apiSend('DELETE', `/access-control/msil-person/${encodeURIComponent(id)}`);
      showToast(response.message || 'MSIL person removed.', 'success');
      syncAccessState(await apiGet('/access-control'));
    } catch (error) {
      showToast(error.message || 'Failed to remove MSIL person.', 'error');
    }
  }

  async function syncParsedAccessCredentials(credentials) {
    const parsedCredentials = Array.isArray(credentials) ? credentials : [];
    if (!parsedCredentials.length) return;

    await apiSend('PUT', '/access-control', {
      zones: uniqueValues([
        ...state.zones,
        ...parsedCredentials.map((credential) => credential.zone),
      ]),
      regions: uniqueValues([
        ...state.regions,
        ...parsedCredentials.map((credential) => credential.region),
      ]),
      msilPersons: state.msilPersons,
      dealerCredentials: parsedCredentials,
      returnData: false,
    });
  }

  function setUploadBusy(isBusy) {
    const uploadButton = document.getElementById('upload-button');
    uploadButton.disabled = isBusy;
    uploadButton.textContent = isBusy ? 'Uploading...' : 'Upload Excel';
  }

  async function handleExcelFile(file) {
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx'].includes(extension)) {
      showToast('Please choose an Excel file (.xls or .xlsx).', 'error');
      return;
    }

    try {
      setUploadBusy(true);
      const parsed = await apiUploadBscExcel(file);
      const scores = Array.isArray(parsed.data) ? parsed.data : [];

      if (!scores.length) {
        showToast(parsed.message || 'No scorecards found in the Excel file.', 'error');
        return;
      }

      const periodHint = [state.filters.month, state.filters.year].filter(Boolean).join(' ');
      const shouldSave = window.confirm(
        `Parsed ${scores.length} scorecard${scores.length === 1 ? '' : 's'}${periodHint ? ` for ${periodHint}` : ''}. Save them to BSC master data?`
      );
      if (!shouldSave) {
        showToast('Excel parsed successfully. Save was cancelled.', 'info');
        return;
      }

      const saveResponse = await apiSend('POST', '/bsc/bulk-save', { scores, upsert: true });
      await syncParsedAccessCredentials(parsed.accessCredentials);
      await refreshDashboardData();
      setActiveSection('bsc');
      showToast(saveResponse.message || `${scores.length} scorecards saved successfully.`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload Excel file.', 'error');
    } finally {
      uploadInput.value = '';
      setUploadBusy(false);
    }
  }

  function setActiveSection(section) {
    state.activeSection = section;
    document.querySelectorAll('[data-section]').forEach((button) => {
      button.classList.toggle('sidebar-item--active', button.dataset.section === section);
    });
    elements.masterPanel.hidden = !['bsc', 'nsc'].includes(section);
    elements.credentialsPanel.hidden = section !== 'credentials';
    elements.controlPanel.hidden = section !== 'control';
    elements.pageTitle.textContent = section === 'nsc'
      ? 'View NSC Master Data'
      : section === 'credentials'
        ? 'Dealer Access Credentials'
        : section === 'control'
          ? 'Access Control'
          : 'View BSC Master Data';
    state.page = 1;
    if (section === 'credentials') renderAccessCredentials();
    if (section === 'control') renderAccessControl();
    if (['bsc', 'nsc'].includes(section)) renderRows();
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

  function renderCredentialsPagination(totalCount, totalPages) {
    elements.credentialsPagination.innerHTML = '';
    if (!totalCount) return;

    const makeButton = (label, page, disabled, active) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      if (active) button.classList.add('active');
      button.addEventListener('click', () => {
        state.credentialsPage = page;
        renderAccessCredentials();
      });
      elements.credentialsPagination.appendChild(button);
    };

    makeButton('Prev', Math.max(1, state.credentialsPage - 1), state.credentialsPage === 1, false);

    const visiblePages = [...new Set([
      1,
      Math.max(1, state.credentialsPage - 1),
      state.credentialsPage,
      Math.min(totalPages, state.credentialsPage + 1),
      totalPages,
    ])].sort((a, b) => a - b);

    let previous = 0;
    visiblePages.forEach((page) => {
      if (page - previous > 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        elements.credentialsPagination.appendChild(ellipsis);
      }
      makeButton(String(page), page, false, page === state.credentialsPage);
      previous = page;
    });

    makeButton('Next', Math.min(totalPages, state.credentialsPage + 1), state.credentialsPage === totalPages, false);
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

    document.querySelectorAll('[data-section]').forEach((button) => {
      button.addEventListener('click', () => {
        setActiveSection(button.dataset.section);
      });
    });

    document.getElementById('back-button').addEventListener('click', () => {
      window.history.length > 1 ? window.history.back() : window.location.assign('/vanilla/admin/');
    });

    document.getElementById('azure-button').addEventListener('click', () => {
      showToast('Azure document browser placeholder. Link/API will be connected later.', 'info');
    });
    document.getElementById('upload-button').addEventListener('click', () => {
      uploadInput.click();
    });
    uploadInput.addEventListener('change', () => handleExcelFile(uploadInput.files?.[0]));
    document.getElementById('add-button').addEventListener('click', () => {
      showToast('Add BSC score will be converted in a later iteration.', 'info');
    });

    elements.credentialSearch.addEventListener('input', () => {
      state.credentialsPage = 1;
      renderAccessCredentials();
    });
    document.getElementById('add-credential-button').addEventListener('click', () => {
      state.credentials.unshift({
        id: `new-${Date.now()}`,
        dealerCode: '',
        dealerName: '',
        mailId: '',
        password: '1234',
        zone: state.zones[0] || '',
        region: state.regions[0] || '',
        msilPersons: [],
      });
      setActiveSection('credentials');
    });
    document.getElementById('add-zone-button').addEventListener('click', () => {
      state.zones.push('');
      setActiveSection('control');
    });
    document.getElementById('add-region-button').addEventListener('click', () => {
      state.regions.push('');
      setActiveSection('control');
    });
    document.getElementById('add-msil-button').addEventListener('click', () => {
      state.msilPersons.unshift({
        id: `new-msil-${Date.now()}`,
        name: '',
        mailId: '',
        password: '1234',
      });
      setActiveSection('control');
    });
  }

  async function init() {
    const user = ensureAdmin();
    if (!user) return;

    elements.userName.textContent = user.dealerName || user.name || 'Admin';
    elements.userCode.textContent = user.dealerCode || user.role || 'ADMIN';
    bindEvents();

    try {
      await refreshDashboardData();
      setActiveSection('bsc');
    } catch (error) {
      elements.table.hidden = true;
      elements.tableLoading.hidden = false;
      elements.tableLoading.textContent = error.message || 'Failed to load BSC master data.';
      showToast(elements.tableLoading.textContent, 'error');
    }
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.msil-picker__menu').forEach((menu) => {
      menu.hidden = true;
    });
  });

  init();
})();
