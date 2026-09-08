import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Bell, Camera, User } from 'lucide-react';
import { DetectionEvent } from '../services/api';

interface AlertPanelProps {
  events: DetectionEvent[];
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ events }) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filteredEvents = events.filter((e) => (filter === 'ALL' ? true : e.severity === filter));

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="badge badge-critical" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            <AlertCircle style={{ width: '11px', height: '11px' }} /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            <AlertTriangle style={{ width: '11px', height: '11px' }} /> WARNING
          </span>
        );
      default:
        return (
          <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            <Info style={{ width: '11px', height: '11px' }} /> INFO
          </span>
        );
    }
  };

  const formatEventType = (type: string) => {
    if (type === 'SUSPICIOUS_VEHICLE_ACCESS' || type === 'RESTRICTED_ZONE_ENTRY') {
      return 'SUSPICIOUS ACTIVITY DETECTED';
    }
    return type.replace(/_/g, ' ');
  };

  return (
    <aside
      className="glass-panel"
      style={{
        width: '320px',
        minWidth: '320px',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%',
        padding: '12px',
        gap: '10px',
        overflow: 'hidden'
      }}
    >
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell style={{ width: '16px', height: '16px', color: 'var(--accent-cyan)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            REAL-TIME ALERTS
          </h3>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
          {events.length}
        </span>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '3px',
          background: 'var(--bg-card)',
          padding: '3px',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
          flexShrink: 0
        }}
      >
        {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              flex: 1,
              padding: '4px 0',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: filter === tab ? 'var(--accent-cyan)' : 'transparent',
              color: filter === tab ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Internal Scrollable Alert Container (Does NOT cause page scroll) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px'
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '30px 0' }}>
            No alerts matching filter criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id || evt.event_id}
              style={{
                background: evt.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-card)',
                border: evt.severity === 'CRITICAL' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {getSeverityBadge(evt.severity)}
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {evt.iso_timestamp || new Date(evt.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                {formatEventType(evt.event_type)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  <Camera style={{ width: '11px', height: '11px' }} /> {evt.camera_id}
                </span>
                {evt.track_id && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <User style={{ width: '11px', height: '11px' }} /> #{evt.track_id}
                  </span>
                )}
                <span>Conf: <strong style={{ color: 'var(--accent-emerald)' }}>{(evt.confidence * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
