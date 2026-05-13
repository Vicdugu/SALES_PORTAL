'use client';

/**
 * useNotificationSound - generates UI sounds via Web Audio API.
 *
 * Design:
 * - AudioContext is created on first warmAudio() or play() call.
 * - play() resumes a suspended context inline then schedules tones immediately.
 *   On the very first sound (before user interaction on strict browsers) the
 *   resume() promise resolves in < 5ms and the tone fires right after.
 * - Tone sequences use ctx.currentTime+offset - sample-accurate, zero OS jitter.
 */

type AudioContextCtor = typeof AudioContext;

let _ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  try {
    const Ctor: AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
    _ctx = new Ctor();
  } catch {
    return null;
  }
  return _ctx;
}

/** Warm the context on first user interaction (call on click/touchstart). */
export async function warmAudio(): Promise<void> {
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    // Play a silent 1-sample buffer - keeps iOS from re-suspending
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // Non-critical
  }
}

/**
 * Schedule a single tone at ctx.currentTime + startOffset (seconds).
 */
function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  startOffset = 0,
  waveform: OscillatorType = 'sine',
  volume = 0.25
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
    // Silent fail
  }
}

/** Map of notification type -> sound. Offsets are in seconds. */
const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  ORDER_PENDING:     (ctx) => { tone(ctx, 523, 0.18); tone(ctx, 659, 0.22, 0.18); },
  ORDER_IN_PROGRESS: (ctx) => { tone(ctx, 294, 0.28); },
  ORDER_READY:       (ctx) => { tone(ctx, 523, 0.13); tone(ctx, 659, 0.13, 0.13); tone(ctx, 784, 0.22, 0.26); },
  ORDER_COMPLETED:   (ctx) => { tone(ctx, 392, 0.25); },
  PAYMENT_ERROR:     (ctx) => { tone(ctx, 311, 0.22, 0, 'square', 0.2); tone(ctx, 261, 0.28, 0.22, 'square', 0.2); },
  LOW_STOCK:         (ctx) => { tone(ctx, 440, 0.38); },
  SYSTEM_ALERT:      (ctx) => { tone(ctx, 440, 0.2); tone(ctx, 440, 0.2, 0.25); },
};

const SOUND_ROLES: Record<string, string[]> = {
  ORDER_PENDING:     ['KITCHEN', 'ADMIN', 'SUPERADMIN'],
  ORDER_IN_PROGRESS: ['STAFF', 'ADMIN', 'SUPERADMIN'],
  ORDER_READY:       ['STAFF', 'ADMIN', 'SUPERADMIN'],
  ORDER_COMPLETED:   ['ADMIN', 'SUPERADMIN'],
  PAYMENT_ERROR:     ['STAFF', 'ADMIN', 'SUPERADMIN'],
  LOW_STOCK:         ['ADMIN', 'SUPERADMIN'],
  SYSTEM_ALERT:      ['ADMIN', 'SUPERADMIN'],
};

export function useNotificationSound() {
  function initAudio() {
    warmAudio().catch(() => {});
  }

  /**
   * Play a notification sound immediately.
   * If the AudioContext is suspended, resumes it first (< 5ms on warm devices)
   * then fires the tone. Works on desktop, mobile, and tablet.
   */
  function play(type: string, role?: string) {
    if (role && SOUND_ROLES[type] && !SOUND_ROLES[type].includes(role)) return;
    const soundFn = SOUNDS[type];
    if (!soundFn) return;

    const ctx = ensureCtx();
    if (!ctx) return;

    if (ctx.state === 'running') {
      soundFn(ctx);
    } else {
      // Context suspended - resume then play immediately
      ctx.resume().then(() => soundFn(ctx)).catch(() => {});
    }
  }

  return { play, initAudio };
}
