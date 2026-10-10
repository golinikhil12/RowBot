import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import { exportFile } from '../services/api';
import toast from 'react-hot-toast';
import { Download, FileText, FileSpreadsheet, BarChart2, Loader } from 'lucide-react';

const EXPORT_OPTIONS = [
  {
    id: 'csv',
    icon: '📄',
    title: 'Cleaned CSV',
    desc: 'UTF-8 encoded CSV with proper quoting and formula-injection protection.',
    format: 'csv',
    ext: 'csv',
  },
  {
    id: 'xlsx',
    icon: '📊',
    title: 'Cleaned Excel',
    desc: 'Formatted .xlsx with styled headers, alternating rows, and frozen panes.',
    format: 'xlsx',
    ext: 'xlsx',
  },
  {
    id: 'report',
    icon: '📋',
    title: 'Cleaning Report',
    desc: 'Full HTML report with quality scores, operation log, and before/after examples.',
    format: 'report',
    ext: 'html',
  },
];

export default function Export() {
  const navigate = useNavigate();
  const { jobId, jobMeta, operationLog } = useJob();
  const [downloading, setDownloading] = useState(null);

  if (!jobId) return (
    <div className="empty-state">
      <div className="empty-state-icon">📥</div>
      <div className="empty-state-title">No file loaded</div>
      <div className="empty-state-desc" style={{ marginBottom: 16 }}>Upload and clean a file to export.</div>
      <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload File</button>
    </div>
  );

  const handleExport = async (option) => {
    setDownloading(option.id);
    try {
      const { data, headers } = await exportFile(jobId, option.format);
      const blob = new Blob([data], { type: headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Try to extract filename from content-disposition
      const cd = headers['content-disposition'];
      const match = cd && cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      a.download = match ? match[1].replace(/['"]/g, '') : `cleaned_data.${option.ext}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloaded ${a.download}`);
    } catch (e) {
      toast.error(e.response?.data?.error || `Export failed for ${option.title}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="animate-fadeInUp">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
          <Download size={20} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--teal-600)' }} />
          Export Center
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
          {jobMeta?.filename} · {operationLog.length} operations applied
        </p>
      </div>

      {operationLog.length === 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span>⚠️</span>
          <span>
            No cleaning operations have been applied yet. The exported data will be identical to the original.{' '}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => navigate('/studio')}>
              Go to Studio →
            </button>
          </span>
        </div>
      )}

      <div className="export-grid">
        {EXPORT_OPTIONS.map(opt => (
          <div key={opt.id} className="export-card" onClick={() => !downloading && handleExport(opt)} id={`export-${opt.id}-btn`}>
            <div className="export-card-icon">{opt.icon}</div>
            <div className="export-card-title">{opt.title}</div>
            <div className="export-card-desc">{opt.desc}</div>
            <button
              className="btn btn-primary btn-sm"
              disabled={!!downloading}
              style={{ pointerEvents: 'none' }}
            >
              {downloading === opt.id
                ? <><Loader size={14} className="animate-pulse" /> Preparing…</>
                : <><Download size={14} /> Download .{opt.ext}</>
              }
            </button>
          </div>
        ))}
      </div>

      {/* Operation summary */}
      {operationLog.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">What's included in the export</span>
          </div>
          <div className="card-body">
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              <span>✅</span>
              <span>The exported files contain your actual cleaned data after {operationLog.length} operation(s).</span>
            </div>
            <div className="log-list">
              {operationLog.map((e, i) => (
                <div key={i} className="log-entry">
                  <div className="log-entry-num">{i + 1}</div>
                  <div className="log-entry-body">
                    <div className="log-entry-op">
                      {e.op?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div className="log-entry-meta">{e.rows_affected} rows affected</div>
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
