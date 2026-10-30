/** WebAudio 短哔哔：无资源文件。首次用户手势后解锁。 */

type Tone = 'hit' | 'hurt' | 'perfect' | 'rake' | 'ui' | 'win' | 'lose' | 'pickup' | 'phase';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 封面/按钮首次点击时调一次。 */
export function unlockAudio(): void {
  ac();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, slide = 0): void {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide !== 0) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function playSfx(kind: Tone): void {
  switch (kind) {
    case 'hit':
      beep(420, 0.06, 'square', 0.07);
      break;
    case 'hurt':
      beep(180, 0.12, 'sawtooth', 0.09, -80);
      break;
    case 'perfect':
      beep(660, 0.05, 'triangle', 0.08);
      beep(990, 0.08, 'triangle', 0.06);
      break;
    case 'rake':
      beep(140, 0.18, 'sawtooth', 0.1, 120);
      break;
    case 'ui':
      beep(520, 0.04, 'sine', 0.05);
      break;
    case 'win':
      beep(523, 0.1, 'triangle', 0.07);
      setTimeout(() => beep(659, 0.1, 'triangle', 0.07), 90);
      setTimeout(() => beep(784, 0.18, 'triangle', 0.08), 180);
      break;
    case 'lose':
      beep(300, 0.15, 'sawtooth', 0.08, -150);
      setTimeout(() => beep(160, 0.25, 'sawtooth', 0.07, -60), 120);
      break;
    case 'pickup':
      beep(880, 0.05, 'sine', 0.06);
      beep(1320, 0.07, 'sine', 0.05);
      break;
    case 'phase':
      beep(220, 0.2, 'square', 0.08, 200);
      break;
    default:
      break;
  }
}
