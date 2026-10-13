import React, { useRef, useEffect, useState } from 'react';
import { Layers, Maximize, Minimize, AlertCircle, Volume2 } from 'lucide-react';
import { Camera } from '../services/api';
import { WSFramePayload } from '../services/websocket';

interface CameraCardProps {
  camera: Camera;
  framePayload: WSFramePayload | null;
  isProcessing: boolean;
  onToggleProcessing?: () => void;
  onOpenZoneDrawer: (cameraId: string) => void;
  isAlarmActive?: boolean;
  isFocusHero?: boolean;
  onAcknowledgeAlarm?: () => void;
  isAIMode?: boolean;
}

const isSameCamera = (idA: string, idB: string): boolean => {
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

export const CameraCard: React.FC<CameraCardProps> = ({
  camera,
  framePayload,
  isProcessing,
  onOpenZoneDrawer,
  isAlarmActive = false,
  isFocusHero = false,
  onAcknowledgeAlarm,
  isAIMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const activeFrameRef = useRef<WSFramePayload | null>(framePayload);

  // Synchronize incoming frame payload specifically for this camera ID
  useEffect(() => {
    if (framePayload && isSameCamera(framePayload.camera_id, camera.camera_id)) {
      activeFrameRef.current = framePayload;
    }
  }, [framePayload, camera.camera_id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch((err) => console.warn('Fullscreen error:', err));
    } else {
      document.exitFullscreen().catch((err) => console.warn('Exit fullscreen error:', err));
    }
  };

  // Canvas video & AI overlay rendering loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawOverlays = (targetCtx: CanvasRenderingContext2D, pl: WSFramePayload) => {
      if (!isAIMode) return;
      const origW = pl.frame_width || 1920;
      const origH = pl.frame_height || 1080;
      const scaleX = canvas.width / origW;
      const scaleY = canvas.height / origH;

      const isCam3 = isSameCamera(camera.camera_id, 'CAM-PARKING-03');
      const isCam1 = isSameCamera(camera.camera_id, 'CAM-NORTH-01');

      // Draw Spatial Zone & Line Overlays
      if (isCam3) {
        targetCtx.beginPath();
        targetCtx.moveTo(1000 * scaleX, 720 * scaleY);
        targetCtx.lineTo(1280 * scaleX, 720 * scaleY);
        targetCtx.lineTo(1280 * scaleX, 1080 * scaleY);
        targetCtx.lineTo(1000 * scaleX, 1080 * scaleY);
        targetCtx.closePath();
        targetCtx.fillStyle = isAlarmActive ? 'rgba(244, 63, 94, 0.28)' : 'rgba(244, 63, 94, 0.16)';
        targetCtx.fill();
        targetCtx.strokeStyle = '#f43f5e';
        targetCtx.lineWidth = 1.8;
        targetCtx.setLineDash([4, 4]);
        targetCtx.stroke();
        targetCtx.setLineDash([]);

        targetCtx.fillStyle = '#f43f5e';
        targetCtx.font = 'bold 10px Outfit, sans-serif';
        targetCtx.fillText('RESTRICTED PARKING ZONE', 1005 * scaleX, 740 * scaleY);
      } else if (isCam1) {
        targetCtx.beginPath();
        targetCtx.moveTo(350 * scaleX, 100 * scaleY);
        targetCtx.lineTo(350 * scaleX, 800 * scaleY);
        targetCtx.strokeStyle = '#06b6d4';
        targetCtx.lineWidth = 2;
        targetCtx.stroke();

        targetCtx.fillStyle = '#06b6d4';
        targetCtx.font = 'bold 10px Outfit, sans-serif';
        targetCtx.fillText('CHECKPOINT LINE A → B', 355 * scaleX, 120 * scaleY);
      }

      // Render AI Detection Bounding Boxes & Tracks
      if (pl.active_tracks) {
        pl.active_tracks.forEach((track) => {
          const [x1, y1, x2, y2] = track.bbox;
          const rx1 = x1 * scaleX;
          const ry1 = y1 * scaleY;
          const rw = (x2 - x1) * scaleX;
          const rh = (y2 - y1) * scaleY;

          const isPerson = track.class_name === 'person';
          const strokeColor = isPerson ? '#3b82f6' : '#10b981';

          targetCtx.strokeStyle = strokeColor;
          targetCtx.lineWidth = 1.8;
          targetCtx.strokeRect(rx1, ry1, rw, rh);

          // Tracking point dot
          const [bcX, bcY] = track.bottom_center;
          targetCtx.beginPath();
          targetCtx.arc(bcX * scaleX, bcY * scaleY, 3, 0, Math.PI * 2);
          targetCtx.fillStyle = '#f59e0b';
          targetCtx.fill();

          // Track Tag
          const label = `${track.class_name.toUpperCase()} #${track.id}`;
          targetCtx.fillStyle = strokeColor;
          const tw = targetCtx.measureText(label).width + 6;
          targetCtx.fillRect(rx1, Math.max(0, ry1 - 16), tw, 16);
          targetCtx.fillStyle = '#ffffff';
          targetCtx.font = 'bold 9px Inter, sans-serif';
          targetCtx.fillText(label, rx1 + 3, Math.max(11, ry1 - 4));

          // ANPR Plate Tag
          if (track.plate) {
            const plateLabel = `PLATE: ${track.plate}`;
            targetCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            targetCtx.fillRect(rx1, ry1 + rh + 2, targetCtx.measureText(plateLabel).width + 6, 16);
            targetCtx.fillStyle = '#06b6d4';
            targetCtx.font = 'bold 10px Inter, sans-serif';
            targetCtx.fillText(plateLabel, rx1 + 3, ry1 + rh + 13);
          }
        });
      }
    };

    const renderLoop = () => {
      const payload = activeFrameRef.current;

      if (!isProcessing || !payload || !isSameCamera(payload.camera_id, camera.camera_id)) {
        // Dark Offline / Connecting State
        ctx.fillStyle = '#060913';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        ctx.fillStyle = isProcessing ? '#f59e0b' : '#ef4444';
        ctx.font = 'bold 13px Outfit, sans-serif';
        const statusMsg = isProcessing ? `CONNECTING TO ${camera.camera_id}...` : 'STREAM PAUSED';
        ctx.fillText(statusMsg, 16, 30);

        animId = requestAnimationFrame(renderLoop);
        return;
      }

      if (payload.frame_b64) {
        // Draw JPEG Base64 Frame
        const img = new Image();
        img.src = `data:image/jpeg;base64,${payload.frame_b64}`;
        img.onload = () => {
          if (!isSameCamera(payload.camera_id, camera.camera_id)) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawOverlays(ctx, payload);
        };
      } else {
        // Tactical Radar Display when streaming telemetry without JPEG video
        ctx.fillStyle = '#070b16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`● TELEMETRY STREAM ACTIVE [${camera.camera_id}]`, 16, 26);

        drawOverlays(ctx, payload);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [isProcessing, camera.camera_id, isAlarmActive, isAIMode]);

  const activeTracksCount = framePayload?.stats?.active_track_count || 0;
  const fps = isProcessing ? 30 : 0;

  return (
    <div
      ref={wrapperRef}
      className={isAIMode ? `camera-card glass-panel ${isAlarmActive ? 'camera-card-alarm' : ''} ${isFocusHero ? 'camera-card-focus' : ''}` : 'camera-card cctv-panel'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isAIMode ? 'var(--radius-sm)' : '2px',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        transition: 'all 0.2s ease',
        background: isAIMode ? undefined : '#05070c',
        border: isAIMode
          ? isAlarmActive
            ? '2px solid var(--accent-rose)'
            : '1px solid var(--border-color)'
          : '1px solid #1e2433'
      }}
    >
      {/* 1. Header: Traditional CCTV Minimal Bar vs AI Rich Bar */}
      {isAIMode ? (
        /* AI Mode Header */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: isAlarmActive ? 'rgba(244, 63, 94, 0.15)' : 'rgba(15, 23, 42, 0.85)',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isAlarmActive ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                boxShadow: isAlarmActive ? '0 0 6px var(--accent-rose)' : '0 0 6px var(--accent-emerald)',
                animation: 'blink 1.2s infinite'
              }}
            />
            <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
              {camera.camera_id}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              — {camera.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isAlarmActive && (
              <span className="badge badge-critical" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                <AlertCircle style={{ width: '10px', height: '10px' }} /> SUSPICIOUS ACTIVITY
              </span>
            )}
            <span className="badge badge-info" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
              {fps} FPS
            </span>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {activeTracksCount} TRACKS
            </span>
          </div>
        </div>
      ) : (
        /* Traditional CCTV Header (Clean, Functional Control Room Style) */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 8px',
            background: '#0a0d14',
            borderBottom: '1px solid #1e2433',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block'
              }}
            />
            <span style={{ fontWeight: 700, fontSize: '0.74rem', color: '#f1f5f9', letterSpacing: '0.5px' }}>
              {camera.camera_id}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {camera.name ? `— ${camera.name}` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.64rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.3px' }}>
              ● ONLINE
            </span>
            <span style={{ fontSize: '0.64rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
              REC
            </span>
          </div>
        </div>
      )}

      {/* 2. Video Viewport Container */}
      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, background: '#000' }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />

        {/* Priority Alarm Banner Overlay - ONLY in AI Mode */}
        {isAIMode && isAlarmActive && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              right: '6px',
              background: 'rgba(244, 63, 94, 0.92)',
              backdropFilter: 'blur(6px)',
              padding: '6px 10px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 15px rgba(244, 63, 94, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff' }}>
              <Volume2 style={{ width: '14px', height: '14px' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.4px' }}>
                  🚨 CRITICAL EVENT — SUSPICIOUS ACTIVITY DETECTED
                </div>
                <div style={{ fontSize: '0.66rem', opacity: 0.9 }}>
                  Restricted door area breach | Priority Focus Active
                </div>
              </div>
            </div>

            {onAcknowledgeAlarm && (
              <button
                onClick={onAcknowledgeAlarm}
                style={{
                  background: '#ffffff',
                  color: '#f43f5e',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
              >
                ACKNOWLEDGE
              </button>
            )}
          </div>
        )}

        {/* Action Buttons: Fullscreen (Both modes) & Zone Drawer (AI Mode only) */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: isAIMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(0, 0, 0, 0.6)',
            padding: '2px 4px',
            borderRadius: '4px',
            border: isAIMode ? '1px solid var(--border-color)' : '1px solid #1e293b'
          }}
        >
          {isAIMode && (
            <button
              onClick={() => onOpenZoneDrawer(camera.camera_id)}
              title="Configure Zones"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <Layers style={{ width: '12px', height: '12px' }} />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            title="Fullscreen"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
          >
            {isFullscreen ? (
              <Minimize style={{ width: '12px', height: '12px' }} />
            ) : (
              <Maximize style={{ width: '12px', height: '12px' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
