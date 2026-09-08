import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggleTheme }) => {
  return (
    <button
      onClick={onToggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
        padding: '6px 14px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {theme === 'dark' ? (
        <>
          <Sun style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon style={{ width: '14px', height: '14px', color: '#8b5cf6' }} />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
};
