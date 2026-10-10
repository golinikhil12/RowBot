import React from 'react';
import { useNavigate } from 'react-router-dom';
import UploadZone from '../components/UploadZone';

export default function Upload() {
  return (
    <div className="animate-fadeInUp" style={{ maxWidth: 740, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>Upload Your Data</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
          Accepted formats: CSV, Excel (.xlsx, .xls) · Maximum size: 55 MB
        </p>
      </div>
      <div style={{ width: '100%', margin: '0 auto' }}>
        <UploadZone />
      </div>
      <div style={{ marginTop: 32, padding: 24, background: 'var(--surface-0)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', width: '100%', boxSizing: 'border-box' }}>
        <h3 style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: 12 }}>Tips for best results</h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20 }}>
          {[
            'Make sure your file has column headers in the first row.',
            'For Excel files with multiple sheets, you\'ll be asked to select one.',
            'Maximum file size is 55 MB. Large files may take a few seconds to process.',
            'Don\'t have a file? Download our sample messy dataset to explore RowBot.',
          ].map((tip, i) => (
            <li key={i} style={{ fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
