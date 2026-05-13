'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/store/notificationStore';

// ─── Icon map ────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  ORDER_PENDING: '🛎️',
  ORDER_IN_PROGRESS: '👨‍🍳',
  ORDER_READY: '✅',
  ORDER_COMPLETED: '🎉',
  LOW_STOCK: '📦',
  PAYMENT_ERROR: '❌',
  SYSTEM_ALERT: '⚠️',
};

const TYPE_LABEL: Record<string, string> = {
  ORDER_PENDING: 'New Order',
  ORDER_IN_PROGRESS: 'In Progress',
  ORDER_READY: 'Ready',
  ORDER_COMPLETED: 'Completed',
  LOW_STOCK: 'Low Stock',
  PAYMENT_ERROR: 'Payment Error',
  SYSTEM_ALERT: 'System Alert',
};

const CATEGORY_COLOR: Record<string, string> = {
  order: 'bg-blue-100 text-blue-700',
  inventory: 'bg-amber-100 text-amber-700',
  payment: 'bg-red-100 text-red-700',
  system: 'bg-gray-100 text-gray-700',
};

// ─── Time ago ────────────────────────────────────────────────────────────────
function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'order' | 'inventory' | 'payment' | 'system';

const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🔔' },
  { key: 'order', label: 'Orders', emoji: '🛎️' },
  { key: 'inventory', label: 'Stock', emoji: '📦' },
  { key: 'payment', label: 'Payments', emoji: '💳' },
  { key: 'system', label: 'System', emoji: '⚙️' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface NotificationPanelProps {
  userRole?: string;
  /** Optional Tailwind colour classes for the bell button background. */
  buttonClass?: string;
  muted?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function NotificationPanel({
  userRole,
  buttonClass = 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  muted = false,
}: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  useEffect(() => { setMounted(true); }, []);

  const { notifications, unreadCount, markAsRead, markAllRead, dismiss, clearRead } =
    useNotifications({ role: userRole, muted });

  // Recalculate position when opening
  const handleOpen = useCallback(() => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  // Close panel when clicking outside (both button and panel)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filtered = notifications.filter(
    (n: Notification) => filter === 'all' || n.category === filter
  );

  const filteredUnread = filtered.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="relative">
      {/* ── Bell button ─────────────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`relative p-2 rounded-lg transition border font-bold ${buttonClass}`}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full px-1 border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel — rendered via Portal so it escapes parent stacking contexts ── */}
      {isOpen && mounted && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: panelPos.top,
            right: panelPos.right,
            zIndex: 9999,
            maxHeight: 'calc(100vh - 80px)',
          }}
          className="w-[340px] max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Notifications
              {filteredUnread > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {filteredUnread} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded hover:bg-blue-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={clearRead}
                className="text-xs text-gray-400 hover:text-gray-600 font-semibold px-2 py-1 rounded hover:bg-gray-100"
                title="Clear read notifications"
              >
                Clear read
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 px-3 pt-2 pb-1 overflow-x-auto">
            {FILTERS.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-semibold transition ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <div className="text-3xl mb-2">🔕</div>
                No notifications here
              </div>
            ) : (
              filtered.map((n: Notification) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                  onDismiss={dismiss}
                />
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────
function NotificationRow({
  notification: n,
  onRead,
  onDismiss,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className={`relative px-4 py-3 flex gap-3 group transition ${
        n.isRead ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950/30'
      }`}
    >
      {/* Unread dot */}
      {!n.isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {n.title}
          </p>
          <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
            {timeAgo(n.createdAt)}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
          {n.message}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Category tag */}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              CATEGORY_COLOR[n.category] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {TYPE_LABEL[n.type] ?? n.type}
          </span>

          {/* Navigation link */}
          {n.link && (
            <a
              href={n.link}
              className="text-[10px] text-blue-600 hover:underline font-semibold"
              onClick={() => onRead(n.id)}
            >
              View →
            </a>
          )}

          {/* Mark read */}
          {!n.isRead && (
            <button
              onClick={() => onRead(n.id)}
              className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold"
            >
              Mark read
            </button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(n.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-600 flex-shrink-0 text-base leading-none mt-0.5 p-0.5 rounded"
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}
