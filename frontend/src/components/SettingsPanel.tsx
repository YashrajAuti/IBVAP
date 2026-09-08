import React, { useState } from 'react';
import { Settings, Sliders, Monitor, Bell, Camera, Save, RotateCcw, Check } from 'lucide-react';
import { LayoutMode } from './LayoutSelector';

export interface SystemSettings {
  systemName: string;
  autoRefresh: boolean;
  showFps: boolean;
  showAiLabels: boolean;

  confidenceThreshold: number; // 0.50 - 0.95
  enableDetection: boolean;
  enableTracking: boolean;
  enableAnpr: boolean;
  enableZoneDetection: boolean;

  theme: 'dark' | 'light';
  interfaceDensity: 'normal' | 'compact';
  showBoundingBoxes: boolean;
  showTrajectoryTrails: boolean;

  masterAlertsEnabled: boolean;
  alarmSoundEnabled: boolean;
  alertFeedEnabled: boolean;
  criticalAlertsEnabled: boolean;

  defaultLayout: LayoutMode;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  systemName: 'IBVAP Command Center',
  autoRefresh: true,
  showFps: true,
  showAiLabels: true,

  confidenceThreshold: 0.50,
  enableDetection: true,
  enableTracking: true,
  enableAnpr: true,
  enableZoneDetection: true,

  theme: 'dark',
  interfaceDensity: 'normal',
  showBoundingBoxes: true,
  showTrajectoryTrails: true,

  masterAlertsEnabled: true,
  alarmSoundEnabled: true,
  alertFeedEnabled: true,
  criticalAlertsEnabled: true,

  defaultLayout: 'ALL'
};

