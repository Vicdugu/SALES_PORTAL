'use client';

import { useEffect } from 'react';

export function HideDevTools() {
  useEffect(() => {
    // Aggressive removal function
    const aggressiveRemove = () => {
      try {
        // Remove ONLY dev tools related buttons - be very specific
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const id = btn.getAttribute('id') || '';
          
          // ONLY remove if it's explicitly a dev tools button
          if (
            ariaLabel === 'Open Next.js Dev Tools' ||
            id === 'next-logo' ||
            btn.hasAttribute('data-nextjs-dev-tools-button')
          ) {
            btn.style.cssText = 'display: none !important; visibility: hidden !important; pointer-events: none !important;';
            try {
              btn.parentElement?.removeChild(btn);
            } catch (e) {
              // Keep hidden via CSS if removal fails
            }
          }
        });

        // Remove alert dialogs and overlays
        document.querySelectorAll('[role="alertdialog"], [role="alert"], dialog, [data-nextjs-dialog-overlay]').forEach(el => {
          (el as HTMLElement).style.cssText = 'display: none !important; visibility: hidden !important; pointer-events: none !important;';
          try {
            el.parentElement?.removeChild(el);
          } catch (e) {
            // Keep hidden via CSS if removal fails
          }
        });
      } catch (e) {
        // Silently ignore errors
      }
    };

    // Remove immediately
    aggressiveRemove();

    // Remove on document ready
    if (document.readyState === 'complete') {
      aggressiveRemove();
    } else {
      document.addEventListener('DOMContentLoaded', aggressiveRemove);
      document.addEventListener('readystatechange', aggressiveRemove);
    }

    // Set aggressive observer - watch for ANY changes
    const observer = new MutationObserver(() => {
      aggressiveRemove();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'role', 'class', 'id'],
    });

    // Also remove on window events
    const events = ['load', 'focus', 'mousemove', 'click'];
    events.forEach(event => {
      window.addEventListener(event, aggressiveRemove, { capture: true });
    });

    // Periodic check
    const interval = setInterval(aggressiveRemove, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
      events.forEach(event => {
        window.removeEventListener(event, aggressiveRemove, { capture: true });
      });
      document.removeEventListener('DOMContentLoaded', aggressiveRemove);
      document.removeEventListener('readystatechange', aggressiveRemove);
    };
  }, []);

  return null;
}
