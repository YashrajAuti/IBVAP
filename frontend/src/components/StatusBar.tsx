import React from 'react';
import { Camera, Users, Car, AlertTriangle, FileText, Activity } from 'lucide-react';

interface StatusBarProps {
  camerasOnline: number;
  activeTrackCount: number;
  personCount: number;
  vehicleCount: number;
  alertsCount: number;
  anprHits: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  camerasOnline,
  activeTrackCount,
  personCount,
  vehicleCount,
  alertsCount,
  anprHits
}) => {
  const metrics = [
    { label: 'CAMERAS ONLINE', value: camerasOnline, icon: Camera, color: '#10b981' },
    { label: 'ACTIVE TRACKS', value: activeTrackCount, icon: Activity, color: '#06b6d4' },
    { label: 'PERSONS', value: personCount, icon: Users, color: '#3b82f6' },
    { label: 'VEHICLES', value: vehicleCount, icon: Car, color: '#10b981' },
    { label: 'ALERTS', value: alertsCount, icon: AlertTriangle, color: '#f43f5e' },
    { label: 'ANPR', value: anprHits, icon: FileText, color: '#8b5cf6' }
  ];

  return (
    <footer
      className="glass-panel"
      style={{
        height: '36px',
        minHeight: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon style={{ width: '13px', height: '13px', color: m.color }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {m.label}:
              </span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 800 }}>
                {m.value}
              </strong>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        IBVAP AI PIPELINE ACTIVE | SYSTEM HEALTH: NORMAL
      </div>
    </footer>
  );
};
