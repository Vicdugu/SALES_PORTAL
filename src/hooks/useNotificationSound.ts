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

async function getCtx(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Plays a single synthesised tone — ctx must already be running. */
function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  delayMs = 0,
  waveform: OscillatorType = 'sine',
  volume = 0.22
) {
  setTimeout(() => {
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

/** Map of notification type → sound effect (ctx is already running). */
const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  // New order (kitchen + cashier): ascending double chime C5 → E5
  ORDER_PENDING: (ctx) => {
    tone(ctx, 523, 0.18);
    tone(ctx, 659, 0.22, 180);
  },

  // Kitchen started order (cashier): soft single mid-low tone D4
  ORDER_IN_PROGRESS: (ctx) => {
    tone(ctx, 294, 0.28);
  },

  // Order ready for collection (cashier): triple ascending fanfare C5 → E5 → G5
  ORDER_READY: (ctx) => {
    tone(ctx, 523, 0.13);
    tone(ctx, 659, 0.13, 130);
    tone(ctx, 784, 0.22, 260);
  },

  // Order completed (admin): warm resolution tone G4
  ORDER_COMPLETED: (ctx) => {
    tone(ctx, 392, 0.25);
  },

  // Payment error (cashier): descending warning square tones Eb4 → C4
  PAYMENT_ERROR: (ctx) => {
    tone(ctx, 311, 0.22, 0, 'square', 0.18);
    tone(ctx, 261, 0.28, 220, 'square', 0.18);
  },

  // Low stock (admin): gentle bell A4
  LOW_STOCK: (ctx) => {
    tone(ctx, 440, 0.38);
  },

  // System alert (admin): two equal mid tones A4 → A4
  SYSTEM_ALERT: (ctx) => {
    tone(ctx, 440, 0.2);
    tone(ctx, 440, 0.2, 250);
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
    getCtx().catch(() => {});
  }

  /**
   * Play the sound for a given notification type.
   * Awaits AudioContext.resume() before scheduling tones to avoid first-play delay.
   * @param type  NotificationType string
   * @param role  Current user's role — sound is skipped if not relevant to this role
   */
  async function play(type: string, role?: string) {
    if (role && SOUND_ROLES[type] && !SOUND_ROLES[type].includes(role)) return;
    const soundFn = SOUNDS[type];
    if (!soundFn) return;
    const ctx = await getCtx();
    if (!ctx) return;
    soundFn(ctx);
  }

  return { play, initAudio };
}
