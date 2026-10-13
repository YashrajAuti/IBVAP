import React, { useState, useEffect, useRef } from 'react';
import { Header, AlertsMode } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { CameraGrid } from './components/CameraGrid';
import { ANPRTable } from './components/ANPRTable';
import { ZoneDrawerModal } from './components/ZoneDrawerModal';
import { LayoutMode } from './components/LayoutSelector';

import { DashboardView } from './components/DashboardView';
import { AIAnalyticsView } from './components/AIAnalyticsView';
import { IncidentInvestigationView } from './components/IncidentInvestigationView';
import { BlockchainAuditView } from './components/BlockchainAuditView';
import { CamerasView } from './components/CamerasView';
import { AlertsView } from './components/AlertsView';
import { ZonesView } from './components/ZonesView';
import { EventsView } from './components/EventsView';
import { SettingsPanel, SystemSettings, DEFAULT_SETTINGS } from './components/SettingsPanel';
import { audioAlertService } from './services/audioAlert';

import { IBVAPWebSocketClient, WSMessage, CameraStatsPayload, WSFramePayload } from './services/websocket';
import {
  fetchCameras,
  fetchEvents,
  fetchANPRRecords,
  Camera,
  DetectionEvent,
  ANPRRecord
} from './services/api';

export const App: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [anprRecords, setAnprRecords] = useState<ANPRRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState<boolean>(false);
  const [zoneModalCameraId, setZoneModalCameraId] = useState<string>('CAM-NORTH-01');

  // Sidebar & Navigation State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');

  // Multi-camera grid & layout mode
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('ALL');

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('ibvap_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse ibvap_settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Light / Dark Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ibvap_theme') as 'dark' | 'light') || settings.theme || 'dark';
  });

  // Master Alert System State (ON / MUTED / DISABLED)
  const [alertsMode, setAlertsMode] = useState<AlertsMode>('ON');
  const [muteTimerSeconds, setMuteTimerSeconds] = useState<number | null>(null);

  // Priority Camera Focus Mode State
  const [priorityCameraId, setPriorityCameraId] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string | number>>(new Set());

  const lastAlarmTimesRef = useRef<Record<string, number>>({});

  // Operating Mode: Traditional CCTV (default false) vs AI Specialized (true)
  const [isAIMode, setIsAIMode] = useState<boolean>(false);
  const isAIModeRef = useRef<boolean>(false);

  useEffect(() => {
    isAIModeRef.current = isAIMode;
  }, [isAIMode]);

  // Per-camera Frame & Statistics maps
  const [framesMap, setFramesMap] = useState<Record<string, WSFramePayload>>({});
  const [cameraStatsMap, setCameraStatsMap] = useState<Record<string, CameraStatsPayload>>({});

  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    setTheme(newSettings.theme);
    localStorage.setItem('ibvap_settings', JSON.stringify(newSettings));
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setTheme(DEFAULT_SETTINGS.theme);
    localStorage.setItem('ibvap_settings', JSON.stringify(DEFAULT_SETTINGS));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ibvap_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    handleSaveSettings({ ...settings, theme: nextTheme });
  };

  const handleToggleAlertsMode = () => {
    if (alertsMode === 'ON') {
      setAlertsMode('DISABLED');
      setMuteTimerSeconds(null);
    } else {
      setAlertsMode('ON');
      setMuteTimerSeconds(null);
    }
  };

  const handleSetTemporaryMute = (seconds: number | null) => {
    if (seconds === null) {
      setAlertsMode('DISABLED');
      setMuteTimerSeconds(null);
    } else {
      setAlertsMode('MUTED');
      setMuteTimerSeconds(seconds);
    }
  };

  useEffect(() => {
    if (alertsMode !== 'MUTED' || muteTimerSeconds === null) return;
    if (muteTimerSeconds <= 0) {
      setAlertsMode('ON');
      setMuteTimerSeconds(null);
      return;
    }
    const timer = setInterval(() => {
      setMuteTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setAlertsMode('ON');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [alertsMode, muteTimerSeconds]);

  useEffect(() => {
    // Initialize audio alert listener & volume
    audioAlertService.setupUnlockListeners();
    return () => {
      audioAlertService.stopAlarm();
    };
  }, []);

  useEffect(() => {
    const initData = async () => {
      const camList = await fetchCameras();
      setCameras(camList);

      const evtList = await fetchEvents();
      setEvents(evtList);

      const anprList = await fetchANPRRecords();
      setAnprRecords(anprList);
    };
    initData();
  }, []);

  const triggerAlarmEvent = (camId: string, trackId: number | null, eventType: string, isCritical: boolean) => {
    // Honor master alert switches
    if (alertsMode === 'DISABLED' || alertsMode === 'MUTED' || !settings.masterAlertsEnabled) {
      return;
    }

    // Debounce to prevent overlapping cacophony (3.5s cooldown per camera/event)
    const identityKey = `${camId}_${trackId || 0}_${eventType}`;
    const now = Date.now();
    const lastTime = lastAlarmTimesRef.current[identityKey] || 0;
    if (now - lastTime < 3500) return;
    lastAlarmTimesRef.current[identityKey] = now;

    if (isCritical || settings.criticalAlertsEnabled) {
      setPriorityCameraId(camId);
    }
    if (settings.alarmSoundEnabled) {
      audioAlertService.playAlarm(4000);
    }
  };

  useEffect(() => {
    const envWs = import.meta.env.VITE_WS_URL as string;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = window.location.port === '3000' || !window.location.port ? ':8000' : `:${window.location.port}`;
    const wsUrl = envWs || `${wsProtocol}//${wsHost}${wsPort}/ws/live`;

    const client = new IBVAPWebSocketClient(wsUrl, (msg: WSMessage) => {
      if (msg.type === 'frame_update') {
        const camId = msg.camera_id;
        setFramesMap((prev) => ({ ...prev, [camId]: msg }));
        if (msg.stats) {
          setCameraStatsMap((prev) => ({ ...prev, [camId]: msg.stats! }));
        }
        if (msg.alarm_active) {
          triggerAlarmEvent(camId, null, 'RESTRICTED_ZONE_INTRUSION', true);
        }
      } else if (msg.type === 'spatial_event') {
        const newEvt: DetectionEvent = {
          id: Date.now(),
          event_id: msg.event_id,
          event_type: msg.event_type,
          camera_id: msg.camera_id,
          track_id: msg.track_id,
          object_type: msg.object_type,
          confidence: 0.95,
          severity: msg.severity,
          timestamp: msg.timestamp,
          iso_timestamp: new Date(msg.timestamp * 1000).toLocaleTimeString(),
          created_at: new Date().toISOString()
        };
        setEvents((prev) => [newEvt, ...prev.slice(0, 99)]);
        const shouldRing = msg.severity === 'CRITICAL' || msg.severity === 'WARNING' ||
          ['RESTRICTED_ZONE_ENTRY', 'SUSPICIOUS_VEHICLE_ACCESS', 'LINE_CROSSING'].includes(msg.event_type);
        if (shouldRing) {
          triggerAlarmEvent(msg.camera_id, msg.track_id, msg.event_type, true);
        }
      }
    });

    client.connect();
    return () => client.disconnect();
  }, [alertsMode, settings]);

  const handleAcknowledgeAlarm = (eventId?: string | number) => {
    if (eventId) {
      setAcknowledgedIds((prev) => new Set([...prev, eventId]));
    }
    setPriorityCameraId(null);
    audioAlertService.stopAlarm();
  };

  const handleANPRSearch = async (query: string) => {
    const records = await fetchANPRRecords(query);
    setAnprRecords(records);
  };

  const handleOpenZoneDrawer = (camId: string) => {
    setZoneModalCameraId(camId);
    setIsZoneModalOpen(true);
  };

  const handleSelectCameraToView = (camId: string) => {
    setActiveTab('LIVE');
    setPriorityCameraId(camId);
  };

  const aggregatedStats = ((): CameraStatsPayload => {
    if (!isProcessing) {
      return { active_track_count: 0, person_count: 0, vehicle_count: 0, zone_intrusions: 0, line_crossings: 0, anpr_hits: 0 };
    }
    let activeTracks = 0;
    let persons = 0;
    let vehicles = 0;
    let intrusions = 0;
    let lineCrossings = 0;
    let anprHits = 0;

    Object.values(cameraStatsMap).forEach((st) => {
      activeTracks += st.active_track_count || 0;
      persons += st.person_count || 0;
      vehicles += st.vehicle_count || 0;
      intrusions += st.zone_intrusions || 0;
      lineCrossings += st.line_crossings || 0;
      anprHits += st.anpr_hits || 0;
    });

    return {
      active_track_count: activeTracks,
      person_count: persons,
      vehicle_count: vehicles,
      zone_intrusions: intrusions,
      line_crossings: lineCrossings,
      anpr_hits: anprHits
    };
  })();

  return (
    <div className="app-container" style={{ padding: isAIMode ? '8px' : '4px', gap: isAIMode ? '8px' : '4px', background: isAIMode ? undefined : '#000000' }}>
      {/* 1. Header with Master Alert Controls & Status */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        fps={isProcessing ? 30 : 0}
        isAlarmActive={!!priorityCameraId}
        onAcknowledgeAlarm={() => handleAcknowledgeAlarm()}
        onOpenSettings={() => {
          setIsAIMode(true);
          setActiveTab('SETTINGS');
        }}
        alertsMode={alertsMode}
        muteTimerSeconds={muteTimerSeconds}
        onToggleAlertsMode={handleToggleAlertsMode}
        onSetTemporaryMute={handleSetTemporaryMute}
        isAIMode={isAIMode}
        onToggleAIMode={setIsAIMode}
        totalCameras={cameras.length > 0 ? cameras.length : 3}
      />

      {/* Main Body */}
      <div className="dashboard-main" style={{ gap: isAIMode ? '8px' : '0' }}>
        {/* 2. Navigation Sidebar (Visible in AI Mode to preserve all routes/navigation, hidden in Traditional for full screen) */}
        {isAIMode && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />
        )}

        {/* 3. Central Workspace */}
        <main
          className="stream-section"
          style={{
            padding: isAIMode ? '12px' : '4px',
            flex: 1,
            overflowY: 'auto',
            background: isAIMode ? undefined : '#000000'
          }}
        >
          {/* In Traditional CCTV Mode: Full-screen 2x2 Camera Grid with Pagination & Auto-Rotation */}
          {!isAIMode ? (
            <CameraGrid
              cameras={cameras}
              framesMap={framesMap}
              layoutMode="ALL"
              onSelectLayout={setLayoutMode}
              isProcessing={isProcessing}
              onToggleProcessing={() => setIsProcessing(!isProcessing)}
              onOpenZoneDrawer={handleOpenZoneDrawer}
              priorityCameraId={null}
              onAcknowledgeAlarm={handleAcknowledgeAlarm}
              isAIMode={false}
            />
          ) : (
            /* In AI Specialized Mode: Full AI Analytics, Dashboards & Tabs */
            <>
              {activeTab === 'DASHBOARD' && (
                <DashboardView
                  cameras={cameras}
                  framesMap={framesMap}
                  events={events}
                  isProcessing={isProcessing}
                  onToggleProcessing={() => setIsProcessing(!isProcessing)}
                  onOpenZoneDrawer={handleOpenZoneDrawer}
                  onSelectCameraToView={handleSelectCameraToView}
                  priorityCameraId={priorityCameraId}
                  onAcknowledgeAlarm={handleAcknowledgeAlarm}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'LIVE' && (
                <CameraGrid
                  cameras={cameras}
                  framesMap={framesMap}
                  layoutMode={layoutMode}
                  onSelectLayout={setLayoutMode}
                  isProcessing={isProcessing}
                  onToggleProcessing={() => setIsProcessing(!isProcessing)}
                  onOpenZoneDrawer={handleOpenZoneDrawer}
                  priorityCameraId={priorityCameraId}
                  onAcknowledgeAlarm={() => handleAcknowledgeAlarm()}
                  isAIMode={true}
                />
              )}

              {activeTab === 'CAMERAS' && (
                <CamerasView
                  cameras={cameras}
                  framesMap={framesMap}
                  isProcessing={isProcessing}
                  onToggleProcessing={() => setIsProcessing(!isProcessing)}
                  onSelectCameraToView={handleSelectCameraToView}
                />
              )}

              {activeTab === 'ALERTS' && (
                <AlertsView
                  events={events}
                  onClearAlerts={() => setEvents([])}
                  onAcknowledgeAlert={handleAcknowledgeAlarm}
                  acknowledgedIds={acknowledgedIds}
                />
              )}

              {activeTab === 'INVESTIGATE' && (
                <IncidentInvestigationView onBackToAlerts={() => setActiveTab('ALERTS')} />
              )}

              {(activeTab === 'BLOCKCHAIN' || activeTab === 'EVIDENCE') && (
                <BlockchainAuditView />
              )}

              {activeTab === 'ANPR' && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <ANPRTable records={anprRecords} onSearch={handleANPRSearch} />
                </div>
              )}

              {activeTab === 'ZONES' && (
                <ZonesView onOpenZoneDrawer={handleOpenZoneDrawer} />
              )}

              {activeTab === 'EVENTS' && (
                <EventsView
                  events={events}
                  onClearEvents={() => setEvents([])}
                />
              )}

              {(activeTab === 'ANALYTICS' || activeTab === 'TRACKING' || activeTab === 'FACE' || activeTab === 'REPORTS') && (
                <AIAnalyticsView
                  initialSubTab={
                    activeTab === 'TRACKING'
                      ? 'TRACKING'
                      : activeTab === 'FACE'
                      ? 'FACE'
                      : activeTab === 'REPORTS'
                      ? 'REPORTS'
                      : 'ANALYTICS'
                  }
                  cameras={cameras}
                  framesMap={framesMap}
                  events={events}
                />
              )}

              {activeTab === 'SETTINGS' && (
                <SettingsPanel
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  onResetSettings={handleResetSettings}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 4. Status Bar - Rendered in AI Mode for detailed metrics */}
      {isAIMode && (
        <StatusBar
          camerasOnline={cameras.length > 0 ? cameras.length : 3}
          activeTrackCount={aggregatedStats.active_track_count}
          personCount={aggregatedStats.person_count}
          vehicleCount={aggregatedStats.vehicle_count}
          alertsCount={events.length}
          anprHits={aggregatedStats.anpr_hits}
        />
      )}

      {/* Zone Drawer Modal */}
      <ZoneDrawerModal
        cameraId={zoneModalCameraId}
        isOpen={isZoneModalOpen}
        onClose={() => setIsZoneModalOpen(false)}
        onZoneCreated={() => {
          fetchEvents().then(setEvents);
        }}
      />
    </div>
  );
};
