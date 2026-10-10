import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJob } from '../contexts/JobContext';
import {
  applyOperation, previewOperation, batchApplyOperations, undoOperation, getLog,
  exportFile, getProfile
} from '../services/api';
import ExcelSpreadsheet from '../components/ExcelSpreadsheet';
import { ScoreRing } from '../components/ScoreRing';
import toast from 'react-hot-toast';
import {
  Scissors, RotateCcw, CheckSquare, Eye, ChevronDown, ChevronUp,
  Trash2, Type, Calendar, Hash, AlertTriangle, RotateCw, Filter,
  Layers, Search, CheckCircle, CheckCircle2, ArrowRight, X, Sparkles,
  Download, FileSpreadsheet, FileText, Lightbulb, Check
} from 'lucide-react';

const ISSUE_MAP = {
  exact_duplicates: {
    icon: '🗑️',
    op: 'remove_exact_duplicates',
    params: {},
    actionLabel: 'Remove Duplicates',
    category: 'Duplicates',
  },
  potential_duplicates: {
    icon: '🔍',
    op: 'fuzzy_deduplicate',
    params: { threshold: 0.85 },
    actionLabel: 'Fuzzy Deduplicate',
    category: 'Duplicates',
  },
  whitespace: {
    icon: '✂️',
    op: 'trim_whitespace',
    params: {},
    actionLabel: 'Trim Spaces',
    category: 'Formatting',
  },
  inconsistent_case: {
    icon: '🔡',
    op: 'normalize_case',
    params: { mode: 'title' },
    actionLabel: 'Title Case',
    category: 'Text & Case',
  },
  date_formats: {
    icon: '📅',
    op: 'standardize_dates',
    params: { format: '%Y-%m-%d' },
    actionLabel: 'Fix Dates (ISO)',
    category: 'Dates',
  },
  ambiguous_dates: {
    icon: '📆',
    op: 'standardize_dates',
    params: { format: '%Y-%m-%d', ambiguous_preference: 'DMY' },
    actionLabel: 'Resolve Dates',
    category: 'Dates',
  },
  missing_values: {
    icon: '🔢',
    op: 'fill_missing',
    params: { method: 'median' },
    actionLabel: 'Fill Missing (Median)',
    category: 'Missing',
  },
  numeric_as_text: {
    icon: '#️⃣',
    op: 'convert_numeric',
    params: {},
    actionLabel: 'Convert to Numbers',
    category: 'Numeric',
  },
  email_issues: {
    icon: '📧',
    op: 'normalize_email',
    params: { remove_invalid: true },
    actionLabel: 'Normalize & Fix Emails',
    category: 'Text & Case',
  },
  constant_columns: {
    icon: '📉',
    op: 'remove_empty_columns',
    params: {},
    actionLabel: 'Remove Constant Cols',
    category: 'Structure',
  },
};

const ALL_QUICK_PIPELINE = [
  { label: 'Remove Empty Rows', icon: '📭', op: 'remove_empty_rows', params: {}, desc: 'Delete rows where every column cell is blank' },
  { label: 'Remove Empty Columns', icon: '📉', op: 'remove_empty_columns', params: {}, desc: 'Delete columns that are completely devoid of values' },
  { label: 'Remove Exact Duplicates', icon: '🗑️', op: 'remove_exact_duplicates', params: {}, desc: 'Delete rows that are identical duplicates' },
  { label: 'Trim Whitespace', icon: '✂️', op: 'trim_whitespace', params: {}, desc: 'Remove leading and trailing spaces from all text columns' },
  { label: 'Normalize Text', icon: '🧹', op: 'normalize_text', params: {}, desc: 'Collapse multiple internal spaces into single spaces' },
  { label: 'Normalize Emails', icon: '📧', op: 'normalize_email', params: {}, desc: 'Lowercase and trim all email addresses' },
  { label: 'Standardize Dates (ISO)', icon: '📅', op: 'standardize_dates', params: { format: '%Y-%m-%d' }, desc: 'Convert all date formats to standard YYYY-MM-DD' },
  { label: 'Convert to Numeric', icon: '#️⃣', op: 'convert_numeric', params: {}, desc: 'Cast numeric strings into true numeric numbers' },
  { label: 'Fill Missing (Median)', icon: '🔢', op: 'fill_missing', params: { method: 'median' }, desc: 'Impute missing numeric values with column median' },
  { label: 'Fill Missing (Mode)', icon: '📊', op: 'fill_missing', params: { method: 'mode' }, desc: 'Impute missing values with most frequent value' },
];

