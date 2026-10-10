import axios from 'axios';
import { DEMO_ROWS, FALLBACK_PROFILE, FALLBACK_SCORE } from '../demoData';

const BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://rowbot-b6lv.onrender.com' : '');

const api = axios.create({ baseURL: BASE, timeout: 12000 });

export const checkHealth = () => api.get('/api/health');

export const uploadFile = (formData, onProgress) =>
  api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });

export const loadDemoSample = async () => {
  try {
    const res = await api.post('/api/demo');
    return res;
  } catch (err) {
    console.warn('Live backend waking up or unreachable, using instant demo fallback:', err);
    return {
      data: {
        ok: true,
        job_id: 'demo-sample-local',
        filename: 'rowbot_sample_messy.csv',
        file_type: 'csv',
        row_count: 20,
        col_count: 8,
        columns: ['customer_id', 'name', 'email', 'phone', 'country', 'signup_date', 'revenue', 'status'],
        profile: FALLBACK_PROFILE,
        score: FALLBACK_SCORE,
      }
    };
  }
};

export const getProfile = async (jobId) => {
  if (jobId === 'demo-sample-local') {
    return { data: { ok: true, job_id: jobId, profile: FALLBACK_PROFILE, score: FALLBACK_SCORE } };
  }
  try {
    return await api.get(`/api/jobs/${jobId}/profile`);
  } catch (err) {
    if (jobId && jobId.includes('demo')) {
      return { data: { ok: true, job_id: jobId, profile: FALLBACK_PROFILE, score: FALLBACK_SCORE } };
    }
    throw err;
  }
};

export const getData = async (jobId, page = 1, pageSize = 50) => {
  if (jobId === 'demo-sample-local') {
    return { data: { rows: DEMO_ROWS, total: 20, page, page_size: pageSize } };
  }
  try {
    return await api.get(`/api/jobs/${jobId}/data`, { params: { page, page_size: pageSize } });
  } catch (err) {
    if (jobId && jobId.includes('demo')) {
      return { data: { rows: DEMO_ROWS, total: 20, page, page_size: pageSize } };
    }
    throw err;
  }
};

export const getOriginalData = async (jobId, page = 1, pageSize = 50) => {
  if (jobId === 'demo-sample-local') {
    return { data: { rows: DEMO_ROWS, total: 20, page, page_size: pageSize } };
  }
  try {
    return await api.get(`/api/jobs/${jobId}/original`, { params: { page, page_size: pageSize } });
  } catch (err) {
    if (jobId && jobId.includes('demo')) {
      return { data: { rows: DEMO_ROWS, total: 20, page, page_size: pageSize } };
    }
    throw err;
  }
};

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
