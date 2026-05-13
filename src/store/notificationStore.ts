import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'LOW_STOCK' | 'ORDER_READY' | 'ORDER_PENDING' | 'ORDER_IN_PROGRESS' | 'ORDER_COMPLETED' | 'SYSTEM_ALERT' | 'PAYMENT_ERROR';
  title: string;
  message: string;
  link?: string | null;
  category: string;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      // Avoid duplicates (polling fallback may race with SSE)
      if (state.notifications.some((n) => n.id === notification.id)) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
      };
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: state.unreadCount - 1,
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
