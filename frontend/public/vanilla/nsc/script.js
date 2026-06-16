(function () {
  const params = new URLSearchParams(window.location.search);

  const demoScores = [
    { id: 'nsc-1', zone: 'NORTH', region: 'NORTH 1', dealerCode: 'NORTH 1AKANS', dealerName: 'AKANKSHA (M)', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-2', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3JAYBE', dealerName: 'JAYBEE', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-3', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3MTLAZ', dealerName: 'MITTAL AUTOZONE', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-4', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3PALLA', dealerName: 'PALLAVI', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-5', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3PODDR', dealerName: 'PODDAR', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-6', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3PROGR', dealerName: 'PROGRESSIVE', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-7', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3RANI', dealerName: 'RANI', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-8', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3RDMOT', dealerName: 'RD MOTORS', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-9', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3SAIK', dealerName: 'SAIKIA', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
    { id: 'nsc-10', zone: 'EAST', region: 'EAST 3', dealerCode: 'EAST 3SAMAD', dealerName: 'SAMADON', month: 'June', year: '2029', provisionalBand: 'NO BAND', evaluatedPoints: '0' },
  ];

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem('bsc_user') || '{}');
    } catch (error) {
      return {};
    }
  }

  const user = readUser();
  const role = params.get('role') || user.role || 'admin';
  let activeScore = null;
  let activeMode = 'summary';

  const roleHome = {
    admin: '/vanilla/admin/',
    msil: '/vanilla/msil/',
    dealer: '/vanilla/dealer/',
  };

  const elements = {
    pageTitle: document.getElementById('page-title'),
    summaryPanel: document.getElementById('summary-panel'),
    detailPanel: document.getElementById('detail-panel'),
    summaryRows: document.getElementById('summary-rows'),
    summaryCount: document.getElementById('summary-count'),
    downloadButton: document.getElementById('download-button'),
    summaryBackButton: document.getElementById('summary-back-button'),
    zoneFilter: document.getElementById('zone-filter'),
    regionFilter: document.getElementById('region-filter'),
    dealerFilter: document.getElementById('dealer-filter'),
    monthFilter: document.getElementById('month-filter'),
    yearFilter: document.getElementById('year-filter'),
    azureButton: document.getElementById('azure-button'),
    uploadButton: document.getElementById('upload-button'),
  };

  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
  uploadInput.hidden = true;
  document.body.appendChild(uploadInput);

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function setOptions(select, values, allLabel) {
    select.innerHTML = `<option value="">${allLabel}</option>`;
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function safeFilePart(value) {
    return String(value || '')
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'score-sheet';
  }

  function monthFromEvaluationPeriod(period) {
    const monthNames = {
      jan: 'January',
      january: 'January',
      feb: 'February',
      february: 'February',
      mar: 'March',
      march: 'March',
      apr: 'April',
      april: 'April',
      may: 'May',
      jun: 'June',
      june: 'June',
      jul: 'July',
      july: 'July',
      aug: 'August',
      august: 'August',
      sep: 'September',
      sept: 'September',
      september: 'September',
      oct: 'October',
      october: 'October',
      nov: 'November',
      november: 'November',
      dec: 'December',
      december: 'December',
    };
    const match = String(period || '').trim().match(/[A-Za-z]+/);
    return match ? monthNames[match[0].toLowerCase()] || '' : '';
  }

  function unique(key) {
    return [...new Set(demoScores.map((score) => score[key]).filter(Boolean))].sort();
  }

  function getFilteredScores() {
    const zone = elements.zoneFilter.value;
    const region = elements.regionFilter.value;
    const dealerText = elements.dealerFilter.value.trim().toLowerCase();
    const month = elements.monthFilter.value;
    const year = elements.yearFilter.value;

    return demoScores.filter((score) => {
      if (zone && score.zone !== zone) return false;
      if (region && score.region !== region) return false;
      if (month && score.month !== month) return false;
      if (year && score.year !== year) return false;
      if (dealerText) {
        const haystack = `${score.dealerCode} ${score.dealerName}`.toLowerCase();
        if (!haystack.includes(dealerText)) return false;
      }
      return true;
    });
  }

  function actionButtons(score) {
    const wrapper = document.createElement('div');
    wrapper.className = 'summary-action-group';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'table-action';
    viewButton.textContent = 'View';
    viewButton.addEventListener('click', () => showDetail(score, 'view'));
    wrapper.appendChild(viewButton);

    if (role === 'admin') {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'table-action table-action--edit';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => showDetail(score, 'edit'));
      wrapper.appendChild(editButton);
    }

    return wrapper;
  }

  function renderSummary() {
    const scores = getFilteredScores();
    elements.summaryRows.innerHTML = '';

    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      [
        index + 1,
        score.zone,
        score.region,
        score.dealerName,
        score.month,
        score.year,
        score.provisionalBand,
        score.evaluatedPoints,
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value || '-';
        row.appendChild(cell);
      });

      const actionCell = document.createElement('td');
      actionCell.appendChild(actionButtons(score));
      row.appendChild(actionCell);
      elements.summaryRows.appendChild(row);
    });

    elements.summaryCount.textContent = `Showing ${scores.length} dealer${scores.length === 1 ? '' : 's'}`;
  }

  function fillTemplateValues(score) {
    const fiscalYearLabel = score.fiscalYearLabel || score.fiscalYear || 'FY 26-27';
    const evaluationPeriod = score.evaluationPeriod || score.period || "Apr'26";
    const evaluatedOutOf = score.evaluatedOutOf || '545';
    const evaluationMonth = monthFromEvaluationPeriod(evaluationPeriod);
    const values = {
      region: score.region || '',
      dealerName: score.dealerName || '',
      dealerCode: score.dealerCode || '',
      fiscalYearLabel,
      evaluationPeriod,
      scoreMonth: evaluationMonth || score.month || '',
      scoreYear: score.year || score.fiscalYear || '',
      provisionalPoints: score.evaluatedPoints || '0',
      evaluatedPoints: score.evaluatedPoints || '0',
      finalEvaluatedPoints: score.evaluatedPoints || '0',
      finalScore: score.evaluatedPoints || '0',
      provisionalBand: score.provisionalBand || '',
      noteEvaluation: score.noteEvaluation || `1. Evaluation till ${evaluationPeriod} has been done out of ${evaluatedOutOf} points excluding parameter norms related to True Value Vehicle Retention, Sourcing Manpower, Working Capital Diversion & Inadequacy, Facilities Management and Charging Infrastructure parameters.`,
      noteVertical: score.noteVertical || '2. Vertical score cannot be higher than the total maximum points of that vertical or less than zero for Sales & Marketing, Service, Accessories and True Value (excluding ELV) verticals. This does not apply to ELV Scrap Penetration Parameter, Dealer Financials and Dealer Infrastructure & Management Verticals.',
    };

    document.querySelectorAll('[data-nsc-field]').forEach((element) => {
      const key = element.dataset.nscField;
      element.textContent = values[key] ?? '';
      element.contentEditable = 'false';
    });

    document.querySelectorAll('[data-nsc-input-field]').forEach((element) => {
      const key = element.dataset.nscInputField;
      element.value = values[key] ?? '';
    });
  }

  function setDetailHistory(score, mode) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'detail');
    url.searchParams.set('scoreId', score.id);
    url.searchParams.set('mode', mode);
    window.history.pushState({ nscView: 'detail', scoreId: score.id, mode }, '', url);
  }

  function setSummaryHistory(replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('scoreId');
    url.searchParams.delete('mode');
    const state = { nscView: 'summary' };
    if (replace) window.history.replaceState(state, '', url);
    else window.history.pushState(state, '', url);
  }

  function showDetail(score, mode, options = {}) {
    if (!options.fromHistory) setDetailHistory(score, mode);
    activeMode = mode;
    activeScore = score;
    fillTemplateValues(score);
    elements.summaryPanel.hidden = true;
    elements.detailPanel.hidden = false;
    elements.downloadButton.hidden = false;
    elements.summaryBackButton.hidden = false;
    elements.azureButton.hidden = true;
    elements.uploadButton.hidden = true;
    elements.pageTitle.textContent = mode === 'edit' ? 'Edit NSC Score page' : 'View NSC Score page';

    if (mode === 'edit') {
      document.querySelectorAll('[data-nsc-field]').forEach((element) => {
        element.contentEditable = 'true';
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showSummary(options = {}) {
    if (!options.fromHistory) {
      const shouldReplace = options.replaceCurrent ?? activeMode !== 'summary';
      setSummaryHistory(shouldReplace);
    }
    activeMode = 'summary';
    activeScore = null;
    elements.summaryPanel.hidden = false;
    elements.detailPanel.hidden = true;
    elements.downloadButton.hidden = true;
    elements.summaryBackButton.hidden = true;
    elements.azureButton.hidden = role !== 'admin';
    elements.uploadButton.hidden = role !== 'admin';
    elements.pageTitle.textContent = 'View NSC Master Data';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function configureForRole() {
    document.querySelectorAll('[data-admin-only]').forEach((element) => {
      element.hidden = role !== 'admin';
    });
  }

  function collectCssText() {
    return [...document.styleSheets].map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
      } catch (error) {
        return '';
      }
    }).join('\n');
  }

  function escapeXmlText(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function latin1ToBytes(value) {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  function concatBytes(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function makeImagePdf(imageBytes, width, height) {
    const objects = [];
    const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`;
    objects[4] = {
      header: `<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>`,
      stream: imageBytes,
    };
    objects[5] = {
      header: `<< /Length ${content.length} >>`,
      stream: latin1ToBytes(content),
    };

    const parts = [latin1ToBytes('%PDF-1.4\n')];
    const offsets = [0];
    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = parts.reduce((sum, part) => sum + part.length, 0);
      parts.push(latin1ToBytes(`${index} 0 obj\n`));
      if (typeof objects[index] === 'string') {
        parts.push(latin1ToBytes(`${objects[index]}\nendobj\n`));
      } else {
        parts.push(latin1ToBytes(`${objects[index].header}\nstream\n`));
        parts.push(objects[index].stream);
        parts.push(latin1ToBytes('\nendstream\nendobj\n'));
      }
    }
    const xrefOffset = parts.reduce((sum, part) => sum + part.length, 0);
    const xrefRows = offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
      .join('\n');
    parts.push(latin1ToBytes(`xref\n0 ${objects.length}\n0000000000 65535 f \n${xrefRows}\ntrailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return new Blob([concatBytes(parts)], { type: 'application/pdf' });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function renderSheetToCanvas(sheet) {
    const clone = sheet.cloneNode(true);
    clone.style.width = `${sheet.scrollWidth}px`;
    clone.style.minHeight = '0';
    clone.style.boxShadow = 'none';
    clone.querySelectorAll('[contenteditable]').forEach((element) => {
      element.removeAttribute('contenteditable');
    });

    const css = collectCssText();
    const width = sheet.scrollWidth;
    const height = sheet.scrollHeight;
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <style>${escapeXmlText(css)}</style>
            ${serialized}
          </div>
        </foreignObject>
      </svg>`;
    const image = new Image();
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = svgUrl;
      });
      const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  async function downloadScorePdf() {
    if (!activeScore) return;
    const sheet = document.getElementById('nsc-sheet');
    if (!sheet) return;
    const originalText = elements.downloadButton.textContent;
    elements.downloadButton.disabled = true;
    elements.downloadButton.textContent = 'Preparing...';
    try {
      const canvas = await renderSheetToCanvas(sheet);
      const imageBytes = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.96));
      const pdfBlob = makeImagePdf(imageBytes, canvas.width, canvas.height);
      const fileName = `${safeFilePart(['NSC', activeScore.dealerCode, activeScore.dealerName, activeScore.year].filter(Boolean).join('-'))}.pdf`;
      downloadBlob(pdfBlob, fileName);
    } catch (error) {
      window.print();
    } finally {
      elements.downloadButton.disabled = false;
      elements.downloadButton.textContent = originalText;
    }
  }

  function bindEvents() {
    document.getElementById('logout-button')?.addEventListener('click', () => {
      localStorage.removeItem('bsc_token');
      localStorage.removeItem('bsc_user');
      sessionStorage.removeItem('bsc_safe_route_history');
      window.location.href = '/login';
    });

    document.querySelector('[data-go-bsc]')?.addEventListener('click', () => {
      window.location.href = roleHome[role] || '/vanilla/admin/';
    });

    document.querySelectorAll('[data-admin-section]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.dataset.adminSection || 'bsc';
        sessionStorage.setItem('bsc_admin_section', section);
        window.location.href = `/vanilla/admin/?section=${encodeURIComponent(section)}`;
      });
    });

    document.getElementById('back-button')?.addEventListener('click', () => {
      if (!elements.detailPanel.hidden) {
        showSummary({ fromHistory: false });
        return;
      }
      window.location.href = roleHome[role] || '/vanilla/admin/';
    });

    elements.summaryBackButton.addEventListener('click', showSummary);
    elements.downloadButton.addEventListener('click', downloadScorePdf);
    elements.azureButton.addEventListener('click', () => {
      window.alert('Azure document browser placeholder. Link/API will be connected later.');
    });
    elements.uploadButton.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files?.[0];
      if (file) {
        window.alert(`${file.name} selected. NSC Excel upload API will be connected later.`);
      }
      uploadInput.value = '';
    });

    window.addEventListener('popstate', (event) => {
      const state = event.state || {};
      const url = new URL(window.location.href);
      const view = state.nscView || url.searchParams.get('view') || 'summary';
      if (view === 'detail') {
        const scoreId = state.scoreId || url.searchParams.get('scoreId');
        const score = demoScores.find((item) => item.id === scoreId) || activeScore || demoScores[0];
        showDetail(score, state.mode || url.searchParams.get('mode') || 'view', { fromHistory: true });
      } else {
        showSummary({ fromHistory: true });
      }
    });

    [
      elements.zoneFilter,
      elements.regionFilter,
      elements.dealerFilter,
      elements.monthFilter,
      elements.yearFilter,
    ].forEach((element) => {
      element.addEventListener('input', renderSummary);
      element.addEventListener('change', renderSummary);
    });
  }

  setText('#user-name', user.dealerName || user.name || (role === 'msil' ? 'MSIL' : role === 'dealer' ? 'Dealer' : 'Admin'));
  setText('#user-code', user.dealerCode || user.mailId || role.toUpperCase());
  setOptions(elements.zoneFilter, unique('zone'), 'All Zones');
  setOptions(elements.regionFilter, unique('region'), 'All Regions');
  setOptions(elements.monthFilter, unique('month'), 'All Months');
  setOptions(elements.yearFilter, unique('year'), 'All Years');
  configureForRole();
  bindEvents();
  renderSummary();
  window.history.replaceState({ nscView: 'summary' }, '', window.location.href);
})();
