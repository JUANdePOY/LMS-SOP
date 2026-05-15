// client/src/services/trainingsService.js
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token (optional until JWT is wired)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const trainingsService = {
  // Get all trainings with filters and pagination
  getTrainings: async (params = {}) => {
    try {
      const response = await api.get('/trainings/internal', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch trainings'
      };
    }
  },

  // Get external trainings
  getExternalTrainings: async (params = {}) => {
    try {
      const response = await api.get('/trainings/external', { params });
      const body = response.data;
      return {
        success: body?.success !== false,
        message: body?.message,
        data: body?.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch external trainings'
      };
    }
  },

  // Get training by ID (internal)
  getInternalTrainingById: async (id) => {
    try {
      const response = await api.get(`/trainings/internal/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch training'
      };
    }
  },

  // Get training by ID (external)
  getExternalTrainingById: async (id) => {
    try {
      const response = await api.get(`/trainings/external/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch training'
      };
    }
  },

  // Create new internal training
  createInternalTraining: async (trainingData) => {
    try {
      const response = await api.post('/trainings/internal', trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create training'
      };
    }
  },

  // Create new external training
  createExternalTraining: async (trainingData) => {
    try {
      const response = await api.post('/trainings/external', trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create external training'
      };
    }
  },

  // Update existing internal training
  updateInternalTraining: async (id, trainingData) => {
    try {
      const response = await api.patch(`/trainings/internal/${id}`, trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update training'
      };
    }
  },

  // Update existing external training
  updateExternalTraining: async (id, trainingData) => {
    try {
      const response = await api.patch(`/trainings/external/${id}`, trainingData);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update external training'
      };
    }
  },

  // Delete internal training
  deleteInternalTraining: async (id) => {
    try {
      const response = await api.delete(`/trainings/internal/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete training'
      };
    }
  },

  // Delete external training
  deleteExternalTraining: async (id) => {
    try {
      const response = await api.delete(`/trainings/external/${id}`);
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete external training'
      };
    }
  },

  // Create registration for external training
  createRegistration: async (trainingId, participantData) => {
    try {
      const response = await api.post(`/trainings/external/${trainingId}/register`, { participantData });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to submit registration'
      };
    }
  },

  // Get registrations for external training
  getRegistrationsByTrainingId: async (trainingId) => {
    try {
      const response = await api.get(`/trainings/external/${trainingId}/registrations`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch registrations'
      };
    }
  },

  // Upload letter order (internal training only; metadata in DB, file under server/uploads)
  uploadLetterOrder: async (file, trainingId) => {
    try {
      const formData = new FormData();
      formData.append('letter_order', file);
      const response = await api.post(
        `/trainings/internal/${trainingId}/attachments/letter-order`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      const body = response.data;
      return {
        success: body.success !== false,
        message: body.message,
        data: body.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to upload letter order',
      };
    }
  },
};

export const getTrainings = trainingsService.getTrainings;
export const getExternalTrainings = trainingsService.getExternalTrainings;
export const getTrainingById = trainingsService.getInternalTrainingById; // Default to internal for backward compatibility
export const createTraining = trainingsService.createInternalTraining; // Default to internal for backward compatibility
export const updateTraining = trainingsService.updateInternalTraining; // Default to internal for backward compatibility
export const deleteTraining = trainingsService.deleteInternalTraining; // Default to internal for backward compatibility
export const createInternalTraining = trainingsService.createInternalTraining;
export const updateInternalTraining = trainingsService.updateInternalTraining;
export const createRegistration = trainingsService.createRegistration;
export const getRegistrationsByTrainingId = trainingsService.getRegistrationsByTrainingId;
export const uploadLetterOrder = trainingsService.uploadLetterOrder;
export const createExternalTraining = trainingsService.createExternalTraining;
export const updateExternalTraining = trainingsService.updateExternalTraining;
export const deleteExternalTraining = trainingsService.deleteExternalTraining;
export const getExternalTrainingById = trainingsService.getExternalTrainingById;

export default trainingsService;