const QUICK_OPS = [
  { label: 'Trim Whitespace', icon: '✂️', op: 'trim_whitespace', desc: 'Remove leading and trailing spaces from all text columns', category: 'text', params: {} },
  { label: 'Normalize Text', icon: '🧹', op: 'normalize_text', desc: 'Collapse multiple internal spaces into single spaces', category: 'text', params: {} },
  { label: 'Title Case Text', icon: '🔡', op: 'normalize_case', desc: 'Capitalize the first letter of each word', category: 'text', params: { mode: 'title' } },
  { label: 'Lowercase Text', icon: '⬇️', op: 'normalize_case', desc: 'Convert all text to uniform lowercase', category: 'text', params: { mode: 'lower' } },
  { label: 'Normalize Emails', icon: '📧', op: 'normalize_email', desc: 'Lowercase and trim all email addresses', category: 'text', params: {} },
  { label: 'Remove Exact Duplicates', icon: '🗑️', op: 'remove_exact_duplicates', desc: 'Delete rows that are identical duplicates', category: 'dupes', params: {} },
  { label: 'Fuzzy Deduplicate', icon: '🔍', op: 'fuzzy_deduplicate', desc: 'Remove near-duplicate rows with 85%+ similarity', category: 'dupes', params: { threshold: 0.85 } },
  { label: 'Standardize Dates (ISO)', icon: '📅', op: 'standardize_dates', desc: 'Convert all date formats to standard YYYY-MM-DD', category: 'dates', params: { format: '%Y-%m-%d' } },
  { label: 'Ambiguous Dates (DMY)', icon: '📆', op: 'standardize_dates', desc: 'Resolve ambiguous dates as Day/Month/Year (04/05 -> May 4)', category: 'dates', params: { format: '%Y-%m-%d', ambiguous_preference: 'DMY' } },
  { label: 'Ambiguous Dates (MDY)', icon: '🗓️', op: 'standardize_dates', desc: 'Resolve ambiguous dates as Month/Day/Year (04/05 -> Apr 5)', category: 'dates', params: { format: '%Y-%m-%d', ambiguous_preference: 'MDY' } },
  { label: 'Fill Missing (Median)', icon: '🔢', op: 'fill_missing', desc: 'Impute missing numeric values with column median', category: 'missing', params: { method: 'median' } },
  { label: 'Fill Missing (Mode)', icon: '📊', op: 'fill_missing', desc: 'Impute missing values with most frequent value', category: 'missing', params: { method: 'mode' } },
  { label: 'Remove Empty Rows', icon: '📭', op: 'remove_empty_rows', desc: 'Delete rows where every column cell is blank', category: 'structure', params: {} },
  { label: 'Remove Empty Columns', icon: '📉', op: 'remove_empty_columns', desc: 'Delete columns that are completely devoid of values', category: 'structure', params: {} },
  { label: 'Convert to Numeric', icon: '#️⃣', op: 'convert_numeric', desc: 'Cast numeric strings into true numeric numbers', category: 'numeric', params: {} },
];

const CATEGORIES = [
  { id: 'all', label: 'All (15)' },
  { id: 'dupes', label: 'Duplicates' },
  { id: 'text', label: 'Text & Case' },
  { id: 'dates', label: 'Dates' },
  { id: 'missing', label: 'Missing' },
  { id: 'structure', label: 'Structure' },
];

