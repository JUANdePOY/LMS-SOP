const API_BASE = '/api';

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data.data || data;
};

export const fetchAnnouncements = async () => {
  return apiRequest('/announcements');
};

export const fetchAnnouncement = async (id) => {
  return apiRequest(`/announcements/${id}`);
};

export const createAnnouncement = async (announcement) => {
  return apiRequest('/announcements', {
    method: 'POST',
    body: JSON.stringify(announcement),
  });
};

export const updateAnnouncement = async (id, announcement) => {
  return apiRequest(`/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(announcement),
  });
};

export const deleteAnnouncement = async (id) => {
  return apiRequest(`/announcements/${id}`, {
    method: 'DELETE',
  });
};