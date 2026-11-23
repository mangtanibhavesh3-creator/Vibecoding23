import axios from 'axios';

const RAW_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
const API_BASE_URL = RAW_API_URL.replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Returns staff authorization headers from sessionStorage
 */
export const getStaffHeaders = () => {
  const pin = sessionStorage.getItem('salon_staff_pin');
  return pin ? { 'x-staff-pin': pin } : {};
};

// Request Interceptor: Attach staff PIN if stored in sessionStorage
api.interceptors.request.use(
  (config) => {
    const staffHeaders = getStaffHeaders();
    if (staffHeaders['x-staff-pin']) {
      config.headers['x-staff-pin'] = staffHeaders['x-staff-pin'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages & clear auth on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('salon_staff_pin');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('salon:auth_cleared'));
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Network communication error';
    return Promise.reject(new Error(message));
  }
);

/**
 * Health check helper querying the Express `/api/health` endpoint
 */
export const checkApiHealth = async () => {
  try {
    const res = await api.get('/health');
    return res.data;
  } catch (err) {
    return {
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString(),
    };
  }
};

export default api;
