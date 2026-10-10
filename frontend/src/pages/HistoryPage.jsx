import React from 'react';
import { useJob } from '../contexts/JobContext';
import { History } from 'lucide-react';

export default function HistoryPage() {
  const { operationLog, jobMeta } = useJob();

  return (
    <div className="animate-fadeInUp">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
          <History size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--teal-600)' }} />
          Cleaning History
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
          Full transformation log for the current session.
          {jobMeta && ` · ${jobMeta.filename}`}
        </p>
      </div>

      {operationLog.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No operations yet</div>
          <div className="empty-state-desc">
            Upload a file and apply cleaning operations to see them here.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="log-list">
              {operationLog.map((entry, i) => (
                <div key={i} className="log-entry" style={{ background: 'var(--surface-0)' }}>
                  <div className="log-entry-num">{i + 1}</div>
                  <div className="log-entry-body">
                    <div className="log-entry-op">
                      {entry.op?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div className="log-entry-meta">
                      {entry.rows_affected} rows affected
                      {entry.columns?.length > 0 && ` · Columns: ${entry.columns.join(', ')}`}
                    </div>
                    {entry.examples?.map((ex, ei) => (
                      <div key={ei} style={{ fontSize: '.72rem', marginTop: 6, display: 'flex', gap: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{ex.column}:</span>
                        <span style={{ color: 'var(--accent-rose)', fontFamily: 'monospace' }}>"{ex.before}"</span>
                        <span>→</span>
                        <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace' }}>"{ex.after}"</span>
                      </div>
                    ))}
                  </div>
                  <div className="log-entry-ts">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
