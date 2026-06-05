import api from './api';

const accessControlService = {
  getAccessControl: async () => {
    const response = await api.get('/access-control');
    return response.data;
  },

  saveAccessControl: async (payload) => {
    const response = await api.put('/access-control', payload);
    return response.data;
  },

  saveDealerCredential: async (payload) => {
    const response = await api.post('/access-control/dealer-credential', payload);
    return response.data;
  },

  saveMsilPerson: async (payload) => {
    const response = await api.post('/access-control/msil-person', payload);
    return response.data;
  },

  deleteZone: async (id) => {
    const response = await api.delete(`/access-control/zone/${encodeURIComponent(id)}`);
    return response.data;
  },

  deleteRegion: async (id) => {
    const response = await api.delete(`/access-control/region/${encodeURIComponent(id)}`);
    return response.data;
  },

  deleteMsilPerson: async (id) => {
    const response = await api.delete(`/access-control/msil-person/${encodeURIComponent(id)}`);
    return response.data;
  },

  deleteDealerCredential: async (id) => {
    const response = await api.delete(`/access-control/dealer-credential/${encodeURIComponent(id)}`);
    return response.data;
  },

  login: async (payload) => {
    const response = await api.post('/access-control/login', payload);
    return response.data;
  },
};

export default accessControlService;
