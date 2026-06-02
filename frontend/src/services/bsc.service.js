import api from './api';

const bscService = {
  getScores: async (params = {}) => {
    const { data } = await api.get('/bsc/score', { params });
    return data;
  },

  getScoreById: async (id) => {
    const { data } = await api.get(`/bsc/score/${id}`);
    return data;
  },

  // Returns a blob for file download
  downloadScoreSheet: async (id) => {
    const response = await api.get(`/bsc/score/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  createScore: async (scoreData) => {
    const { data } = await api.post('/bsc/score', scoreData);
    return data;
  },

  updateScore: async (id, scoreData) => {
    const { data } = await api.put(`/bsc/score/${id}`, scoreData);
    return data;
  },
  
  uploadExcel: async ({ file, fiscalYear, month }) => {
  const formData = new FormData();
  

  formData.append('file', file);
  if (fiscalYear) formData.append('fiscalYear', fiscalYear);
  if (month) formData.append('month', month);

  const { data } = await api.post('/bsc/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
},
bulkSaveScores: async (scores) => {
  const { data } = await api.post('/bsc/bulk-save', { scores });
  return data;
},
};

export const triggerDownload = (response, filename) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'BSC_Score_Sheet.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default bscService;
