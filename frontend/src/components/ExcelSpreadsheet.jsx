import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getData, getOriginalData, undoOperation, getComparison } from '../services/api';
import {
  Search, RotateCcw, Download, Eye, EyeOff, ZoomIn, ZoomOut,
  FileSpreadsheet, AlertTriangle, CheckCircle, ChevronLeft,
  ChevronRight, Filter, RefreshCw, X, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';

/** Helper: Generate Excel column letter (0 -> A, 25 -> Z, 26 -> AA) */
export function getExcelColName(n) {
  let str = '';
  let num = n;
  while (num >= 0) {
    str = String.fromCharCode((num % 26) + 65) + str;
    num = Math.floor(num / 26) - 1;
  }
  return str;
}

export default function ExcelSpreadsheet({
  jobId,
  refreshKey = 0,
  onUndoComplete = null,
  showToolbar = true,
  showComparisonToggle = true,
  initialViewMode = 'working', // 'working' | 'original'
  highlightIssuesDefault = true,
  maxHeight = '540px'
}) {
  const [viewMode, setViewMode] = useState(initialViewMode); // 'working' | 'original'
  const [data, setData] = useState({
    columns: [],
    rows: [],
    total_rows: 0,
    total_pages: 1,
    column_types: {},
    exact_duplicate_row_indices: [],
    potential_duplicate_row_indices: [],
    filename: '',
    file_type: 'csv',
    sheet_name: null
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightIssues, setHighlightIssues] = useState(highlightIssuesDefault);
  const [zoomLevel, setZoomLevel] = useState('default'); // 'compact' | 'default' | 'comfort'
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0, colName: '' });
  const [comparison, setComparison] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Load paginated data
  const loadData = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const fetcher = viewMode === 'original' ? getOriginalData : getData;
      const { data: res } = await fetcher(jobId, page, pageSize);
      setData(res);
      if (res.columns?.length > 0 && !selectedCell.colName) {
        setSelectedCell({ row: 0, col: 0, colName: res.columns[0] });
      }
    } catch (e) {
      console.error('Failed to load spreadsheet data:', e);
      toast.error('Failed to load spreadsheet page.');
    } finally {
      setLoading(false);
    }
  }, [jobId, page, pageSize, viewMode, selectedCell.colName]);

  // Load comparison stats for before/after summary badge
  const loadComparison = useCallback(async () => {
    if (!jobId) return;
    try {
      const { data: comp } = await getComparison(jobId);
      setComparison(comp);
    } catch (e) {
      // Comparison may not be available if uninitialized
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison, refreshKey]);

  // Reset page when switching original/cleaned view
  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    setPage(1);
  };

  // Cell classification helper
  const isMissing = (val) => val === null || val === undefined || String(val).trim() === '';

  const hasWhitespaceIssue = (val) => {
    if (val === null || val === undefined) return false;
    const str = String(val);
    return str.length > 0 && str !== str.trim();
  };

  // Filter rows based on search
  const visibleRows = useMemo(() => {
    if (!search.trim()) return data.rows;
    const q = search.toLowerCase();
    return data.rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data.rows, search]);

  // Get active cell value for the Excel Formula Bar
  const activeCellValue = useMemo(() => {
    if (!visibleRows.length || !data.columns.length) return '';
    const r = visibleRows[selectedCell.row];
    if (!r) return '';
    const val = r[selectedCell.colName || data.columns[selectedCell.col]];
    return val === null || val === undefined ? '' : String(val);
  }, [visibleRows, data.columns, selectedCell]);

  // Active cell diagnostic
  const activeCellDiagnostic = useMemo(() => {
    if (!visibleRows.length || !data.columns.length) return null;
    const r = visibleRows[selectedCell.row];
    if (!r) return null;
    const val = r[selectedCell.colName || data.columns[selectedCell.col]];
    if (isMissing(val)) {
      return { type: 'missing', label: 'Missing Cell', color: '#a16207', bg: '#fef9c3' };
    }
    if (data.exact_duplicate_row_indices?.includes(selectedCell.row)) {
      return { type: 'duplicate', label: 'Exact Duplicate Row', color: '#b91c1c', bg: '#fee2e2' };
    }
    if (data.potential_duplicate_row_indices?.includes(selectedCell.row)) {
      return { type: 'potential', label: 'Near-Duplicate Row', color: '#c2410c', bg: '#ffedd5' };
    }
    if (hasWhitespaceIssue(val)) {
      return { type: 'whitespace', label: 'Whitespace Issue', color: '#7e22ce', bg: '#f3e8ff' };
    }
    return null;
  }, [visibleRows, data.columns, selectedCell, data.exact_duplicate_row_indices, data.potential_duplicate_row_indices]);

  // Handle cell click
  const handleCellClick = (rowIndex, colIndex, colName) => {
    setSelectedCell({ row: rowIndex, col: colIndex, colName });
  };

  // Undo operation
  const handleUndo = async () => {
    if (!jobId || undoing) return;
    setUndoing(true);
    try {
      const { data: res } = await undoOperation(jobId);
      if (res.ok) {
        toast.success(`Undone: ${res.undone_operation?.op?.replace(/_/g, ' ') || 'operation'}`);
        loadData();
        loadComparison();
        if (onUndoComplete) onUndoComplete(res);
      } else {
        toast.error(res.error || 'Nothing to undo.');
      }
    } catch (e) {
      toast.error('Undo failed.');
    } finally {
      setUndoing(false);
    }
  };

  // Download export file
  const handleDownload = async (format) => {
    if (!jobId || downloading) return;
    setDownloading(true);
    try {
      const downloadUrl = `/api/jobs/${jobId}/export?format=${format}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${data.filename || 'dataset'}_cleaned.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading cleaned ${format.toUpperCase()} file...`);
    } catch (e) {
      toast.error('Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const getCellAlignClass = (colName) => {
    const type = data.column_types?.[colName];
    if (type === 'numeric') return 'align-right';
    if (type === 'date') return 'align-center';
    return 'align-left';
  };

  // Real before/after diff summary metrics
  const diffSummary = useMemo(() => {
    if (!comparison?.before || !comparison?.after) return null;
    const rowDiff = comparison.before.row_count - comparison.after.row_count;
    const dupeDiff = comparison.before.duplicates - comparison.after.duplicates;
    const missingDiff = comparison.before.missing - comparison.after.missing;
    const scoreDiff = comparison.after.score - comparison.before.score;
    return {
      rowsRemoved: Math.max(0, rowDiff),
      dupesRemoved: Math.max(0, dupeDiff),
      missingFixed: Math.max(0, missingDiff),
      scoreGain: scoreDiff,
      operations: comparison.operations_applied || 0
    };
  }, [comparison]);

  return (
    <div className={`excel-container zoom-${zoomLevel}`}>
      {/* ── 1. Excel Ribbon Toolbar ── */}
      {showToolbar && (
        <div className="excel-toolbar">
          {/* File & Workbook Metadata */}
          <div className="excel-toolbar-group">
            <div className={`excel-file-badge ${data.file_type === 'excel' ? 'excel' : 'csv'}`}>
              <FileSpreadsheet size={14} />
              <span>{data.filename || 'Spreadsheet'}</span>
              <span style={{ opacity: 0.7, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                ({data.file_type})
              </span>
            </div>

            {data.sheet_name && (
              <span className="excel-stats-pill" title="Active Worksheet">
                📑 {data.sheet_name}
              </span>
            )}

            <span className="excel-stats-pill">
              {data.total_rows.toLocaleString()} rows × {data.columns.length} cols
            </span>

            {/* Change metrics pill */}
            {diffSummary && diffSummary.operations > 0 && viewMode === 'working' && (
              <div className="excel-change-metrics" title="Changes applied to working copy">
                <CheckCircle size={13} />
                <span>
                  {diffSummary.rowsRemoved > 0 && `−${diffSummary.rowsRemoved} rows `}
                  {diffSummary.dupesRemoved > 0 && `· ${diffSummary.dupesRemoved} dupes cleared `}
                  {diffSummary.missingFixed > 0 && `· ${diffSummary.missingFixed} nulls fixed `}
                  {diffSummary.scoreGain > 0 && `· +${diffSummary.scoreGain} pts`}
                </span>
              </div>
            )}
          </div>

          {/* Center: Search & Comparison View Toggle */}
          <div className="excel-toolbar-group">
            {showComparisonToggle && (
              <div className="excel-toggle-group">
                <button
                  type="button"
                  className={`excel-toggle-btn ${viewMode === 'working' ? 'active' : ''}`}
                  onClick={() => handleToggleViewMode('working')}
                  title="Show working dataset with applied cleaning changes"
                >
                  <Eye size={12} /> Cleaned Data
                </button>
                <button
                  type="button"
                  className={`excel-toggle-btn ${viewMode === 'original' ? 'active' : ''}`}
                  onClick={() => handleToggleViewMode('original')}
                  title="Show unchanged initial upload dataset"
                >
                  <EyeOff size={12} /> Original Data
                </button>
              </div>
            )}

            <div className="excel-search-box">
              <Search size={13} className="excel-search-icon" />
              <input
                className="excel-search-input"
                placeholder="Find in page..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="excel-search-clear"
                  onClick={() => setSearch('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Actions, Zoom & Export */}
          <div className="excel-toolbar-group">
            <button
              type="button"
              className={`btn btn-xs ${highlightIssues ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.72rem', height: 26, padding: '0 8px', gap: 4 }}
              onClick={() => setHighlightIssues(!highlightIssues)}
              title="Toggle visual highlights for missing values, duplicates, and format errors"
            >
              <AlertTriangle size={12} />
              <span>Highlights {highlightIssues ? 'ON' : 'OFF'}</span>
            </button>

            {/* Zoom presets */}
            <div style={{ display: 'flex', gap: 2, background: '#e2e8f0', padding: 2, borderRadius: 5 }}>
              <button
                type="button"
                className={`excel-toggle-btn ${zoomLevel === 'compact' ? 'active' : ''}`}
                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                onClick={() => setZoomLevel('compact')}
                title="Compact view (dense grid)"
              >
                85%
              </button>
              <button
                type="button"
                className={`excel-toggle-btn ${zoomLevel === 'default' ? 'active' : ''}`}
                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                onClick={() => setZoomLevel('default')}
                title="Standard 100% view"
              >
                100%
              </button>
              <button
                type="button"
                className={`excel-toggle-btn ${zoomLevel === 'comfort' ? 'active' : ''}`}
                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                onClick={() => setZoomLevel('comfort')}
                title="Comfortable view (larger cells)"
              >
                115%
              </button>
            </div>

            {/* Undo button */}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              style={{ height: 26, padding: '0 8px', fontSize: '0.72rem', gap: 4 }}
              onClick={handleUndo}
              disabled={undoing || viewMode === 'original'}
              title="Undo the last applied data cleaning transformation"
            >
              <RotateCcw size={12} className={undoing ? 'animate-spin' : ''} />
              <span>Undo</span>
            </button>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                style={{ height: 26, padding: '0 8px', fontSize: '0.72rem', gap: 4 }}
                onClick={() => handleDownload('csv')}
                title="Export clean data as CSV file"
              >
                <Download size={11} /> CSV
              </button>
              <button
                type="button"
                className="btn btn-primary btn-xs"
                style={{ height: 26, padding: '0 8px', fontSize: '0.72rem', gap: 4 }}
                onClick={() => handleDownload('excel')}
                title="Export clean data as Microsoft Excel (.xlsx) file"
              >
                <Download size={11} /> Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Microsoft Excel Formula Bar & Cell Inspector ── */}
      <div className="excel-formula-bar">
        {/* Name Box (e.g., B4) */}
        <div className="excel-name-box" title="Active Cell Coordinate">
          {getExcelColName(selectedCell.col)}
          {(page - 1) * pageSize + selectedCell.row + 1}
        </div>

        {/* fx formula symbol */}
        <div className="excel-fx-icon" title="Formula / Cell Value">fx</div>

        {/* Formula Input / Inspector */}
        <input
          className="excel-formula-input"
          value={activeCellValue}
          readOnly
          placeholder="(Select any cell in the sheet to inspect its raw value)"
        />

        {/* Active Cell Quality Diagnostic */}
        {activeCellDiagnostic && highlightIssues && (
          <div
            className="excel-cell-diagnostic"
            style={{
              background: activeCellDiagnostic.bg,
              color: activeCellDiagnostic.color,
              border: `1px solid ${activeCellDiagnostic.color}40`
            }}
          >
            <AlertTriangle size={11} />
            <span>{activeCellDiagnostic.label}</span>
          </div>
        )}
      </div>

      {/* ── 3. Issue Color Legend ── */}
      {highlightIssues && (
        <div className="excel-legend-bar">
          <span style={{ fontWeight: 600, color: '#334155' }}>Issue Legend:</span>
          <div className="excel-legend-item">
            <span className="excel-legend-color missing" />
            <span>Missing Cell</span>
          </div>
          <div className="excel-legend-item">
            <span className="excel-legend-color duplicate" />
            <span>Exact Duplicate Row</span>
          </div>
          <div className="excel-legend-item">
            <span className="excel-legend-color potential" />
            <span>Near-Duplicate Cluster</span>
          </div>
          <div className="excel-legend-item">
            <span className="excel-legend-color format" />
            <span>Whitespace / Format</span>
          </div>
          {search && (
            <div className="excel-legend-item" style={{ marginLeft: 'auto', color: '#065f46' }}>
              <span>Showing {visibleRows.length} matching rows on this page</span>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Main Spreadsheet Grid Viewport ── */}
      <div className="excel-grid-viewport" style={{ maxHeight }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 28, borderRadius: 3 }} />
            ))}
          </div>
        ) : (
          <table className="excel-table">
            <thead>
              {/* Row 1: Excel Column Letters (A, B, C, D...) */}
              <tr className="excel-col-letter-row">
                <th rowSpan={2} className="excel-corner-header" title="Select All Sheet">
                  <div className="excel-corner-content">
                    <div className="excel-corner-triangle" />
                    <span className="excel-corner-label">◢ #</span>
                  </div>
                </th>
                {data.columns.map((colName, colIdx) => (
                  <th
                    key={`letter-${colName}-${colIdx}`}
                    className={`excel-col-letter ${selectedCell.col === colIdx ? 'active-col' : ''}`}
                    title={`Column ${getExcelColName(colIdx)}`}
                  >
                    {getExcelColName(colIdx)}
                  </th>
                ))}
              </tr>

              {/* Row 2: Actual Column Names & Inferred Data Types */}
              <tr className="excel-col-name-row">
                {/* Note: Row 2 has no corner cell because the corner header has rowSpan={2} */}
                {data.columns.map((colName, colIdx) => {
                  const type = data.column_types?.[colName] || 'text';
                  return (
                    <th
                      key={`col-${colName}-${colIdx}`}
                      className="excel-col-name"
                      title={`${colName} (${type})`}
                    >
                      <div className="excel-col-name-content">
                        <span className="excel-col-title-text">{colName}</span>
                        <span className={`excel-col-type-badge ${type}`}>
                          {type === 'numeric' ? '123' : type === 'date' ? '📅' : 'ABC'}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={data.columns.length + 1}
                    style={{ textAlign: 'center', padding: 48, color: '#64748b', background: '#ffffff' }}
                  >
                    {search ? `No cells matched "${search}".` : 'No spreadsheet data available.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, rowIdx) => {
                  const absoluteRowNum = (page - 1) * pageSize + rowIdx + 1;
                  const isExactDupe = data.exact_duplicate_row_indices?.includes(rowIdx);
                  const isPotentialDupe = data.potential_duplicate_row_indices?.includes(rowIdx);

                  // Row-level issue classes
                  let rowIssueClass = '';
                  if (highlightIssues) {
                    if (isExactDupe) rowIssueClass = 'issue-exact-duplicate';
                    else if (isPotentialDupe) rowIssueClass = 'issue-potential-duplicate';
                  }

                  return (
                    <tr key={`row-${rowIdx}`} className={`excel-row ${rowIssueClass}`}>
                      {/* Sticky Row Number (1, 2, 3...) */}
                      <td
                        className={`excel-row-num ${selectedCell.row === rowIdx ? 'active-row' : ''}`}
                        title={`Row ${absoluteRowNum}${isExactDupe ? ' (Exact Duplicate)' : isPotentialDupe ? ' (Near-Duplicate)' : ''}`}
                      >
                        {absoluteRowNum}
                      </td>

                      {/* Spreadsheet Cells */}
                      {data.columns.map((colName, colIdx) => {
                        const val = row[colName];
                        const missing = isMissing(val);
                        const wsIssue = hasWhitespaceIssue(val);
                        const isSelected = selectedCell.row === rowIdx && selectedCell.col === colIdx;

                        // Cell-level highlight class
                        let cellClass = '';
                        if (highlightIssues) {
                          if (missing) cellClass = 'issue-missing';
                          else if (wsIssue) cellClass = 'issue-whitespace';
                        }

                        // Search match highlight
                        const isMatched = search && String(val ?? '').toLowerCase().includes(search.toLowerCase());
                        if (isMatched) cellClass += ' cell-matched';

                        return (
                          <td
                            key={`cell-${rowIdx}-${colName}`}
                            className={`excel-cell ${getCellAlignClass(colName)} ${cellClass} ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleCellClick(rowIdx, colIdx, colName)}
                            title={
                              missing
                                ? `[Missing value] at ${getExcelColName(colIdx)}${absoluteRowNum}`
                                : wsIssue
                                ? `[Whitespace issue: "${val}"] at ${getExcelColName(colIdx)}${absoluteRowNum}`
                                : `${colName}: ${val}`
                            }
                          >
                            {missing ? <em>(empty)</em> : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 5. Excel Status Bar & Pagination Footer ── */}
      <div className="excel-status-bar">
        {/* Sheet Tabs */}
        <div className="excel-sheet-tabs">
          <div className="excel-sheet-tab active">
            <span>{data.sheet_name || 'Sheet1'}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 8 }}>
            Ready · Selected: {getExcelColName(selectedCell.col)}{(page - 1) * pageSize + selectedCell.row + 1}
          </span>
        </div>

        {/* Page navigation controls */}
        {data.total_pages > 1 && (
          <div className="excel-page-nav">
            <span style={{ marginRight: 6 }}>
              Page <strong>{page}</strong> of <strong>{data.total_pages}</strong> ({data.total_rows.toLocaleString()} rows)
            </span>
            <button
              type="button"
              className="excel-page-btn"
              disabled={page === 1}
              onClick={() => setPage(1)}
              title="First Page"
            >
              «
            </button>
            <button
              type="button"
              className="excel-page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              title="Previous Page"
            >
              <ChevronLeft size={12} />
            </button>

            {/* Quick page jumper pills */}
            {[...Array(Math.min(5, data.total_pages))].map((_, i) => {
              const p = Math.max(1, Math.min(page - 2, data.total_pages - 4)) + i;
              return (
                <button
                  key={p}
                  type="button"
                  className={`excel-page-btn ${p === page ? 'active' : ''}`}
                  style={p === page ? { background: '#107c41', color: '#ffffff', borderColor: '#107c41' } : {}}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              className="excel-page-btn"
              disabled={page === data.total_pages}
              onClick={() => setPage(p => p + 1)}
              title="Next Page"
            >
              <ChevronRight size={12} />
            </button>
            <button
              type="button"
              className="excel-page-btn"
              disabled={page === data.total_pages}
              onClick={() => setPage(data.total_pages)}
              title="Last Page"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
