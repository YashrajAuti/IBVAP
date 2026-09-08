import React, { useState } from 'react';
import { Activity, Download, Trash2, Filter } from 'lucide-react';
import { DetectionEvent } from '../services/api';


interface EventsViewProps {
  events: DetectionEvent[];
  onClearEvents: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, onClearEvents }) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [cameraFilter, setCameraFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((evt) => {
    if (severityFilter !== 'ALL' && evt.severity !== severityFilter) return false;
    if (cameraFilter !== 'ALL' && evt.camera_id !== cameraFilter && !evt.camera_id?.includes(cameraFilter)) return false;
    if (typeFilter !== 'ALL' && evt.event_type !== typeFilter) return false;
    return true;
  });

  const getZoneName = (camId: string) => {
    if (camId === 'CAM-PARKING-03' || camId.includes('PARKING')) return 'Restricted Parking Zone';
    if (camId === 'CAM-WEST-02' || camId.includes('WEST')) return 'Restricted Office Zone A';
    if (camId === 'CAM-NORTH-01' || camId.includes('NORTH')) return 'Checkpoint Line A → B';
    return 'General Perimeter Zone';
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ibvap_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return;
    const headers = ['ID', 'Event Type', 'Camera ID', 'Track ID', 'Object Type', 'Severity', 'Confidence', 'ISO Timestamp'];
    const rows = filteredEvents.map((e) => [
      e.id || e.event_id,
      `"${e.event_type}"`,
      `"${e.camera_id}"`,
      e.track_id || '',
      `"${e.object_type}"`,
      `"${e.severity}"`,
      (e.confidence * 100).toFixed(0) + '%',
      `"${e.iso_timestamp || new Date(e.timestamp * 1000).toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `ibvap_events_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Header & Export Controls */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity style={{ width: '22px', height: '22px', color: 'var(--accent-violet)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              SYSTEM CHRONOLOGICAL EVENT LOGS
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Complete record of all spatial event notifications, line crossings, intrusions, and vehicle access events
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleExportJSON}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Download style={{ width: '13px', height: '13px' }} /> JSON
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Download style={{ width: '13px', height: '13px' }} /> CSV
          </button>

          <button
            onClick={onClearEvents}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--accent-rose)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 style={{ width: '13px', height: '13px' }} /> CLEAR LOGS
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              SEVERITY:
            </span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: severityFilter === s ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                  color: severityFilter === s ? '#000' : 'var(--text-secondary)'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Camera Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              CAMERA:
            </span>
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              <option value="ALL">All Cameras</option>
              <option value="CAM-NORTH-01">CAM-NORTH-01</option>
              <option value="CAM-WEST-02">CAM-WEST-02</option>
              <option value="CAM-PARKING-03">CAM-PARKING-03</option>
            </select>
          </div>

          {/* Event Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              EVENT TYPE:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              <option value="ALL">All Types</option>
              <option value="RESTRICTED_ZONE_ENTRY">Restricted Zone Entry</option>
              <option value="LINE_CROSSING">Line Crossing</option>
              <option value="SUSPICIOUS_VEHICLE_ACCESS">Suspicious Vehicle Access</option>
              <option value="ANPR_DETECTION">ANPR Detection</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Time</th>
                <th style={{ padding: '10px 12px' }}>Event Type</th>
                <th style={{ padding: '10px 12px' }}>Camera</th>
                <th style={{ padding: '10px 12px' }}>Target Track</th>
                <th style={{ padding: '10px 12px' }}>Location / Zone</th>
                <th style={{ padding: '10px 12px' }}>Severity</th>
                <th style={{ padding: '10px 12px' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No events logged matching filter selection.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.id || evt.event_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {evt.iso_timestamp || new Date(evt.timestamp * 1000).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {evt.event_type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {evt.camera_id}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {evt.object_type.toUpperCase()} {evt.track_id ? `#${evt.track_id}` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {getZoneName(evt.camera_id)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${evt.severity === 'CRITICAL' ? 'badge-critical' : evt.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>
                        {evt.severity}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {(evt.confidence * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
