import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile, getSampleUrl } from '../services/api';
import { useJob } from '../contexts/JobContext';
import { useNavigate, useLocation } from 'react-router-dom';

const MAX_MB = 55;
const ACCEPTED = { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] };

export default function UploadZone() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setJobId, setJobMeta, setProfile, setScore, clearJob, loadDemoDataset } = useJob();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sheetNames, setSheetNames] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState('');

  // Handle incoming file forwarded from landing page
  useEffect(() => {
    if (location.state?.pendingFile && location.state?.sheetNames) {
      setPendingFile(location.state.pendingFile);
      setSheetNames(location.state.sheetNames);
      setSelectedSheet(location.state.sheetNames[0] || '');
    }
  }, [location.state]);

  const processUpload = useCallback(async (f, sheetName = null) => {
    setUploading(true);
    setProgress(0);
    setError('');
    clearJob();

    const fd = new FormData();
    fd.append('file', f);
    if (sheetName) fd.append('sheet_name', sheetName);

    try {
      const { data } = await uploadFile(fd, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });

      if (data.requires_sheet_selection) {
        setSheetNames(data.sheet_names);
        setPendingFile(f);
        setSelectedSheet(data.sheet_names[0]);
        setUploading(false);
        return;
      }

      setJobId(data.job_id);
      setJobMeta({
        filename: data.filename,
        row_count: data.row_count,
        col_count: data.col_count,
        columns: data.columns,
        file_type: data.file_type,
        sheet_name: data.sheet_name,
      });
      if (data.profile) setProfile(data.profile);
      if (data.score) setScore(data.score);
      setFile(null);
      setPendingFile(null);
      setSheetNames(null);
      toast.success(`Uploaded ${data.filename} — ${data.row_count} rows, ${data.col_count} columns`);
      navigate('/profile');
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, [clearJob, setJobId, setJobMeta, setProfile, setScore, navigate]);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const reason = rejected[0].errors?.[0]?.message || 'Invalid file format. Please upload CSV or Excel.';
      setError(reason);
      toast.error(reason);
      return;
    }
    const f = accepted[0];
    if (f.size > MAX_MB * 1024 * 1024) {
      const msg = `File is too large (${(f.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${MAX_MB} MB.`;
      setError(msg);
      toast.error(msg);
      return;
    }
    setFile(f);
    setSheetNames(null);
    setPendingFile(null);
    setError('');
    // Instant processing without needing extra confirmation click
    processUpload(f);
  }, [processUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: false,
  });

  const handleUploadClick = () => {
    if (!file) return;
    processUpload(file);
  };

  const handleSheetConfirm = () => {
    if (!pendingFile || !selectedSheet) return;
    processUpload(pendingFile, selectedSheet);
  };

  return (
    <div className="animate-fadeInUp">
      {/* Sheet selection modal */}
      {sheetNames && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 400, padding: 28 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 700 }}>
              Select Excel Sheet
            </h3>
            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              This workbook has multiple sheets. Choose one to load:
            </p>
            <select
              className="select"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              style={{ marginBottom: 20 }}
            >
              {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSheetNames(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSheetConfirm}>Load Sheet</button>
            </div>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'dragover' : ''} ${file ? 'active' : ''}`}
      >
        <input {...getInputProps()} id="file-upload-input" />
        <div className="upload-icon">
          <UploadCloud size={28} color="#fff" />
        </div>
        {isDragActive ? (
          <p className="upload-title">Drop your file here…</p>
        ) : (
          <>
            <p className="upload-title">Drag & drop your file here</p>
            <p className="upload-sub">or click to browse your computer</p>
          </>
        )}
        <div className="upload-formats">
          {['.CSV', '.XLSX', '.XLS'].map(f => (
            <span key={f} className="format-chip">{f}</span>
          ))}
          <span className="format-chip">Max {MAX_MB} MB</span>
        </div>
      </div>

      {/* File selected */}
      {file && !uploading && (
        <div className="card" style={{ marginTop: 14, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileText size={20} color="var(--teal-600)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{file.name}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => { setFile(null); setError(''); }}>
              <X size={16} />
            </button>
            <button className="btn btn-primary" onClick={handleUploadClick} id="upload-confirm-btn">
              Analyse File
            </button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 8, color: 'var(--text-secondary)' }}>
            <span>Uploading and analysing…</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-outer">
            <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginTop: 14 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Sample download & instant demo load */}
      <div style={{ marginTop: 22, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={async () => {
            setUploading(true);
            setError('');
            try {
              await loadDemoDataset();
              toast.success('Loaded sample messy dataset!');
              navigate('/profile');
            } catch (e) {
              setError('Failed to load sample dataset. Please check backend.');
            } finally {
              setUploading(false);
            }
          }}
          className="btn btn-secondary btn-sm"
          id="sample-instant-load-btn"
        >
          ⚡ Load Sample Dataset Instantly
        </button>
        <a
          href={getSampleUrl()}
          download="rowbot_sample_messy.csv"
          className="btn btn-ghost btn-sm"
          style={{ gap: 6 }}
          id="sample-download-btn"
        >
          <Download size={14} />
          Download sample CSV
        </a>
      </div>
    </div>
  );
}
