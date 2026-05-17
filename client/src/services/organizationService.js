import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function searchSquadrons(search, limit = 50) {
  try {
    const response = await api.get('/squadrons', { params: { search, limit } });
    const body = response.data;
    return {
      success: body?.success !== false,
      squadrons: body?.data?.squadrons ?? [],
      message: body?.message,
    };
  } catch (error) {
    return {
      success: false,
      squadrons: [],
      message: error.response?.data?.message || 'Failed to load squadrons',
    };
  }
}

export async function searchSquadronReservists(squadronId, search, limit = 50) {
  try {
    const response = await api.get(`/squadrons/${squadronId}/reservists`, {
      params: { search, limit },
    });
    const body = response.data;
    return {
      success: body?.success !== false,
      reservists: body?.data?.reservists ?? [],
      message: body?.message,
    };
  } catch (error) {
    return {
      success: false,
      reservists: [],
      message: error.response?.data?.message || 'Failed to load reservists',
    };
  }
}
