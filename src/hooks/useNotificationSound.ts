'use client';

/**
 * useNotificationSound — generates UI sounds via Web Audio API.
 * No external audio files needed. Works on desktop + mobile.
 *
 * Design:
 * - AudioContext is created and resumed eagerly on first user interaction.
 * - `play()` is fully synchronous — no async/await, no setTimeout.
 * - Multi-tone sequences use Web Audio's `ctx.currentTime + offset` scheduling,
 *   which is sample-accurate and adds zero OS-level jitter.
 * - A silent buffer is played on init to keep iOS from suspending the context.
 */

type AudioContextCtor = typeof AudioContext;

let _ctx: AudioContext | null = null;
let _ctxReady = false;

/** Eagerly warm the AudioContext. Called on first click/touchstart. */
export async function warmAudio(): Promise<void> {
  if (_ctxReady || typeof window === 'undefined') return;
  try {
    const Ctor: AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
    _ctx = new Ctor();
    if (_ctx.state === 'suspended') await _ctx.resume();
    // Play a 1-sample silent buffer — keeps iOS AudioContext alive
    const silentBuf = _ctx.createBuffer(1, 1, _ctx.sampleRate);
    const src = _ctx.createBufferSource();
    src.buffer = silentBuf;
    src.connect(_ctx.destination);
    src.start(0);
    _ctxReady = true;
  } catch {
    // Non-critical
  }
}

/** Synchronously returns the ready context, or null if not yet warmed. */
function getCtx(): AudioContext | null {
  return _ctxReady ? _ctx : null;
}

/**
 * Schedule a single synthesised tone via Web Audio time offsets.
 * startOffset is in SECONDS (Web Audio time, not ms) — zero-jitter.
 */
function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  startOffset = 0,
  waveform: OscillatorType = 'sine',
  volume = 0.22
) {
  try {
    const t = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch {
    // Silent fail — audio is non-critical
  }
}

/** Map of notification type → sound effect. Offsets are in seconds (Web Audio time). */
const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  // New order (kitchen + cashier): ascending double chime C5 → E5
  ORDER_PENDING: (ctx) => {
    tone(ctx, 523, 0.18);
    tone(ctx, 659, 0.22, 0.18);
  },

  // Kitchen started order (cashier): soft single mid-low tone D4
  ORDER_IN_PROGRESS: (ctx) => {
    tone(ctx, 294, 0.28);
  },

  // Order ready for collection (cashier): triple ascending fanfare C5 → E5 → G5
  ORDER_READY: (ctx) => {
    tone(ctx, 523, 0.13);
    tone(ctx, 659, 0.13, 0.13);
    tone(ctx, 784, 0.22, 0.26);
  },

  // Order completed (admin): warm resolution tone G4
  ORDER_COMPLETED: (ctx) => {
    tone(ctx, 392, 0.25);
  },

  // Payment error (cashier): descending warning square tones Eb4 → C4
  PAYMENT_ERROR: (ctx) => {
    tone(ctx, 311, 0.22, 0, 'square', 0.18);
    tone(ctx, 261, 0.28, 0.22, 'square', 0.18);
  },

  // Low stock (admin): gentle bell A4
  LOW_STOCK: (ctx) => {
    tone(ctx, 440, 0.38);
  },

  // System alert (admin): two equal mid tones A4 → A4
  SYSTEM_ALERT: (ctx) => {
    tone(ctx, 440, 0.2);
    tone(ctx, 440, 0.2, 0.25);
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
    warmAudio().catch(() => {});
  }

  /**
   * Play the sound for a given notification type.
   * Fully synchronous — zero async overhead, sample-accurate scheduling.
   * Silently no-ops if AudioContext hasn’t been warmed yet.
   */
  function play(type: string, role?: string) {
    if (role && SOUND_ROLES[type] && !SOUND_ROLES[type].includes(role)) return;
    const soundFn = SOUNDS[type];
    if (!soundFn) return;
    const ctx = getCtx();
    if (!ctx) return;
    soundFn(ctx);
  }

  return { play, initAudio };
}
