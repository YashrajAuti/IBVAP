import React, { useState, useEffect } from 'react';
import { Settings, Bell, BellOff, Clock, ChevronDown, Lock, Volume2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { audioAlertService } from '../services/audioAlert';

export type AlertsMode = 'ON' | 'MUTED' | 'DISABLED';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  fps: number;
  isAlarmActive?: boolean;
  onAcknowledgeAlarm?: () => void;
  onOpenSettings?: () => void;

  alertsMode: AlertsMode;
  muteTimerSeconds: number | null;
  onToggleAlertsMode: () => void;
  onSetTemporaryMute: (seconds: number | null) => void;

  isAIMode: boolean;
  onToggleAIMode: (isAI: boolean) => void;
  totalCameras: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  isAlarmActive = false,
  onAcknowledgeAlarm,
  onOpenSettings,
  alertsMode,
  muteTimerSeconds,
  onToggleAlertsMode,
  onSetTemporaryMute,
  isAIMode,
  onToggleAIMode,
  totalCameras
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMuteMenuOpen, setIsMuteMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header
      className={isAIMode ? "glass-panel" : "cctv-panel"}
      style={{
        height: '46px',
        minHeight: '46px',
        maxHeight: '46px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderRadius: isAIMode ? 'var(--radius-sm)' : '2px',
        border: isAlarmActive && isAIMode ? '1px solid var(--accent-rose)' : isAIMode ? '1px solid var(--border-color)' : '1px solid #1e2433',
        background: isAIMode ? undefined : '#07090e',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      {/* Brand & Platform Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            overflow: 'hidden',
            border: isAIMode ? '1px solid var(--accent-cyan)' : '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            flexShrink: 0,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <img
            src="/logo.jpeg"
            alt="IBVAP Logo"
            title="IBVAP — Intelligent Border Video Analytics Platform"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            title="IBVAP — Intelligent Border Video Analytics Platform"
            style={{ 
              fontSize: '0.9rem', 
              fontWeight: 800, 
              letterSpacing: '0.5px', 
              color: isAIMode ? 'var(--text-primary)' : '#f8fafc' 
            }}
          >
            {isAIMode ? 'IBVAP AI PLATFORM' : 'IBVAP CCTV MONITORING'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.3px', marginLeft: '4px' }}>
            ● SYSTEM ONLINE
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, borderLeft: isAIMode ? '1px solid var(--border-color)' : '1px solid #334155', paddingLeft: '8px' }}>
            CAMERAS: {totalCameras > 0 ? totalCameras : 12}
          </span>
        </div>
      </div>

      {/* Center: Mode Switcher (Traditional CCTV vs AI Specialized) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: isAIMode ? 'var(--bg-card)' : '#0a0d14',
          border: isAIMode ? '1px solid var(--border-color)' : '1px solid #334155',
          borderRadius: '4px',
          padding: '2px',
          gap: '2px'
        }}
      >
        <button
          onClick={() => onToggleAIMode(false)}
          title="Traditional CCTV Control-Room Mode"
          style={{
            background: !isAIMode ? '#2563eb' : 'transparent',
            color: !isAIMode ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '3px',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          TRADITIONAL CCTV
        </button>
        <button
          onClick={() => onToggleAIMode(true)}
          title="AI Specialized Video Analytics Mode"
          style={{
            background: isAIMode ? 'var(--accent-cyan)' : 'transparent',
            color: isAIMode ? '#ffffff' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '3px',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          AI SPECIALIZED
        </button>
      </div>

      {/* Right Controls & Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Active Alarm Banner (Visible in both CCTV and AI mode whenever alarm is triggered) */}
        {isAlarmActive && (
          <button
            onClick={onAcknowledgeAlarm}
            title="Intrusion Detected! Click to Silence & Acknowledge Alarm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ef4444',
              color: '#ffffff',
              border: '1px solid #dc2626',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 0 14px rgba(239, 68, 68, 0.8)',
              letterSpacing: '0.5px'
            }}
          >
            <Volume2 style={{ width: '13px', height: '13px' }} />
            🚨 ALARM ACTIVE — SILENCE
          </button>
        )}

        {/* Master Alert System Toggle & Test Siren */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={onToggleAlertsMode}
              title={alertsMode === 'ON' ? 'Click to Disable Alerts' : 'Click to Enable Alerts'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: alertsMode === 'ON' ? 'rgba(16, 185, 129, 0.15)' : alertsMode === 'MUTED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                border: alertsMode === 'ON' ? '1px solid var(--accent-emerald)' : alertsMode === 'MUTED' ? '1px solid #f59e0b' : '1px solid var(--accent-rose)',
                color: alertsMode === 'ON' ? 'var(--accent-emerald)' : alertsMode === 'MUTED' ? '#f59e0b' : 'var(--accent-rose)',
                padding: '3px 8px',
                borderRadius: '4px 0 0 4px',
                fontWeight: 700,
                fontSize: '0.68rem',
                cursor: 'pointer'
              }}
            >
              {alertsMode === 'ON' ? <Bell style={{ width: '11px', height: '11px' }} /> : <BellOff style={{ width: '11px', height: '11px' }} />}
              {alertsMode === 'ON' ? 'ALERTS ON' : alertsMode === 'MUTED' ? `MUTED (${muteTimerSeconds !== null ? formatTimer(muteTimerSeconds) : 'MANUAL'})` : 'DISABLED'}
            </button>

            <button
              onClick={() => setIsMuteMenuOpen(!isMuteMenuOpen)}
              title="Mute Options"
              style={{
                background: alertsMode === 'ON' ? 'rgba(16, 185, 129, 0.15)' : alertsMode === 'MUTED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                border: alertsMode === 'ON' ? '1px solid var(--accent-emerald)' : alertsMode === 'MUTED' ? '1px solid #f59e0b' : '1px solid var(--accent-rose)',
                borderLeft: 'none',
                color: alertsMode === 'ON' ? 'var(--accent-emerald)' : alertsMode === 'MUTED' ? '#f59e0b' : 'var(--accent-rose)',
                padding: '3px 5px',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronDown style={{ width: '11px', height: '11px' }} />
            </button>

            {isMuteMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '32px',
                  right: 0,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  zIndex: 100,
                  width: '140px'
                }}
              >
                <button
                  onClick={() => { onSetTemporaryMute(60); setIsMuteMenuOpen(false); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', textAlign: 'left', padding: '4px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock style={{ width: '11px', height: '11px' }} /> 1 Minute
                </button>
                <button
                  onClick={() => { onSetTemporaryMute(300); setIsMuteMenuOpen(false); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', textAlign: 'left', padding: '4px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Clock style={{ width: '11px', height: '11px' }} /> 5 Minutes
                </button>
                <button
                  onClick={() => { onSetTemporaryMute(null); setIsMuteMenuOpen(false); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', textAlign: 'left', padding: '4px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BellOff style={{ width: '11px', height: '11px' }} /> Until Enabled
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => audioAlertService.testAlarm()}
            title="Test Siren Sound & Unlock Browser Audio"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.68rem',
              cursor: 'pointer'
            }}
          >
            <Volume2 style={{ width: '11px', height: '11px' }} />
            TEST SIREN
          </button>
        </div>

        {/* AI Mode Pills */}
        {isAIMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.3)', fontWeight: 600 }}>
              ● AI ACTIVE
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(168, 85, 247, 0.12)', color: 'var(--accent-violet)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 600 }}>
              <Lock style={{ width: '10px', height: '10px' }} /> BLOCKCHAIN
            </span>
          </div>
        )}

        {/* Real-time Clock */}
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: isAIMode ? 'var(--text-primary)' : '#e2e8f0',
          background: isAIMode ? 'var(--bg-card)' : '#0a0d14',
          padding: '3px 8px',
          borderRadius: '3px',
          border: isAIMode ? '1px solid var(--border-color)' : '1px solid #1e293b'
        }}>
          {currentTime || '00:00:00'}
        </div>

        {/* Light/Dark Theme Toggle */}
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />

        {/* Settings Icon */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '4px'
          }}
        >
          <Settings style={{ width: '15px', height: '15px' }} />
        </button>
      </div>
    </header>
  );
};
