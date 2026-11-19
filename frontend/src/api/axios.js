import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
export const SOCKET_URL = API_URL;

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 60000 }); // generous: free hosts cold-start

api.interceptors.request.use((cfg) => {
  try {
    const raw = localStorage.getItem('ms_auth');
    if (raw) cfg.headers.Authorization = `Bearer ${JSON.parse(raw).token}`;
  } catch {
    /* storage unavailable */
  }
  return cfg;
});

export const errMsg = (e) =>
  e?.response?.data?.error ||
  (e?.code === 'ECONNABORTED' ? 'The server took too long to respond. It may be waking up, so try again.' : null) ||
  (e?.message === 'Network Error' ? 'Cannot reach the server. Check your connection and try again.' : null) ||
  e?.message ||
  'Something went wrong.';

export default api;
