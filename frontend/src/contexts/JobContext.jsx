import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadDemoSample } from '../services/api';
import { FALLBACK_PROFILE, FALLBACK_SCORE } from '../demoData';

const JobContext = createContext(null);

export function JobProvider({ children }) {
  const [jobId, setJobIdState] = useState(() => {
    try {
      return sessionStorage.getItem('rowbot_job_id') || null;
    } catch {
      return null;
    }
  });

  const [jobMeta, setJobMetaState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rowbot_job_meta');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rowbot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('rowbot_user', JSON.stringify(userData));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('rowbot_user');
    } catch {}
  };

  const [profile, setProfile] = useState(null);
  const [score, setScore] = useState(null);
  const [operationLog, setOperationLog] = useState([]);

  const setJobId = (id) => {
    setJobIdState(id);
    try {
      if (id) sessionStorage.setItem('rowbot_job_id', id);
      else sessionStorage.removeItem('rowbot_job_id');
    } catch {}
  };

  const setJobMeta = (meta) => {
    setJobMetaState(meta);
    try {
      if (meta) sessionStorage.setItem('rowbot_job_meta', JSON.stringify(meta));
      else sessionStorage.removeItem('rowbot_job_meta');
    } catch {}
  };

  const clearJob = () => {
    setJobId(null);
    setJobMeta(null);
    setProfile(null);
    setScore(null);
    setOperationLog([]);
    try {
      sessionStorage.removeItem('rowbot_job_id');
      sessionStorage.removeItem('rowbot_job_meta');
    } catch {}
  };

  const addLogEntry = (entry) =>
    setOperationLog((prev) => [...prev, entry]);

  const loadDemoDataset = async () => {
    try {
      const { data } = await loadDemoSample();
      if (data && (data.job_id || data.columns)) {
        const id = data.job_id || 'demo-sample-local';
        setJobId(id);
        setJobMeta({
          filename: data.filename || 'rowbot_sample_messy.csv',
          row_count: data.row_count || 20,
          col_count: data.col_count || 8,
          columns: data.columns || ['customer_id', 'name', 'email', 'phone', 'country', 'signup_date', 'revenue', 'status'],
          file_type: data.file_type || 'csv',
        });
        if (data.profile) setProfile(data.profile);
        else setProfile(FALLBACK_PROFILE);
        if (data.score) setScore(data.score);
        else setScore(FALLBACK_SCORE);
        return data;
      }
    } catch (err) {
      console.warn('API error, using guaranteed fallback:', err);
    }

    // Guaranteed fallback: sets demo state and never throws
    setJobId('demo-sample-local');
    setJobMeta({
      filename: 'rowbot_sample_messy.csv',
      row_count: 20,
      col_count: 8,
      columns: ['customer_id', 'name', 'email', 'phone', 'country', 'signup_date', 'revenue', 'status'],
      file_type: 'csv',
    });
    setProfile(FALLBACK_PROFILE);
    setScore(FALLBACK_SCORE);
    return { ok: true, job_id: 'demo-sample-local' };
  };

  const [showWelcome, setShowWelcome] = useState(true);

  const openWelcome = () => setShowWelcome(true);
  const closeWelcome = () => setShowWelcome(false);

  return (
    <JobContext.Provider value={{
      jobId, setJobId,
      jobMeta, setJobMeta,
      profile, setProfile,
      score, setScore,
      operationLog, setOperationLog, addLogEntry,
      clearJob,
      loadDemoDataset,
      user, login, logout,
      showWelcome, openWelcome, closeWelcome,
    }}>
      {children}
    </JobContext.Provider>
  );
}

export const useJob = () => useContext(JobContext);
