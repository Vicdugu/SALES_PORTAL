// Notification event broadcaster — in-memory pub/sub, same pattern as OrderBroadcaster.

export interface NotificationPayload {
  id: string;
  storeId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  category: string;
  isRead: boolean;
  createdAt: string; // ISO string (safe for SSE JSON)
}

type NotificationListener = (payload: NotificationPayload) => void;

class NotificationBroadcaster {
  private listeners: Map<string, Set<NotificationListener>> = new Map();
  private buffer: NotificationPayload[] = [];
  private maxBuffer = 100;

  subscribe(storeId: string, listener: NotificationListener): () => void {
    if (!this.listeners.has(storeId)) {
      this.listeners.set(storeId, new Set());
    }
    this.listeners.get(storeId)!.add(listener);
    return () => {
      this.listeners.get(storeId)?.delete(listener);
    };
  }

  broadcast(payload: NotificationPayload): void {
    const storeListeners = this.listeners.get(payload.storeId);
    if (storeListeners) {
      storeListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error('[NotificationBroadcaster] listener error:', err);
        }
      });
    }
    this.buffer.push(payload);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
  }

  getRecent(storeId: string, limit = 20): NotificationPayload[] {
    return this.buffer.filter((n) => n.storeId === storeId).slice(-limit);
  }

  clear(): void {
    this.listeners.clear();
    this.buffer = [];
  }
}

export const notificationBroadcaster = new NotificationBroadcaster();