interface SettingsPanelProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  onResetSettings: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSaveSettings,
  onResetSettings
}) => {

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'AI' | 'DISPLAY' | 'ALERTS' | 'CAMERA'>('GENERAL');
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleChange = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings style={{ width: '22px', height: '22px', color: 'var(--accent-cyan)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              SURVEILLANCE SYSTEM PREFERENCES & ENGINE CONFIGURATION
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Configure AI detection sensitivities, alert behaviors, rendering overlays, and platform preferences (Persisted to LocalStorage)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onResetSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            <RotateCcw style={{ width: '13px', height: '13px' }} /> RESET DEFAULTS
          </button>

          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: savedSuccess ? 'var(--accent-emerald)' : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {savedSuccess ? <Check style={{ width: '14px', height: '14px' }} /> : <Save style={{ width: '14px', height: '14px' }} />}
            {savedSuccess ? 'SAVED PREFERENCES!' : 'SAVE SETTINGS'}
          </button>
        </div>
      </div>

      {/* Main Settings Body */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Category Tabs Sidebar */}
        <div className="glass-panel" style={{ width: '200px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          {[
            { id: 'GENERAL', label: 'GENERAL', icon: Settings },
            { id: 'AI', label: 'AI ENGINE', icon: Sliders },
            { id: 'DISPLAY', label: 'DISPLAY UI', icon: Monitor },
            { id: 'ALERTS', label: 'ALERT SETTINGS', icon: Bell },
            { id: 'CAMERA', label: 'CAMERAS', icon: Camera }
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Category Content Area */}
        <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {activeTab === 'GENERAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                General Surveillance Platform Preferences
              </h3>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Platform / System Name
                </label>
                <input
                  type="text"
                  value={formData.systemName}
                  onChange={(e) => handleChange('systemName', e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.autoRefresh}
                    onChange={(e) => handleChange('autoRefresh', e.target.checked)}
                  />
                  Auto-Refresh / Live WebSocket Updates
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showFps}
                    onChange={(e) => handleChange('showFps', e.target.checked)}
                  />
                  Show Pipeline FPS Metric Indicator
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showAiLabels}
                    onChange={(e) => handleChange('showAiLabels', e.target.checked)}
                  />
                  Show AI Object Class Labels & Track IDs
                </label>
              </div>
            </div>
          )}

          {activeTab === 'AI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                AI Vision & Analytics Pipeline Settings
              </h3>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Detection Confidence Threshold
                  </label>
                  <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                    {(formData.confidenceThreshold * 100).toFixed(0)}%
                  </strong>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.95"
                  step="0.05"
                  value={formData.confidenceThreshold}
                  onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
                  style={{ width: '100%', maxWidth: '360px', accentColor: 'var(--accent-cyan)' }}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Filter out low-confidence detections below this threshold
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableDetection}
                    onChange={(e) => handleChange('enableDetection', e.target.checked)}
                  />
                  Enable YOLOv8 Object Detection Engine
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableTracking}
                    onChange={(e) => handleChange('enableTracking', e.target.checked)}
                  />
                  Enable ByteTrack Multi-Object Tracking
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableAnpr}
                    onChange={(e) => handleChange('enableAnpr', e.target.checked)}
                  />
                  Enable Automatic Number Plate Recognition (ANPR / OCR)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.enableZoneDetection}
                    onChange={(e) => handleChange('enableZoneDetection', e.target.checked)}
                  />
                  Enable Spatial Zone & Line Crossing Analytics
                </label>
              </div>
            </div>
          )}

          {activeTab === 'DISPLAY' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Display UI & Rendering Preferences
              </h3>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Color Theme
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleChange('theme', 'dark')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: formData.theme === 'dark' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: formData.theme === 'dark' ? 'var(--accent-cyan-glow)' : 'transparent',
                      color: formData.theme === 'dark' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    🌙 Dark Futuristic Theme
                  </button>
                  <button
                    onClick={() => handleChange('theme', 'light')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: formData.theme === 'light' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: formData.theme === 'light' ? 'var(--accent-cyan-glow)' : 'transparent',
                      color: formData.theme === 'light' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    ☀️ Light Command Theme
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Interface Density
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleChange('interfaceDensity', 'normal')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: formData.interfaceDensity === 'normal' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: formData.interfaceDensity === 'normal' ? 'var(--accent-cyan-glow)' : 'transparent',
                      color: formData.interfaceDensity === 'normal' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Normal Spacing
                  </button>
                  <button
                    onClick={() => handleChange('interfaceDensity', 'compact')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: formData.interfaceDensity === 'compact' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: formData.interfaceDensity === 'compact' ? 'var(--accent-cyan-glow)' : 'transparent',
                      color: formData.interfaceDensity === 'compact' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Compact Density
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showBoundingBoxes}
                    onChange={(e) => handleChange('showBoundingBoxes', e.target.checked)}
                  />
                  Render AI Object Bounding Boxes on Video Overlay
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.showTrajectoryTrails}
                    onChange={(e) => handleChange('showTrajectoryTrails', e.target.checked)}
                  />
                  Render Object Trajectory Trails & Center Points
                </label>
              </div>
            </div>
          )}

          {activeTab === 'ALERTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Alert System & Alarm Playback Controls
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.masterAlertsEnabled}
                    onChange={(e) => handleChange('masterAlertsEnabled', e.target.checked)}
                  />
                  Master Alert System Enabled (🔔 ALERTS ON)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.alarmSoundEnabled}
                    onChange={(e) => handleChange('alarmSoundEnabled', e.target.checked)}
                  />
                  Play Alarm Audio (alarm.mp3 on Critical Events)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.alertFeedEnabled}
                    onChange={(e) => handleChange('alertFeedEnabled', e.target.checked)}
                  />
                  Display Real-time Alert Sidebar Feed
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.criticalAlertsEnabled}
                    onChange={(e) => handleChange('criticalAlertsEnabled', e.target.checked)}
                  />
                  Trigger Priority Focus Mode on Critical Intrusions
                </label>
              </div>
            </div>
          )}

          {activeTab === 'CAMERA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Default Camera Layout & System Feeds
              </h3>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Default Multi-Camera Grid Layout
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['ALL', '1', '2', '3'] as LayoutMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleChange('defaultLayout', mode)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: formData.defaultLayout === mode ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        background: formData.defaultLayout === mode ? 'var(--accent-cyan-glow)' : 'transparent',
                        color: formData.defaultLayout === mode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {mode === 'ALL' ? 'ALL CAMERAS' : `${mode} VIEW`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>System Camera Mapping Verification:</div>
                <div style={{ color: 'var(--text-secondary)' }}>• CAM-NORTH-01 → North Sector Gate 4 (vehicle_gate.mp4)</div>
                <div style={{ color: 'var(--text-secondary)' }}>• CAM-WEST-02 → West Post Checkpoint (office_crowd.mp4)</div>
                <div style={{ color: 'var(--text-secondary)' }}>• CAM-PARKING-03 → Parking Area (person.mp4)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
