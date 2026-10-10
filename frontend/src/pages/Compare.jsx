import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import { getComparison } from '../services/api';
import { ScoreRing } from '../components/ScoreRing';
import DataTable from '../components/DataTable';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function Delta({ before, after, label, invert = false }) {
  const diff = after - before;
  const improved = invert ? diff < 0 : diff > 0;
  const worsened = invert ? diff > 0 : diff < 0;
  const Icon = diff === 0 ? Minus : improved ? TrendingUp : TrendingDown;
  const color = diff === 0 ? 'var(--text-muted)' : improved ? 'var(--accent-green)' : 'var(--accent-rose)';
  const sign = diff > 0 ? '+' : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.82rem' }}>
      <Icon size={14} style={{ color }} />
      <span style={{ color, fontWeight: 600 }}>{sign}{diff.toLocaleString()}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function StatPanel({ title, data, color }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, color }}>
        {title}
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ScoreRing score={data.score} grade={data.grade} size={80} />
        </div>
        <div className="divider" />
        {[
          { label: 'Rows', value: data.row_count?.toLocaleString() },
          { label: 'Columns', value: data.col_count },
          { label: 'Missing Cells', value: data.missing?.toLocaleString() },
          { label: 'Duplicate Rows', value: data.duplicates?.toLocaleString() },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontWeight: 700 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Compare() {
  const navigate = useNavigate();
  const { jobId, jobMeta, operationLog } = useJob();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    getComparison(jobId)
      .then(({ data }) => setComparison(data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load comparison.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (!jobId) return (
    <div className="empty-state">
      <div className="empty-state-icon">⚖️</div>
      <div className="empty-state-title">No file loaded</div>
      <div className="empty-state-desc" style={{ marginBottom: 16 }}>Upload and clean a file first.</div>
      <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload File</button>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
    </div>
  );

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!comparison) return null;

  const { before, after } = comparison;
  const scoreDiff = after.score - before.score;

  return (
    <div className="animate-fadeInUp">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
          ⚖️ Before & After Comparison
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
          {comparison.operations_applied} operations applied to {jobMeta?.filename}
        </p>
      </div>

      {/* Score change banner */}
      <div style={{
        padding: '20px 24px',
        background: scoreDiff > 0
          ? 'linear-gradient(135deg, rgba(34,197,94,.1), rgba(20,184,166,.1))'
          : scoreDiff < 0
          ? 'rgba(239,68,68,.08)'
          : 'var(--surface-2)',
        border: `1px solid ${scoreDiff > 0 ? 'rgba(34,197,94,.3)' : scoreDiff < 0 ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '2rem' }}>
          {scoreDiff > 0 ? '📈' : scoreDiff < 0 ? '📉' : '➡️'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {scoreDiff > 0
              ? `Quality improved by ${scoreDiff} points!`
              : scoreDiff < 0
              ? `Quality decreased by ${Math.abs(scoreDiff)} points`
              : 'No change in quality score'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {before.score} → {after.score} · Grade {before.grade} → {after.grade}
          </div>
        </div>
        <div className="comparison-score-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/studio')}>Back to Studio</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/export')}>Export →</button>
        </div>
      </div>

      {/* Before / After panels */}
      <div className="comparison-grid" style={{ marginBottom: 24 }}>
        <StatPanel title="📋 Before Cleaning" data={before} color="var(--accent-rose)" />
        <div className="comparison-divider">
          <div className="arrow-icon">→</div>
        </div>
        <StatPanel title="✅ After Cleaning" data={after} color="var(--accent-green)" />
      </div>

      {/* Delta summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Changes Summary</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <Delta before={before.score} after={after.score} label="quality score" />
          <Delta before={before.missing} after={after.missing} label="missing cells" invert />
          <Delta before={before.duplicates} after={after.duplicates} label="duplicates" invert />
          <Delta before={before.row_count} after={after.row_count} label="rows" />
          <Delta before={before.col_count} after={after.col_count} label="columns" />
        </div>
      </div>

      {/* Operations list */}
      {operationLog.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Operations Applied ({operationLog.length})</span>
          </div>
          <div className="card-body">
            <div className="log-list">
              {operationLog.map((entry, i) => (
                <div key={i} className="log-entry">
                  <div className="log-entry-num">{i + 1}</div>
                  <div className="log-entry-body">
                    <div className="log-entry-op">
                      {entry.op?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div className="log-entry-meta">
                      {entry.rows_affected} rows affected
                      {entry.columns?.length > 0 && ` · ${entry.columns.join(', ')}`}
                    </div>
                  </div>
                  <div className="log-entry-ts">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Interactive Spreadsheet View with Cleaned vs Original Toggle */}
      <div style={{ marginTop: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            📊 Spreadsheet Verification
          </h2>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            Use the Cleaned Data / Original Data toggle in the toolbar to inspect before & after rows
          </span>
        </div>
        <DataTable jobId={jobId} showComparisonToggle={true} initialViewMode="working" />
      </div>
    </div>
  );
}
