import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Shield, User, CornerDownLeft } from 'lucide-react';
import RowBotLogo from './RowBotLogo';
import { useJob } from '../contexts/JobContext';
import toast from 'react-hot-toast';

export default function FullScreenWelcome({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { login, loadDemoDataset } = useJob();

  // Always directly ask for the name on open
  const [step, setStep] = useState('input');
  const [inputName, setInputName] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);

  if (!isOpen) return null;

  const handleNameSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      toast.error('Please enter your name to continue');
      return;
    }

    login({
      name: trimmed,
      roleTag: 'Data Analyst',
      email: `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}@rowbot.ai`,
      isGuest: false,
      avatar: '👤',
    });

    setStep('welcoming');
  };

  const handleEnterWorkspace = () => {
    try {
      sessionStorage.setItem('rowbot_welcomed', 'true');
    } catch {}
    if (onClose) onClose();
  };

  const handleLaunchSample = async () => {
    setLoadingDemo(true);
    try {
      sessionStorage.setItem('rowbot_welcomed', 'true');
      await loadDemoDataset();
      toast.success('Sample dataset loaded instantly!');
      if (onClose) onClose();
      navigate('/profile');
    } catch (e) {
      toast.error('Could not load sample dataset.');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="fullscreen-welcome-overlay">
      {/* Background Decorative Ambient Radiant Orbs */}
      <div className="fullscreen-ambient-orb orb-1" />
      <div className="fullscreen-ambient-orb orb-2" />
      <div className="fullscreen-ambient-orb orb-3" />

      {step === 'input' ? (
        /* ── STEP 1: Direct Name Prompt with Animated Text Appearance ────────── */
        <div className="fullscreen-card fullscreen-animated-entry">
          <div className="anim-delay-1" style={{ textAlign: 'center', marginBottom: 20 }}>
            <RowBotLogo size="lg" subtitle="Enterprise Data Cleaning AI" />
          </div>

          <div className="fullscreen-badge anim-delay-2" style={{ marginBottom: 14 }}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Personalize Your Workspace
          </div>

          <h2 className="fullscreen-title anim-delay-3" style={{ marginBottom: 10, textAlign: 'center' }}>
            What is your name?
          </h2>

          <p className="anim-delay-3" style={{ color: 'var(--text-muted)', fontSize: '0.96rem', textAlign: 'center', maxWidth: 380, marginBottom: 28, lineHeight: 1.5 }}>
            Enter your name to unlock your personalized data cleaning studio and audit reports.
          </p>

          <form onSubmit={handleNameSubmit} className="anim-delay-4" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#845162" style={{ position: 'absolute', left: 16, top: 16 }} />
                <input
                  type="text"
                  autoFocus
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Enter your name..."
                  className="input fullscreen-name-input"
                  style={{
                    paddingLeft: 46,
                    paddingRight: 46,
                    height: 52,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderColor: '#E3B6B1',
                    borderRadius: 14,
                    boxShadow: '0 4px 16px rgba(132, 81, 98, 0.08)',
                  }}
                  required
                />
                <button
                  type="submit"
                  title="Submit name"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    color: '#845162',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CornerDownLeft size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 50,
                fontSize: '1.05rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 14,
                boxShadow: '0 6px 20px rgba(132, 81, 98, 0.3)',
              }}
            >
              Continue to Welcome Screen <ArrowRight size={18} />
            </button>
          </form>
        </div>
      ) : (
        /* ── STEP 2: Grand Welcoming Full Screen Presentation with Animated Text ── */
        <div className="fullscreen-welcome-content">
          {/* Brand Logo Header */}
          <div className="fullscreen-logo-wrapper anim-delay-1" style={{ marginBottom: 16 }}>
            <RowBotLogo size="lg" subtitle="Enterprise Data Cleaning AI" />
          </div>

          {/* Top Animated Badge */}
          <div className="fullscreen-badge anim-delay-1" style={{ marginBottom: 16 }}>
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Personalized Data Quality Workspace
          </div>

          {/* Animated Highlighted User Name */}
          <h1 className="fullscreen-headline anim-delay-2">
            Welcome, <span className="highlight-username animated-text-glow">{inputName}!</span>
          </h1>

          {/* Animated Highlighted RowBot Name */}
          <div className="fullscreen-subheadline anim-delay-3">
            to{' '}
            <span className="highlight-rowbot">
              <span className="row-text">Row</span>
              <span className="bot-text">Bot</span>
              <span className="pulse-dot" />
            </span>
          </div>

          {/* Animated Professional Tagline Banner */}
          <div className="fullscreen-tagline-box anim-delay-4">
            <div className="primary-tagline">
              “Messy Data In. Clean Data Out.”
            </div>
            <div className="secondary-tagline">
              Enterprise-Grade AI for Automated Data Cleaning, Deduplication & Quality Transformation
            </div>
          </div>

          {/* Animated Feature Highlights */}
          <div className="fullscreen-features-row anim-delay-5">
            <div className="fullscreen-feature-pill">
              <Zap size={16} color="#845162" />
              <span>Instant 0–100 Quality Score</span>
            </div>
            <div className="fullscreen-feature-pill">
              <Sparkles size={16} color="#845162" />
              <span>1-Click Anomaly Fixes</span>
            </div>
            <div className="fullscreen-feature-pill">
              <Shield size={16} color="#845162" />
              <span>100% In-Memory Private Processing</span>
            </div>
          </div>

          {/* Animated Call to Action Buttons */}
          <div className="fullscreen-actions anim-delay-5">
            <button
              onClick={handleEnterWorkspace}
              className="btn btn-primary fullscreen-btn-main"
            >
              🚀 Enter RowBot Workspace <ArrowRight size={20} />
            </button>

            <button
              onClick={handleLaunchSample}
              disabled={loadingDemo}
              className="btn btn-secondary fullscreen-btn-sub"
            >
              ⚡ {loadingDemo ? 'Loading Sample Dataset...' : 'Try With Sample File'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
