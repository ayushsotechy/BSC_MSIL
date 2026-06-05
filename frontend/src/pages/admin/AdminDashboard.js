import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import Navbar from '../../components/common/Navbar';
import BscScoreSheet from '../../components/dealer/BscScoreSheet';
import accessControlService from '../../services/accessControl.service';
import bscService from '../../services/bsc.service';
import useSafeBackNavigation from '../../hooks/useSafeBackNavigation';
import { buildVendorBscScore, getVendorBscData } from '../../data/vendorBscData';
import { useAuth } from '../../context/AuthContext';
import './AdminDashboard.css';
import '../../pages/dealer/DealerDashboard.css';
import '../msil/MsilDashboard.css';

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

const DEFAULT_UPLOAD_YEAR = String(new Date().getFullYear());
const DEFAULT_UPLOAD_MONTH = MONTH_OPTIONS[new Date().getMonth()];
const DEFAULT_TABLE_PAGE_SIZE = 10;
const DEFAULT_COMPACT_PAGE_SIZE = 6;
const CREDENTIAL_BATCH_SIZE = 25;
const SCORE_BATCH_SIZE = 10;
const ACCESS_ZONES_KEY = 'bsc_access_zones';
const ACCESS_REGIONS_KEY = 'bsc_access_regions';
const ACCESS_MSIL_PERSONS_KEY = 'bsc_access_msil_persons';
const ACCESS_DEALER_CREDENTIALS_KEY = 'bsc_access_dealer_credentials';

const defaultAccessData = {
  zones: ['CENTRAL', 'EAST', 'NORTH', 'SOUTH', 'SOUTH EAST', 'WEST'],
  regions: [
    'CENTRAL 1',
    'CENTRAL 2',
    'CENTRAL 3',
    'CENTRAL 4',
    'EAST 1',
    'EAST 2',
    'EAST 3',
    'NORTH 1',
    'NORTH 2',
    'NORTH 3',
    'NORTH 4',
    'SOUTH 1',
    'SOUTH 2',
    'SOUTH 3',
    'SOUTH EAST 1',
    'SOUTH EAST 2',
    'WEST 1',
    'WEST 2',
    'WEST 3',
  ],
  msilPersons: [
    { id: 'msil-1', name: 'neha', mailId: '', password: '1234' },
    { id: 'msil-2', name: 'Sahil', mailId: '', password: '1234' },
    { id: 'msil-3', name: 'Sandeep', mailId: '', password: '1234' },
    { id: 'msil-4', name: 'ayush', mailId: '', password: '1234' },
  ],
  dealerCredentials: [
    { id: 'dealer-1', dealerCode: 'Dealer 1', dealerName: 'Dealer 1', mailId: '', password: '', zone: 'North', region: 'R1', msilPersons: [] },
    { id: 'dealer-2', dealerCode: 'Dealer 2', dealerName: 'Dealer 2', mailId: '', password: '', zone: 'North', region: 'R2', msilPersons: [] },
    { id: 'dealer-3', dealerCode: 'Dealer 3', dealerName: 'Dealer 3', mailId: '', password: '', zone: 'South', region: 'R3', msilPersons: [] },
  ],
};

const readStoredList = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStoredList = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getPageCount = (totalItems, pageSize) => Math.max(1, Math.ceil((totalItems || 0) / pageSize));

const paginateItems = (items, page, pageSize) => {
  const startIndex = (page - 1) * pageSize;
  return (items || []).slice(startIndex, startIndex + pageSize);
};

const chunkItems = (items, chunkSize) => {
  const chunks = [];
  for (let index = 0; index < (items || []).length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const sanitizeFilePart = (value) =>
  String(value || 'BSC').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (rows, filename) => {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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

const formatEvaluationPeriod = (score) => {
  const rawMonth = String(score?.month || '').trim();
  if (rawMonth.includes("'")) return rawMonth;

  const month = MONTH_SHORT_NAMES[rawMonth.toLowerCase()] || rawMonth.slice(0, 3) || 'Month';
  const yearText = String(score?.fiscalYear || '').trim();
  const fullYearMatch = yearText.match(/\b(20\d{2})\b/);
  const fyMatch = yearText.match(/fy\s*\d{2}\s*[-/]\s*(\d{2})/i);
  const yearSuffix = fullYearMatch ? fullYearMatch[1].slice(-2) : fyMatch?.[1] || '';

  return yearSuffix ? `${month}'${yearSuffix}` : month;
};

const getScoreDenominator = (score, fallbackMaxPoints) => {
  const scoreText = String(score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '');
  const denominator = scoreText.includes('/') ? Number(scoreText.split('/').pop()) : 0;
  return denominator || fallbackMaxPoints || 0;
};

const downloadScorePdf = (score) => {
  if (!score) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 24;
  const earlyBirdMax = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'earlyBird', 'maxPoints'), 0);
  const fullYearMax = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'fullYear', 'maxPoints'), 0);
  const earlyBirdMin = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'earlyBird', 'minPoints'), 0);
  const fullYearMin = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'fullYear', 'minPoints'), 0);
  const earlyBirdAchieved = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'earlyBird', 'achieved'), 0);
  const fullYearAchieved = (score.businessAreas || []).reduce((sum, area) => sum + metricTotal(area, 'fullYear', 'achieved'), 0);
  const pdfRows = [];

  (score.businessAreas || []).forEach((area) => {
    (area.parameters || []).forEach((param, index) => {
      pdfRows.push([
        index === 0 ? area.areaName || '' : '',
        String(param.sNo || ''),
        param.parameter || '',
        String(metricValue(param.earlyBird, 'maxPoints')),
        String(metricValue(param.earlyBird, 'minPoints')),
        String(metricValue(param.earlyBird, 'achieved')),
        String(metricValue(param.fullYear, 'maxPoints')),
        String(metricValue(param.fullYear, 'minPoints')),
        String(metricValue(param.fullYear, 'achieved')),
      ]);
    });

    pdfRows.push([
      `${area.areaName || ''} Total`,
      '',
      '',
      String(metricTotal(area, 'earlyBird', 'maxPoints')),
      String(metricTotal(area, 'earlyBird', 'minPoints')),
      String(metricTotal(area, 'earlyBird', 'achieved')),
      String(metricTotal(area, 'fullYear', 'maxPoints')),
      String(metricTotal(area, 'fullYear', 'minPoints')),
      String(metricTotal(area, 'fullYear', 'achieved')),
    ]);
  });

  pdfRows.push([
    'TOTAL',
    '',
    '',
    String(earlyBirdMax),
    String(earlyBirdMin),
    String(earlyBirdAchieved),
    String(fullYearMax),
    String(fullYearMin),
    String(fullYearAchieved),
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`BSC ${score.fiscalYear || ''} PROVISIONAL SCORE SHEET`, pageWidth / 2, 34, { align: 'center' });

  autoTable(doc, {
    startY: 48,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      valign: 'middle',
      lineColor: [214, 221, 235],
      lineWidth: 0.6,
    },
    body: [
      ['BSC Parent Dealer Code', score.dealerCode || '', 'Region', score.region || '', 'Dealer Name', score.dealerName || ''],
      ['Fiscal Year', score.fiscalYear || '', 'Month', score.month || '', '', ''],
      ['Early Bird Provisional Score', score.earlyBird?.provisionalScore || '', 'Full Year Provisional Score', score.fullYear?.provisionalScore || '', '', ''],
      ['Early Bird Provisional Qualification', score.earlyBird?.qualification || '', 'Full Year Provisional Score %', score.fullYear?.provisionalScorePercent || '', '', ''],
      ['Early Bird Provisional Band', score.earlyBird?.band || '', 'Full Year Band', score.fullYear?.band || '', '', ''],
    ],
    columnStyles: {
      0: { fillColor: [74, 110, 224], textColor: 255, fontStyle: 'bold', cellWidth: 130 },
      1: { cellWidth: 120 },
      2: { fillColor: [74, 110, 224], textColor: 255, fontStyle: 'bold', cellWidth: 130 },
      3: { cellWidth: 120 },
      4: { fillColor: [74, 110, 224], textColor: 255, fontStyle: 'bold', cellWidth: 130 },
      5: { cellWidth: 120 },
    },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    theme: 'grid',
    margin: { left: margin, right: margin, bottom: 42 },
    styles: {
      font: 'helvetica',
      fontSize: 7.4,
      cellPadding: 4.5,
      valign: 'middle',
      lineColor: [214, 221, 235],
      lineWidth: 0.55,
      textColor: [55, 65, 81],
    },
    head: [
      ['Business Area', 'S.No.', 'Parameter', 'EARLY BIRD EVALUATION', '', '', 'FULL YEAR EVALUATION', '', ''],
      ['', '', '', 'Max Points', 'Min Points', 'Points Achieved', 'Max Points', 'Min Points', 'Points Achieved'],
    ],
    body: pdfRows,
    columnStyles: {
      0: { cellWidth: 108, halign: 'center' },
      1: { cellWidth: 34, halign: 'center' },
      2: { cellWidth: 248 },
      3: { cellWidth: 52, halign: 'center' },
      4: { cellWidth: 52, halign: 'center' },
      5: { cellWidth: 68, halign: 'center' },
      6: { cellWidth: 52, halign: 'center' },
      7: { cellWidth: 52, halign: 'center' },
      8: { cellWidth: 68, halign: 'center' },
    },
    didParseCell: ({ cell, row, column }) => {
      const raw = row.raw || [];
      const isTotal = row.section === 'body' && String(raw[0] || '').includes('Total');
      const isGrandTotal = row.section === 'body' && String(raw[0] || '') === 'TOTAL';
      const isEarlyBirdColumn = column.index >= 3 && column.index <= 5;
      const isFullYearColumn = column.index >= 6 && column.index <= 8;

      if (row.section === 'head') {
        cell.styles.fontStyle = 'bold';
        cell.styles.halign = 'center';

        if (column.index <= 2) {
          cell.styles.fillColor = [74, 110, 224];
          cell.styles.textColor = 255;
        } else if (isEarlyBirdColumn) {
          cell.styles.fillColor = [217, 221, 231];
          cell.styles.textColor = [31, 47, 95];
        } else if (isFullYearColumn) {
          cell.styles.fillColor = [38, 59, 134];
          cell.styles.textColor = 255;
        }
      }

      if (row.section === 'body') {
        if (column.index === 0 && raw[0] && !isTotal && !isGrandTotal) {
          cell.styles.fillColor = [74, 110, 224];
          cell.styles.textColor = 255;
          cell.styles.fontStyle = 'bold';
        } else if (isEarlyBirdColumn) {
          cell.styles.fillColor = [238, 240, 245];
        } else if (isFullYearColumn) {
          cell.styles.fillColor = [220, 232, 255];
        }

        if (isTotal || isGrandTotal) {
          cell.styles.fontStyle = 'bold';

          if (column.index <= 2) {
            cell.styles.fillColor = isGrandTotal ? [255, 255, 255] : [229, 231, 235];
            cell.styles.textColor = [31, 41, 55];
            cell.styles.halign = column.index === 0 ? 'right' : 'center';
          } else if (isEarlyBirdColumn) {
            cell.styles.fillColor = [217, 221, 231];
            cell.styles.textColor = [31, 41, 55];
          } else if (isFullYearColumn) {
            cell.styles.fillColor = [38, 59, 134];
            cell.styles.textColor = 255;
          }
        }
      }
    },
  });

  const noteMaxPoints = getScoreDenominator(score, fullYearMax || earlyBirdMax);
  const noteText = `Note :\n1. Evaluation till ${formatEvaluationPeriod(score)} has been done out of ${noteMaxPoints} Points excluding parameter norms related to ARENA & TV Manpower Certification, True Value Retention, Service Infrastructure, MSGA (Norm C), Dealer Financials, ARENA & TV Sales Infrastructure and Adequate Insurance Coverage & Preventive Safety Audit parameters.\n2. Vertical's score cannot be higher than the total maximum points of that vertical or less than zero for Sales & Marketing Performance and Sales Quality, True Value Performance (excluding ELV), Service Performance and Service Quality and Parts and Accessories.`;
  const pageHeight = doc.internal.pageSize.getHeight();
  const noteFontSize = 8.5;
  const noteWidth = pageWidth - (margin * 2) - 16;
  const noteLines = doc.splitTextToSize(noteText, noteWidth);
  const noteHeight = (noteLines.length * noteFontSize * 1.18) + 24;
  let noteStartY = doc.lastAutoTable.finalY;

  if (noteStartY + noteHeight > pageHeight - margin) {
    doc.addPage('a4', 'landscape');
    noteStartY = margin;
  }

  autoTable(doc, {
    startY: noteStartY,
    theme: 'grid',
    rowPageBreak: 'avoid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 8,
      lineColor: [17, 24, 39],
      lineWidth: 1,
      textColor: [17, 24, 39],
    },
    body: [[noteText]],
  });

  const filename = `BSC_${sanitizeFilePart(score.dealerCode)}_${sanitizeFilePart(score.fiscalYear)}_${sanitizeFilePart(score.month)}.pdf`;
  const blobUrl = URL.createObjectURL(doc.output('blob'));
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
};

