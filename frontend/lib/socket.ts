/**
 * WebSocket client singleton for real-time messaging.
 * Provides connect/disconnect lifecycle and pub/sub event handling.
 * TODO: Implement actual WebSocket connection once backend handler is ready.
 */

type EventCallback = (data: unknown) => void;

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

class SocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private intentionalDisconnect = false;

  /**
   * Establish a WebSocket connection to the Beacon server.
   * The backend authenticates via the JWT passed as a path segment (`/ws/{token}`).
   */
  connect(token?: string): void {
    if (!token) return;
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.intentionalDisconnect = false;
    const url = `${WS_BASE_URL}/${encodeURIComponent(token)}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.info("[socket] Connected");
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const { type, payload } = JSON.parse(event.data as string) as {
            type: string;
            payload: unknown;
          };
          this.emit(type, payload);
        } catch {
          console.warn("[socket] Failed to parse incoming message");
        }
      };

      this.socket.onclose = () => {
        console.info("[socket] Disconnected");
        if (!this.intentionalDisconnect) {
          this.attemptReconnect(token);
        }
      };

      this.socket.onerror = (error) => {
        console.error("[socket] Error:", error);
      };
    } catch (error) {
      console.error("[socket] Connection failed:", error);
    }
  }

  /**
   * Gracefully close the WebSocket connection.
   */
  disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners.clear();
  }

  /**
   * Send a typed event to the server.
   * TODO: Queue messages when socket is not yet open.
   */
  send(type: string, payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn("[socket] Cannot send — socket not connected");
      return;
    }
    this.socket.send(JSON.stringify({ type, payload }));
  }

  /**
   * Subscribe to a server event type.
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from a server event type.
   */
  unsubscribe(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Returns whether the socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  private attemptReconnect(token?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[socket] Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(token), delay);
  }
}

/** Singleton WebSocket client instance */
export const socket = new SocketClient();

export { WS_BASE_URL };
export type { EventCallback };
