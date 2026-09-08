import React, { useState } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, Trash2, CheckCircle2, Filter, Camera } from 'lucide-react';
import { DetectionEvent } from '../services/api';


interface AlertsViewProps {
  events: DetectionEvent[];
  onClearAlerts: () => void;
  onAcknowledgeAlert?: (eventId: string | number) => void;
  acknowledgedIds?: Set<string | number>;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  events,
  onClearAlerts,
  onAcknowledgeAlert,
  acknowledgedIds = new Set()
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    if (severityFilter !== 'ALL' && evt.severity !== severityFilter) return false;
    if (cameraFilter !== 'ALL' && evt.camera_id !== cameraFilter && !evt.camera_id?.includes(cameraFilter)) return false;
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="badge badge-critical" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>
            <AlertCircle style={{ width: '12px', height: '12px' }} /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>
            <AlertTriangle style={{ width: '12px', height: '12px' }} /> WARNING
          </span>
        );
      default:
        return (
          <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>
            <Info style={{ width: '12px', height: '12px' }} /> INFO
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Header & Global Actions */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell style={{ width: '22px', height: '22px', color: 'var(--accent-rose)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              ALERTS & INCIDENT HISTORY
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Comprehensive real-time log of security events, perimeter intrusions, and AI incident alerts
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onClearAlerts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 style={{ width: '14px', height: '14px' }} />
            CLEAR ALERTS HISTORY
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Severity Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '6px' }}>
            SEVERITY:
          </span>
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSeverityFilter(tab)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: severityFilter === tab ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: severityFilter === tab ? '#000' : 'var(--text-secondary)'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Camera Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            CAMERA:
          </span>
          <select
            value={cameraFilter}
            onChange={(e) => setCameraFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Cameras (3/3)</option>
            <option value="CAM-NORTH-01">CAM-NORTH-01 (Gate 4)</option>
            <option value="CAM-WEST-02">CAM-WEST-02 (West Post)</option>
            <option value="CAM-PARKING-03">CAM-PARKING-03 (Parking)</option>
          </select>
        </div>
      </div>

      {/* Alert Feed Table */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Severity</th>
                <th style={{ padding: '10px 12px' }}>Alert Type</th>
                <th style={{ padding: '10px 12px' }}>Camera</th>
                <th style={{ padding: '10px 12px' }}>Track ID</th>
                <th style={{ padding: '10px 12px' }}>Confidence</th>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    No alerts matching selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const key = evt.id || evt.event_id;
                  const isAcked = acknowledgedIds.has(key) || acknowledgedIds.has(evt.event_id);

                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: evt.severity === 'CRITICAL' && !isAcked ? 'rgba(244, 63, 94, 0.06)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>{getSeverityBadge(evt.severity)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {formatEventType(evt.event_type)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Camera style={{ width: '12px', height: '12px' }} /> {evt.camera_id}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {evt.track_id ? `#${evt.track_id}` : 'N/A'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          {(evt.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {evt.iso_timestamp || new Date(evt.timestamp * 1000).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isAcked ? (
                          <span style={{ color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 style={{ width: '13px', height: '13px' }} /> ACKNOWLEDGED
                          </span>
                        ) : (
                          <span style={{ color: evt.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
                            {evt.severity === 'CRITICAL' ? 'UNACKNOWLEDGED' : 'LOGGED'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {!isAcked && onAcknowledgeAlert && (
                          <button
                            onClick={() => onAcknowledgeAlert(key)}
                            style={{
                              background: 'var(--accent-cyan)',
                              color: '#000',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            ACKNOWLEDGE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
