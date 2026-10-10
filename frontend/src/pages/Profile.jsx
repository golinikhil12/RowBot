import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, AlertTriangle, CheckCircle, TrendingUp, RefreshCw,
  FileSpreadsheet, Sparkles, Filter, Layers, Database
} from 'lucide-react';
import { getProfile } from '../services/api';
import { useJob } from '../contexts/JobContext';
import { ScoreRing } from '../components/ScoreRing';
import ExcelSpreadsheet from '../components/ExcelSpreadsheet';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

const SEVERITY_ICONS = { high: '🔴', medium: '🟡', low: '🔵' };

function ColTypePill({ type }) {
  const cls = { text: 'type-text', numeric: 'type-numeric', date: 'type-date', mixed: 'type-mixed' };
  return <span className={`col-type-badge ${cls[type] || 'type-text'}`}>{type}</span>;
}

export default function Profile() {
  const navigate = useNavigate();
  const { jobId, setJobId, jobMeta, profile, setProfile, score, setScore, loadDemoDataset } = useJob();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'excel' | 'columns' | 'charts'
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    if (!jobId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await getProfile(jobId);
      if (data.job_id && data.job_id !== jobId) {
        setJobId(data.job_id);
      }
      setProfile(data.profile);
      setScore(data.score);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load profile. The dataset session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    setError('');
    try {
      await loadDemoDataset();
    } catch (err) {
      setError('Failed to initialize demo dataset. Ensure backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile && jobId) {
      load();
    }
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No dataset currently loaded</div>
        <div className="empty-state-desc" style={{ marginBottom: 20 }}>
          Upload a CSV/Excel file or launch our sample dataset to inspect data quality metrics and automated profiling.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleLoadDemo}>
            ⚡ Load Demo Dataset
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
            Upload File
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, color: 'var(--text-muted)' }}>
        <RefreshCw className="animate-spin" size={18} />
        <span>Computing data quality score and profiling column distributions...</span>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
      ))}
    </div>
  );

  if (error) return (
    <div className="card" style={{ padding: 28, textAlign: 'center', maxWidth: 640, margin: '40px auto' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#f87171' }}>
        <AlertTriangle size={24} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Unable to Load Data Profile</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
        {error}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleLoadDemo}>
          ⚡ Load Sample Dataset
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
          Upload New File
        </button>
        <button className="btn btn-secondary" onClick={load}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  if (!profile) return null;

  const radarData = score?.breakdown ? Object.entries(score.breakdown).map(([key, val]) => ({
    subject: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    penalty: val.penalty,
    max: val.max_penalty,
  })) : [];

  const missingData = profile.columns
    .filter(c => c.missing_count > 0)
    .sort((a, b) => b.missing_count - a.missing_count)
    .slice(0, 10)
    .map(c => ({ name: c.name, missing: c.missing_count, pct: c.missing_pct }));

  const filteredColumns = profile.columns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fadeInUp">
      {/* ── 1. Page Header ── */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={22} style={{ color: 'var(--color-primary)' }} />
            Data Quality Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {jobMeta?.filename || 'dataset'} · {profile.row_count.toLocaleString()} rows · {profile.col_count} columns
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} id="refresh-profile-btn">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/studio?auto=true')}
            id="profile-auto-clean-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            title="Clean all issues at once using all 10 quick operations"
          >
            <Sparkles size={14} style={{ color: 'var(--color-primary)' }} />
            <span>⚡ 1-Click Clean All</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/studio')} id="go-to-studio-btn">
            Open Studio →
          </button>
        </div>
      </div>

      {/* ── 2. Top Executive KPI Cards ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {/* Quality Score */}
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={score?.score ?? 0} grade={score?.grade} size={84} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="stat-label">Quality Score</div>
            <div style={{ fontSize: '.86rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Grade <strong>{score?.grade || 'A'}</strong> · −{score?.total_deductions ?? 0} deductions
            </div>
          </div>
        </div>

        {/* Missing Cells */}
        <div className="stat-card red">
          <div className="stat-label">Missing Cells</div>
          <div className="stat-value">{profile.total_missing.toLocaleString()}</div>
          <div className="stat-sub">{profile.missing_pct}% of total cells</div>
        </div>

        {/* Duplicate Rows */}
        <div className="stat-card amber">
          <div className="stat-label">Duplicate Rows</div>
          <div className="stat-value">{profile.exact_duplicate_rows.toLocaleString()}</div>
          <div className="stat-sub">
            {profile.potential_duplicate_groups?.length || 0} near-duplicate clusters
          </div>
        </div>

        {/* Issues Found */}
        <div className="stat-card teal">
          <div className="stat-label">Issues Detected</div>
          <div className="stat-value">{profile.issues.length}</div>
          <div className="stat-sub">across {profile.col_count} columns</div>
        </div>
      </div>

      {/* ── 3. Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: `Issues & Fixes (${profile.issues.length})` },
          { id: 'excel', label: '📊 Microsoft Excel Spreadsheet View' },
          { id: 'columns', label: `Column Roster (${profile.col_count})` },
          { id: 'charts', label: 'Quality Score Breakdown' },
        ].map(t => (
          <button
            key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: ISSUES & FIXES ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(132, 81, 98, 0.07)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(132, 81, 98, 0.2)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-main)' }}>
                {profile.issues.length} Data Quality Issues Identified
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                Review detected issues below and resolve them instantly in the Cleaning Studio.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/studio')}>
              Start Cleaning →
            </button>
          </div>

          <div className="issue-list">
            {profile.issues.length === 0 ? (
              <div className="alert alert-success">
                <CheckCircle size={16} />
                No significant data quality issues detected. Your dataset is pristine and ready for analysis!
              </div>
            ) : (
              profile.issues.map(issue => (
                <div key={issue.id} className="issue-item">
                  <div className={`issue-icon ${issue.severity}`}>
                    {SEVERITY_ICONS[issue.severity]}
                  </div>
                  <div className="issue-body">
                    <div className="issue-title">{issue.title}</div>
                    <div className="issue-desc">{issue.description}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge badge-${issue.severity}`}>{issue.severity} priority</span>
                    <span className="issue-count">{issue.count.toLocaleString()} occurrences</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '.72rem', padding: '2px 8px', color: 'var(--color-primary)' }}
                      onClick={() => navigate('/studio')}
                    >
                      Fix in Studio →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Fuzzy Duplicate Clusters */}
          {profile.potential_duplicate_groups?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">🔍 Potential / Near-Duplicate Clusters ({profile.potential_duplicate_groups.length})</span>
                <button className="btn btn-primary btn-xs" onClick={() => navigate('/studio')}>
                  Resolve in Studio
                </button>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {profile.potential_duplicate_groups.slice(0, 5).map((g, idx) => (
                  <div key={idx} style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                      Cluster #{idx + 1} — Base Row #{g.base_row_index + 1}
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {Object.entries(g.base_preview).map(([k, v]) => `${k}: "${v}"`).join(' · ')}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                      Similar to: {g.matches.map(m => `Row #${m.row_index + 1} (${Math.round(m.similarity * 100)}% match)`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: EXCEL SPREADSHEET VIEW ── */}
      {activeTab === 'excel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 18px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={18} style={{ color: '#107c41' }} />
                Microsoft Excel Interactive Spreadsheet Inspector
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Full grid navigation with formula coordinate bar, row/column sticky headers, and issue highlighting.
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/studio')}>
              Clean In Studio →
            </button>
          </div>

          <ExcelSpreadsheet
            jobId={jobId}
            maxHeight="560px"
            highlightIssuesDefault={true}
          />
        </div>
      )}

      {/* ── TAB 3: COLUMN ROSTER ── */}
      {activeTab === 'columns' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span className="card-title">Dataset Columns ({profile.col_count})</span>
            <input
              className="input"
              style={{ width: 220, padding: '6px 12px', fontSize: '0.82rem' }}
              placeholder="Filter columns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="data-table-wrapper" style={{ maxHeight: 480 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Missing</th>
                  <th>Unique Values</th>
                  <th>Detected Issues</th>
                  <th>Sample Values</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredColumns.map(col => {
                  const issueFlags = [
                    col.missing_count > 0 && `${col.missing_count} Missing`,
                    col.leading_trailing_spaces > 0 && 'Whitespace',
                    col.inconsistent_case && 'Case Drift',
                    col.date_formats_inconsistent && 'Date Anomaly',
                    col.numeric_as_text && 'Num Stored As Text',
                    col.has_email_issues && 'Email Syntax',
                    col.is_constant && 'Constant Value',
                  ].filter(Boolean);

                  return (
                    <tr key={col.name}>
                      <td style={{ fontWeight: 600 }}>{col.name}</td>
                      <td><ColTypePill type={col.type} /></td>
                      <td className={col.missing_count > 0 ? 'cell-missing' : ''}>
                        {col.missing_count > 0 ? `${col.missing_count.toLocaleString()} (${col.missing_pct}%)` : '—'}
                      </td>
                      <td>{col.unique_count.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {issueFlags.length === 0 ? (
                            <span style={{ color: 'var(--emerald-600, #059669)', fontSize: '.74rem', fontWeight: 700 }}>
                              ✓ Clean
                            </span>
                          ) : (
                            issueFlags.map(f => (
                              <span key={f} className="badge badge-medium" style={{ padding: '2px 7px' }}>
                                {f}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '.76rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.sample_values?.slice(0, 2).join(' · ') || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                          onClick={() => navigate('/studio')}
                        >
                          Clean →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: QUALITY SCORE BREAKDOWN & CHARTS ── */}
      {activeTab === 'charts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Score breakdown radar */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Score Penalty Distribution</span>
              </div>
              <div className="card-body" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                    <Radar name="Penalty" dataKey="penalty" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Missing per column */}
            {missingData.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Missing Values by Column</span>
                </div>
                <div className="card-body" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={missingData} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v) => [`${v} cells`, 'Missing']} />
                      <Bar dataKey="missing" fill="#f43f5e" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Score breakdown detail */}
          {score?.breakdown && (
            <div className="card">
              <div className="card-header">
                <span className="card-title"><TrendingUp size={16} /> Formula Penalty Breakdown</span>
                <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>How the quality score is calculated</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(score.breakdown).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 180, fontSize: '.8rem', color: 'var(--text-secondary)', flexShrink: 0, fontWeight: 600 }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="progress-bar-outer" style={{ height: 8 }}>
                        <div
                          className="progress-bar-inner"
                          style={{
                            width: `${(val.penalty / val.max_penalty) * 100}%`,
                            background: val.penalty === 0 ? '#22c55e' : val.penalty < val.max_penalty / 2 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ width: 70, textAlign: 'right', fontSize: '.8rem', fontWeight: 600, fontFamily: 'monospace' }}>
                      −{val.penalty}/{val.max_penalty}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
