export interface Camera {
  id: number;
  camera_id: string;
  name: string;
  rtsp_url: string;
  location: string;
  status: string;
  created_at: string;
}

export interface DetectionEvent {
  id: number;
  event_id: string;
  event_type: string;
  camera_id: string;
  track_id: number | null;
  object_type: string;
  confidence: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: number;
  iso_timestamp: string;
  details_json?: string;
  created_at: string;
}

export interface ANPRRecord {
  id: number;
  camera_id: string;
  track_id: number;
  plate_number: string;
  confidence: number;
  timestamp: number;
  crop_path?: string;
  created_at: string;
}

export interface SpatialZone {
  id: number;
  camera_id: string;
  zone_type: 'polygon' | 'line';
  zone_name: string;
  coordinates_json: string;
  created_at: string;
}

const apiHost = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost';
const defaultApi = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? `https://${apiHost}/api/v1`
  : `http://${apiHost}:8000/api/v1`;

export const API_BASE = (import.meta.env.VITE_API_URL as string) || defaultApi;

export const fetchCameras = async (): Promise<Camera[]> => {
  try {
    const res = await fetch(`${API_BASE}/cameras`);
    if (!res.ok) throw new Error('Failed to fetch cameras');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock camera data:', err);
    return [
      { id: 1, camera_id: 'CAM-NORTH-01', name: 'North Sector Gate 4', rtsp_url: 'rtsp://192.168.1.101:554/live', location: 'Northern Perimeter', status: 'ACTIVE', created_at: new Date().toISOString() },
      { id: 2, camera_id: 'CAM-WEST-02', name: 'West Post Checkpoint', rtsp_url: 'rtsp://192.168.1.102:554/live', location: 'Western Outpost', status: 'ACTIVE', created_at: new Date().toISOString() },
      { id: 3, camera_id: 'CAM-PARKING-03', name: 'Parking Area', rtsp_url: 'rtsp://192.168.1.103:554/live', location: 'Parking Perimeter', status: 'ACTIVE', created_at: new Date().toISOString() }
    ];
  }
};

export const fetchEvents = async (severity?: string): Promise<DetectionEvent[]> => {
  try {
    const url = severity ? `${API_BASE}/events?severity=${severity}` : `${API_BASE}/events`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch events');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock events:', err);
    return [
      { id: 101, event_id: 'EVT-P901', event_type: 'RESTRICTED_ZONE_ENTRY', camera_id: 'CAM-PARKING-03', track_id: 14, object_type: 'person', confidence: 0.94, severity: 'CRITICAL', timestamp: Math.floor(Date.now() / 1000) - 120, iso_timestamp: '12:02:15', created_at: new Date().toISOString() },
      { id: 102, event_id: 'EVT-P902', event_type: 'LINE_CROSSING', camera_id: 'CAM-NORTH-01', track_id: 8, object_type: 'car', confidence: 0.91, severity: 'CRITICAL', timestamp: Math.floor(Date.now() / 1000) - 300, iso_timestamp: '11:59:10', created_at: new Date().toISOString() },
      { id: 103, event_id: 'EVT-P903', event_type: 'SUSPICIOUS_VEHICLE_ACCESS', camera_id: 'CAM-PARKING-03', track_id: 7, object_type: 'person', confidence: 0.96, severity: 'CRITICAL', timestamp: Math.floor(Date.now() / 1000) - 480, iso_timestamp: '11:56:05', created_at: new Date().toISOString() },
      { id: 104, event_id: 'EVT-P904', event_type: 'CROWD_LOITERING', camera_id: 'CAM-WEST-02', track_id: 22, object_type: 'person', confidence: 0.88, severity: 'WARNING', timestamp: Math.floor(Date.now() / 1000) - 720, iso_timestamp: '11:52:00', created_at: new Date().toISOString() },
    ];
  }
};

export const fetchANPRRecords = async (query?: string): Promise<ANPRRecord[]> => {
  try {
    const url = query ? `${API_BASE}/anpr?plate_number=${encodeURIComponent(query)}` : `${API_BASE}/anpr`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ANPR records');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock ANPR records:', err);
    return [
      { id: 1, camera_id: 'CAM-NORTH-01', track_id: 12, plate_number: 'DL-01-AB-1234', confidence: 0.96, timestamp: Math.floor(Date.now() / 1000) - 180, created_at: new Date().toISOString() },
      { id: 2, camera_id: 'CAM-NORTH-01', track_id: 18, plate_number: 'MH-12-DE-5678', confidence: 0.92, timestamp: Math.floor(Date.now() / 1000) - 420, created_at: new Date().toISOString() },
      { id: 3, camera_id: 'CAM-NORTH-01', track_id: 25, plate_number: 'KA-04-XY-9012', confidence: 0.89, timestamp: Math.floor(Date.now() / 1000) - 900, created_at: new Date().toISOString() },
    ];
  }
};

export const fetchZones = async (cameraId?: string): Promise<SpatialZone[]> => {
  try {
    const url = cameraId ? `${API_BASE}/zones?camera_id=${encodeURIComponent(cameraId)}` : `${API_BASE}/zones`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch zones');
    return await res.json();
  } catch (err) {
    console.warn('Backend offline, returning mock spatial zones:', err);
    return [
      { id: 1, camera_id: 'CAM-PARKING-03', zone_type: 'polygon', zone_name: 'Restricted Parking Zone', coordinates_json: '[[1000, 720], [1280, 720], [1280, 1080], [1000, 1080]]', created_at: new Date().toISOString() },
      { id: 2, camera_id: 'CAM-NORTH-01', zone_type: 'line', zone_name: 'Checkpoint Line A → B', coordinates_json: '[[350, 100], [350, 800]]', created_at: new Date().toISOString() }
    ];

  }
};

export const createZone = async (zoneData: { camera_id: string; zone_type: string; zone_name: string; coordinates: any[] }): Promise<SpatialZone> => {
  const res = await fetch(`${API_BASE}/zones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zoneData)
  });
  if (!res.ok) throw new Error('Failed to create zone');
  return await res.json();
};

export const deleteZone = async (zoneId: number): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/zones/${zoneId}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete zone from backend:', err);
    return false;
  }
};

