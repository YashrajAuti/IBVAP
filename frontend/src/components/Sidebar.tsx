import {
  LayoutDashboard,
  Video,
  Camera,
  Bell,
  BarChart3,
  FileText,
  Layers,
  Activity,
  Lock,
  Settings,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab
}) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'LIVE', label: 'Live Monitoring', icon: Video },
    { id: 'CAMERAS', label: 'Cameras', icon: Camera },
    { id: 'ALERTS', label: 'Alerts', icon: Bell },
    { id: 'ANALYTICS', label: 'AI Analytics & Reports', icon: BarChart3, aliases: ['TRACKING', 'FACE', 'REPORTS'] },
    { id: 'ANPR', label: 'ANPR Plates', icon: FileText },
    { id: 'ZONES', label: 'Zones & Fences', icon: Layers },
    { id: 'EVENTS', label: 'Events Audit', icon: Activity },
    { id: 'BLOCKCHAIN', label: 'Blockchain & Evidence', icon: Lock, aliases: ['EVIDENCE'] },
    { id: 'SETTINGS', label: 'System Settings', icon: Settings }
  ];

  return (
    <aside
      className="glass-panel"
      style={{
        width: isCollapsed ? '58px' : '190px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 6px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        zIndex: 10
      }}
    >
      {/* Navigation Link List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.aliases && item.aliases.includes(activeTab));
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'var(--accent-cyan-glow)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              <Icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Operator Profile Card & Collapse Toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
        {/* Operator Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User style={{ width: '14px', height: '14px', color: 'var(--accent-cyan)' }} />
          </div>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Security Operator
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Command Center
              </span>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-end',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          {isCollapsed ? (
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
              <span>COLLAPSE</span>
              <ChevronLeft style={{ width: '16px', height: '16px' }} />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
