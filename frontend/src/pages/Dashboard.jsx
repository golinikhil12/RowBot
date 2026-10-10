import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import { UploadCloud, History, Info } from 'lucide-react';
import { ScoreRing } from '../components/ScoreRing';

export default function Dashboard() {
  const navigate = useNavigate();
  const { jobId, jobMeta, score, operationLog, loadDemoDataset } = useJob();

  return (
    <div className="animate-fadeInUp">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>Welcome to RowBot — your data cleaning workspace.</p>
      </div>

      {!jobId ? (
        <div>
          <div className="opening-banner">
            <div className="opening-banner-badge">
              Automated Data Engineering & Cleaning
            </div>
            <h2 className="opening-banner-name">
              RowBot Workspace
            </h2>
            <div className="opening-banner-quote">
              “Messy Data In. Clean Data Out. — Transforming chaotic spreadsheets into clean, audit-ready intelligence in seconds.”
            </div>
            <p style={{ color: 'var(--text-body)', fontSize: '1rem', maxWidth: 680, margin: '0 auto 24px auto', textAlign: 'center', lineHeight: 1.6 }}>
              Get started by uploading your raw spreadsheet, or instantly test all 12 cleaning transforms with our pre-loaded dirty dataset.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/upload')} id="dash-upload-btn">
                <UploadCloud size={18} /> Upload Your Spreadsheet
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={async () => {
                  try {
                    await loadDemoDataset();
                    navigate('/profile');
                  } catch (e) {
                    navigate('/upload');
                  }
                }}
              >
                ⚡ Load Sample Dataset Instantly
              </button>
            </div>
          </div>

          <div className="dash-info-grid">
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 12, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                How RowBot Fixes Your Data
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '🔍', text: 'Identifies missing cells, whitespace padding, duplicate records, and casing' },
                  { icon: '🤖', text: 'Interprets conversational requests via Google Gemini AI' },
                  { icon: '👁️', text: 'Provides real-time before & after previews with change counters' },
                  { icon: '↩️', text: 'Supports unlimited undo operations preserving your original data' },
                  { icon: '📥', text: 'Generates clean CSV, Excel, and standalone HTML audit reports' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', gap: 12, fontSize: '.88rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ color: 'var(--text-body)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(132, 81, 98, 0.08)', border: '1px solid rgba(132, 81, 98, 0.25)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#845162', marginBottom: 8 }}>
                Instant Quality Audit
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '.88rem', marginBottom: 20, lineHeight: 1.5 }}>
                Every uploaded file receives an immediate composite Quality Score from 0 to 100 based on completeness, uniqueness, consistency, and format validity.
              </p>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/upload')}>
                Start Now →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Current job */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Current File</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/upload')}>
                Upload New
              </button>
            </div>
            <div className="card-body dash-file-card-body">
              {score && <ScoreRing score={score.score} grade={score.grade} size={80} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{jobMeta?.filename}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '.875rem', marginBottom: 12 }}>
                  {jobMeta?.row_count?.toLocaleString()} rows · {jobMeta?.col_count} columns
                  {jobMeta?.sheet_name && ` · Sheet: ${jobMeta.sheet_name}`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/profile')}>View Profile</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/studio')}>Clean Data</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/copilot')}>Gemini</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="stat-grid">
            <div className="stat-card teal">
              <div className="stat-label">Quality Score</div>
              <div className="stat-value">{score?.score ?? '—'}</div>
              <div className="stat-sub">Grade {score?.grade}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Operations Applied</div>
              <div className="stat-value">{operationLog.length}</div>
              <div className="stat-sub">since upload</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rows</div>
              <div className="stat-value">{jobMeta?.row_count?.toLocaleString() ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Columns</div>
              <div className="stat-value">{jobMeta?.col_count ?? '—'}</div>
            </div>
          </div>

          {operationLog.length > 0 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><History size={16} /> Recent Operations</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/studio')}>View All →</button>
              </div>
              <div className="card-body">
                <div className="log-list">
                  {[...operationLog].reverse().slice(0, 5).map((e, i) => (
                    <div key={i} className="log-entry">
                      <div className="log-entry-num">{operationLog.length - i}</div>
                      <div className="log-entry-body">
                        <div className="log-entry-op">{e.op?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                        <div className="log-entry-meta">{e.rows_affected} rows affected</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
