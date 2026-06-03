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

  login: async (payload) => {
    const response = await api.post('/access-control/login', payload);
    return response.data;
  },
};

export default accessControlService;
