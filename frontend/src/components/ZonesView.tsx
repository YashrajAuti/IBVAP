import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Eye } from 'lucide-react';
import { SpatialZone, fetchZones, deleteZone } from '../services/api';


interface ZonesViewProps {
  onOpenZoneDrawer: (camId: string) => void;
}

export const ZonesView: React.FC<ZonesViewProps> = ({ onOpenZoneDrawer }) => {
  const [zones, setZones] = useState<SpatialZone[]>([]);
  const [disabledZones, setDisabledZones] = useState<Record<number, boolean>>({});

  const loadZones = async () => {
    const data = await fetchZones();
    setZones(data);
  };

  useEffect(() => {
    loadZones();
  }, []);

  const toggleZone = (id: number) => {
    setDisabledZones((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = async (id: number) => {
    const ok = await deleteZone(id);
    if (ok) {
      setZones((prev) => prev.filter((z) => z.id !== id));
    } else {
      setZones((prev) => prev.filter((z) => z.id !== id));
    }
  };

  const getRecentIntrusionsCount = (camId: string) => {
    if (camId.includes('PARKING') || camId === 'CAM-PARKING-03') return 4;
    if (camId.includes('WEST') || camId === 'CAM-WEST-02') return 2;
    return 1;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers style={{ width: '22px', height: '22px', color: 'var(--accent-cyan)' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              SPATIAL BOUNDARY & ZONE RULE MANAGEMENT
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Configure restricted polygon zones, virtual boundary fences, and line-crossing detection rules per camera
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenZoneDrawer('CAM-PARKING-03')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
          ADD SPATIAL RULE
        </button>
      </div>

      {/* Zones Table */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Zone Name</th>
                <th style={{ padding: '10px 12px' }}>Camera</th>
                <th style={{ padding: '10px 12px' }}>Rule Type</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Recent Intrusions</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No spatial rules configured yet. Click "Add Spatial Rule" above to create one.
                  </td>
                </tr>
              ) : (
                zones.map((z) => {
                  const isDisabled = !!disabledZones[z.id];

                  return (
                    <tr key={z.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', opacity: isDisabled ? 0.5 : 1 }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {z.zone_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {z.camera_id}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${z.zone_type === 'polygon' ? 'badge-critical' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>
                          {z.zone_type === 'polygon' ? 'RESTRICTED POLYGON' : 'VIRTUAL FENCE LINE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: isDisabled ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.75rem' }}>
                          {isDisabled ? 'DISABLED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-rose)' }}>
                        {getRecentIntrusionsCount(z.camera_id)} Hits
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => toggleZone(z.id)}
                            style={{
                              background: isDisabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: isDisabled ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isDisabled ? 'ENABLE' : 'DISABLE'}
                          </button>

                          <button
                            onClick={() => onOpenZoneDrawer(z.camera_id)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye style={{ width: '12px', height: '12px' }} /> VIEW
                          </button>

                          <button
                            onClick={() => handleDelete(z.id)}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: 'none',
                              padding: '4px',
                              cursor: 'pointer'
                            }}
                            title="Delete Zone"
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
