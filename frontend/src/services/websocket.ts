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
          console.warn('WebSocket connection closed unexpectedly. Retrying in 3s...');
          setTimeout(() => {
            if (!this.isIntentionalDisconnect) {
              this.connect();
            }
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        if (!this.isIntentionalDisconnect) {
          console.error('WebSocket error:', err);
        }
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket client:', err);
    }
  }

  public send(data: any) {
    if (this.ws && this.isConnected && !this.isIntentionalDisconnect) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
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
