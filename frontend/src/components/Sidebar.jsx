import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import {
  UploadCloud, BarChart2, Wand2, Table2,
  GitCompareArrows, Download, History, Settings,
  Home, Zap, Layers
} from 'lucide-react';

import RowBotLogo from './RowBotLogo';

const navItems = [
  { to: '/', icon: Home, label: 'Home', alwaysVisible: true },
  { to: '/upload', icon: UploadCloud, label: 'Upload', alwaysVisible: true },
  { to: '/presentation', icon: Layers, label: 'Pitch Deck (PPTX)', alwaysVisible: true },
  { label: 'Analysis', isSection: true },
  { to: '/profile', icon: BarChart2, label: 'Data Profile', needsJob: true },
  { to: '/studio', icon: Table2, label: 'Cleaning Studio', needsJob: true },
  { to: '/copilot', icon: Wand2, label: 'Gemini', needsJob: true },
  { label: 'Results', isSection: true },
  { to: '/compare', icon: GitCompareArrows, label: 'Before & After', needsJob: true },
  { to: '/export', icon: Download, label: 'Export Center', needsJob: true },
  { to: '/history', icon: History, label: 'History', alwaysVisible: true },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, jobMeta, score, user, openWelcome } = useJob();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => { navigate('/'); onClose(); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <RowBotLogo size="md" subtitle="Data Cleaning AI" />
        </div>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm mobile-close-btn"
          style={{ padding: 4, display: mobileOpen ? 'flex' : 'none' }}
          title="Close Navigation"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.isSection) {
            return (
              <div key={i} className="nav-section-label">{item.label}</div>
            );
          }
          const Icon = item.icon;
          const disabled = item.needsJob && !jobId;
          const active = location.pathname === item.to;

          return (
            <button
              key={item.to}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => {
                if (!disabled) {
                  navigate(item.to);
                  onClose();
                }
              }}
              style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
              title={disabled ? 'Upload a file first' : item.label}
            >
              <Icon size={16} className="nav-icon" />
              {item.label}
              {item.to === '/profile' && score && (
                <span className="nav-badge">{score.score}</span>
              )}
            </button>
          );
        })}
      </nav>

      {jobMeta && (
        <div className="sidebar-footer">
          <div style={{ marginBottom: 4, color: 'var(--text-main)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📄 {jobMeta.filename}
          </div>
          <div style={{ fontSize: '.76rem', color: 'var(--text-muted)' }}>
            {jobMeta.row_count?.toLocaleString()} rows · {jobMeta.col_count} columns
          </div>
        </div>
      )}
      {!jobMeta && (
        <div className="sidebar-footer" style={{ color: 'var(--text-muted)' }}>
          No file currently active
        </div>
      )}

      {user && (
        <div
          onClick={openWelcome}
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(132, 81, 98, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          title="Click to view full screen Welcome banner"
        >
          <span style={{ fontSize: '1.25rem' }}>{user.avatar || '👤'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '.84rem', color: '#2e1a22', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '.7rem', color: '#845162', fontWeight: 600 }}>
              {user.roleTag} · 👋 View Welcome
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
