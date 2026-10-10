import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UploadCloud, Zap, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, FileSpreadsheet } from 'lucide-react';
import { useJob } from '../contexts/JobContext';
import { uploadFile } from '../services/api';
import RowBotLogo from './RowBotLogo';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function WelcomeModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { loadDemoDataset, setJobId, setJobMeta, clearJob } = useJob();
  const [demoLoading, setDemoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Allow closing on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      await loadDemoDataset();
      toast.success('Sample dataset loaded instantly with real data issues!');
      onClose();
      navigate('/profile');
    } catch (e) {
      toast.error('Could not load sample dataset. Please ensure backend is active.');
    } finally {
      setDemoLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    setUploading(true);
    setProgress(0);
    clearJob();

    const fd = new FormData();
    fd.append('file', file);

    try {
      const { data } = await uploadFile(fd, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });

      if (data.requires_sheet_selection) {
        onClose();
        navigate('/upload');
        return;
      }

      setJobId(data.job_id);
      setJobMeta({
        filename: data.filename,
        row_count: data.row_count,
        col_count: data.col_count,
        columns: data.columns,
        file_type: data.file_type,
      });

      toast.success(`Successfully loaded ${data.filename} (${data.row_count} rows)`);
      onClose();
      navigate('/profile');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process file. Please try again.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal animate-fadeInUp"
        style={{
          maxWidth: 720,
          width: '100%',
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 30px 70px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(99, 102, 241, 0.15)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Realistic OS Window Titlebar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            userSelect: 'none',
          }}
        >
          {/* Mac/Desktop Window Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              onClick={onClose}
              title="Close window (Esc)"
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#ef4444',
                cursor: 'pointer',
                display: 'inline-block',
                transition: 'opacity 0.15s',
              }}
            />
            <span
              onClick={onClose}
              title="Minimize window"
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#f59e0b',
                cursor: 'pointer',
                display: 'inline-block',
              }}
            />
            <span
              title="Maximize window"
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
          </div>

          {/* Window Center Title */}
          <div
            style={{
              fontSize: '.82rem',
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={14} color="#6366f1" />
            RowBot Window — AI Data Quality & Transformation
          </div>

          {/* Right Close Button */}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close Window"
          >
            <X size={16} />
          </button>
        </div>

        {/* Window Body */}
        <div style={{ padding: '28px 32px 32px' }}>
          {/* Header with Logo and App Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <RowBotLogo size="lg" showText={false} />
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '.74rem',
                  fontWeight: 800,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  padding: '2px 10px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  marginBottom: 4,
                }}
              >
                <Zap size={12} />
                Automated Data Cleaning
              </div>
              <h2
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                RowBot
              </h2>
            </div>
          </div>

          {/* The Highlighted Quote Window Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)',
              border: '1px solid #c7d2fe',
              borderLeft: '5px solid #4f46e5',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.06)',
            }}
          >
            <div
              style={{
                fontSize: '1.08rem',
                fontWeight: 700,
                color: '#1e1b4b',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              “Messy Data In. Clean Data Out. — Transforming chaotic spreadsheets into clean, trusted intelligence in seconds.”
            </div>
          </div>

          {/* Value Props Pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 20,
            }}
          >
            {[
              '🎯 Instant 0–100 Quality Score',
              '🧹 Automatic Deduplication',
              '📅 Smart Date & Type Repair',
              '👁️ Live Before & After Preview',
            ].map((feature, i) => (
              <span
                key={i}
                style={{
                  fontSize: '.78rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#f1f5f9',
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              >
                {feature}
              </span>
            ))}
          </div>

          {/* Instant Dropzone inside the Window */}
          <div
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
            style={{
              padding: '24px 20px',
              borderRadius: 14,
              background: isDragActive ? '#eff6ff' : '#fcfdff',
              border: isDragActive ? '2px dashed #4f46e5' : '2px dashed #cbd5e1',
              marginBottom: 20,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
            }}
          >
            <input {...getInputProps()} />
            <div
              className="upload-icon"
              style={{
                width: 44,
                height: 44,
                background: '#eef2ff',
                margin: '0 auto 10px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={24} color="#4f46e5" />
            </div>

            {uploading ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#0f172a', marginBottom: 6 }}>
                  Analyzing dataset... {progress}%
                </div>
                <div className="progress-bar-outer" style={{ maxWidth: 280, margin: '0 auto' }}>
                  <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : isDragActive ? (
              <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '.95rem' }}>
                Release file to analyze immediately!
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 800, fontSize: '.98rem', color: '#0f172a', marginBottom: 3 }}>
                  Drop your CSV or Excel file here for instant results
                </div>
                <div style={{ fontSize: '.8rem', color: '#64748b' }}>
                  or click to browse your computer (CSV, XLSX, XLS up to 20MB)
                </div>
              </div>
            )}
          </div>

          {/* Window Footer Actions */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid #f1f5f9',
              paddingTop: 18,
            }}
          >
            <button
              onClick={handleLaunchDemo}
              disabled={demoLoading || uploading}
              className="btn btn-secondary btn-sm"
              style={{
                fontWeight: 700,
                padding: '9px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} color="#4f46e5" />
              {demoLoading ? 'Loading Sample...' : 'Try Sample Dataset (Instant)'}
            </button>

            <button
              onClick={onClose}
              className="btn btn-primary btn-sm"
              style={{
                padding: '9px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
              }}
            >
              Explore Workspace <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
