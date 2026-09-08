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

const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE = `http://${apiHost || 'localhost'}:8000/api/v1`;

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
    return [];
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
    return [];
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

