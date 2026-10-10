import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: BASE });

export const checkHealth = () => api.get('/api/health');

export const uploadFile = (formData, onProgress) =>
  api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });

export const loadDemoSample = () => api.post('/api/demo');

export const getProfile = (jobId) => api.get(`/api/jobs/${jobId}/profile`);
export const getData = (jobId, page = 1, pageSize = 50) =>
  api.get(`/api/jobs/${jobId}/data`, { params: { page, page_size: pageSize } });
export const getOriginalData = (jobId, page = 1, pageSize = 50) =>
  api.get(`/api/jobs/${jobId}/original`, { params: { page, page_size: pageSize } });

export const previewOperation = (jobId, operation) =>
  api.post(`/api/jobs/${jobId}/preview`, { operation });
export const applyOperation = (jobId, operation) =>
  api.post(`/api/jobs/${jobId}/apply`, { operation });
export const batchApplyOperations = (jobId, operations = null) =>
  api.post(`/api/jobs/${jobId}/batch_apply`, { operations });
export const undoOperation = (jobId) => api.post(`/api/jobs/${jobId}/undo`);
export const getLog = (jobId) => api.get(`/api/jobs/${jobId}/log`);

export const sendInstruction = (jobId, instruction, apiKey = null, model = null) =>
  api.post(`/api/jobs/${jobId}/assistant`, { instruction, api_key: apiKey, model });
export const getExamples = () => api.get('/api/assistant/examples');

export const getGeminiStatus = () => api.get('/api/gemini/status');
export const setGeminiConfig = (apiKey, model) =>
  api.post('/api/gemini/config', { api_key: apiKey, model });
export const chatWithGemini = (jobId, message, apiKey = null, model = null) =>
  api.post(`/api/jobs/${jobId}/gemini/chat`, { message, api_key: apiKey, model });
export const getGeminiAutoRecipe = (jobId, apiKey = null, model = null) =>
  api.post(`/api/jobs/${jobId}/gemini/auto-recipe`, { api_key: apiKey, model });

export const getComparison = (jobId) => api.get(`/api/jobs/${jobId}/comparison`);

export const exportFile = (jobId, format) =>
  api.post(`/api/jobs/${jobId}/export`, { format }, { responseType: 'blob' });

export const getSampleUrl = () => `${BASE || ''}/api/sample`;

export default api;
