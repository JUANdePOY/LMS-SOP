import api from '@/services/api';

const API_BASE = '/users';

export async function getUserLeaderboard(period = 'all') {
  const res = await api.get(`${API_BASE}/leaderboard`, {
    params: { period },
  });
  return res.data;
}
