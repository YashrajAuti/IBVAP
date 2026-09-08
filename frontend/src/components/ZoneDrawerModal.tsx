import React, { useState } from 'react';
import { X, Layers } from 'lucide-react';
import { createZone } from '../services/api';

interface ZoneModalProps {
  cameraId: string;
  isOpen: boolean;
  onClose: () => void;
  onZoneCreated: () => void;
}

export const ZoneDrawerModal: React.FC<ZoneModalProps> = ({ cameraId, isOpen, onClose, onZoneCreated }) => {
  const [zoneType, setZoneType] = useState<'polygon' | 'line'>('polygon');
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;

    setLoading(true);
    setSuccessMsg('');

    try {
      const defaultCoords = zoneType === 'polygon'
        ? [[200, 200], [600, 200], [600, 500], [200, 500]]
        : [[700, 150], [700, 600]];

      await createZone({
        camera_id: cameraId,
        zone_type: zoneType,
        zone_name: zoneName,
        coordinates: defaultCoords
      });

      setSuccessMsg(`✅ ${zoneType === 'polygon' ? 'Restricted Zone' : 'Virtual Line'} configured successfully!`);
      setTimeout(() => {
        onZoneCreated();
        onClose();
        setSuccessMsg('');
        setZoneName('');
      }, 1000);
    } catch (err) {
      alert('Failed to create zone: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '440px', padding: '24px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Layers style={{ width: '22px', height: '22px', color: 'var(--accent-cyan)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Configure Spatial Rule</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Rule Type
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setZoneType('polygon')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: zoneType === 'polygon' ? '1px solid var(--accent-rose)' : '1px solid var(--border-color)',
                  background: zoneType === 'polygon' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  color: zoneType === 'polygon' ? 'var(--accent-rose)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Restricted Polygon Zone
              </button>
              <button
                type="button"
                onClick={() => setZoneType('line')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: zoneType === 'line' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: zoneType === 'line' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  color: zoneType === 'line' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Virtual Fence Line
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Rule / Zone Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sector 4 Restricted Perimeter"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          {successMsg && (
            <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {loading ? 'Saving...' : 'Save Spatial Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
