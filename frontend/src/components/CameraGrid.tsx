import React, { useState, useEffect } from 'react';
import { Camera } from '../services/api';
import { WSFramePayload } from '../services/websocket';
import { CameraCard } from './CameraCard';
import { LayoutSelector, LayoutMode } from './LayoutSelector';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

export const CAMERA_ROTATION_INTERVAL = 15000; // 15 seconds configurable rotation interval

interface CameraGridProps {
  cameras: Camera[];
  framesMap: Record<string, WSFramePayload>;
  layoutMode: LayoutMode;
  onSelectLayout: (mode: LayoutMode) => void;
  isProcessing: boolean;
  onToggleProcessing?: () => void;
  onOpenZoneDrawer: (cameraId: string) => void;
  priorityCameraId: string | null;
  onAcknowledgeAlarm: () => void;
  isAIMode?: boolean;
}

const isSameCam = (idA: string, idB: string): boolean => {
  if (!idA || !idB) return false;
  if (idA === idB) return true;
  const isA_Cam1 = idA === 'CAM-GATE-01' || idA === 'CAM-NORTH-01' || idA.includes('GATE') || idA.includes('NORTH');
  const isB_Cam1 = idB === 'CAM-GATE-01' || idB === 'CAM-NORTH-01' || idB.includes('GATE') || idB.includes('NORTH');
  if (isA_Cam1 && isB_Cam1) return true;

  const isA_Cam2 = idA === 'CAM-OFFICE-02' || idA === 'CAM-WEST-02' || idA.includes('OFFICE') || idA.includes('WEST');
  const isB_Cam2 = idB === 'CAM-OFFICE-02' || idB === 'CAM-WEST-02' || idB.includes('OFFICE') || idB.includes('WEST');
  if (isA_Cam2 && isB_Cam2) return true;

  const isA_Cam3 = idA === 'CAM-PARKING-03' || idA.includes('PARKING');
  const isB_Cam3 = idB === 'CAM-PARKING-03' || idB.includes('PARKING');
  if (isA_Cam3 && isB_Cam3) return true;

  return false;
};

