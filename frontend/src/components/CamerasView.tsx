import React, { useState } from 'react';
import { Camera as CameraIcon, Play, Pause, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import { Camera } from '../services/api';
import { WSFramePayload } from '../services/websocket';

interface CamerasViewProps {
  cameras: Camera[];
  framesMap: Record<string, WSFramePayload>;
  isProcessing: boolean;
  onToggleProcessing: () => void;
  onSelectCameraToView: (camId: string) => void;
}

export const CamerasView: React.FC<CamerasViewProps> = ({
  cameras,
  framesMap,
  isProcessing,
  onToggleProcessing,
  onSelectCameraToView
}) => {
  const [disabledCamIds, setDisabledCamIds] = useState<Record<string, boolean>>({});
  const [reconnectingCamId, setReconnectingCamId] = useState<string | null>(null);

  const defaultCameras: Camera[] = cameras.length > 0 ? cameras : [
    { id: 1, camera_id: 'CAM-NORTH-01', name: 'North Sector Gate 4', rtsp_url: 'rtsp://192.168.1.101:554/live (vehicle_gate.mp4)', location: 'Northern Perimeter', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 2, camera_id: 'CAM-WEST-02', name: 'West Post Checkpoint', rtsp_url: 'rtsp://192.168.1.102:554/live (office_crowd.mp4)', location: 'Western Outpost', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 3, camera_id: 'CAM-PARKING-03', name: 'Parking Area', rtsp_url: 'rtsp://192.168.1.103:554/live (person.mp4)', location: 'Parking Perimeter', status: 'ACTIVE', created_at: new Date().toISOString() }
  ];

  const getVideoSourceLabel = (camId: string, rtsp: string) => {
    if (camId === 'CAM-NORTH-01') return 'vehicle_gate.mp4 (North Gate Stream)';
    if (camId === 'CAM-WEST-02') return 'office_crowd.mp4 (West Post Stream)';
    if (camId === 'CAM-PARKING-03') return 'person.mp4 (Parking Area Stream)';
    return rtsp || 'rtsp://local.stream/live';
  };

  const toggleCamera = (camId: string) => {
    setDisabledCamIds((prev) => ({
      ...prev,
      [camId]: !prev[camId]
    }));
  };

  const handleReconnect = (camId: string) => {
    setReconnectingCamId(camId);
    setTimeout(() => {
      setReconnectingCamId(null);
    }, 1200);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CameraIcon style={{ width: '22px', height: '22px', color: 'var(--accent-cyan)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              CAMERA INFRASTRUCTURE MANAGEMENT
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Manage registered video streams, detection feeds, and operational states across all 3 surveillance positions
            </div>
          </div>
        </div>

        <button
          onClick={onToggleProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isProcessing ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: isProcessing ? '1px solid var(--accent-rose)' : '1px solid var(--accent-emerald)',
            color: isProcessing ? 'var(--accent-rose)' : 'var(--accent-emerald)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {isProcessing ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
          {isProcessing ? 'PAUSE ALL CAMERAS' : 'RESUME ALL CAMERAS'}
        </button>
      </div>

      {/* Camera Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {defaultCameras.map((cam) => {
          const isDisabled = !!disabledCamIds[cam.camera_id];
          const isReconnecting = reconnectingCamId === cam.camera_id;
          const framePayload = framesMap[cam.camera_id];
          const activeTracks = framePayload?.stats?.active_track_count || 0;
          const fps = (!isDisabled && isProcessing) ? 30 : 0;
          const status = isDisabled ? 'DISABLED' : isProcessing ? 'ACTIVE' : 'PAUSED';

          return (
            <div
              key={cam.camera_id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: isDisabled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--border-color)',
                opacity: isDisabled ? 0.6 : 1,
                transition: 'all 0.25s ease'
              }}
            >
              {/* Card Title & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {cam.camera_id}
                    </h3>
                    <span className={`badge ${status === 'ACTIVE' ? 'badge-info' : status === 'DISABLED' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                      {status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {cam.name}
                  </div>
                </div>

                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: status === 'ACTIVE' ? 'var(--accent-emerald)' : status === 'DISABLED' ? 'var(--accent-rose)' : '#f59e0b',
                    boxShadow: status === 'ACTIVE' ? '0 0 8px var(--accent-emerald)' : 'none'
                  }}
                />
              </div>

              {/* Specs Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{cam.location || 'Perimeter Sector'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Video Source:</span>
                  <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    {getVideoSourceLabel(cam.camera_id, cam.rtsp_url)}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Detection Pipeline:</span>
                  <span style={{ color: isProcessing && !isDisabled ? 'var(--accent-emerald)' : 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle style={{ width: '12px', height: '12px' }} />
                    {isProcessing && !isDisabled ? 'YOLOv8 + ByteTrack Active' : 'Idle'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Live Output:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {fps} FPS | {activeTracks} Active Tracks
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button
                  onClick={() => toggleCamera(cam.camera_id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: isDisabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                    color: isDisabled ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {isDisabled ? 'ENABLE CAMERA' : 'DISABLE CAMERA'}
                </button>

                <button
                  onClick={() => handleReconnect(cam.camera_id)}
                  disabled={isReconnecting}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw style={{ width: '12px', height: '12px', animation: isReconnecting ? 'spin 1s linear infinite' : 'none' }} />
                  {isReconnecting ? 'RECONNECTING...' : 'RESTART'}
                </button>

                <button
                  onClick={() => onSelectCameraToView(cam.camera_id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent-cyan)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye style={{ width: '12px', height: '12px' }} />
                  VIEW
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