function BatchPreviewModal({ operations, onConfirm, onCancel, running }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '94vw' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title" style={{ fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡</span>
            <span>Run All Quick Operations (1-Click Auto Clean)</span>
          </span>
          <button className="btn btn-ghost btn-xs" onClick={onCancel} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div className="card-body" style={{ overflow: 'auto', maxHeight: '60vh', padding: 20 }}>
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <strong>1-Click Multi-Step Pipeline:</strong> The following <strong>{operations.length}</strong> quick cleaning transformations will be applied in sequence to your active dataset. Every step is recorded in the Transformation Ledger and is completely reversible.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {operations.map((op, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: '#845162', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: '1.15rem', flexShrink: 0 }}>{op.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>{op.label}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{op.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={running}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={onConfirm}
            disabled={running}
            id="confirm-batch-run-btn"
            style={{
              background: 'linear-gradient(135deg, #845162 0%, #a25c74 100%)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {running ? (
              <>
                <RotateCw size={14} className="animate-spin" />
                <span>Running All Operations…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Execute All {operations.length} Operations</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ preview, onApply, onCancel, opLabel }) {
  if (!preview) return null;
  const { rows_affected, sample_changes, warnings } = preview;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, width: '94vw' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title" style={{ fontSize: '0.96rem' }}>
            <Eye size={16} style={{ color: 'var(--color-primary)' }} />
            <span>Operation Preview: <strong>{opLabel}</strong></span>
          </span>
          <button className="btn btn-ghost btn-xs" onClick={onCancel} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div className="card-body" style={{ overflow: 'auto', maxHeight: '60vh', padding: 20 }}>
          <div className="alert alert-info" style={{ marginBottom: 14 }}>
            This operation will transform <strong>{rows_affected.toLocaleString()}</strong> rows/cells in your working copy.
          </div>

          {warnings?.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 14 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <div>{warnings.join(' ')}</div>
            </div>
          )}

          {sample_changes?.length > 0 ? (
            <div>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Sample Cell Transformations:
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: '.8rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Column</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#dc2626' }}>Before</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sample_changes.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: '#334155' }}>{c.column || c.note}</td>
                        <td style={{ padding: '7px 12px', fontFamily: 'JetBrains Mono, monospace', color: '#dc2626' }}>
                          <span className="log-entry-diff-before">{c.before || '""'}</span>
                        </td>
                        <td style={{ padding: '7px 12px', fontFamily: 'JetBrains Mono, monospace', color: '#059669' }}>
                          <span className="log-entry-diff-after">{c.after || '""'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 16, color: '#64748b', fontSize: '0.84rem' }}>
              No cell data differences detected for the selected sample.
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#f8fafc' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={onApply} id="confirm-apply-btn">
            <CheckSquare size={14} /> Apply Transformation
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Studio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, jobMeta, score, setScore, profile, setProfile, operationLog, setOperationLog } = useJob();
  const [tableKey, setTableKey] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewLabel, setPreviewLabel] = useState('');
  const [pendingOp, setPendingOp] = useState(null);
  const [applying, setApplying] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [logExpanded, setLogExpanded] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load profile when visiting Studio if not yet populated
  useEffect(() => {
    if (jobId && !profile) {
      getProfile(jobId)
        .then(res => {
          if (res.data) {
            setProfile(res.data);
            if (res.data.score) setScore(res.data.score);
          }
        })
        .catch(err => console.error('Error fetching profile in Studio:', err));
    }
  }, [jobId, profile, setProfile, setScore]);

  // Derive intelligent cleaning suggestions directly from active dataset profile issues
  const activeSuggestions = useMemo(() => {
    if (!profile?.issues || !Array.isArray(profile.issues)) return [];
    return profile.issues
      .filter(issue => ISSUE_MAP[issue.id])
      .map(issue => {
        const meta = ISSUE_MAP[issue.id];
        return {
          id: issue.id,
          title: issue.title,
          count: issue.count,
          description: issue.description,
          severity: issue.severity || 'medium',
          icon: meta.icon,
          op: meta.op,
          params: meta.params,
          actionLabel: meta.actionLabel,
          category: meta.category,
        };
      });
  }, [profile?.issues]);

  const handleRunAll = async (showModalFirst = false) => {
    if (showModalFirst) {
      setShowBatchModal(true);
      return;
    }
    setShowBatchModal(false);
    setBatchRunning(true);
    const toastId = toast.loading('Executing all quick cleaning operations in sequence...');
    try {
      const { data } = await batchApplyOperations(jobId, ALL_QUICK_PIPELINE);
      if (data.ok) {
        if (data.log_entries?.length > 0) {
          setOperationLog(prev => [...prev, ...data.log_entries]);
        }
        if (data.score) setScore(data.score);
        if (data.profile) setProfile(data.profile);
        setTableKey(k => k + 1);
        toast.success(
          `🎉 All ${data.applied_count} operations completed! Total ${data.total_rows_affected} cells cleaned. Score is now ${data.score?.score || 95} (${data.score?.grade || 'A'})`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(data.error || 'Batch operations failed.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to execute all operations.', { id: toastId });
    } finally {
      setBatchRunning(false);
    }
  };

  const handleApplySuggestion = async (sugg) => {
    setApplying(sugg.actionLabel);
    const toastId = toast.loading(`Applying: ${sugg.actionLabel}...`);
    try {
      const { data } = await applyOperation(jobId, { op: sugg.op, params: sugg.params });
      if (data.ok) {
        setOperationLog(prev => [...prev, data.log_entry]);
        if (data.score) setScore(data.score);
        if (data.profile) setProfile(data.profile);
        setTableKey(k => k + 1);
        toast.success(`Fixed! ${sugg.actionLabel} (${data.log_entry.rows_affected} cells updated)`, { id: toastId });
      } else {
        toast.error(data.error || 'Failed to apply fix.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to apply fix.', { id: toastId });
    } finally {
      setApplying(null);
    }
  };

  const handleApplyAllSuggestions = async () => {
    if (activeSuggestions.length === 0) return;
    const pipeline = activeSuggestions.map(s => ({
      op: s.op,
      params: s.params,
      label: s.actionLabel,
      icon: s.icon,
      desc: s.description,
    }));
    setBatchRunning(true);
    const toastId = toast.loading(`Applying ${pipeline.length} suggested fixes...`);
    try {
      const { data } = await batchApplyOperations(jobId, pipeline);
      if (data.ok) {
        if (data.log_entries?.length > 0) {
          setOperationLog(prev => [...prev, ...data.log_entries]);
        }
        if (data.score) setScore(data.score);
        if (data.profile) setProfile(data.profile);
        setTableKey(k => k + 1);
        toast.success(
          `🎉 Successfully applied all ${data.applied_count} suggested fixes! Data health score improved.`,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(data.error || 'Failed to apply suggestions.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to apply suggestions.', { id: toastId });
    } finally {
      setBatchRunning(false);
    }
  };

  const handleDownload = async (format) => {
    if (!jobId || downloadingFormat) return;
    setDownloadingFormat(format);
    const formatNames = { xlsx: 'Excel (.xlsx)', csv: 'CSV (.csv)', report: 'HTML Audit Report' };
    const toastId = toast.loading(`Preparing ${formatNames[format] || format} download...`);
    try {
      const { data, headers } = await exportFile(jobId, format);
      const blob = new Blob([data], { type: headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = headers['content-disposition'];
      const match = cd && cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const baseName = (jobMeta?.filename || 'dataset').replace(/\.[^/.]+$/, '');
      const ext = format === 'report' ? 'html' : format;
      a.download = match ? match[1].replace(/['"]/g, '') : `cleaned_${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`🎉 Downloaded ${a.download}`, { id: toastId, duration: 4500 });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || `Export failed for ${format}.`, { id: toastId });
    } finally {
      setDownloadingFormat(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('auto') === 'true' && jobId) {
      handleRunAll(false);
    }
  }, [location.search, jobId]);

  if (!jobId) return (
    <div className="empty-state">
      <div className="empty-state-icon">🧹</div>
      <div className="empty-state-title">No dataset loaded</div>
      <div className="empty-state-desc" style={{ marginBottom: 16 }}>
        Upload a file or launch a demo dataset to start cleaning data in the interactive Studio.
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/upload')}>
        Upload File
      </button>
    </div>
  );

  const filteredOps = useMemo(() => {
    return QUICK_OPS.filter(op => {
      const matchCat = selectedCategory === 'all' || op.category === selectedCategory;
      const matchSearch = op.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          op.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handlePreview = async (op, params, label) => {
    setApplying(label);
    try {
      const { data } = await previewOperation(jobId, { op, params });
      if (data.ok) {
        setPreview(data);
        setPreviewLabel(label);
        setPendingOp({ op, params });
      } else {
        toast.error(data.error || 'Preview failed.');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Preview failed.');
    } finally {
      setApplying(null);
    }
  };

  const handleApply = async () => {
    if (!pendingOp) return;
    setApplying(previewLabel);
    setPreview(null);
    try {
      const { data } = await applyOperation(jobId, pendingOp);
      if (data.ok) {
        setOperationLog(prev => [...prev, data.log_entry]);
        if (data.score) setScore(data.score);
        if (data.profile) setProfile(data.profile);
        setTableKey(k => k + 1);
        toast.success(`Applied: ${previewLabel} (${data.log_entry.rows_affected} rows affected)`);
      } else {
        toast.error(data.error || 'Apply failed.');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Apply failed.');
    } finally {
      setApplying(null);
      setPendingOp(null);
    }
  };

  const handleUndo = async () => {
    setUndoing(true);
    try {
      const { data } = await undoOperation(jobId);
      if (data.ok) {
        setOperationLog(prev => prev.slice(0, -1));
        if (data.score) setScore(data.score);
        if (data.profile) setProfile(data.profile);
        setTableKey(k => k + 1);
        toast.success(`Undone: ${data.undone_operation?.op?.replace(/_/g, ' ') || 'operation'}`);
      } else {
        toast.error(data.error || 'Nothing to undo.');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Undo failed.');
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="animate-fadeInUp">
      {preview && (
        <PreviewModal
          preview={preview}
          opLabel={previewLabel}
          onApply={handleApply}
          onCancel={() => { setPreview(null); setPendingOp(null); }}
        />
      )}

      {showBatchModal && (
        <BatchPreviewModal
          operations={ALL_QUICK_PIPELINE}
          onConfirm={() => handleRunAll(false)}
          onCancel={() => setShowBatchModal(false)}
          running={batchRunning}
        />
      )}

      {/* ── 1. Studio Header ── */}
      <div className="page-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧹 Cleaning Studio
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '.875rem' }}>
            {jobMeta?.filename || 'dataset'} · {jobMeta?.row_count?.toLocaleString()} rows · {jobMeta?.col_count} columns · {operationLog.length} changes applied
          </p>
        </div>

        <div className="page-header-actions">
          {score && <ScoreRing score={score.score} grade={score.grade} size={56} />}

          {/* Prominent Header 1-Click Clean All Button */}
          <button
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #845162 0%, #b85d75 100%)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(132, 81, 98, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              padding: '0 14px',
            }}
            onClick={() => handleRunAll(false)}
            disabled={batchRunning || Boolean(applying)}
            id="run-all-quick-ops-header-btn"
            title="Execute all quick cleaning operations in sequence with one click"
          >
            {batchRunning ? <RotateCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{batchRunning ? 'Cleaning All…' : '⚡ Run All Quick Operations'}</span>
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleUndo}
            disabled={undoing || operationLog.length === 0}
            id="undo-btn"
            title="Undo the last applied cleaning operation"
          >
            <RotateCcw size={14} />
            {undoing ? 'Undoing…' : `Undo ${operationLog.length > 0 ? `(${operationLog.length})` : ''}`}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/compare')}>
            View Results →
          </button>
        </div>
      </div>

      {/* ── 2. Grid Layout: Left Ops Hub + Right Live Excel View & Log ── */}
      <div className="studio-layout-grid">
        {/* Left: Quick Operations Panel */}
        <div className="studio-ops-panel">
          <div className="studio-ops-header">
            <div className="studio-ops-title-row">
              <span className="studio-ops-title">
                ⚡ Quick Operations
              </span>
              <span className="studio-ops-count">
                {filteredOps.length} ready
              </span>
            </div>

            {/* ── 1-Click Clean All Quick Operations Card ── */}
            <div className="studio-batch-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                  <span>🚀</span>
                  <span>1-Click Auto Clean</span>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  10-in-1 Pipeline
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
                Execute all 10 essential data-cleaning transformations in sequence with a single button.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="studio-batch-btn"
                  onClick={() => handleRunAll(false)}
                  disabled={batchRunning || Boolean(applying)}
                  id="quick-clean-all-btn"
                  style={{ flex: 1 }}
                >
                  {batchRunning ? (
                    <>
                      <RotateCw size={14} className="animate-spin" />
                      <span>Cleaning All…</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Run All Operations Now</span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowBatchModal(true)}
                  disabled={batchRunning || Boolean(applying)}
                  title="Preview the complete list of operations before running"
                  style={{ height: 38, minHeight: 38, padding: '0 12px' }}
                  id="preview-all-ops-btn"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="studio-ops-search">
              <input
                className="input"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                placeholder="Search operations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Tabs */}
            <div className="studio-category-tabs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`studio-cat-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Ops List */}
          <div className="studio-ops-list">
            {filteredOps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.82rem' }}>
                No operations match "{searchQuery}".
              </div>
            ) : (
              filteredOps.map(({ label, icon, op, desc, params }) => (
                <button
                  key={label}
                  className="studio-op-card"
                  onClick={() => handlePreview(op, params, label)}
                  disabled={applying === label}
                  title={desc}
                  id={`op-${op.replace(/_/g, '-')}`}
                >
                  <span className="studio-op-icon">{icon}</span>
                  <div className="studio-op-content">
                    <div className="studio-op-label">
                      <span>{applying === label ? 'Processing…' : label}</span>
                      <Eye size={13} style={{ color: '#94a3b8' }} />
                    </div>
                    <div className="studio-op-desc">{desc}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Live Microsoft Excel Spreadsheet + Transformation Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {/* ── 1. Smart Cleaning Suggestions (While Cleaning) ── */}
          <div className="studio-suggestions-card" id="studio-suggestions-section">
            <div
              className="studio-suggestions-header"
              onClick={() => setSuggestionsExpanded(prev => !prev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: activeSuggestions.length > 0 ? '#fef3c7' : '#ecfdf5',
                  color: activeSuggestions.length > 0 ? '#b45309' : '#059669',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0
                }}>
                  {activeSuggestions.length > 0 ? <Lightbulb size={17} /> : <CheckCircle2 size={17} />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Cleaning Suggestions</span>
                    {activeSuggestions.length > 0 ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                        {activeSuggestions.length} recommended
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                        All Clean & Optimal
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {activeSuggestions.length > 0
                      ? 'Live actionable improvements identified from active dataset diagnostics'
                      : 'No quality issues detected! Your dataset passes all automated cleaning rules'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeSuggestions.length > 0 && (
                  <button
                    className="btn btn-primary btn-xs"
                    style={{
                      background: 'linear-gradient(135deg, #845162 0%, #b85d75 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '5px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(132, 81, 98, 0.25)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyAllSuggestions();
                    }}
                    disabled={batchRunning || Boolean(applying)}
                    title="Apply all recommended suggestions in one click"
                    id="apply-all-suggestions-btn"
                  >
                    {batchRunning ? <RotateCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>Fix All ({activeSuggestions.length})</span>
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-xs"
                  style={{ padding: 4 }}
                  title={suggestionsExpanded ? 'Collapse suggestions' : 'Expand suggestions'}
                >
                  {suggestionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {suggestionsExpanded && (
              <>
                {activeSuggestions.length > 0 ? (
                  <div className="studio-suggestions-list">
                    {activeSuggestions.map((sugg) => (
                      <div key={sugg.id} className={`studio-suggestion-item severity-${sugg.severity}`}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{sugg.icon}</span>
                              <span>{sugg.title}</span>
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: sugg.severity === 'high' ? '#fee2e2' : sugg.severity === 'medium' ? '#fef3c7' : '#e0f2fe',
                              color: sugg.severity === 'high' ? '#dc2626' : sugg.severity === 'medium' ? '#d97706' : '#0284c7'
                            }}>
                              {sugg.count ? `${sugg.count} ${sugg.count === 1 ? 'issue' : 'issues'}` : sugg.severity}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
                            {sugg.description}
                          </p>
                        </div>

                        <div className="studio-suggestion-actions">
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                            onClick={() => handlePreview(sugg.op, sugg.params, sugg.actionLabel)}
                            disabled={Boolean(applying) || batchRunning}
                            title="Preview sample changes before applying"
                          >
                            <Eye size={12} /> Preview
                          </button>
                          <button
                            className="btn btn-primary btn-xs"
                            style={{
                              fontSize: '0.72rem',
                              padding: '4px 11px',
                              fontWeight: 700,
                              marginLeft: 'auto',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                            onClick={() => handleApplySuggestion(sugg)}
                            disabled={applying === sugg.actionLabel || batchRunning}
                            id={`fix-suggestion-${sugg.id}`}
                          >
                            {applying === sugg.actionLabel ? (
                              <>
                                <RotateCw size={11} className="animate-spin" />
                                <span>Fixing…</span>
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                <span>Fix Now</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#ecfdf5', color: '#059669',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0
                    }}>
                      ✨
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#065f46' }}>
                        Dataset In Peak Condition!
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#047857' }}>
                        No duplicates, empty records, whitespace anomalies, or formatting issues found. You can download the cleaned file directly below.
                      </div>
                    </div>
                    <div style={{
                      background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857',
                      fontWeight: 700, fontSize: '0.74rem', padding: '4px 10px', borderRadius: 99
                    }}>
                      Score: {score?.score || 100}% ({score?.grade || 'A+'})
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── 2. Live Microsoft Excel Spreadsheet ── */}
          <ExcelSpreadsheet
            jobId={jobId}
            refreshKey={tableKey}
            onUndoComplete={(res) => {
              setOperationLog(prev => prev.slice(0, -1));
              if (res.score) setScore(res.score);
              if (res.profile) setProfile(res.profile);
              setTableKey(k => k + 1);
            }}
            maxHeight="520px"
            highlightIssuesDefault={true}
          />

          {/* ── 3. Cleaned Dataset Download Bar (Below Spreadsheet) ── */}
          <div className="studio-download-bar" id="cleaned-file-download-section">
            <div className="studio-download-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: operationLog.length > 0 ? '#ecfdf5' : '#f0fdf4',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: 99,
                  padding: '2px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)'
                  }} />
                  {operationLog.length > 0 ? 'CLEANED DATASET READY' : 'DATASET READY FOR DOWNLOAD'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                  {jobMeta?.filename || 'dataset'}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>
                  <strong>{operationLog.length}</strong> transformation{operationLog.length === 1 ? '' : 's'} applied
                </span>
                <span>•</span>
                <span>
                  <strong>{jobMeta?.row_count?.toLocaleString()}</strong> rows × <strong>{jobMeta?.col_count}</strong> columns
                </span>
                {score && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#845162', fontWeight: 700 }}>
                      Health Score: {score.score}/100 ({score.grade})
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="studio-download-actions">
              <button
                className="download-btn-excel"
                onClick={() => handleDownload('xlsx')}
                disabled={Boolean(downloadingFormat)}
                id="download-cleaned-excel-btn"
                title="Download cleaned dataset as formatted Microsoft Excel (.xlsx)"
              >
                {downloadingFormat === 'xlsx' ? (
                  <RotateCw size={15} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                <span>{downloadingFormat === 'xlsx' ? 'Exporting…' : 'Download Excel (.xlsx)'}</span>
              </button>

              <button
                className="download-btn-csv"
                onClick={() => handleDownload('csv')}
                disabled={Boolean(downloadingFormat)}
                id="download-cleaned-csv-btn"
                title="Download cleaned dataset as UTF-8 CSV (.csv)"
              >
                {downloadingFormat === 'csv' ? (
                  <RotateCw size={15} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}
                <span>{downloadingFormat === 'csv' ? 'Exporting…' : 'Download CSV (.csv)'}</span>
              </button>

              <button
                className="download-btn-report"
                onClick={() => handleDownload('report')}
                disabled={Boolean(downloadingFormat)}
                id="download-cleaning-report-btn"
                title="Download complete HTML audit cleaning report with metrics and operation ledger"
              >
                {downloadingFormat === 'report' ? (
                  <RotateCw size={15} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>{downloadingFormat === 'report' ? 'Generating…' : 'Audit Report (.html)'}</span>
              </button>
            </div>
          </div>

          {/* Transformation Ledger / Audit Log */}
          <div className="card">
            <div
              className="card-header"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setLogExpanded(e => !e)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="card-title">
                  📋 Transformation Ledger ({operationLog.length})
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {operationLog.length === 0 ? 'No changes applied yet' : 'Immutable audit trail'}
                </span>
              </div>
              {logExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {logExpanded && (
              <div className="card-body">
                {operationLog.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 18px' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📋</div>
                    <div className="empty-state-title" style={{ fontSize: '1rem' }}>No transformations applied yet</div>
                    <div className="empty-state-desc" style={{ fontSize: '0.82rem' }}>
                      Click any operation on the left panel to preview and apply it to your dataset.
                    </div>
                  </div>
                ) : (
                  <div className="log-list">
                    {[...operationLog].reverse().map((entry, i) => (
                      <div key={i} className="log-entry">
                        <div className="log-entry-left">
                          <div className="log-entry-num">#{operationLog.length - i}</div>
                          <div className="log-entry-body">
                            <div className="log-entry-op">
                              {entry.op?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </div>
                            <div className="log-entry-meta">
                              {entry.rows_affected} rows affected
                              {entry.columns?.length > 0 && ` · Columns: ${entry.columns.join(', ')}`}
                            </div>
                            {entry.examples?.slice(0, 2).map((ex, ei) => (
                              <div key={ei} className="log-entry-diff">
                                <span className="log-entry-diff-before">"{ex.before}"</span>
                                <span style={{ color: '#94a3b8' }}>→</span>
                                <span className="log-entry-diff-after">"{ex.after}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="log-entry-ts">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