export const CameraGrid: React.FC<CameraGridProps> = ({
  cameras,
  framesMap,
  layoutMode,
  onSelectLayout,
  isProcessing,
  onToggleProcessing,
  onOpenZoneDrawer,
  priorityCameraId,
  onAcknowledgeAlarm,
  isAIMode = false
}) => {
  const [selectedSingleCamId, setSelectedSingleCamId] = useState<string>(cameras[0]?.camera_id || 'CAM-NORTH-01');
  const [currentGroup, setCurrentGroup] = useState<number>(0);
  const [isRotationPaused, setIsRotationPaused] = useState<boolean>(false);

  // Active cameras list with fallback defaults
  const activeCameras: Camera[] = cameras.length > 0 ? cameras : [
    { id: 1, camera_id: 'CAM-NORTH-01', name: 'North Sector Gate 4', rtsp_url: '', location: 'Gate 4', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 2, camera_id: 'CAM-WEST-02', name: 'West Post Checkpoint', rtsp_url: '', location: 'West Post', status: 'ACTIVE', created_at: new Date().toISOString() },
    { id: 3, camera_id: 'CAM-PARKING-03', name: 'Parking Area', rtsp_url: '', location: 'Parking Area', status: 'ACTIVE', created_at: new Date().toISOString() }
  ];

  // Helper to resolve frame payload by camera ID
  const getFramePayload = (camId: string): WSFramePayload | null => {
    if (framesMap[camId]) return framesMap[camId];
    const key = Object.keys(framesMap).find((k) => isSameCam(k, camId));
    return key ? framesMap[key] : null;
  };

  const PAGE_SIZE = 4;
  const totalGroups = Math.max(1, Math.ceil(activeCameras.length / PAGE_SIZE));

  // Automatic camera rotation for Traditional CCTV mode when > 4 cameras exist
  useEffect(() => {
    if (isAIMode || totalGroups <= 1 || isRotationPaused) return;

    const timer = setInterval(() => {
      setCurrentGroup((prev) => (prev + 1) % totalGroups);
    }, CAMERA_ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, [isAIMode, totalGroups, isRotationPaused]);

  // Keep group index within bounds when cameras change
  useEffect(() => {
    if (currentGroup >= totalGroups) {
      setCurrentGroup(0);
    }
  }, [totalGroups, currentGroup]);

  const handlePrevGroup = () => {
    setCurrentGroup((prev) => (prev === 0 ? totalGroups - 1 : prev - 1));
  };

  const handleNextGroup = () => {
    setCurrentGroup((prev) => (prev + 1) % totalGroups);
  };

  // --- TRADITIONAL CCTV MODE (Fixed 2x2 Grid + Pagination) ---
  if (!isAIMode) {
    const startIdx = currentGroup * PAGE_SIZE;
    const pageCameras = activeCameras.slice(startIdx, startIdx + PAGE_SIZE);
    // Ensure exactly 4 slots for 2x2 grid
    const slots = [0, 1, 2, 3].map((i) => pageCameras[i] || null);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* 2x2 Fixed Camera Grid (Dominates entire screen) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '6px',
            flex: 1,
            minHeight: 0,
            width: '100%',
            height: '100%'
          }}
        >
          {slots.map((cam, idx) => {
            if (cam) {
              return (
                <CameraCard
                  key={cam.camera_id}
                  camera={cam}
                  framePayload={getFramePayload(cam.camera_id)}
                  isProcessing={isProcessing}
                  onToggleProcessing={onToggleProcessing}
                  onOpenZoneDrawer={onOpenZoneDrawer}
                  isAIMode={false}
                />
              );
            }
            // Inactive / No Signal CCTV slot placeholder
            return (
              <div
                key={`empty-slot-${idx}`}
                style={{
                  background: '#04060a',
                  border: '1px solid #1e2433',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  height: '100%',
                  minHeight: 0
                }}
              >
                <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#64748b', letterSpacing: '1px' }}>
                  [ NO SIGNAL ]
                </div>
                <div style={{ fontSize: '0.65rem', color: '#334155', marginTop: '4px' }}>
                  CAMERA SLOT {startIdx + idx + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Camera Group Pagination & Auto-Rotation Status (Shown when > 4 cameras) */}
        {totalGroups > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 8px',
              background: '#0a0d14',
              border: '1px solid #1e2433',
              borderRadius: '2px',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.4px', color: '#cbd5e1' }}>
                CAMERAS {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, activeCameras.length)} / {activeCameras.length}
              </span>
              <span style={{ fontSize: '0.65rem', color: isRotationPaused ? '#f59e0b' : '#38bdf8' }}>
                {isRotationPaused ? '(ROTATION PAUSED)' : `(AUTO-ROTATING ${CAMERA_ROTATION_INTERVAL / 1000}s)`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setIsRotationPaused(!isRotationPaused)}
                title={isRotationPaused ? 'Resume Rotation' : 'Pause Rotation'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: '#1e2433',
                  border: 'none',
                  borderRadius: '2px',
                  color: '#e2e8f0',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isRotationPaused ? <Play style={{ width: '10px', height: '10px' }} /> : <Pause style={{ width: '10px', height: '10px' }} />}
                {isRotationPaused ? 'RESUME' : 'PAUSE'}
              </button>
              <button
                onClick={handlePrevGroup}
                title="Previous 4 Cameras"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  background: '#1e2433',
                  border: 'none',
                  borderRadius: '2px',
                  color: '#e2e8f0',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft style={{ width: '12px', height: '12px' }} /> PREV
              </button>
              <button
                onClick={handleNextGroup}
                title="Next 4 Cameras"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  background: '#1e2433',
                  border: 'none',
                  borderRadius: '2px',
                  color: '#e2e8f0',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                NEXT <ChevronRight style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- AI SPECIALIZED MODE (Dynamic Layouts, Incident Focus, AI Overlays) ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Top Layout Controls Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <LayoutSelector
          layoutMode={layoutMode}
          onSelectLayout={onSelectLayout}
          totalCameras={activeCameras.length}
        />

        {priorityCameraId && (
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
              🚨 INCIDENT FOCUS MODE: {priorityCameraId}
            </span>
          </div>
        )}
      </div>

      {/* Main Video Surveillance Area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Priority Camera Incident Focus Mode */}
        {priorityCameraId ? (
          (() => {
            const priorityCam = activeCameras.find((c) => isSameCam(c.camera_id, priorityCameraId)) || activeCameras[2] || activeCameras[0];
            const secondaryCams = activeCameras.filter((c) => !isSameCam(c.camera_id, priorityCam.camera_id));

            return (
              <div
                className="camera-focus-container"
                style={{
                  display: 'flex',
                  gap: '12px',
                  flex: 1,
                  minHeight: 0
                }}
              >
                {/* Dominant Hero Priority Camera */}
                <div style={{ flex: 2, minHeight: 0 }}>
                  <CameraCard
                    camera={priorityCam}
                    framePayload={getFramePayload(priorityCam.camera_id)}
                    isProcessing={isProcessing}
                    onToggleProcessing={onToggleProcessing}
                    onOpenZoneDrawer={onOpenZoneDrawer}
                    isAlarmActive={true}
                    isFocusHero={true}
                    onAcknowledgeAlarm={onAcknowledgeAlarm}
                    isAIMode={true}
                  />
                </div>

                {/* Secondary Background Cameras */}
                {secondaryCams.length > 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      minHeight: 0,
                      overflowY: 'auto'
                    }}
                  >
                    {secondaryCams.map((cam) => (
                      <CameraCard
                        key={cam.camera_id}
                        camera={cam}
                        framePayload={getFramePayload(cam.camera_id)}
                        isProcessing={isProcessing}
                        onToggleProcessing={onToggleProcessing}
                        onOpenZoneDrawer={onOpenZoneDrawer}
                        isAlarmActive={false}
                        isAIMode={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        ) : layoutMode === '1' ? (
          /* 1 VIEW Mode */
          (() => {
            const currentCam = activeCameras.find((c) => isSameCam(c.camera_id, selectedSingleCamId)) || activeCameras[0];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', alignSelf: 'center' }}>
                    CAMERA:
                  </span>
                  {activeCameras.map((cam) => (
                    <button
                      key={cam.camera_id}
                      onClick={() => setSelectedSingleCamId(cam.camera_id)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: isSameCam(cam.camera_id, currentCam.camera_id) ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                        color: isSameCam(cam.camera_id, currentCam.camera_id) ? '#000' : 'var(--text-secondary)'
                      }}
                    >
                      {cam.camera_id}
                    </button>
                  ))}
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                  <CameraCard
                    camera={currentCam}
                    framePayload={getFramePayload(currentCam.camera_id)}
                    isProcessing={isProcessing}
                    onToggleProcessing={onToggleProcessing}
                    onOpenZoneDrawer={onOpenZoneDrawer}
                    isAIMode={true}
                  />
                </div>
              </div>
            );
          })()
        ) : (
          /* 2 VIEW / 3 VIEW / ALL Mode in AI */
          (() => {
            let displayedCams = activeCameras;
            if (layoutMode === '2') displayedCams = activeCameras.slice(0, 2);
            else if (layoutMode === '3') displayedCams = activeCameras.slice(0, 3);

            const getGridColumns = () => {
              const count = displayedCams.length;
              if (count === 2) return '1fr 1fr';
              if (count === 3) return 'repeat(3, 1fr)';
              return 'repeat(auto-fit, minmax(320px, 1fr))';
            };

            return (
              <div
                className="camera-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridColumns(),
                  gap: '12px',
                  flex: 1,
                  minHeight: 0,
                  width: '100%',
                  overflowY: 'auto'
                }}
              >
                {displayedCams.map((cam) => (
                  <CameraCard
                    key={cam.camera_id}
                    camera={cam}
                    framePayload={getFramePayload(cam.camera_id)}
                    isProcessing={isProcessing}
                    onToggleProcessing={onToggleProcessing}
                    onOpenZoneDrawer={onOpenZoneDrawer}
                    isAIMode={true}
                  />
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};
