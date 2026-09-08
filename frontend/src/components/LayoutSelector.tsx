import React from 'react';
import { LayoutGrid, Monitor, Columns, Square } from 'lucide-react';

export type LayoutMode = '1' | '2' | '3' | 'ALL';

interface LayoutSelectorProps {
  layoutMode: LayoutMode;
  onSelectLayout: (mode: LayoutMode) => void;
  totalCameras: number;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  layoutMode,
  onSelectLayout,
  totalCameras
}) => {
  const options: { mode: LayoutMode; label: string; icon: React.FC<{ style?: React.CSSProperties }> }[] = [
    { mode: '1', label: '1 VIEW', icon: Square },
    { mode: '2', label: '2 VIEW', icon: Columns },
    { mode: '3', label: '3 VIEW', icon: LayoutGrid },
    { mode: 'ALL', label: `ALL (${totalCameras})`, icon: Monitor }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--bg-card)',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)'
      }}
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        LAYOUT:
      </span>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = layoutMode === opt.mode;
        return (
          <button
            key={opt.mode}
            onClick={() => onSelectLayout(opt.mode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              background: isActive ? 'var(--accent-cyan)' : 'transparent',
              color: isActive ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <Icon style={{ width: '12px', height: '12px' }} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