const PaginationControls = ({ totalItems, page, pageSize, onPageChange, label = 'list' }) => {
  const pageCount = getPageCount(totalItems, pageSize);
  if ((totalItems || 0) <= pageSize) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((pageNumber) =>
      pageNumber === 1
      || pageNumber === pageCount
      || Math.abs(pageNumber - page) <= 2
    );

  return (
    <div className="admin-pagination">
      <span className="admin-pagination__summary">
        Showing {startItem}-{endItem} of {totalItems} {label}
      </span>
      <div className="admin-pagination__pages">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        {pageNumbers.map((pageNumber, index) => (
          <React.Fragment key={pageNumber}>
            {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
              <span className="admin-pagination__ellipsis">...</span>
            )}
            <button
              type="button"
              className={pageNumber === page ? 'admin-pagination__page--active' : ''}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          </React.Fragment>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const normalizeAccessControlData = (data = {}) => ({
  zones: Array.isArray(data.zones) && data.zones.length
    ? data.zones.map((item) => String(item?.name || item || '').trim()).filter(Boolean)
    : defaultAccessData.zones,
  regions: Array.isArray(data.regions) && data.regions.length
    ? data.regions.map((item) => String(item?.name || item || '').trim()).filter(Boolean)
    : defaultAccessData.regions,
  msilPersons: Array.isArray(data.msilPersons) && data.msilPersons.length
    ? data.msilPersons.map((person) => ({
      id: String(person.id || person._id || createId('msil')),
      name: person.name || '',
      mailId: person.mailId || person.email || '',
      password: person.password || '',
    }))
    : defaultAccessData.msilPersons,
  dealerCredentials: Array.isArray(data.dealerCredentials)
    ? data.dealerCredentials.map((credential) => ({
      id: String(credential.id || credential._id || createId('dealer')),
      dealerCode: credential.dealerCode || '',
      dealerName: credential.dealerName || credential.dealerCode || '',
      mailId: credential.mailId || credential.email || '',
      password: credential.password || '',
      zone: credential.zone || '',
      region: credential.region || '',
      msilPersons: credential.msilPersons || [],
    }))
    : defaultAccessData.dealerCredentials,
});

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
  const total = area?.[`${period}Total`];
  if (total && typeof total === 'object') return Number(metricValue(total, key)) || 0;
  if (key === 'achieved' && total !== undefined && total !== null && total !== '') return Number(total) || 0;

  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + (param?.excludeFromTotals ? 0 : (Number(metricValue(param?.[period], key)) || 0)),
      0,
    );
  }

  return 0;
};

const normalizeMetric = (metric = {}) => ({
  maxPoints: Number(metricValue(metric, 'maxPoints')) || 0,
  minPoints: Number(metricValue(metric, 'minPoints')) || 0,
  achieved: Number(metricValue(metric, 'achieved')) || 0,
});

const normalizeTotalMetric = (area, period) => ({
  maxPoints: metricTotal(area, period, 'maxPoints'),
  minPoints: metricTotal(area, period, 'minPoints'),
  achieved: metricTotal(area, period, 'achieved'),
});

const normalizeScoreForApi = (score) => ({
  dealerCode: String(score?.dealerCode || '').trim(),
  dealerName: String(score?.dealerName || '').trim(),
  region: String(score?.region || '').trim(),
  fiscalYear: String(score?.fiscalYear || '').trim(),
  month: String(score?.month || '').trim(),
  previousYearBand: score?.previousYearBand || '',
  currentYearBand: score?.currentYearBand || score?.fullYear?.band || score?.earlyBird?.band || 'NO BAND',
  yearScore: score?.yearScore || score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '',
  provisionalType: score?.provisionalType || 'provisional',
  earlyBird: {
    provisionalScore: score?.earlyBird?.provisionalScore || `${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'achieved')) || 0), 0)}/${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'maxPoints')) || 0), 0)}`,
    provisionalScorePercent: (() => {
      if (score?.earlyBird?.provisionalScorePercent) return score.earlyBird.provisionalScorePercent;
      const achieved = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'achieved')) || 0), 0);
      const max = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'earlyBird', 'maxPoints')) || 0), 0);
      return max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%';
    })(),
    qualification: score?.earlyBird?.qualification || 'N',
    total: score?.earlyBird?.total,
    band: score?.earlyBird?.band || '',
  },
  fullYear: {
    provisionalScore: score?.fullYear?.provisionalScore || `${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'achieved')) || 0), 0)}/${(score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'maxPoints')) || 0), 0)}`,
    provisionalScorePercent: (() => {
      if (score?.fullYear?.provisionalScorePercent) return score.fullYear.provisionalScorePercent;
      const achieved = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'achieved')) || 0), 0);
      const max = (score?.businessAreas || []).reduce((sum, area) => sum + (Number(metricTotal(area, 'fullYear', 'maxPoints')) || 0), 0);
      return max ? `${((achieved / max) * 100).toFixed(1)}%` : '0.0%';
    })(),
    qualification: score?.fullYear?.qualification || 'N',
    total: score?.fullYear?.total,
    band: score?.fullYear?.band || '',
  },
  businessAreas: (score?.businessAreas || []).map((area) => ({
    areaName: area?.areaName || '',
    earlyBirdTotal: normalizeTotalMetric(area, 'earlyBird'),
    fullYearTotal: normalizeTotalMetric(area, 'fullYear'),
    parameters: (area?.parameters || []).map((param) => ({
      sNo: param?.sNo,
      parameter: param?.parameter || param?.name || '',
      accessConditionMet: param?.accessConditionMet || param?.condition || '',
      excludeFromTotals: Boolean(param?.excludeFromTotals),
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

const getCurrentYearBand = (score) =>
  score?.currentYearBand || score?.fullYear?.band || score?.earlyBird?.band || 'NO BAND';

const getYearScore = (score) =>
  score?.yearScore || score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '-';

const parseFiscalYearNumber = (fiscalYear) => {
  const text = String(fiscalYear || '').trim();
  const fullYearMatch = text.match(/\b(20\d{2})\b/);
  if (fullYearMatch) return Number(fullYearMatch[1]);

  const fyMatch = text.match(/fy\s*(\d{2})\s*[-/]\s*(\d{2})/i);
  if (fyMatch) return 2000 + Number(fyMatch[2]);

  return null;
};

const getPreviousFiscalYearCandidates = (fiscalYear) => {
  const yearNumber = parseFiscalYearNumber(fiscalYear);
  if (!yearNumber) return [];

  const previousYear = yearNumber - 1;
  const previousShort = String(previousYear).slice(-2);
  const currentShort = String(yearNumber).slice(-2);

  return [
    String(previousYear).toLowerCase(),
    `fy ${previousShort}-${currentShort}`.toLowerCase(),
    `fy${previousShort}-${currentShort}`.toLowerCase(),
  ];
};

const getPreviousYearBand = (score, allScores) => {
  if (score?.previousYearBand) return score.previousYearBand;

  const candidates = getPreviousFiscalYearCandidates(score?.fiscalYear);
  const previousScore = (allScores || []).find((item) =>
    String(item?.dealerCode || '').trim().toLowerCase() === String(score?.dealerCode || '').trim().toLowerCase()
    && candidates.includes(String(item?.fiscalYear || '').trim().toLowerCase())
  );

  return previousScore ? getCurrentYearBand(previousScore) : 'N/A';
};

const getScoreCredential = (score, dealerCredentials) =>
  (dealerCredentials || []).find((credential) =>
    String(credential.dealerCode || '').trim().toLowerCase() === String(score?.dealerCode || '').trim().toLowerCase()
  );

const getMonthRank = (monthName) => {
  const monthIndex = MONTH_OPTIONS.findIndex((item) =>
    item.toLowerCase() === String(monthName || '').trim().toLowerCase()
  );

  return monthIndex >= 0 ? monthIndex : -1;
};

const getLatestMonthFromRows = (rows = []) => {
  const rowWithLatestMonth = rows
    .filter((row) => row?.month)
    .sort((a, b) => {
      const yearA = parseFiscalYearNumber(a?.fiscalYear) || 0;
      const yearB = parseFiscalYearNumber(b?.fiscalYear) || 0;
      if (yearA !== yearB) return yearB - yearA;

      return getMonthRank(b?.month) - getMonthRank(a?.month);
    })[0];

  return rowWithLatestMonth?.month || '';
};

const AdminDashboard = ({ readOnly = false }) => {
  const { user } = useAuth();
  const fallbackDashboardPath = readOnly ? '/msil/dashboard' : '/admin/dashboard';
  const goBackSafely = useSafeBackNavigation(fallbackDashboardPath);
  const [activeTab, setActiveTab] = useState('bsc');
  const [pageHistory, setPageHistory] = useState([]);
  const [zone, setZone] = useState('');
  const [region, setRegion] = useState('');
  const [dealer, setDealer] = useState('');
  const [month, setMonth] = useState('');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [hasInitializedMsilMonth, setHasInitializedMsilMonth] = useState(false);
  const [year, setYear] = useState('');
  const excelInputRef = useRef(null);
  const monthDropdownRef = useRef(null);
  
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [draftScore, setDraftScore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Database State
  const [tableRows, setTableRows] = useState([]);
  const [nscRows, setNscRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [parsedExcelScores, setParsedExcelScores] = useState([]);
  const [parsedExcelCredentials, setParsedExcelCredentials] = useState([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [bulkSaveProgress, setBulkSaveProgress] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadYear, setUploadYear] = useState(DEFAULT_UPLOAD_YEAR);
  const [uploadMonth, setUploadMonth] = useState(DEFAULT_UPLOAD_MONTH);
  const [zones, setZones] = useState(() => readStoredList(ACCESS_ZONES_KEY, defaultAccessData.zones));
  const [regions, setRegions] = useState(() => readStoredList(ACCESS_REGIONS_KEY, defaultAccessData.regions));
  const [msilPersons, setMsilPersons] = useState(() => readStoredList(ACCESS_MSIL_PERSONS_KEY, defaultAccessData.msilPersons));
  const [dealerCredentials, setDealerCredentials] = useState(() => readStoredList(ACCESS_DEALER_CREDENTIALS_KEY, defaultAccessData.dealerCredentials));
  const [dealerCredentialSearch, setDealerCredentialSearch] = useState('');
  const [openMsilDropdownId, setOpenMsilDropdownId] = useState(null);
  const [isAccessSaving, setIsAccessSaving] = useState(false);
  const [isEditingZones, setIsEditingZones] = useState(false);
  const [isEditingRegions, setIsEditingRegions] = useState(false);
  const [editingMsilId, setEditingMsilId] = useState(null);
  const [editingDealerId, setEditingDealerId] = useState(null);
  const [bscPage, setBscPage] = useState(1);
  const [nscPage, setNscPage] = useState(1);
  const [excelPreviewPage, setExcelPreviewPage] = useState(1);
  const [dealerCredentialPage, setDealerCredentialPage] = useState(1);
  const [zonePage, setZonePage] = useState(1);
  const [regionPage, setRegionPage] = useState(1);
  const [msilPersonPage, setMsilPersonPage] = useState(1);

  const isMsilReadOnly = readOnly && user?.role === 'msil';
  const msilUserIds = useMemo(() => (
    [user?.name, user?.mailId, user?.dealerCode]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  ), [user?.dealerCode, user?.mailId, user?.name]);
  const msilDealerCredentials = useMemo(() => (
    isMsilReadOnly
      ? dealerCredentials.filter((credential) =>
        (credential.msilPersons || []).some((personId) =>
          msilUserIds.includes(String(personId || '').trim().toLowerCase())
        )
      )
      : dealerCredentials
  ), [dealerCredentials, isMsilReadOnly, msilUserIds]);
  const allowedMsilDealerCodes = useMemo(() => (
    msilDealerCredentials
      .map((credential) => String(credential.dealerCode || '').trim().toLowerCase())
      .filter(Boolean)
  ), [msilDealerCredentials]);
  const msilVisibleRowsForDefaults = useMemo(() => (
    isMsilReadOnly
      ? tableRows.filter((row) => allowedMsilDealerCodes.includes(String(row.dealerCode || '').trim().toLowerCase()))
      : []
  ), [allowedMsilDealerCodes, isMsilReadOnly, tableRows]);
  const selectedMonthFilters = isMsilReadOnly ? selectedMonths : (month ? [month] : []);
  const zoneOptions = isMsilReadOnly
    ? zones.filter((item) => msilDealerCredentials.some((credential) => credential.zone === item))
    : zones;
  const regionOptions = isMsilReadOnly
    ? regions.filter((item) =>
      msilDealerCredentials.some((credential) =>
        credential.region === item && (!zone || credential.zone === zone)
      )
    )
    : regions;

  const filterRows = (rows) => rows.filter((row) => {
    const dealerText = `${row.dealerName || ''} ${row.dealerCode || ''}`.toLowerCase();
    const rowCredential = dealerCredentials.find((credential) =>
      String(credential.dealerCode || '').trim().toLowerCase() === String(row.dealerCode || '').trim().toLowerCase()
    );

    return (
      (!isMsilReadOnly || allowedMsilDealerCodes.includes(String(row.dealerCode || '').trim().toLowerCase())) &&
      (!zone || String(rowCredential?.zone || '').toLowerCase() === zone.toLowerCase()) &&
      (!region || String(rowCredential?.region || row.region || '').toLowerCase().includes(region.toLowerCase())) &&
      (!dealer || dealerText.includes(dealer.toLowerCase())) &&
      (!selectedMonthFilters.length || selectedMonthFilters.some((selectedMonth) =>
        String(row.month || '').toLowerCase() === String(selectedMonth || '').toLowerCase()
      )) &&
      (!year || String(row.fiscalYear || '').toLowerCase().includes(year.toLowerCase()))
    );
  });

  const fetchMasterData = async () => {
    try {
      setIsLoading(true);
      const response = await bscService.getScores({ summary: true });
      const dbData = response.data || [];
      setTableRows(dbData);
      setNscRows(dbData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyAccessControlData = useCallback((data) => {
    const normalized = normalizeAccessControlData(data);
    setZones(normalized.zones);
    setRegions(normalized.regions);
    setMsilPersons(normalized.msilPersons);
    setDealerCredentials(normalized.dealerCredentials);
    writeStoredList(ACCESS_ZONES_KEY, normalized.zones);
    writeStoredList(ACCESS_REGIONS_KEY, normalized.regions);
    writeStoredList(ACCESS_MSIL_PERSONS_KEY, normalized.msilPersons);
    writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, normalized.dealerCredentials);
  }, []);

  const fetchAccessControlData = useCallback(async () => {
    try {
      const response = await accessControlService.getAccessControl();
      applyAccessControlData(response.data || response);
    } catch (error) {
      console.error('Error fetching access control:', error);
    }
  }, [applyAccessControlData]);

  const saveAccessControlData = async (onSuccess, overrides = {}) => {
    try {
      setIsAccessSaving(true);
      const response = await accessControlService.saveAccessControl({
        zones: overrides.zones || zones,
        regions: overrides.regions || regions,
        msilPersons: overrides.msilPersons || msilPersons,
        dealerCredentials: overrides.dealerCredentials || dealerCredentials,
      });
      applyAccessControlData(response.data || response);
      if (onSuccess) onSuccess();
      toast.success(response.message || 'Access control saved successfully.');
    } catch (error) {
      console.error('Failed to save access control:', error);
      toast.error(error.response?.data?.message || 'Failed to save access control.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const buildAccessDraftWithExcelCredentials = (excelCredentials = parsedExcelCredentials) => {
    const nextZones = [...new Map(
      [...zones, ...excelCredentials.map((credential) => credential.zone)]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item])
    ).values()];

    const nextRegions = [...new Map(
      [...regions, ...excelCredentials.map((credential) => credential.region)]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item])
    ).values()];

    const hasAyush = msilPersons.some((person) =>
      String(person.name || '').trim().toLowerCase() === 'ayush' ||
      String(person.mailId || '').trim().toLowerCase() === 'ayush@gmail.com'
    );
    const nextMsilPersons = hasAyush
      ? msilPersons
      : [...msilPersons, { id: createId('msil'), name: 'ayush', mailId: 'ayush@gmail.com', password: '1234' }];

    const credentialMap = new Map(
      dealerCredentials.map((credential) => [
        String(credential.dealerCode || '').trim().toLowerCase(),
        credential,
      ])
    );

    excelCredentials.forEach((credential, index) => {
      const dealerCode = String(credential.dealerCode || '').trim();
      if (!dealerCode) return;

      const existingCredential = credentialMap.get(dealerCode.toLowerCase()) || {};

      credentialMap.set(dealerCode.toLowerCase(), {
        id: credentialMap.get(dealerCode.toLowerCase())?.id || credential.id || createId('dealer'),
        dealerCode,
        dealerName: credential.dealerName || dealerCode,
        mailId: credential.mailId || `dealer${index + 1}@gmail.com`,
        password: credential.password || '1234',
        zone: credential.zone || '',
        region: credential.region || '',
        msilPersons: ['ayush'],
        ...existingCredential,
      });
    });

    return {
      zones: nextZones,
      regions: nextRegions,
      msilPersons: nextMsilPersons,
      dealerCredentials: [...credentialMap.values()],
    };
  };

  // Fetch exactly from DB
  useEffect(() => {
    if (!selectedDealer) {
      fetchMasterData();
    }
  }, [activeTab, selectedDealer]);

  useEffect(() => {
    fetchAccessControlData();
  }, [fetchAccessControlData]);

  useEffect(() => {
    writeStoredList(ACCESS_ZONES_KEY, zones);
  }, [zones]);

  useEffect(() => {
    writeStoredList(ACCESS_REGIONS_KEY, regions);
  }, [regions]);

  useEffect(() => {
    writeStoredList(ACCESS_MSIL_PERSONS_KEY, msilPersons);
  }, [msilPersons]);

  useEffect(() => {
    writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, dealerCredentials);
  }, [dealerCredentials]);

  useEffect(() => {
    if (!isMsilReadOnly) return;

    if (zone && !zoneOptions.includes(zone)) {
      setZone('');
    }

    if (region && !regionOptions.includes(region)) {
      setRegion('');
    }
  }, [isMsilReadOnly, zone, region, zoneOptions, regionOptions]);

  useEffect(() => {
    if (!isMsilReadOnly || hasInitializedMsilMonth || !msilVisibleRowsForDefaults.length) return;

    const latestMonth = getLatestMonthFromRows(msilVisibleRowsForDefaults);
    if (latestMonth) {
      setSelectedMonths([latestMonth]);
      setMonth(latestMonth);
    }
    setHasInitializedMsilMonth(true);
  }, [hasInitializedMsilMonth, isMsilReadOnly, msilVisibleRowsForDefaults]);

  useEffect(() => {
    if (!isMonthDropdownOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!monthDropdownRef.current?.contains(event.target)) {
        setIsMonthDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMonthDropdownOpen]);

  const getCurrentPageKey = () => (selectedDealer ? `detail:${activeTab}` : activeTab);

  const pushCurrentPage = () => {
    const currentPage = getCurrentPageKey();
    setPageHistory((history) => (history[history.length - 1] === currentPage ? history : [...history, currentPage]));
  };

  const openDealerScore = async (row, editing = false, tab = 'bsc') => {
    try {
      const hasFullScore = Array.isArray(row?.businessAreas) && row.businessAreas.length > 0;
      const fullRow = hasFullScore || !row?._id
        ? row
        : (await bscService.getScoreById(row._id)).data;
      const score = cloneScore(fullRow);

      pushCurrentPage();
      setActiveTab(tab);
      setSelectedDealer({ row: fullRow, score });
      setDraftScore(score);
      setIsEditing(editing);
    } catch (error) {
      console.error('Failed to load score sheet:', error);
      toast.error(error.response?.data?.message || 'Failed to load score sheet.');
    }
  };

  const openUploadModal = () => {
    if (readOnly || activeTab !== 'bsc') return;
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    if (isUploadingExcel) return;
    setShowUploadModal(false);
  };

  const handleChooseExcelFile = () => {
    if (!uploadYear.trim()) {
      toast.warn('Please enter year before uploading.');
      return;
    }

    if (!uploadMonth) {
      toast.warn('Please select month before uploading.');
      return;
    }

    excelInputRef.current?.click();
  };

  const handleExcelUpload = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setIsUploadingExcel(true);

    const response = await bscService.uploadExcel({
      file,
      fiscalYear: uploadYear.trim(),
      month: uploadMonth,
    });

    const parsedScores = response.data || [];
    const parsedCredentials = response.accessCredentials || [];

    if (!parsedScores.length) {
      toast.warn('No valid scorecards found in Excel.');
      return;
    }

    setParsedExcelScores(parsedScores);
    setParsedExcelCredentials(parsedCredentials);
    const accessDraft = buildAccessDraftWithExcelCredentials(parsedCredentials);
    setZones(accessDraft.zones);
    setRegions(accessDraft.regions);
    setMsilPersons(accessDraft.msilPersons);
    setDealerCredentials(accessDraft.dealerCredentials);
    setShowUploadModal(false);

    toast.success(`Excel parsed successfully for ${uploadMonth} ${uploadYear}. ${parsedScores.length} dealers found. Generated access credentials are ready for review; click Save All Dealers when done.`);
  } catch (error) {
    console.error('Excel upload failed:', error);
    toast.error(error.response?.data?.message || 'Excel upload failed. Check console.');
  } finally {
    setIsUploadingExcel(false);
    e.target.value = '';
  }
};
const handleBulkSaveScores = async () => {
  if (!parsedExcelScores.length) {
    toast.warn('No parsed scorecards to save.');
    return;
  }

  try {
    setIsSavingBulk(true);
    const accessDraft = buildAccessDraftWithExcelCredentials();
    const excelDealerCodeSet = new Set(
      parsedExcelScores
        .map((score) => String(score.dealerCode || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const credentialsToSave = accessDraft.dealerCredentials.filter((credential) =>
      excelDealerCodeSet.has(String(credential.dealerCode || '').trim().toLowerCase())
    );
    const credentialBatches = chunkItems(credentialsToSave, CREDENTIAL_BATCH_SIZE);
    const scoreBatches = chunkItems(parsedExcelScores, SCORE_BATCH_SIZE);

    setBulkSaveProgress('Saving access lists...');
    await accessControlService.saveAccessControl({
      zones: accessDraft.zones,
      regions: accessDraft.regions,
      msilPersons: accessDraft.msilPersons,
      dealerCredentials: [],
      returnData: false,
    });

    for (let batchIndex = 0; batchIndex < credentialBatches.length; batchIndex += 1) {
      setBulkSaveProgress(`Saving credentials ${Math.min((batchIndex + 1) * CREDENTIAL_BATCH_SIZE, credentialsToSave.length)}/${credentialsToSave.length}...`);
      await accessControlService.saveAccessControl({
        zones: accessDraft.zones,
        regions: accessDraft.regions,
        msilPersons: accessDraft.msilPersons,
        dealerCredentials: credentialBatches[batchIndex],
        returnData: false,
      });
    }

    let savedScoreCount = 0;
    for (let batchIndex = 0; batchIndex < scoreBatches.length; batchIndex += 1) {
      setBulkSaveProgress(`Saving scorecards ${Math.min((batchIndex + 1) * SCORE_BATCH_SIZE, parsedExcelScores.length)}/${parsedExcelScores.length}...`);
      const response = await bscService.bulkSaveScores(scoreBatches[batchIndex], { upsert: true });
      savedScoreCount += Number(response.count || 0);
    }

    toast.success(`${savedScoreCount} scorecards and ${credentialsToSave.length} access credentials saved successfully.`);

    setParsedExcelScores([]);
    setParsedExcelCredentials([]);
    setBulkSaveProgress('');
    await fetchAccessControlData();
    await fetchMasterData();
  } catch (error) {
    console.error('Bulk save failed:', error);
    toast.error(error.response?.data?.message || 'Failed to save parsed scorecards.');
  } finally {
    setIsSavingBulk(false);
    setBulkSaveProgress('');
  }
};

  const addZone = () => {
    setZones((current) => [...current, '']);
    setZonePage(getPageCount(zones.length + 1, DEFAULT_COMPACT_PAGE_SIZE));
    setIsEditingZones(true);
  };

  const addRegion = () => {
    setRegions((current) => [...current, '']);
    setRegionPage(getPageCount(regions.length + 1, DEFAULT_COMPACT_PAGE_SIZE));
    setIsEditingRegions(true);
  };

  const updateZone = (index, value) => {
    setZones((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const updateRegion = (index, value) => {
    setRegions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const removeZone = async (index) => {
    const zoneToRemove = zones[index];
    const nextZones = zones.filter((_, itemIndex) => itemIndex !== index);
    const nextDealerCredentials = dealerCredentials.map((credential) => (
      String(credential.zone || '').trim().toLowerCase() === String(zoneToRemove || '').trim().toLowerCase()
        ? { ...credential, zone: '', zoneId: '' }
        : credential
    ));

    if (!String(zoneToRemove || '').trim()) {
      setZones(nextZones);
      setDealerCredentials(nextDealerCredentials);
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.deleteZone(zoneToRemove);
      setZones(nextZones);
      setDealerCredentials(nextDealerCredentials);
      writeStoredList(ACCESS_ZONES_KEY, nextZones);
      writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, nextDealerCredentials);
      toast.success(response.message || 'Zone removed successfully.');
    } catch (error) {
      console.error('Failed to remove zone:', error);
      toast.error(error.response?.data?.message || 'Failed to remove zone.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const removeRegion = async (index) => {
    const regionToRemove = regions[index];
    const nextRegions = regions.filter((_, itemIndex) => itemIndex !== index);
    const nextDealerCredentials = dealerCredentials.map((credential) => (
      String(credential.region || '').trim().toLowerCase() === String(regionToRemove || '').trim().toLowerCase()
        ? { ...credential, region: '', regionId: '' }
        : credential
    ));

    if (!String(regionToRemove || '').trim()) {
      setRegions(nextRegions);
      setDealerCredentials(nextDealerCredentials);
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.deleteRegion(regionToRemove);
      setRegions(nextRegions);
      setDealerCredentials(nextDealerCredentials);
      writeStoredList(ACCESS_REGIONS_KEY, nextRegions);
      writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, nextDealerCredentials);
      toast.success(response.message || 'Region removed successfully.');
    } catch (error) {
      console.error('Failed to remove region:', error);
      toast.error(error.response?.data?.message || 'Failed to remove region.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const saveZones = () => {
    const cleanedZones = [...new Map(
      zones
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item])
    ).values()];

    setZones(cleanedZones);
    saveAccessControlData(() => setIsEditingZones(false), { zones: cleanedZones });
  };

  const saveRegions = () => {
    const cleanedRegions = [...new Map(
      regions
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => [item.toLowerCase(), item])
    ).values()];

    setRegions(cleanedRegions);
    saveAccessControlData(() => setIsEditingRegions(false), { regions: cleanedRegions });
  };

  const addMsilPerson = () => {
    const id = createId('msil');
    setMsilPersons((current) => [
      ...current,
      { id, name: '', mailId: '', password: '1234' },
    ]);
    setMsilPersonPage(getPageCount(msilPersons.length + 1, DEFAULT_TABLE_PAGE_SIZE));
    setEditingMsilId(id);
  };

  const updateMsilPerson = (id, field, value) => {
    setMsilPersons((current) => current.map((person) => (
      person.id === id ? { ...person, [field]: value } : person
    )));
  };

  const removeMsilPerson = async (id) => {
    const personToRemove = msilPersons.find((person) => person.id === id);
    const nextMsilPersons = msilPersons.filter((person) => person.id !== id);
    const nextDealerCredentials = dealerCredentials.map((credential) => ({
      ...credential,
      msilPersons: (credential.msilPersons || []).filter((personId) => personId !== id),
    }));

    if (!personToRemove?._id && !String(personToRemove?.mailId || personToRemove?.name || '').trim()) {
      setMsilPersons(nextMsilPersons);
      setDealerCredentials(nextDealerCredentials);
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.deleteMsilPerson(personToRemove?._id || personToRemove?.mailId || personToRemove?.name || personToRemove?.id);
      setMsilPersons(nextMsilPersons);
      setDealerCredentials(nextDealerCredentials);
      setEditingMsilId((currentId) => (currentId === id ? null : currentId));
      writeStoredList(ACCESS_MSIL_PERSONS_KEY, nextMsilPersons);
      writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, nextDealerCredentials);
      toast.success(response.message || 'MSIL person removed successfully.');
    } catch (error) {
      console.error('Failed to remove MSIL person:', error);
      toast.error(error.response?.data?.message || 'Failed to remove MSIL person.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const addDealerCredential = () => {
    const id = createId('dealer');
    setDealerCredentials((current) => [
      ...current,
      {
        id,
        dealerCode: '',
        dealerName: '',
        mailId: '',
        password: '',
        zone: zones[0] || '',
        region: regions[0] || '',
        msilPersons: [],
      },
    ]);
    setDealerCredentialPage(getPageCount(dealerCredentials.length + 1, DEFAULT_TABLE_PAGE_SIZE));
    setEditingDealerId(id);
  };

  const updateDealerCredential = (id, field, value) => {
    setDealerCredentials((current) => current.map((row) => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const removeDealerCredential = async (id) => {
    const credentialToRemove = dealerCredentials.find((credential) => credential.id === id);
    const nextDealerCredentials = dealerCredentials.filter((credential) => credential.id !== id);

    if (!credentialToRemove?._id && !String(credentialToRemove?.dealerCode || '').trim()) {
      setDealerCredentials(nextDealerCredentials);
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.deleteDealerCredential(credentialToRemove?._id || credentialToRemove?.dealerCode || credentialToRemove?.id);
      setDealerCredentials(nextDealerCredentials);
      setEditingDealerId((currentId) => (currentId === id ? null : currentId));
      setOpenMsilDropdownId((currentId) => (currentId === id ? null : currentId));
      writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, nextDealerCredentials);
      toast.success(response.message || 'Dealer credential removed successfully.');
    } catch (error) {
      console.error('Failed to remove dealer credential:', error);
      toast.error(error.response?.data?.message || 'Failed to remove dealer credential.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const getMsilPersonLabel = (personId) => {
    const person = msilPersons.find((item) => item.id === personId);
    return person?.name || person?.mailId || personId;
  };

  const getDealerMsilSummary = (personIds = []) => {
    if (!personIds.length) return 'Select MSIL person';
    return personIds.map(getMsilPersonLabel).join(', ');
  };

  const getMonthFilterSummary = () => {
    if (!selectedMonths.length) return 'All Months';
    if (selectedMonths.length === MONTH_OPTIONS.length) return 'All Months';
    if (selectedMonths.length <= 2) return selectedMonths.join(', ');
    return `${selectedMonths.length} months selected`;
  };

  const toggleSelectedMonth = (nextMonth) => {
    setHasInitializedMsilMonth(true);
    setSelectedMonths((currentMonths) => (
      currentMonths.includes(nextMonth)
        ? currentMonths.filter((item) => item !== nextMonth)
        : [...currentMonths, nextMonth]
    ));
    setMonth('');
  };

  const showAllMonthsForMsil = () => {
    setHasInitializedMsilMonth(true);
    setSelectedMonths([]);
    setMonth('');
  };

  const toggleDealerMsilPerson = (dealerId, personId) => {
    setDealerCredentials((current) => current.map((row) => {
      if (row.id !== dealerId) return row;

      const currentPersons = row.msilPersons || [];
      const nextPersons = currentPersons.includes(personId)
        ? currentPersons.filter((id) => id !== personId)
        : [...currentPersons, personId];

      return { ...row, msilPersons: nextPersons };
    }));
  };

  const saveMsilPerson = async (id) => {
    const person = msilPersons.find((item) => item.id === id);
    if (!String(person?.name || '').trim() && !String(person?.mailId || '').trim()) {
      toast.warn('Please enter MSIL person name or mail ID.');
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.saveMsilPerson(person);
      const savedPerson = response.data || person;

      setMsilPersons((current) => {
        const nextPeople = current.map((item) => (item.id === id ? { ...item, ...savedPerson } : item));
        writeStoredList(ACCESS_MSIL_PERSONS_KEY, nextPeople);
        return nextPeople;
      });
      setEditingMsilId(null);
      toast.success(response.message || 'MSIL person saved successfully.');
    } catch (error) {
      console.error('Failed to save MSIL person:', error);
      toast.error(error.response?.data?.message || 'Failed to save MSIL person.');
    } finally {
      setIsAccessSaving(false);
    }
  };

  const saveDealerCredential = async (id) => {
    const credential = dealerCredentials.find((item) => item.id === id);

    if (!String(credential?.dealerCode || '').trim()) {
      toast.warn('Please enter dealer code.');
      return;
    }

    if (!String(credential?.password || '').trim()) {
      toast.warn('Please enter dealer password.');
      return;
    }

    try {
      setIsAccessSaving(true);
      const response = await accessControlService.saveDealerCredential(credential);
      const savedCredential = response.data || credential;

      setDealerCredentials((current) => {
        const existingIndex = current.findIndex((item) => item.id === id);
        const nextCredentials = existingIndex >= 0
          ? current.map((item) => (item.id === id ? { ...item, ...savedCredential } : item))
          : [...current, savedCredential];
        writeStoredList(ACCESS_DEALER_CREDENTIALS_KEY, nextCredentials);
        return nextCredentials;
      });
      setEditingDealerId(null);
      setOpenMsilDropdownId(null);
      toast.success(response.message || 'Dealer credential saved successfully.');
    } catch (error) {
      console.error('Failed to save dealer credential:', error);
      toast.error(error.response?.data?.message || 'Failed to save dealer credential.');
    } finally {
      setIsAccessSaving(false);
    }
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
      toast.success('Scorecard saved successfully!');
      await fetchMasterData();
    } catch (error) {
      console.error('Failed to save', error);
      toast.error(error.response?.data?.message || 'Failed to save data. Check console.');
    }
  };

  const handleDownloadScoreSheet = () => {
    const score = activeScore;

    if (!score) {
      toast.warn('No score sheet is loaded to download.');
      return;
    }

    try {
      downloadScorePdf(score);
    } catch (error) {
      console.error('Failed to download score sheet:', error);
      toast.error(error.response?.data?.message || 'Failed to download score sheet.');
    }
  };

  const handleExportReviewSheet = () => {
    const score = activeScore;
    if (!score) {
      toast.warn('No score sheet is loaded to export.');
      return;
    }

    const rows = [
      ['BSC Review Sheet'],
      ['Dealer Code', score.dealerCode || ''],
      ['Dealer Name', score.dealerName || ''],
      ['Region', score.region || ''],
      ['Fiscal Year', score.fiscalYear || ''],
      ['Month', score.month || ''],
      [],
      ['Metric', 'Early Bird', 'Full Year'],
      ['Provisional Score', score.earlyBird?.provisionalScore || '', score.fullYear?.provisionalScore || ''],
      ['Score Achievement', score.earlyBird?.provisionalScorePercent || '', score.fullYear?.provisionalScorePercent || ''],
      ['Qualification', score.earlyBird?.qualification || '', score.fullYear?.qualification || ''],
      ['Band', score.earlyBird?.band || '', score.fullYear?.band || ''],
      [],
      ['Business Area', 'EB Max', 'EB Min', 'EB Achieved', 'FY Max', 'FY Min', 'FY Achieved'],
      ...(score.businessAreas || []).map((area) => [
        area.areaName || '',
        metricTotal(area, 'earlyBird', 'maxPoints'),
        metricTotal(area, 'earlyBird', 'minPoints'),
        metricTotal(area, 'earlyBird', 'achieved'),
        metricTotal(area, 'fullYear', 'maxPoints'),
        metricTotal(area, 'fullYear', 'minPoints'),
        metricTotal(area, 'fullYear', 'achieved'),
      ]),
    ];

    const filename = `BSC_Review_${sanitizeFilePart(score.dealerCode)}_${sanitizeFilePart(score.fiscalYear)}_${sanitizeFilePart(score.month)}.csv`;
    downloadCsv(rows, filename);
  };

  const handleOpenAzureDocuments = () => {
    toast.info('Azure document server link is not configured yet. Later this will open the dealer review-sheet documents using dealer code as the unique key.');
  };

  const activeScore = draftScore || selectedDealer?.score;
  const filteredTableRows = filterRows(tableRows);
  const filteredNscRows = filterRows(nscRows);
  const filteredDealerCredentials = dealerCredentials.filter((credential) => {
    const searchText = dealerCredentialSearch.trim().toLowerCase();
    if (!searchText) return true;

    return [
      credential.dealerCode,
      credential.dealerName,
      credential.mailId,
    ].some((value) => String(value || '').toLowerCase().includes(searchText));
  });
  const paginatedTableRows = paginateItems(filteredTableRows, bscPage, DEFAULT_TABLE_PAGE_SIZE);
  const paginatedNscRows = paginateItems(filteredNscRows, nscPage, DEFAULT_TABLE_PAGE_SIZE);
  const paginatedExcelScores = paginateItems(parsedExcelScores, excelPreviewPage, DEFAULT_TABLE_PAGE_SIZE);
  const paginatedDealerCredentials = paginateItems(filteredDealerCredentials, dealerCredentialPage, DEFAULT_TABLE_PAGE_SIZE);
  const paginatedZones = paginateItems(zones, zonePage, DEFAULT_COMPACT_PAGE_SIZE);
  const paginatedRegions = paginateItems(regions, regionPage, DEFAULT_COMPACT_PAGE_SIZE);
  const paginatedMsilPersons = paginateItems(msilPersons, msilPersonPage, DEFAULT_TABLE_PAGE_SIZE);

  useEffect(() => {
    setBscPage((currentPage) => Math.min(currentPage, getPageCount(filteredTableRows.length, DEFAULT_TABLE_PAGE_SIZE)));
    setNscPage((currentPage) => Math.min(currentPage, getPageCount(filteredNscRows.length, DEFAULT_TABLE_PAGE_SIZE)));
  }, [filteredTableRows.length, filteredNscRows.length]);

  useEffect(() => {
    setBscPage(1);
    setNscPage(1);
  }, [zone, region, dealer, month, selectedMonths, year]);

  useEffect(() => {
    setExcelPreviewPage((currentPage) => Math.min(currentPage, getPageCount(parsedExcelScores.length, DEFAULT_TABLE_PAGE_SIZE)));
  }, [parsedExcelScores.length]);

  useEffect(() => {
    setDealerCredentialPage((currentPage) => Math.min(currentPage, getPageCount(filteredDealerCredentials.length, DEFAULT_TABLE_PAGE_SIZE)));
  }, [filteredDealerCredentials.length]);

  useEffect(() => {
    setDealerCredentialPage(1);
  }, [dealerCredentialSearch]);

  useEffect(() => {
    setZonePage((currentPage) => Math.min(currentPage, getPageCount(zones.length, DEFAULT_COMPACT_PAGE_SIZE)));
    setRegionPage((currentPage) => Math.min(currentPage, getPageCount(regions.length, DEFAULT_COMPACT_PAGE_SIZE)));
    setMsilPersonPage((currentPage) => Math.min(currentPage, getPageCount(msilPersons.length, DEFAULT_TABLE_PAGE_SIZE)));
  }, [zones.length, regions.length, msilPersons.length]);

  const showMasterTab = (tab, trackHistory = true) => {
    if (trackHistory && getCurrentPageKey() !== tab) {
      pushCurrentPage();
    }

    setActiveTab(tab);
    setSelectedDealer(null);
    setDraftScore(null);
    setIsEditing(false);
  };

  const handleSidebarBack = () => {
    if (pageHistory.length) {
      const previousPage = pageHistory[pageHistory.length - 1];
      setPageHistory((history) => history.slice(0, -1));

      const previousTab = previousPage.startsWith('detail:')
        ? previousPage.replace('detail:', '')
        : previousPage;

      showMasterTab(previousTab || 'bsc', false);
      return;
    }

    if (selectedDealer) {
      showMasterTab(activeTab, false);
      return;
    }

    goBackSafely();
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
            <button className="dealer-sidebar__back" type="button" onClick={handleSidebarBack}>
              <span className="dealer-sidebar__back-icon">↩</span><span>Back</span>
            </button>
          </aside>

          <main className="dealer-main">
            <div className="dealer-panel">
              <div className="dealer-main__header dealer-main__header--stacked">
              <h2 className="dealer-main__title">
                  {isEditing && !readOnly ? `Edit ${activeTab === 'nsc' ? 'NSC' : 'BSC'} Score page` : `View ${activeTab === 'nsc' ? 'NSC' : 'BSC'} Score page`}
                </h2>
                <div className="admin-editor-actions admin-editor-actions--exports">
                  <button className="admin-action-btn admin-action-btn--download" type="button" onClick={handleDownloadScoreSheet}>
                    Score Sheet
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </button>
                  <button className="admin-action-btn admin-action-btn--review" type="button" onClick={handleExportReviewSheet}>
                    Review Sheet
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16" /><path d="M4 12h10" /><path d="M4 17h16" /><path d="M17 12l3 3 3-3" /></svg>
                  </button>
                </div>
                {!readOnly && (
                <div className="admin-editor-actions admin-editor-actions--primary">
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
          {!readOnly && (
            <>
              <button className={`msil-sidebar__btn ${activeTab === 'accessCredentials' ? 'msil-sidebar__btn--active' : ''}`} type="button" onClick={() => showMasterTab('accessCredentials')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h6" /><path d="M7 13h10" /><circle cx="17" cy="9" r="1" /></svg>
                <span>Access Credentials</span>
              </button>
              <button className={`msil-sidebar__btn ${activeTab === 'accessControl' ? 'msil-sidebar__btn--active' : ''}`} type="button" onClick={() => showMasterTab('accessControl')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v5c0 5-3 8-7 10-4-2-7-5-7-10V7l7-4z" /><path d="M9 12l2 2 4-5" /></svg>
                <span>Access Control</span>
              </button>
            </>
          )}
          <button className="msil-sidebar__back" type="button" onClick={handleSidebarBack}>
            <span className="msil-sidebar__back-icon">↩</span>
            <span>Back</span>
          </button>
        </aside>

        <main className="msil-main">
          <section className="msil-panel">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="msil-title" style={{ margin: 0 }}>
                {activeTab === 'nsc'
                  ? 'View NSC Master Data'
                  : activeTab === 'accessCredentials'
                    ? 'Dealer Access Credentials'
                    : activeTab === 'accessControl'
                      ? 'Access Control'
                      : 'View BSC Master Data'}
              </h2>
              
  {!readOnly && activeTab !== 'accessCredentials' && activeTab !== 'accessControl' && (
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    {activeTab === 'bsc' && (
      <>
        <button
          type="button"
          className="admin-action-btn admin-action-btn--azure"
          onClick={handleOpenAzureDocuments}
        >
          Azure Documents
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4" />
          </svg>
        </button>

        <button
          type="button"
          className="admin-action-btn admin-action-btn--save"
          onClick={openUploadModal}
          disabled={isUploadingExcel}
          style={{
            padding: '10px 16px',
            background: '#16a34a',
            color: 'white',
            borderRadius: '6px',
            border: 'none',
            cursor: isUploadingExcel ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: isUploadingExcel ? 0.7 : 1,
          }}
        >
          {isUploadingExcel ? 'Uploading...' : 'Upload Excel'}
        </button>

        {parsedExcelScores.length > 0 && (
          <button
            className="admin-action-btn admin-action-btn--save"
            type="button"
            onClick={handleBulkSaveScores}
            disabled={isSavingBulk}
            style={{
              padding: '10px 16px',
              background: '#dc2626',
              color: 'white',
              borderRadius: '6px',
              border: 'none',
              cursor: isSavingBulk ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isSavingBulk ? 0.7 : 1,
            }}
          >
            {isSavingBulk ? (bulkSaveProgress || 'Saving...') : `Save All Dealers (${parsedExcelScores.length})`}
          </button>
        )}
      </>
    )}

    <button
      className="admin-action-btn admin-action-btn--save"
      style={{
        padding: '10px 16px',
        background: '#4a6ee0',
        color: 'white',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
      onClick={handleAddNewScore}
    >
      + Add New {activeTab === 'nsc' ? 'NSC' : 'BSC'} Score
    </button>
  </div>
)}
            </div>

            {/* FILTER PANEL */}
            {activeTab !== 'accessCredentials' && activeTab !== 'accessControl' && (
              <div className="msil-filter-panel">
                <div className="msil-filter-grid">
                  <label className="msil-field">
                    <span>Zone</span>
                    <select value={zone} onChange={(e) => setZone(e.target.value)} className="msil-input">
                      <option value="">All Zones</option>
                      {zoneOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="msil-field">
                    <span>Region</span>
                    <select value={region} onChange={(e) => setRegion(e.target.value)} className="msil-input">
                      <option value="">All Regions</option>
                      {regionOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="msil-field">
                    <span>Dealer Code / Name</span>
                    <input value={dealer} onChange={(e) => setDealer(e.target.value)} className="msil-input" type="text" />
                  </label>

                  <label className="msil-field">
                    <span>Month</span>
                    {isMsilReadOnly ? (
                      <div className="admin-month-multiselect" ref={monthDropdownRef}>
                        <button
                          type="button"
                          className="admin-month-multiselect__trigger"
                          onClick={() => setIsMonthDropdownOpen((isOpen) => !isOpen)}
                        >
                          <span>{getMonthFilterSummary()}</span>
                          <span className="admin-month-multiselect__arrow">▾</span>
                        </button>

                        {isMonthDropdownOpen && (
                          <div className="admin-month-multiselect__menu">
                            <label className="admin-month-multiselect__option">
                              <input
                                type="checkbox"
                                checked={!selectedMonths.length}
                                onChange={showAllMonthsForMsil}
                              />
                              <span>All Months</span>
                            </label>
                            {MONTH_OPTIONS.map((item) => (
                              <label key={item} className="admin-month-multiselect__option">
                                <input
                                  type="checkbox"
                                  checked={selectedMonths.includes(item)}
                                  onChange={() => toggleSelectedMonth(item)}
                                />
                                <span>{item}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <select value={month} onChange={(e) => setMonth(e.target.value)} className="msil-input">
                        <option value="">All Months</option>
                        {MONTH_OPTIONS.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    )}
                  </label>

                  <label className="msil-field">
                    <span>Year</span>
                    <input value={year} onChange={(e) => setYear(e.target.value)} className="msil-input" type="text" placeholder="e.g. 2026" />
                  </label>
                </div>
              </div>
            )}

            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={isUploadingExcel}
              style={{ display: 'none' }}
            />

            {showUploadModal && (
              <div className="admin-upload-modal">
                <div className="admin-upload-modal__card">
                  <button className="admin-upload-modal__close" type="button" onClick={closeUploadModal} aria-label="Close upload modal">
                    X
                  </button>

                  <label className="admin-upload-modal__field">
                    <span>Year</span>
                    <input
                      type="text"
                      value={uploadYear}
                      onChange={(e) => setUploadYear(e.target.value)}
                      placeholder="2026"
                    />
                  </label>

                  <label className="admin-upload-modal__field">
                    <span>Month</span>
                    <select value={uploadMonth} onChange={(e) => setUploadMonth(e.target.value)}>
                      {MONTH_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <div className="admin-upload-modal__actions">
                    <span>Browse</span>
                    <button type="button" onClick={handleChooseExcelFile} disabled={isUploadingExcel}>
                      {isUploadingExcel ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'accessCredentials' ? (
              <div className="admin-access-page">
                <div className="admin-access-page__header">
                  <h3>Dealer Access Credentials</h3>
                  <button className="admin-access-add-btn" type="button" onClick={addDealerCredential}>Add</button>
                </div>
                <div className="admin-access-search">
                  <label htmlFor="dealer-credential-search">Search Dealer Code</label>
                  <input
                    id="dealer-credential-search"
                    type="search"
                    value={dealerCredentialSearch}
                    onChange={(event) => setDealerCredentialSearch(event.target.value)}
                    placeholder="Enter dealer code..."
                  />
                </div>

                <div className="msil-table-shell">
                  <table className="msil-table admin-access-table">
                    <thead>
                      <tr>
                        <th>Sl No.</th>
                        <th>Dealer Code</th>
                        <th>Mail ID</th>
                        <th>Password</th>
                        <th>Zone</th>
                        <th>Region</th>
                        <th>MSIL Person</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDealerCredentials.map((row, index) => {
                        const isRowEditing = editingDealerId === row.id;

                        return (
                          <tr key={row.id}>
                            <td>{(dealerCredentialPage - 1) * DEFAULT_TABLE_PAGE_SIZE + index + 1}</td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={row.dealerCode}
                                onChange={(event) => updateDealerCredential(row.id, 'dealerCode', event.target.value)}
                                placeholder="Dealer code"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={row.mailId}
                                onChange={(event) => updateDealerCredential(row.id, 'mailId', event.target.value)}
                                placeholder="dealer@email.com"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={row.password}
                                onChange={(event) => updateDealerCredential(row.id, 'password', event.target.value)}
                                placeholder="Password"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <select
                                className="admin-access-input"
                                value={row.zone}
                                onChange={(event) => updateDealerCredential(row.id, 'zone', event.target.value)}
                                disabled={!isRowEditing}
                              >
                                <option value="">Select zone</option>
                                {zones.map((item) => (
                                  <option key={item} value={item}>{item}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="admin-access-input"
                                value={row.region}
                                onChange={(event) => updateDealerCredential(row.id, 'region', event.target.value)}
                                disabled={!isRowEditing}
                              >
                                <option value="">Select region</option>
                                {regions.map((item) => (
                                  <option key={item} value={item}>{item}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div className="admin-msil-select-wrap">
                                <button
                                  type="button"
                                  className="admin-msil-dropdown-trigger"
                                  onClick={() => {
                                    if (isRowEditing) {
                                      setOpenMsilDropdownId((currentId) => (currentId === row.id ? null : row.id));
                                    }
                                  }}
                                  disabled={!isRowEditing}
                                >
                                  <span>{getDealerMsilSummary(row.msilPersons || [])}</span>
                                  <span className="admin-msil-dropdown-trigger__arrow">▾</span>
                                </button>

                                {openMsilDropdownId === row.id && isRowEditing && (
                                  <div className="admin-msil-dropdown-menu">
                                    {msilPersons.map((person) => {
                                      const personName = person.name || person.mailId || person.id;

                                      return (
                                        <label key={person.id} className="admin-msil-dropdown-option">
                                          <input
                                            type="checkbox"
                                            checked={(row.msilPersons || []).includes(person.id)}
                                            onChange={() => toggleDealerMsilPerson(row.id, person.id)}
                                          />
                                          <span>{personName || 'MSIL Person'}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {isRowEditing ? (
                                  <button className="admin-access-row-btn admin-access-row-btn--save" type="button" onClick={() => saveDealerCredential(row.id)} disabled={isAccessSaving}>
                                    {isAccessSaving ? 'Saving...' : 'Save'}
                                  </button>
                                ) : (
                                  <button className="admin-access-row-btn" type="button" onClick={() => setEditingDealerId(row.id)}>
                                    Edit
                                  </button>
                                )}
                                <button
                                  className="admin-row-delete-btn"
                                  type="button"
                                  onClick={() => removeDealerCredential(row.id)}
                                  disabled={isAccessSaving}
                                  aria-label={`Remove dealer credential ${row.dealerCode || ''}`}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  totalItems={filteredDealerCredentials.length}
                  page={dealerCredentialPage}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onPageChange={setDealerCredentialPage}
                  label="dealers"
                />
              </div>
            ) : activeTab === 'accessControl' ? (
              <div className="admin-access-page">
                <div className="admin-control-grid">
                  <div className="admin-control-card">
                    <div className="admin-control-card__title">
                      <span>Zone</span>
                      <div className="admin-control-card__actions">
                        {isEditingZones && (
                          <button type="button" onClick={saveZones} disabled={isAccessSaving}>
                            {isAccessSaving ? '...' : 'Save'}
                          </button>
                        )}
                        {!isEditingZones && (
                          <button type="button" onClick={() => setIsEditingZones(true)}>Edit</button>
                        )}
                        <button type="button" onClick={addZone}>+</button>
                      </div>
                    </div>
                    <div className="admin-control-list">
                      {paginatedZones.map((item, index) => {
                        const actualIndex = (zonePage - 1) * DEFAULT_COMPACT_PAGE_SIZE + index;

                        return (
                        <div key={`${item}-${index}`} className="admin-control-list__row">
                          {isEditingZones ? (
                            <>
                              <input
                                className="admin-control-list__input"
                                value={item}
                                onChange={(event) => updateZone(actualIndex, event.target.value)}
                                placeholder="Zone"
                              />
                              <button
                                className="admin-control-remove-btn"
                                type="button"
                                onClick={() => removeZone(actualIndex)}
                                disabled={isAccessSaving}
                                aria-label={`Remove zone ${item || ''}`}
                                title="Remove"
                              >
                                ×
                              </button>
                            </>
                          ) : item}
                        </div>
                        );
                      })}
                    </div>
                    <PaginationControls
                      totalItems={zones.length}
                      page={zonePage}
                      pageSize={DEFAULT_COMPACT_PAGE_SIZE}
                      onPageChange={setZonePage}
                      label="zones"
                    />
                  </div>

                  <div className="admin-control-card">
                    <div className="admin-control-card__title">
                      <span>Region</span>
                      <div className="admin-control-card__actions">
                        {isEditingRegions && (
                          <button type="button" onClick={saveRegions} disabled={isAccessSaving}>
                            {isAccessSaving ? '...' : 'Save'}
                          </button>
                        )}
                        {!isEditingRegions && (
                          <button type="button" onClick={() => setIsEditingRegions(true)}>Edit</button>
                        )}
                        <button type="button" onClick={addRegion}>+</button>
                      </div>
                    </div>
                    <div className="admin-control-list">
                      {paginatedRegions.map((item, index) => {
                        const actualIndex = (regionPage - 1) * DEFAULT_COMPACT_PAGE_SIZE + index;

                        return (
                        <div key={`${item}-${index}`} className="admin-control-list__row">
                          {isEditingRegions ? (
                            <>
                              <input
                                className="admin-control-list__input"
                                value={item}
                                onChange={(event) => updateRegion(actualIndex, event.target.value)}
                                placeholder="Region"
                              />
                              <button
                                className="admin-control-remove-btn"
                                type="button"
                                onClick={() => removeRegion(actualIndex)}
                                disabled={isAccessSaving}
                                aria-label={`Remove region ${item || ''}`}
                                title="Remove"
                              >
                                ×
                              </button>
                            </>
                          ) : item}
                        </div>
                        );
                      })}
                    </div>
                    <PaginationControls
                      totalItems={regions.length}
                      page={regionPage}
                      pageSize={DEFAULT_COMPACT_PAGE_SIZE}
                      onPageChange={setRegionPage}
                      label="regions"
                    />
                  </div>
                </div>

                <div className="admin-access-page__header admin-access-page__header--spaced">
                  <h3>MSIL Access control</h3>
                  <button className="admin-access-add-btn" type="button" onClick={addMsilPerson}>+</button>
                </div>

                <div className="msil-table-shell">
                  <table className="msil-table admin-access-table">
                    <thead>
                      <tr>
                        <th>Sl No.</th>
                        <th>MSIL Person</th>
                        <th>Mail ID</th>
                        <th>Password</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMsilPersons.map((person, index) => {
                        const isRowEditing = editingMsilId === person.id;

                        return (
                          <tr key={person.id}>
                            <td>{(msilPersonPage - 1) * DEFAULT_TABLE_PAGE_SIZE + index + 1}</td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={person.name}
                                onChange={(event) => updateMsilPerson(person.id, 'name', event.target.value)}
                                placeholder="MSIL person"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={person.mailId}
                                onChange={(event) => updateMsilPerson(person.id, 'mailId', event.target.value)}
                                placeholder="msil@email.com"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <input
                                className="admin-access-input"
                                value={person.password}
                                onChange={(event) => updateMsilPerson(person.id, 'password', event.target.value)}
                                placeholder="Password"
                                disabled={!isRowEditing}
                              />
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                {isRowEditing ? (
                                  <button className="admin-access-row-btn admin-access-row-btn--save" type="button" onClick={() => saveMsilPerson(person.id)} disabled={isAccessSaving}>
                                    {isAccessSaving ? 'Saving...' : 'Save'}
                                  </button>
                                ) : (
                                  <button className="admin-access-row-btn" type="button" onClick={() => setEditingMsilId(person.id)}>
                                    Edit
                                  </button>
                                )}
                                <button
                                  className="admin-row-delete-btn"
                                  type="button"
                                  onClick={() => removeMsilPerson(person.id)}
                                  disabled={isAccessSaving}
                                  aria-label={`Remove MSIL person ${person.name || person.mailId || ''}`}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  totalItems={msilPersons.length}
                  page={msilPersonPage}
                  pageSize={DEFAULT_TABLE_PAGE_SIZE}
                  onPageChange={setMsilPersonPage}
                  label="MSIL persons"
                />
              </div>
            ) : activeTab === 'nsc' ? (
  <div className="msil-table-shell">
    <table className="msil-table">
      <thead>
        <tr>
          <th>Sl No.</th>
          <th>Region</th>
          <th>Dealer Name</th>
          <th>Last Year Band</th>
          <th>Current Year Band</th>
          <th>Year Score</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
              Loading Data...
            </td>
          </tr>
        ) : filteredNscRows.length === 0 ? (
          <tr>
            <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No NSC Master Data found in database.
            </td>
          </tr>
        ) : (
          paginatedNscRows.map((row, index) => (
            <tr key={row._id || index}>
              <td>{(nscPage - 1) * DEFAULT_TABLE_PAGE_SIZE + index + 1}</td>
              <td>{row.region || '-'}</td>
              <td>{row.dealerName || '-'}</td>
              <td>{getPreviousYearBand(row, tableRows)}</td>
              <td>{getCurrentYearBand(row)}</td>
              <td>{getYearScore(row)}</td>
              <td>
                <div className="admin-actions">
                  {!readOnly && (
                    <button
                      className="admin-action-btn admin-action-btn--edit"
                      type="button"
                      onClick={() => openDealerScore(row, true, 'nsc')}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="admin-action-btn admin-action-btn--view"
                    type="button"
                    onClick={() => openDealerScore(row, false, 'nsc')}
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    <PaginationControls
      totalItems={filteredNscRows.length}
      page={nscPage}
      pageSize={DEFAULT_TABLE_PAGE_SIZE}
      onPageChange={setNscPage}
      label="NSC records"
    />
  </div>
) : (
  <>
    {/* EXCEL PREVIEW BEFORE SAVE */}
    {parsedExcelScores.length > 0 && (
      <div
        style={{
          marginBottom: '20px',
          padding: '16px',
          border: '1px solid #bbf7d0',
          background: '#f0fdf4',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '12px',
          }}
        >
          <div>
            <strong>{parsedExcelScores.length} dealers parsed from Excel.</strong>
            <div style={{ fontSize: '13px', color: '#166534', marginTop: '4px' }}>
              Review the preview below, then click Save All Dealers.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setParsedExcelScores([]);
              setParsedExcelCredentials([]);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Clear Preview
          </button>
        </div>

        <div className="msil-table-shell">
          <table className="msil-table">
            <thead>
              <tr>
                <th>Sl No.</th>
                <th>Zone</th>
                <th>Region</th>
                <th>Dealer Name</th>
                <th>Dealer Code</th>
                <th>Month</th>
                <th>Year</th>
                <th>Last Year Band</th>
                <th>Current Year Band</th>
                <th>Year Score</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExcelScores.map((score, index) => {
                const scoreCredential = getScoreCredential(score, dealerCredentials);

                return (
                  <tr key={`${score.dealerCode}-${index}`}>
                    <td>{(excelPreviewPage - 1) * DEFAULT_TABLE_PAGE_SIZE + index + 1}</td>
                    <td>{scoreCredential?.zone || '-'}</td>
                    <td>{scoreCredential?.region || score.region || '-'}</td>
                    <td>{score.dealerName || '-'}</td>
                    <td>{score.dealerCode || '-'}</td>
                    <td>{score.month || '-'}</td>
                    <td>{score.fiscalYear || '-'}</td>
                    <td>{getPreviousYearBand(score, tableRows)}</td>
                    <td>{getCurrentYearBand(score)}</td>
                    <td>{getYearScore(score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationControls
          totalItems={parsedExcelScores.length}
          page={excelPreviewPage}
          pageSize={DEFAULT_TABLE_PAGE_SIZE}
          onPageChange={setExcelPreviewPage}
          label="preview dealers"
        />
      </div>
    )}

    {/* BSC DATA TABLE */}
    <div className="msil-table-shell">
      <table className="msil-table">
        <thead>
          <tr>
            <th>Sl No.</th>
            <th>Zone</th>
            <th>Region</th>
            <th>Dealer Parent</th>
            <th>Month</th>
            <th>Year</th>
            <th>Last Year Band</th>
            <th>Current Year Band</th>
            <th>Year Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>
                Loading Data...
              </td>
            </tr>
          ) : filteredTableRows.length === 0 ? (
            <tr>
              <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                No BSC Master Data found in database.
              </td>
            </tr>
          ) : (
            paginatedTableRows.map((row, index) => {
              const rowCredential = getScoreCredential(row, dealerCredentials);

              return (
                <tr key={row._id || index}>
                  <td>{(bscPage - 1) * DEFAULT_TABLE_PAGE_SIZE + index + 1}</td>
                  <td>{rowCredential?.zone || '-'}</td>
                  <td>{rowCredential?.region || row.region || '-'}</td>
                  <td>{row.dealerName || '-'}</td>
                  <td>{row.month || '-'}</td>
                  <td>{row.fiscalYear || '-'}</td>
                  <td>{getPreviousYearBand(row, tableRows)}</td>
                  <td>{getCurrentYearBand(row)}</td>
                  <td>{getYearScore(row)}</td>
                  <td>
                    <div className="admin-actions">
                      {!readOnly && (
                        <button
                          className="admin-action-btn admin-action-btn--edit"
                          type="button"
                          onClick={() => openDealerScore(row, true, 'bsc')}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="admin-action-btn admin-action-btn--view"
                        type="button"
                        onClick={() => openDealerScore(row, false, 'bsc')}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <PaginationControls
        totalItems={filteredTableRows.length}
        page={bscPage}
        pageSize={DEFAULT_TABLE_PAGE_SIZE}
        onPageChange={setBscPage}
        label="BSC records"
      />
    </div>
  </>
)}          
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
