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
 * Schedule a single tone at ctx.currentTime + startOffset.
 * Fades in over `fadeIn` seconds then decays to silence by `duration`.
 */
function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  startOffset = 0,
  waveform: OscillatorType = 'triangle',
  volume = 0.75,
  fadeIn = 0.06
) {
  try {
    const t = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, t);
    // Fade in
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + fadeIn);
    // Decay to silence
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch {
    // Silent fail
  }
}

/** All sounds last ~2 seconds with a gentle fade-in. */
const SOUNDS: Record<string, (ctx: AudioContext) => void> = {
  // New order — bold two-tone ding
  ORDER_PENDING: (ctx) => {
    tone(ctx, 880, 1.0, 0.0, 'triangle', 0.8);
    tone(ctx, 1046, 1.2, 0.85, 'triangle', 0.8);
  },
  // Kitchen started — mid tone
  ORDER_IN_PROGRESS: (ctx) => {
    tone(ctx, 660, 2.0, 0.0, 'triangle', 0.7);
  },
  // Order ready — rising three-note chime
  ORDER_READY: (ctx) => {
    tone(ctx, 784, 0.7, 0.0,  'triangle', 0.8);
    tone(ctx, 988, 0.7, 0.65, 'triangle', 0.8);
    tone(ctx, 1175, 1.0, 1.25, 'triangle', 0.85);
  },
  // Completed — two descending notes
  ORDER_COMPLETED: (ctx) => {
    tone(ctx, 784, 1.0, 0.0,  'triangle', 0.7);
    tone(ctx, 523, 1.2, 0.9,  'triangle', 0.7);
  },
  // Payment error — harsh square buzz
  PAYMENT_ERROR: (ctx) => {
    tone(ctx, 220, 0.9, 0.0,  'square', 0.7);
    tone(ctx, 185, 1.1, 0.95, 'square', 0.7);
  },
  // Low stock — insistent double pulse
  LOW_STOCK: (ctx) => {
    tone(ctx, 880, 0.7, 0.0,  'triangle', 0.75);
    tone(ctx, 880, 0.9, 0.85, 'triangle', 0.75);
  },
  // System alert — triple pulse
  SYSTEM_ALERT: (ctx) => {
    tone(ctx, 880, 0.5, 0.0,  'triangle', 0.75);
    tone(ctx, 880, 0.5, 0.6,  'triangle', 0.75);
    tone(ctx, 880, 0.7, 1.2,  'triangle', 0.75);
  },
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
