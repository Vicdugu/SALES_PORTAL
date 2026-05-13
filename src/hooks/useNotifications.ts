'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { useNotificationSound, warmAudio } from './useNotificationSound';
import { apiCall } from '@/lib/api/client';

interface SSEMessage {
  type: 'connected' | 'notification' | 'heartbeat';
  notification?: Notification & { createdAt: string };
  timestamp: number;
}

interface UseNotificationsOptions {
  /** Current user role — used for sound targeting. */
  role?: string;
  /** Disable sound effects (default: enabled). */
  muted?: boolean;
}

/**
 * useNotifications — central notification hook.
 *
 * - Loads initial notifications from the DB on mount.
 * - Subscribes to /api/notifications/stream (SSE) for real-time delivery.
 * - Plays role-appropriate sounds on new notifications.
 * - Exposes all CRUD actions (markAsRead, markAllRead, dismiss, reportPaymentError).
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { role, muted = false } = options;

  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead: storeMarkAsRead,
    markAllAsRead: storeMarkAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const { play } = useNotificationSound();
  const sseRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // ── Load initial notifications ──────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiCall('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const items: Notification[] = data.data?.notifications ?? [];
      // Populate the store (newest-first, avoid duplicates)
      clearAll();
      items.forEach((n) => addNotification(n));
      // Fix unreadCount since we loaded them in bulk
      useNotificationStore.setState({
        unreadCount: items.filter((n) => !n.isRead).length,
      });
    } catch {
      // Non-fatal
    }
  }, [addNotification, clearAll]);

  // ── SSE connection ───────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (sseRef.current?.readyState === EventSource.OPEN) return;

    const storeId =
      typeof window !== 'undefined' ? localStorage.getItem('storeId') : null;
    const streamUrl = storeId
      ? `/api/notifications/stream?storeId=${encodeURIComponent(storeId)}`
      : '/api/notifications/stream';
    const es = new EventSource(streamUrl, { withCredentials: true });
    sseRef.current = es;

    es.addEventListener('message', (event) => {
      if (!mountedRef.current) return;
      try {
        const msg: SSEMessage = JSON.parse(event.data);

        if (msg.type === 'notification' && msg.notification) {
          const n = msg.notification;
          addNotification({
            ...n,
            createdAt: new Date(n.createdAt),
          });
          if (!muted) {
            play(n.type, role);
          }
        }
      } catch {
        // Malformed message — ignore
      }
    });

    es.addEventListener('error', () => {
      es.close();
      sseRef.current = null;
      // Reconnect after 5 seconds
      setTimeout(() => {
        if (mountedRef.current) connect();
      }, 5_000);
    });
  }, [addNotification, muted, play, role]);

  useEffect(() => {
    mountedRef.current = true;

    // Re-warm AudioContext on every interaction so it never stays suspended.
    // { once: true } caused issues: after ~60s browser auto-suspends the context
    // and the next SSE sound arrives in a non-gesture callback — browsers block
    // resume() there. Re-warming on every click keeps the context alive.
    const onInteraction = () => warmAudio().catch(() => {});
    document.addEventListener('click', onInteraction);
    document.addEventListener('touchstart', onInteraction);

    loadNotifications();
    connect();

    // ── Polling fallback ─────────────────────────────────────────────────
    // Vercel serverless instances don't share memory, so the in-memory
    // broadcaster may not reach the SSE stream on a different instance.
    // Poll every 10 s and surface any DB notifications not yet in the store.
    const pollInterval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await apiCall('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        const items: Notification[] = data.data?.notifications ?? [];
        const knownIds = new Set(
          useNotificationStore.getState().notifications.map((n) => n.id)
        );
        items.forEach((n) => {
          if (!knownIds.has(n.id)) {
            addNotification({ ...n, createdAt: new Date(n.createdAt) });
            if (!n.isRead && !muted) play(n.type, role);
          }
        });
      } catch {
        // Non-fatal
      }
    }, 10_000);

    return () => {
      mountedRef.current = false;
      clearInterval(pollInterval);
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, [connect, loadNotifications, addNotification, muted, play, role]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (id: string) => {
      storeMarkAsRead(id);
      try {
        await apiCall(`/api/notifications/${id}`, { method: 'PATCH' });
      } catch {
        // Optimistic update already applied; silent fail
      }
    },
    [storeMarkAsRead]
  );

  const markAllRead = useCallback(async () => {
    storeMarkAllAsRead();
    try {
      await apiCall('/api/notifications/read-all', { method: 'PATCH' });
    } catch {}
  }, [storeMarkAllAsRead]);

  const dismiss = useCallback(
    async (id: string) => {
      removeNotification(id);
      try {
        await apiCall(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch {}
    },
    [removeNotification]
  );

  const clearRead = useCallback(async () => {
    try {
      await apiCall('/api/notifications', { method: 'DELETE' });
      // Remove read notifications from local store
      useNotificationStore.setState((state) => ({
        notifications: state.notifications.filter((n) => !n.isRead),
      }));
    } catch {}
  }, []);

  /** Report a client-side payment error (e.g. network failure during checkout). */
  const reportPaymentError = useCallback(
    async (message: string) => {
      try {
        await apiCall('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            type: 'PAYMENT_ERROR',
            title: 'Payment Failed',
            message,
            link: '/till',
          }),
        });
      } catch {}
    },
    []
  );

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    dismiss,
    clearRead,
    reportPaymentError,
    reload: loadNotifications,
  };
}
