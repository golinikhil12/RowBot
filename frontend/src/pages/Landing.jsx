import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, Zap, Shield, CheckCircle2, AlertTriangle, ArrowRight,
  Table, Wand2, FileSpreadsheet, Sparkles, User, LogOut, Menu, X
} from 'lucide-react';
import { useJob } from '../contexts/JobContext';
import { uploadFile } from '../services/api';
import RowBotLogo from '../components/RowBotLogo';
import AuthModal from '../components/AuthModal';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function Landing() {
  const navigate = useNavigate();
  const { user, logout, loadDemoDataset, setJobId, setJobMeta, setProfile, setScore, clearJob, openWelcome } = useJob();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    setMobileNavOpen(false);
    try {
      await loadDemoDataset();
      toast.success('Sample dataset loaded instantly!');
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
        navigate('/upload', { state: { pendingFile: file, sheetNames: data.sheet_names } });
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

      toast.success(`Successfully loaded ${data.filename} (${data.row_count} rows)`);
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

  return (
    <div className="landing">
      {/* Professional Auth Modal with Guest Access */}
      <AuthModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Top Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid var(--border)',
        background: '#ffffff', position: 'sticky', top: 0, zIndex: 50,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <RowBotLogo size="md" subtitle="Enterprise Data Cleaning AI" />
        </div>

        {/* Desktop Navigation Links */}
        <div className="landing-nav-desktop">
          <button
            onClick={openWelcome}
            className="btn btn-ghost btn-sm"
            style={{ color: '#845162', fontWeight: 700 }}
            title="Open Full Screen Welcome Screen"
          >
            ✨ Welcome Screen
          </button>

          {user ? (
            <div
              onClick={openWelcome}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: user.isGuest ? '#f8fafc' : 'rgba(132, 81, 98, 0.08)',
                border: `1px solid ${user.isGuest ? '#e2e8f0' : 'rgba(132, 81, 98, 0.25)'}`,
                padding: '5px 12px', borderRadius: 99,
                cursor: 'pointer',
              }}
              title="Click to view personalized Welcome screen"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{user.avatar || '👤'}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '.82rem', color: '#2e1a22', lineHeight: 1.1 }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '.68rem', color: '#845162', fontWeight: 700 }}>
                  {user.roleTag}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '3px 6px', color: '#8da4b8', marginLeft: 4 }}
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, borderColor: '#845162', color: '#845162' }}
              title="Sign In or Continue as Guest"
            >
              Sign In / Guest
            </button>
          )}

          <button
            onClick={() => navigate('/presentation')}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#A78BFA', color: '#6D28D9', fontWeight: 700 }}
            title="Open Living Data Presentation Deck"
          >
            📑 Pitch Deck (PPTX)
          </button>
          <button
            onClick={handleLaunchDemo}
            disabled={demoLoading || uploading}
            className="btn btn-secondary btn-sm"
          >
            ⚡ {demoLoading ? 'Loading...' : 'Try Sample File'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/upload')}
          >
            Upload File →
          </button>
        </div>

        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          className="landing-nav-mobile-toggle"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileNavOpen && (
        <div className="landing-mobile-drawer">
          <button
            onClick={() => { openWelcome(); setMobileNavOpen(false); }}
            className="btn btn-ghost btn-sm"
            style={{ color: '#845162', fontWeight: 800, justifyContent: 'flex-start' }}
          >
            ✨ Open Welcome Screen
          </button>

          <button
            onClick={() => { navigate('/presentation'); setMobileNavOpen(false); }}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#A78BFA', color: '#6D28D9', fontWeight: 700 }}
          >
            📑 Open Pitch Deck (PPTX)
          </button>

          {user ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: user.isGuest ? '#f8fafc' : 'rgba(132, 81, 98, 0.08)',
              border: `1px solid ${user.isGuest ? '#e2e8f0' : 'rgba(132, 81, 98, 0.25)'}`,
              padding: '10px 14px', borderRadius: 12,
            }}>
              <div
                onClick={() => { openWelcome(); setMobileNavOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '1.3rem' }}>{user.avatar || '👤'}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '.9rem', color: '#2e1a22' }}>{user.name}</div>
                  <div style={{ fontSize: '.72rem', color: '#845162', fontWeight: 700 }}>{user.roleTag} · View Welcome</div>
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileNavOpen(false); }}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px 10px', color: '#e11d48' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowLoginModal(true); setMobileNavOpen(false); }}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, borderColor: '#845162', color: '#845162' }}
            >
              Sign In or Continue as Guest
            </button>
          )}

          <button
            onClick={handleLaunchDemo}
            disabled={demoLoading || uploading}
            className="btn btn-secondary btn-sm"
          >
            ⚡ {demoLoading ? 'Loading Sample...' : 'Try Sample File'}
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => { navigate('/upload'); setMobileNavOpen(false); }}
          >
            Upload File →
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '36px 18px 70px' }}>
        {/* Prominent Opening Banner with Name & Quote directly on page (No modal) */}
        <div className="opening-banner animate-fadeInUp">
          <div className="opening-banner-badge">
            <Zap size={13} style={{ marginRight: 4 }} />
            Automated Data Quality & Normalization
          </div>
          
          <h1 className="opening-banner-name">
            RowBot
          </h1>

          <div className="opening-banner-quote">
            “Messy Data In. Clean Data Out. — Transforming chaotic spreadsheets into clean, trusted intelligence in seconds.”
          </div>

          <p style={{ color: 'var(--text-body)', fontSize: '1.05rem', maxWidth: 760, margin: '0 auto 32px auto', textAlign: 'center', lineHeight: 1.6 }}>
            Upload any messy CSV or Excel file. RowBot automatically scans for duplicate rows, missing fields, 
            trailing spaces, inconsistent dates, and invalid formats — giving you an instant 0–100 quality score and one-click fixes.
          </p>

          {/* Instant Drag-and-Drop Area Directly on Homepage */}
          <div
            {...getRootProps()}
            className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
            style={{ maxWidth: 840, width: '100%', margin: '0 auto 20px' }}
          >
            <input {...getInputProps()} />
            <div className="upload-icon" style={{ background: 'rgba(132, 81, 98, 0.12)' }}>
              <UploadCloud size={32} color="#845162" />
            </div>

            {uploading ? (
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
                  Analyzing dataset... {progress}%
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 16 }}>
                  Generating data quality score, identifying inconsistencies, and profiling column distributions...
                </p>
                <div className="progress-bar-outer" style={{ maxWidth: 360, margin: '0 auto' }}>
                  <div className="progress-bar-inner" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : isDragActive ? (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#845162', marginBottom: 6 }}>
                  Drop your file here for instant results!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
                  RowBot will analyze and score your data immediately.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="upload-title">
                  Drop your CSV or Excel file here to get instant results
                </h3>
                <p className="upload-sub">
                  or click to select a file from your computer (CSV, XLSX, XLS up to 55MB)
                </p>
                <div className="upload-formats">
                  <span className="format-chip">.CSV</span>
                  <span className="format-chip">.XLSX</span>
                  <span className="format-chip">.XLS</span>
                  <span className="format-chip">Instant Quality Score</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>Don't have a messy file handy?</span>
            <button
              onClick={handleLaunchDemo}
              disabled={demoLoading || uploading}
              className="btn btn-secondary btn-sm"
              style={{ fontWeight: 700, borderColor: 'rgba(132, 81, 98, 0.45)', color: '#845162' }}
            >
              ⚡ Click here to load sample dataset with real issues
            </button>
          </div>
        </div>

        {/* 3 Step Instant Workflow Cards */}
        <div className="landing-workflow-grid">
          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(132, 81, 98, 0.12)', color: '#845162', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 14 }}>
              1
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>Instant Diagnosis</h3>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Upload and instantly see your data quality score (0–100), duplicate counts, missing values, and formatting errors.
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(132, 81, 98, 0.12)', color: '#845162', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 14 }}>
              2
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>One-Click Fixes</h3>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Clean whitespace, remove duplicate rows, fill missing cells with median, and standardize dates with single clicks.
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(132, 81, 98, 0.12)', color: '#845162', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 14 }}>
              3
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>Export Anywhere</h3>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Download cleaned data ready for Excel, Python, PowerBI, or SQL, with a complete transformation audit log.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
            Built for Real-World Dirty Data
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
            Everything you need to transform messy operational exports into analysis-grade datasets.
          </p>
        </div>

        <div className="landing-feature-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--indigo-600)' }}>📊</div>
            <div className="feature-title">Transparent Quality Score</div>
            <div className="feature-desc">
              Every issue incurs a documented penalty. Watch your data score climb from Grade C to Grade A as you apply fixes.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--blue-600)' }}>🔍</div>
            <div className="feature-title">Live Before & After Diff</div>
            <div className="feature-desc">
              Preview proposed changes side-by-side with exact row and cell counts before committing any transformation.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--emerald-600)' }}>↩️</div>
            <div className="feature-title">Infinite Undo Stack</div>
            <div className="feature-desc">
              Every cleaning step is fully reversible. Your original dataset is preserved untouched at all times.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--amber-500)' }}>✨</div>
            <div className="feature-title">Google Gemini AI</div>
            <div className="feature-desc">
              Type plain English instructions like "trim extra spaces in names" or "convert dates to YYYY-MM-DD".
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--rose-500)' }}>🛡️</div>
            <div className="feature-title">Private & Client-Side Safe</div>
            <div className="feature-desc">
              Runs locally in memory with automatic session cleanup. No data is shared with external third parties.
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: 'var(--indigo-600)' }}>📥</div>
            <div className="feature-title">Audit Reports & Downloads</div>
            <div className="feature-desc">
              Export in clean CSV or Excel formats, plus generate a comprehensive HTML data quality audit certificate.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
