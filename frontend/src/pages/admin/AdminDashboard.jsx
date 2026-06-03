import React, { useCallback, useRef, useState, useEffect } from 'react';
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
  const parameters = area?.parameters || [];

  if (parameters.length) {
    return parameters.reduce(
      (sum, param) => sum + (param?.excludeFromTotals ? 0 : (Number(metricValue(param?.[period], key)) || 0)),
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
  previousYearBand: score?.previousYearBand || '',
  currentYearBand: score?.currentYearBand || score?.fullYear?.band || score?.earlyBird?.band || 'NO BAND',
  yearScore: score?.yearScore || score?.fullYear?.provisionalScore || score?.earlyBird?.provisionalScore || '',
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
  const [year, setYear] = useState('');
  const excelInputRef = useRef(null);
  
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [draftScore, setDraftScore] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Database State
  const [tableRows, setTableRows] = useState([]);
  const [nscRows, setNscRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [parsedExcelScores, setParsedExcelScores] = useState([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadYear, setUploadYear] = useState(DEFAULT_UPLOAD_YEAR);
  const [uploadMonth, setUploadMonth] = useState(DEFAULT_UPLOAD_MONTH);
  const [zones, setZones] = useState(() => readStoredList(ACCESS_ZONES_KEY, defaultAccessData.zones));
  const [regions, setRegions] = useState(() => readStoredList(ACCESS_REGIONS_KEY, defaultAccessData.regions));
  const [msilPersons, setMsilPersons] = useState(() => readStoredList(ACCESS_MSIL_PERSONS_KEY, defaultAccessData.msilPersons));
  const [dealerCredentials, setDealerCredentials] = useState(() => readStoredList(ACCESS_DEALER_CREDENTIALS_KEY, defaultAccessData.dealerCredentials));
  const [openMsilDropdownId, setOpenMsilDropdownId] = useState(null);
  const [isAccessSaving, setIsAccessSaving] = useState(false);
  const [isEditingZones, setIsEditingZones] = useState(false);
  const [isEditingRegions, setIsEditingRegions] = useState(false);
  const [editingMsilId, setEditingMsilId] = useState(null);
  const [editingDealerId, setEditingDealerId] = useState(null);

  const isMsilReadOnly = readOnly && user?.role === 'msil';
  const msilUserIds = [user?.name, user?.mailId, user?.dealerCode]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  const msilDealerCredentials = isMsilReadOnly
    ? dealerCredentials.filter((credential) =>
      (credential.msilPersons || []).some((personId) =>
        msilUserIds.includes(String(personId || '').trim().toLowerCase())
      )
    )
    : dealerCredentials;
  const allowedMsilDealerCodes = msilDealerCredentials
    .map((credential) => String(credential.dealerCode || '').trim().toLowerCase())
    .filter(Boolean);
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
      (!month || String(row.month || '').toLowerCase() === month.toLowerCase()) &&
      (!year || String(row.fiscalYear || '').toLowerCase().includes(year.toLowerCase()))
    );
  });

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
      alert(response.message || 'Access control saved successfully.');
    } catch (error) {
      console.error('Failed to save access control:', error);
      alert(error.response?.data?.message || 'Failed to save access control.');
    } finally {
      setIsAccessSaving(false);
    }
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

  const getCurrentPageKey = () => (selectedDealer ? `detail:${activeTab}` : activeTab);

  const pushCurrentPage = () => {
    const currentPage = getCurrentPageKey();
    setPageHistory((history) => (history[history.length - 1] === currentPage ? history : [...history, currentPage]));
  };

  const openDealerScore = (row, editing = false, tab = 'bsc') => {
    // If it's coming from MongoDB, it is already a fully formed scorecard
    // so we don't need to 'cloneScoreForDealer' the master template over it.
    const score = cloneScore(row); 
    pushCurrentPage();
    setActiveTab(tab);
    setSelectedDealer({ row, score });
    setDraftScore(score);
    setIsEditing(editing);
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
      alert('Please enter year before uploading.');
      return;
    }

    if (!uploadMonth) {
      alert('Please select month before uploading.');
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

    if (!parsedScores.length) {
      alert('No valid scorecards found in Excel.');
      return;
    }

    const allowedDealerCodes = new Set(
      dealerCredentials
        .map((credential) => String(credential.dealerCode || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const unauthorizedDealerCodes = [
      ...new Set(
        parsedScores
          .map((score) => String(score.dealerCode || '').trim())
          .filter((dealerCode) => !allowedDealerCodes.has(dealerCode.toLowerCase()))
      ),
    ];

    if (unauthorizedDealerCodes.length) {
      alert(
        `Upload blocked. Add these dealer codes in Access Credentials first:\n\n${unauthorizedDealerCodes.join('\n')}`
      );
      return;
    }

    setParsedExcelScores(parsedScores);
    setShowUploadModal(false);

    alert(`Excel parsed successfully for ${uploadMonth} ${uploadYear}. ${parsedScores.length} dealers found. Please review preview and click Save All Dealers.`);
  } catch (error) {
    console.error('Excel upload failed:', error);
    alert(error.response?.data?.message || 'Excel upload failed. Check console.');
  } finally {
    setIsUploadingExcel(false);
    e.target.value = '';
  }
};
const handleBulkSaveScores = async () => {
  if (!parsedExcelScores.length) {
    alert('No parsed scorecards to save.');
    return;
  }

  const allowedDealerCodes = new Set(
    dealerCredentials
      .map((credential) => String(credential.dealerCode || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const unauthorizedDealerCodes = [
    ...new Set(
      parsedExcelScores
        .map((score) => String(score.dealerCode || '').trim())
        .filter((dealerCode) => !allowedDealerCodes.has(dealerCode.toLowerCase()))
    ),
  ];

  if (unauthorizedDealerCodes.length) {
    alert(
      `Cannot save. Add these dealer codes in Access Credentials first:\n\n${unauthorizedDealerCodes.join('\n')}`
    );
    return;
  }

  try {
    setIsSavingBulk(true);

    const response = await bscService.bulkSaveScores(parsedExcelScores);

    alert(response.message || `${response.count || 0} scorecards saved successfully.`);

    setParsedExcelScores([]);
    await fetchMasterData();
  } catch (error) {
    console.error('Bulk save failed:', error);
    alert(error.response?.data?.message || 'Failed to save parsed scorecards.');
  } finally {
    setIsSavingBulk(false);
  }
};

  const addZone = () => {
    setZones((current) => [...current, '']);
    setIsEditingZones(true);
  };

  const addRegion = () => {
    setRegions((current) => [...current, '']);
    setIsEditingRegions(true);
  };

  const updateZone = (index, value) => {
    setZones((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const updateRegion = (index, value) => {
    setRegions((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
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
    setEditingMsilId(id);
  };

  const updateMsilPerson = (id, field, value) => {
    setMsilPersons((current) => current.map((person) => (
      person.id === id ? { ...person, [field]: value } : person
    )));
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
    setEditingDealerId(id);
  };

  const updateDealerCredential = (id, field, value) => {
    setDealerCredentials((current) => current.map((row) => (
      row.id === id ? { ...row, [field]: value } : row
    )));
  };

  const getMsilPersonLabel = (personId) => {
    const person = msilPersons.find((item) => item.id === personId);
    return person?.name || person?.mailId || personId;
  };

  const getDealerMsilSummary = (personIds = []) => {
    if (!personIds.length) return 'Select MSIL person';
    return personIds.map(getMsilPersonLabel).join(', ');
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

  const saveMsilPerson = (id) => {
    const person = msilPersons.find((item) => item.id === id);
    if (!String(person?.name || '').trim() && !String(person?.mailId || '').trim()) {
      alert('Please enter MSIL person name or mail ID.');
      return;
    }

    saveAccessControlData(() => setEditingMsilId(null));
  };

  const saveDealerCredential = (id) => {
    const credential = dealerCredentials.find((item) => item.id === id);

    if (!String(credential?.dealerCode || '').trim()) {
      alert('Please enter dealer code.');
      return;
    }

    if (!String(credential?.password || '').trim()) {
      alert('Please enter dealer password.');
      return;
    }

    saveAccessControlData(() => {
      setEditingDealerId(null);
      setOpenMsilDropdownId(null);
    });
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
  const filteredTableRows = filterRows(tableRows);
  const filteredNscRows = filterRows(nscRows);

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
            {isSavingBulk ? 'Saving...' : `Save All Dealers (${parsedExcelScores.length})`}
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
                    <select value={month} onChange={(e) => setMonth(e.target.value)} className="msil-input">
                      <option value="">All Months</option>
                      {MONTH_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
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
                      {dealerCredentials.map((row, index) => {
                        const isRowEditing = editingDealerId === row.id;

                        return (
                          <tr key={row.id}>
                            <td>{index + 1}</td>
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
                              {isRowEditing ? (
                                <button className="admin-access-row-btn admin-access-row-btn--save" type="button" onClick={() => saveDealerCredential(row.id)} disabled={isAccessSaving}>
                                  {isAccessSaving ? 'Saving...' : 'Save'}
                                </button>
                              ) : (
                                <button className="admin-access-row-btn" type="button" onClick={() => setEditingDealerId(row.id)}>
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                      {zones.map((item, index) => (
                        <div key={`${item}-${index}`} className="admin-control-list__row">
                          {isEditingZones ? (
                            <input
                              className="admin-control-list__input"
                              value={item}
                              onChange={(event) => updateZone(index, event.target.value)}
                              placeholder="Zone"
                            />
                          ) : item}
                        </div>
                      ))}
                    </div>
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
                      {regions.map((item, index) => (
                        <div key={`${item}-${index}`} className="admin-control-list__row">
                          {isEditingRegions ? (
                            <input
                              className="admin-control-list__input"
                              value={item}
                              onChange={(event) => updateRegion(index, event.target.value)}
                              placeholder="Region"
                            />
                          ) : item}
                        </div>
                      ))}
                    </div>
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
                      {msilPersons.map((person, index) => {
                        const isRowEditing = editingMsilId === person.id;

                        return (
                          <tr key={person.id}>
                            <td>{index + 1}</td>
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
                              {isRowEditing ? (
                                <button className="admin-access-row-btn admin-access-row-btn--save" type="button" onClick={() => saveMsilPerson(person.id)} disabled={isAccessSaving}>
                                  {isAccessSaving ? 'Saving...' : 'Save'}
                                </button>
                              ) : (
                                <button className="admin-access-row-btn" type="button" onClick={() => setEditingMsilId(person.id)}>
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
          filteredNscRows.map((row, index) => (
            <tr key={row._id || index}>
              <td>{index + 1}</td>
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
            onClick={() => setParsedExcelScores([])}
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
              {parsedExcelScores.slice(0, 10).map((score, index) => {
                const scoreCredential = getScoreCredential(score, dealerCredentials);

                return (
                  <tr key={`${score.dealerCode}-${index}`}>
                    <td>{index + 1}</td>
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

        {parsedExcelScores.length > 10 && (
          <div style={{ marginTop: '10px', fontSize: '13px', color: '#166534' }}>
            Showing first 10 dealers only. Total parsed: {parsedExcelScores.length}.
          </div>
        )}
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
            filteredTableRows.map((row, index) => {
              const rowCredential = getScoreCredential(row, dealerCredentials);

              return (
                <tr key={row._id || index}>
                  <td>{index + 1}</td>
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
