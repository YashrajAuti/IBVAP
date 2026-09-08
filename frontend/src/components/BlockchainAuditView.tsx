import React, { useState } from 'react';
import { Lock, CheckCircle2, XCircle } from 'lucide-react';

export const BlockchainAuditView: React.FC = () => {
  const [inputHash, setInputHash] = useState<string>('8F91A6C4E7B3D029A8C1F9D92A');
  const [verificationResult, setVerificationResult] = useState<'MATCH' | 'MISMATCH' | null>('MATCH');

  const blocks = [
    { block: '#1027', eventId: 'EVT-2026-00127', time: '23:42:18', hash: '8F91A6C4E7B3D029A8C1F9D92A', prevHash: '7A21D9B4F8E2...C019', status: 'VERIFIED' },
    { block: '#1026', eventId: 'EVT-2026-00126', time: '23:41:02', hash: '91A8C2E4F901B37D2A91D0E14B', prevHash: '62B7F1D0E9A4...E820', status: 'VERIFIED' },
    { block: '#1025', eventId: 'EVT-2026-00125', time: '23:38:15', hash: 'A4C91E02F7B8C3D4E5F6A7B8C9', prevHash: '51E0D9C8B7A6...D5C4', status: 'VERIFIED' },
    { block: '#1024', eventId: 'EVT-2026-00124', time: '23:35:40', hash: '1A2B3C4D5E6F7A8B9C0D1E2F3A', prevHash: '40D9C8B7A6F5...C4B3', status: 'VERIFIED' },
    { block: '#1023', eventId: 'EVT-2026-00123', time: '23:30:12', hash: 'F8E7D6C5B4A3F2E1D0C9B8A7F6', prevHash: '39C8B7A6F5E4...B3A2', status: 'VERIFIED' },
  ];

  const handleVerify = () => {
    if (inputHash.trim() === '8F91A6C4E7B3D029A8C1F9D92A') {
      setVerificationResult('MATCH');
    } else {
      setVerificationResult('MISMATCH');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock style={{ color: 'var(--accent-emerald)', width: '20px', height: '20px' }} />
            BLOCKCHAIN EVIDENCE AUDIT LEDGER
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Permissioned Cryptographic Tamper-Proof Chain of Custody for Evidence Logs
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge badge-emerald" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
            ● SYNCHRONIZED
          </span>
          <span className="badge badge-info" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
            NETWORK: PERMISSIONED
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LATEST BLOCK</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>#1027</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL AUDIT RECORDS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>1,284</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VERIFIED EVIDENCE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>1,281</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INTEGRITY EXCEPTIONS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>03</div>
        </div>
      </div>

      {/* Verification Tool & Ledger Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', flex: 1 }}>
        {/* Verification Panel */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            SHA-256 Verification Tool
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Enter a digital evidence hash to verify its integrity against the permissioned blockchain ledger.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evidence SHA-256 Hash:</label>
            <input
              type="text"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleVerify}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--accent-cyan)',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Verify Hash Integrity
            </button>
            <button
              onClick={() => { setInputHash('99999999999999999999999999'); handleVerify(); }}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Test Mismatch
            </button>
          </div>

          {/* Verification Result */}
          {verificationResult === 'MATCH' && (
            <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-emerald)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.82rem' }}>
                <CheckCircle2 style={{ width: '16px', height: '16px' }} /> HASH MATCH CONFIRMED
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                ✓ BLOCKCHAIN RECORD VERIFIED<br />
                ✓ EVIDENCE INTEGRITY CONFIRMED (UNALTERED)
              </div>
            </div>
          )}

          {verificationResult === 'MISMATCH' && (
            <div style={{ padding: '12px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid #f43f5e', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f43f5e', fontWeight: 700, fontSize: '0.82rem' }}>
                <XCircle style={{ width: '16px', height: '16px' }} /> HASH MISMATCH DETECTED
              </div>
              <div style={{ fontSize: '0.72rem', color: '#f43f5e' }}>
                ⚠ POSSIBLE EVIDENCE TAMPERING!<br />
                The current file hash does not match block #1027 ledger record.
              </div>
            </div>
          )}
        </div>

        {/* Ledger Table */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Permissioned Ledger Blocks
          </h3>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>BLOCK</th>
                  <th style={{ padding: '8px' }}>EVENT ID</th>
                  <th style={{ padding: '8px' }}>TIMESTAMP</th>
                  <th style={{ padding: '8px' }}>EVIDENCE HASH</th>
                  <th style={{ padding: '8px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>{b.block}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{b.eventId}</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{b.time}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>{b.hash.substring(0, 16)}...</td>
                    <td style={{ padding: '8px' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
