import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface IncidentInvestigationViewProps {
  onBackToAlerts?: () => void;
}

export const IncidentInvestigationView: React.FC<IncidentInvestigationViewProps> = ({ onBackToAlerts }) => {
  const [status, setStatus] = useState<'ACTIVE' | 'ACKNOWLEDGED' | 'FALSE_POSITIVE'>('ACTIVE');

  const timelineEvents = [
    { time: '23:41:58', event: 'Person detected', type: 'info' },
    { time: '23:42:03', event: 'Track #42 created', type: 'info' },
    { time: '23:42:09', event: 'Approached restricted zone A', type: 'warning' },
    { time: '23:42:17', event: 'Virtual fence crossed', type: 'critical' },
    { time: '23:42:18', event: 'Evidence captured & SHA-256 hash written to Block #1027', type: 'success' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      {/* Top Header Bar for Incident */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-critical" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
            CRITICAL SEVERITY
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            INCIDENT INVESTIGATION: EVT-2026-00127 (PERIMETER INTRUSION)
          </h2>
        </div>
        {onBackToAlerts && (
          <button
            onClick={onBackToAlerts}
            style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            ← Back to Alerts
          </button>
        )}
      </div>

      {/* Main Split Layout: Left CCTV & Timeline, Right Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left Video Player & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* CCTV Viewport Container */}
          <div className="glass-panel" style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            <img
              src="/data/videos/sample.mp4"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              alt="CCTV Incident Stream"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            
            {/* Overlay Elements */}
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '8px' }}>
              <span style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                CAM-03 PERIMETER FENCE
              </span>
              <span style={{ background: '#f43f5e', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                LIVE REPLAY
              </span>
            </div>

            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              2026-09-04 23:42:17
            </div>

            {/* Bounding Box Simulation */}
            <div
              style={{
                position: 'absolute',
                top: '32%',
                left: '42%',
                width: '15%',
                height: '42%',
                border: '2px solid #f59e0b',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                borderRadius: '2px'
              }}
            >
              <div style={{ position: 'absolute', top: -20, left: -2, background: '#f59e0b', color: '#000', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace' }}>
                PERSON 94.7% | TRACK #42
              </div>
            </div>

            {/* Polygon Zone Graphic Overlay */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <polygon points="100,200 450,150 500,380 150,420" fill="rgba(244, 63, 94, 0.18)" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
              <text x="180" y="240" fill="#f43f5e" fontSize="12" fontWeight="bold">RESTRICTED ZONE A (FENCE ACTIVE)</text>
            </svg>
          </div>

          {/* Timeline Panel */}
          <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              INCIDENT EVENT TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {timelineEvents.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', width: '65px' }}>{item.time}</span>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: item.type === 'critical' ? '#f43f5e' : item.type === 'warning' ? '#f59e0b' : item.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-cyan)'
                  }} />
                  <span style={{ color: item.type === 'critical' ? '#f43f5e' : 'var(--text-primary)', fontWeight: item.type === 'critical' ? 700 : 500 }}>
                    {item.event}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Incident Metadata & Action Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>
              Incident Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Incident Type:</span>
                <strong style={{ color: '#f43f5e' }}>PERIMETER INTRUSION</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Severity Level:</span>
                <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>CRITICAL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Camera ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>CAM-03</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Monitored Zone:</span>
                <strong>Restricted Zone A</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Object Track:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>#42 (PERSON)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>AI Detection Confidence:</span>
                <strong style={{ color: 'var(--accent-emerald)' }}>94.7%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                <strong style={{ color: status === 'ACTIVE' ? '#f43f5e' : status === 'ACKNOWLEDGED' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {status}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '8px', padding: '10px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock style={{ width: '12px', height: '12px', color: 'var(--accent-emerald)' }} />
                BLOCKCHAIN VERIFICATION
              </div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-emerald)', wordBreak: 'break-all' }}>
                SHA-256: 8F91A6C4E7B3D029A8C1F9...D92A
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Permissioned Ledger Block #1027 | Status: VERIFIED
              </div>
            </div>

            {/* Operator Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => setStatus('ACKNOWLEDGED')}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'var(--accent-rose)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                ACKNOWLEDGE INCIDENT
              </button>

              <button
                onClick={() => setStatus('FALSE_POSITIVE')}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                MARK FALSE POSITIVE
              </button>

              <button
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--accent-cyan)',
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                VIEW DIGITAL EVIDENCE SNAPSHOT
              </button>

              <button
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                EXPORT AUDIT REPORT (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
