import React from 'react';
import { CameraGrid } from './CameraGrid';
import { AlertPanel } from './AlertPanel';
import { DetectionEvent, Camera } from '../services/api';
import { WSFramePayload } from '../services/websocket';
import { ShieldCheck, Video, Bell, Users, Car, AlertTriangle, FileCheck, Lock } from 'lucide-react';

interface DashboardViewProps {
  cameras: Camera[];
  framesMap: Record<string, WSFramePayload>;
  events: DetectionEvent[];
  isProcessing: boolean;
  onToggleProcessing: () => void;
  onOpenZoneDrawer: (camId: string) => void;
  onSelectCameraToView: (camId: string) => void;
  priorityCameraId: string | null;
  onAcknowledgeAlarm: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cameras,
  framesMap,
  events,
  isProcessing,
  onToggleProcessing,
  onOpenZoneDrawer,
  priorityCameraId,
  onAcknowledgeAlarm,
  onNavigateTab
}) => {
  const metricCards = [
    { label: 'Active Cameras', value: '12', icon: Video, color: 'var(--accent-cyan)', tab: 'CAMERAS' },
    { label: 'Active Alerts', value: '03', icon: Bell, color: '#f43f5e', tab: 'ALERTS', highlight: true },
    { label: 'People Detected', value: '127', icon: Users, color: 'var(--text-primary)', tab: 'TRACKING' },
    { label: 'Vehicles Detected', value: '45', icon: Car, color: 'var(--text-primary)', tab: 'ANPR' },
    { label: 'Intrusions Today', value: '07', icon: AlertTriangle, color: '#f59e0b', tab: 'ZONES' },
    { label: 'Evidence Events', value: '23', icon: FileCheck, color: 'var(--accent-emerald)', tab: 'EVIDENCE' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
      {/* 1. Operational Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(card.tab)}
              className="glass-panel"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: card.highlight ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-color)',
                background: card.highlight ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-panel)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: card.color, marginTop: '2px' }}>
                  {card.value}
                </div>
              </div>
              <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)' }}>
                <Icon style={{ width: '18px', height: '18px', color: card.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Main Dashboard Split: 2x2 Camera Grid (Left) + Live Alert & Blockchain Audit (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Left: 2x2 CCTV Surveillance View */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <CameraGrid
            cameras={cameras}
            framesMap={framesMap}
            layoutMode="ALL"
            onSelectLayout={() => {}}
            isProcessing={isProcessing}
            onToggleProcessing={onToggleProcessing}
            onOpenZoneDrawer={onOpenZoneDrawer}
            priorityCameraId={priorityCameraId}
            onAcknowledgeAlarm={onAcknowledgeAlarm}
            isAIMode={true}
          />
        </div>

        {/* Right Column: Live Alerts & Blockchain Integrity Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
          {/* Live Alert Panel */}
          <div style={{ flex: 1, minHeight: '260px' }}>
            <AlertPanel events={events} />
          </div>

          {/* Blockchain Integrity Quick Widget */}
          <div className="glass-panel" style={{ padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock style={{ width: '15px', height: '15px', color: 'var(--accent-emerald)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Blockchain Integrity</span>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                SYNCHRONIZED
              </span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ledger Network:</span>
                <strong style={{ color: 'var(--text-primary)' }}>PERMISSIONED</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Latest Block:</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>#1027</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Evidence Hash (SHA-256):</span>
                <strong style={{ fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>8F91A6...D92A</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                <ShieldCheck style={{ width: '14px', height: '14px' }} />
                <span>VERIFIED (0 Integrity Exceptions)</span>
              </div>
            </div>
            
            <button
              onClick={() => onNavigateTab('BLOCKCHAIN')}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Open Blockchain Ledger Audit →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
