import React, { useState } from 'react';
import { Search, FileText, CheckCircle2 } from 'lucide-react';
import { ANPRRecord } from '../services/api';

interface ANPRTableProps {
  records: ANPRRecord[];
  onSearch: (query: string) => void;
}

export const ANPRTable: React.FC<ANPRTableProps> = ({ records, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch(val);
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText style={{ width: '18px', height: '18px', color: 'var(--accent-violet)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>ANPR License Plate Logs</h3>
        </div>

        <div style={{ position: 'relative', width: '240px' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search plate e.g. MH12..."
            value={searchTerm}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '6px 12px 6px 32px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '8px 12px' }}>Time</th>
              <th style={{ padding: '8px 12px' }}>Camera</th>
              <th style={{ padding: '8px 12px' }}>Track ID</th>
              <th style={{ padding: '8px 12px' }}>Plate Number</th>
              <th style={{ padding: '8px 12px' }}>OCR Confidence</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No ANPR plate logs found.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{new Date(r.timestamp * 1000).toLocaleTimeString()}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.camera_id}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>#{r.track_id}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>{r.plate_number}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                      {(r.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
