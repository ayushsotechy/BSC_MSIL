(function () {
  function valueOf(value) {
    return value === null || value === undefined || value === '' ? '' : String(value);
  }

  function toNumber(value) {
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? 0 : numberValue;
  }

  function metricValue(metric, key) {
    if (metric && typeof metric === 'object') {
      if (key === 'achieved') return metric.achieved ?? metric.pointsAchieved ?? 0;
      return metric[key] ?? 0;
    }
    return metric ?? 0;
  }

  function formatTotal(value) {
    if (value === null || value === undefined || value === '') return '';
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return valueOf(value);
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

    return {
      maxPoints: (score?.businessAreas || []).reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'maxPoints')), 0),
      minPoints: (score?.businessAreas || []).reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'minPoints')), 0),
      achieved: (score?.businessAreas || []).reduce((sum, area) => sum + toNumber(getTotalValue(area, period, 'achieved')), 0),
    };
  }

  function safeFileName(parts) {
    return parts
      .filter(Boolean)
      .map((part) => String(part).trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''))
      .filter(Boolean)
      .join('_') || 'bsc-score-sheet';
  }

  function buildScoreRows(score, earlySummary, fullSummary) {
    const rows = [];

    (score.businessAreas || []).forEach((area) => {
      const params = area.parameters || [];
      params.forEach((param, index) => {
        rows.push([
          index === 0 ? { content: valueOf(area.areaName), styles: { fontStyle: 'bold', halign: 'center', valign: 'middle' } } : '',
          valueOf(param.sNo),
          valueOf(param.parameter),
          valueOf(metricValue(param.earlyBird, 'maxPoints')),
          valueOf(metricValue(param.earlyBird, 'minPoints')),
          valueOf(metricValue(param.earlyBird, 'achieved')),
          valueOf(metricValue(param.fullYear, 'maxPoints')),
          valueOf(metricValue(param.fullYear, 'minPoints')),
          valueOf(metricValue(param.fullYear, 'achieved')),
        ]);
      });

      rows.push([
        { content: `${valueOf(area.areaName)} Total`, colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 241, 249] } },
        formatTotal(getTotalValue(area, 'earlyBird', 'maxPoints')),
        formatTotal(getTotalValue(area, 'earlyBird', 'minPoints')),
        formatTotal(getTotalValue(area, 'earlyBird', 'achieved')),
        formatTotal(getTotalValue(area, 'fullYear', 'maxPoints')),
        formatTotal(getTotalValue(area, 'fullYear', 'minPoints')),
        formatTotal(getTotalValue(area, 'fullYear', 'achieved')),
      ]);
    });

    rows.push([
      { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', fillColor: [210, 224, 242] } },
      formatTotal(earlySummary.maxPoints),
      formatTotal(earlySummary.minPoints),
      formatTotal(earlySummary.achieved),
      formatTotal(fullSummary.maxPoints),
      formatTotal(fullSummary.minPoints),
      formatTotal(fullSummary.achieved),
    ]);

    return rows;
  }

  function downloadScoreSheetPdf(score, options = {}) {
    if (!score) throw new Error('No score sheet data is available.');
    if (!window.jspdf?.jsPDF) throw new Error('PDF library is not loaded.');

    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const earlySummary = summarizePeriod(score, 'earlyBird');
    const fullSummary = summarizePeriod(score, 'fullYear');
    const margin = 24;
    const sectionLabel = options.sectionLabel || 'BSC';
    const fileName = `${safeFileName([sectionLabel, score.dealerCode, score.month, score.fiscalYear, 'score-sheet'])}.pdf`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`${sectionLabel} Score Sheet`, margin, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, 44);

    doc.autoTable({
      startY: 56,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4, lineColor: [180, 190, 205], lineWidth: 0.4 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [229, 237, 247], cellWidth: 120 },
        1: { cellWidth: 220 },
        2: { fontStyle: 'bold', fillColor: [229, 237, 247], cellWidth: 120 },
        3: { cellWidth: 220 },
      },
      body: [
        ['BSC Parent Dealer Code', valueOf(score.dealerCode), 'Region', valueOf(score.region)],
        ['Dealer Name', { content: valueOf(score.dealerName), colSpan: 3 }],
        ['Fiscal Year', valueOf(score.fiscalYear), 'Month', valueOf(score.month)],
        ['Early Bird Provisional Score', valueOf(score.earlyBird?.provisionalScore || `${earlySummary.achieved}/${earlySummary.maxPoints}`), 'Full Year Provisional Score', valueOf(score.fullYear?.provisionalScore || `${fullSummary.achieved}/${fullSummary.maxPoints}`)],
        ['Early Bird Provisional Qualification', valueOf(score.earlyBird?.qualification), 'Full Year Provisional Score %', valueOf(score.fullYear?.provisionalScorePercent)],
        ['Early Bird Provisional Band', valueOf(score.earlyBird?.band), 'Full Year Band', valueOf(score.fullYear?.band)],
      ],
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 12,
      theme: 'grid',
      margin: { left: margin, right: margin },
      head: [
        [
          { content: 'Business Area', rowSpan: 2 },
          { content: 'S.No.', rowSpan: 2 },
          { content: 'Parameter', rowSpan: 2 },
          { content: 'EARLY BIRD EVALUATION', colSpan: 3, styles: { fillColor: [83, 104, 190] } },
          { content: 'FULL YEAR EVALUATION', colSpan: 3, styles: { fillColor: [83, 104, 190] } },
        ],
        ['Max Points', 'Min Points', 'Points Achieved', 'Max Points', 'Min Points', 'Points Achieved'],
      ],
      body: buildScoreRows(score, earlySummary, fullSummary),
      styles: {
        fontSize: 6.8,
        cellPadding: 2.5,
        overflow: 'linebreak',
        lineColor: [170, 180, 195],
        lineWidth: 0.35,
        valign: 'middle',
      },
      headStyles: { fillColor: [45, 73, 156], textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 86, halign: 'center' },
        1: { cellWidth: 34, halign: 'center' },
        2: { cellWidth: 260 },
        3: { cellWidth: 54, halign: 'center' },
        4: { cellWidth: 54, halign: 'center' },
        5: { cellWidth: 62, halign: 'center' },
        6: { cellWidth: 54, halign: 'center' },
        7: { cellWidth: 54, halign: 'center' },
        8: { cellWidth: 62, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [248, 250, 253] },
      didParseCell(data) {
        if (data.section === 'body' && data.row.raw?.[0]?.content?.includes?.('Total')) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = data.row.raw[0].content === 'TOTAL' ? [210, 224, 242] : [235, 241, 249];
        }
      },
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Note:', margin, finalY);
    doc.setFont('helvetica', 'normal');
    const note = 'Vertical scores cannot be higher than the total maximum points of that vertical or less than zero. Evaluation excludes parameter norms where applicable.';
    doc.text(doc.splitTextToSize(note, 790), margin, finalY + 12);

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(7);
      doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 70, doc.internal.pageSize.getHeight() - 14);
    }

    doc.save(fileName);
  }

  window.BscPdfExporter = { downloadScoreSheetPdf };
})();
