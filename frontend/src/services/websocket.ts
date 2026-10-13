export interface CameraStatsPayload {
  active_track_count: number;
  person_count: number;
  vehicle_count: number;
  zone_intrusions: number;
  line_crossings: number;
  anpr_hits: number;
}

export interface WSFramePayload {
  type: 'frame_update';
  camera_id: string;
  frame_idx: number;
  timestamp: number;
  frame_width?: number;
  frame_height?: number;
  frame_b64?: string;
  active_tracks: Array<{
    id: number;
    class_name: string;
    confidence: number;
    bbox: number[];
    bottom_center: [number, number];
    plate?: string;
  }>;
  stats?: CameraStatsPayload;
  alarm_active?: boolean;
}

export interface WSEventPayload {
  type: 'spatial_event';
  event_id: string;
  event_type: string;
  camera_id: string;
  track_id: number;
  object_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: number;
  play_alarm?: boolean;
  alarm_active?: boolean;
}

export type WSMessage = WSFramePayload | WSEventPayload;

export class IBVAPWebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private onMessageCallback: (msg: WSMessage) => void;
  private isConnected: boolean = false;
  private isIntentionalDisconnect: boolean = false;

  constructor(url: string, onMessage: (msg: WSMessage) => void) {
    this.url = url;
    this.onMessageCallback = onMessage;
  }

  public connect() {
    this.isIntentionalDisconnect = false;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.stopSimulation();
        console.log('✅ Connected to IBVAP Live WebSocket Server:', this.url);
      };

      this.ws.onmessage = (event) => {
        if (this.isIntentionalDisconnect) return;
        try {
          const data: WSMessage = JSON.parse(event.data);
          this.onMessageCallback(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (!this.isIntentionalDisconnect) {
          this.startSimulation();
          console.warn('WebSocket connection closed. Retrying in 3s...');
          setTimeout(() => {
            if (!this.isIntentionalDisconnect) {
              this.connect();
            }
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        if (!this.isIntentionalDisconnect) {
          console.warn('WebSocket error, engaging standalone simulation mode:', err);
          this.startSimulation();
        }
      };
    } catch (err) {
      console.warn('Failed to initialize WebSocket client, engaging simulation:', err);
      this.startSimulation();
    }
  }

  private simInterval: any = null;
  private simStep: number = 0;

  private startSimulation() {
    if (this.simInterval || this.isConnected || this.isIntentionalDisconnect) return;
    console.log('📡 IBVAP Cloud Simulation Mode active (rendering demo telemetry)');

    const cameras = ['CAM-NORTH-01', 'CAM-WEST-02', 'CAM-PARKING-03'];

    this.simInterval = setInterval(() => {
      if (this.isConnected || this.isIntentionalDisconnect) {
        this.stopSimulation();
        return;
      }
      this.simStep++;
      const t = this.simStep * 0.08;

      cameras.forEach((camId, idx) => {
        const offset = idx * 2.2;
        const x1 = Math.round(420 + Math.sin(t + offset) * 160);
        const y1 = Math.round(360 + Math.cos(t * 0.7 + offset) * 100);

        const tracks: WSFramePayload['active_tracks'] = [
          {
            id: 10 + idx,
            class_name: idx === 0 ? 'car' : 'person',
            confidence: 0.94,
            bbox: [x1, y1, x1 + (idx === 0 ? 190 : 85), y1 + (idx === 0 ? 120 : 190)],
            bottom_center: [x1 + 45, y1 + (idx === 0 ? 120 : 190)] as [number, number],
            plate: idx === 0 ? 'DL-01-AB-1234' : undefined
          }
        ];

        if (idx === 2) {
          const pX = Math.round(1040 + Math.sin(t * 0.5) * 60);
          const pY = Math.round(840 + Math.cos(t * 0.5) * 50);
          tracks.push({
            id: 7,
            class_name: 'person',
            confidence: 0.96,
            bbox: [pX, pY - 150, pX + 80, pY],
            bottom_center: [pX + 40, pY] as [number, number]
          });
        }

        const isAlarm = idx === 2 && (this.simStep % 100 < 35);

        const framePayload: WSFramePayload = {
          type: 'frame_update',
          camera_id: camId,
          frame_idx: this.simStep,
          timestamp: Date.now() / 1000,
          frame_width: 1920,
          frame_height: 1080,
          frame_b64: '',
          active_tracks: tracks,
          alarm_active: isAlarm,
          stats: {
            active_track_count: tracks.length,
            person_count: tracks.filter(trk => trk.class_name === 'person').length,
            vehicle_count: tracks.filter(trk => trk.class_name !== 'person').length,
            zone_intrusions: isAlarm ? 1 : 0,
            line_crossings: idx === 0 ? (this.simStep % 70 < 8 ? 1 : 0) : 0,
            anpr_hits: idx === 0 ? 3 : 0
          }
        };

        this.onMessageCallback(framePayload);
      });
    }, 120);
  }

  private stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  public send(data: any) {
    if (this.ws && this.isConnected && !this.isIntentionalDisconnect) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    this.stopSimulation();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch (err) {
        // Ignore close errors on shutdown
      }
      this.ws = null;
    }
  }
}
