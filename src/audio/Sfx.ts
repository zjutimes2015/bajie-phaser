/**
 * 短 SFX：ZzFX 参数表驱动（无 wav）。
 * 对标 https://github.com/KilledByAPixel/ZzFX — 噪声冲击 + 包络 + 滑频。
 */

import { unlockZzfx, zzfx } from './ZzFXMicro';

export type Tone =
  | 'hit'
  | 'rake'
  | 'hurt'
  | 'perfect'
  | 'dodge'
  | 'ui'
  | 'win'
  | 'lose'
  | 'pickup'
  | 'phase'
  | 'warn'
  | 'button';

/** 单音参数；多音（胜负）用带 delayMs 的序列。 */
type Shot = { params: number[]; delayMs?: number };

/**
 * ZzFX 参数序：volume, randomness, frequency, attack, sustain, release,
 * shape(0sin/1tri/2saw/3tan/4noise), shapeCurve, slide, deltaSlide,
 * pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, ...
 */
const TABLE: Record<Tone, Shot[]> = {
  // 轻击：短噪声冲击 + 下滑
  hit: [{ params: [1.4, 0.05, 380, 0.002, 0.02, 0.06, 4, 1.6, -3, 0, 0, 0, 0, 0.35] }],
  // 钉耙：低频锯齿 + 噪声体量感
  rake: [
    { params: [1.8, 0.08, 90, 0.01, 0.08, 0.18, 2, 1.4, 0.4, 0.1, 0, 0, 0, 0.55] },
    { params: [1.0, 0.05, 140, 0, 0.04, 0.12, 4, 1.2, -1, 0, 0, 0, 0, 0.4], delayMs: 30 },
  ],
  // 受伤：下行锯齿
  hurt: [{ params: [1.5, 0.05, 200, 0.01, 0.06, 0.2, 2, 1.8, -2.5, 0, 0, 0, 0, 0.25] }],
  // 完美：两段上跳三角
  perfect: [
    { params: [1.0, 0.02, 660, 0.005, 0.04, 0.08, 1, 1.2, 0, 0, 330, 0.04] },
    { params: [0.8, 0.02, 990, 0.005, 0.05, 0.1, 1, 1.1], delayMs: 40 },
  ],
  // 闪避：短促上滑正弦
  dodge: [{ params: [0.9, 0.04, 420, 0.002, 0.02, 0.08, 0, 1.4, 6] }],
  // UI 轻点
  ui: [{ params: [0.55, 0.02, 620, 0.002, 0.01, 0.04, 1, 1.2] }],
  // 按钮按下：更闷一点
  button: [{ params: [0.65, 0.02, 480, 0.001, 0.01, 0.035, 0, 1.5, -2] }],
  // 胜：上行旋律
  win: [
    { params: [0.85, 0.01, 523, 0.01, 0.06, 0.1, 1] },
    { params: [0.85, 0.01, 659, 0.01, 0.06, 0.1, 1], delayMs: 90 },
    { params: [1.0, 0.01, 784, 0.01, 0.1, 0.18, 1], delayMs: 180 },
  ],
  // 负：下行
  lose: [
    { params: [1.1, 0.05, 280, 0.02, 0.08, 0.22, 2, 1.5, -3] },
    { params: [1.0, 0.05, 150, 0.02, 0.1, 0.28, 2, 1.6, -2], delayMs: 130 },
  ],
  // 拾取：叮叮
  pickup: [
    { params: [0.75, 0.02, 880, 0.002, 0.03, 0.06, 1] },
    { params: [0.65, 0.02, 1320, 0.002, 0.04, 0.08, 1], delayMs: 45 },
  ],
  // 变招：低频噪声轰
  phase: [{ params: [1.4, 0.1, 160, 0.04, 0.1, 0.28, 4, 1.3, 2, 0, 0, 0, 0, 0.5] }],
  // 完美窗提示：尖短 beep
  warn: [{ params: [0.7, 0.02, 920, 0.001, 0.015, 0.05, 1, 1.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 900] }],
};

/** 封面/按钮首次点击时调一次。 */
export function unlockAudio(): void {
  unlockZzfx();
}

function playShot(shot: Shot): void {
  const run = () => {
    zzfx(...(shot.params as Parameters<typeof zzfx>));
  };
  if (shot.delayMs && shot.delayMs > 0) setTimeout(run, shot.delayMs);
  else run();
}

export function playSfx(kind: Tone): void {
  const shots = TABLE[kind];
  if (!shots) throw new Error(`[Sfx] unknown kind: ${String(kind)}`);
  for (const shot of shots) playShot(shot);
}
