'use client';

/**
 * useNotificationSound — generates UI sounds via Web Audio API.
 * No external audio files needed. Works on desktop + mobile.
 *
 * Mobile note: AudioContext requires a user interaction before it can produce
 * audio. This hook initialises the context lazily on first user interaction,
 * then plays sounds freely after that.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Plays a single synthesised tone. */
function tone(
  frequency: number,
  duration: number,
  delayMs = 0,
  waveform: OscillatorType = 'sine',
  volume = 0.22
) {
  setTimeout(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = waveform;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      // Silent fail — audio is non-critical
    }
  }, delayMs);
}

/** Map of notification type → sound effect. */
const SOUNDS: Record<string, () => void> = {
  // New order (kitchen + cashier): ascending double chime C5 → E5
  ORDER_PENDING: () => {
    tone(523, 0.18);
    tone(659, 0.22, 180);
  },

  // Kitchen started order (cashier): soft single mid-low tone D4
  ORDER_IN_PROGRESS: () => {
    tone(294, 0.28);
  },

  // Order ready for collection (cashier): triple ascending fanfare C5 → E5 → G5
  ORDER_READY: () => {
    tone(523, 0.13);
    tone(659, 0.13, 130);
    tone(784, 0.22, 260);
  },

  // Order completed (admin): warm resolution tone G4
  ORDER_COMPLETED: () => {
    tone(392, 0.25);
  },

  // Payment error (cashier): descending warning square tones Eb4 → C4
  PAYMENT_ERROR: () => {
    tone(311, 0.22, 0, 'square', 0.18);
    tone(261, 0.28, 220, 'square', 0.18);
  },

  // Low stock (admin): gentle bell A4
  LOW_STOCK: () => {
    tone(440, 0.38);
  },

  // System alert (admin): two equal mid tones A4 → A4
  SYSTEM_ALERT: () => {
    tone(440, 0.2);
    tone(440, 0.2, 250);
  },
};

/**
 * Sounds that should play per role.
 * Key: notification type; value: set of roles that hear the sound.
 */
const SOUND_ROLES: Record<string, string[]> = {
  ORDER_PENDING: ['KITCHEN', 'ADMIN', 'SUPERADMIN'],
  ORDER_IN_PROGRESS: ['STAFF', 'ADMIN', 'SUPERADMIN'],
  ORDER_READY: ['STAFF', 'ADMIN', 'SUPERADMIN'],
  ORDER_COMPLETED: ['ADMIN', 'SUPERADMIN'],
  PAYMENT_ERROR: ['STAFF', 'ADMIN', 'SUPERADMIN'],
  LOW_STOCK: ['ADMIN', 'SUPERADMIN'],
  SYSTEM_ALERT: ['ADMIN', 'SUPERADMIN'],
};

export function useNotificationSound() {
  /** Initialise the AudioContext on first user interaction (required for mobile). */
  function initAudio() {
    getCtx();
  }

  /**
   * Play the sound for a given notification type.
   * @param type  NotificationType string
   * @param role  Current user's role — sound is skipped if not relevant to this role
   */
  function play(type: string, role?: string) {
    if (role && SOUND_ROLES[type] && !SOUND_ROLES[type].includes(role)) return;
    SOUNDS[type]?.();
  }

  return { play, initAudio };
}
