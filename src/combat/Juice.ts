import Phaser from 'phaser';
import type { AttackTier } from './Frames';
import { playSfx } from '../audio/Sfx';
import { FONT } from '../rules/Copy';

/** 同帧多层反馈 + 表现层 tween（逻辑层不管这些）。 */

/** trauma 分层震屏：轻/重/完美 */
const SHAKE: Record<AttackTier, { intensity: number; ms: number }> = {
  light: { intensity: 0.007, ms: 85 },
  rake: { intensity: 0.02, ms: 210 },
  perfect: { intensity: 0.014, ms: 150 },
};

export function shake(scene: Phaser.Scene, intensity = 0.006, duration = 120): void {
  scene.cameras.main.shake(duration, intensity);
}

export function screenFlash(scene: Phaser.Scene, color = 0xfff0c0, alpha = 0.35, ms = 80): void {
  const { width, height } = scene.scale;
  const f = scene.add.rectangle(width / 2, height / 2, width, height, color, alpha).setDepth(40);
  scene.tweens.add({
    targets: f,
    alpha: 0,
    duration: ms,
    onComplete: () => f.destroy(),
  });
}

/** 按钮/拾取 pop：短促放大回弹 */
export function popScale(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { setScale: (x: number, y?: number) => unknown },
  peak = 1.25,
): void {
  scene.tweens.killTweensOf(target);
  scene.tweens.add({
    targets: target,
    scaleX: peak,
    scaleY: peak,
    duration: 70,
    yoyo: true,
    ease: 'Back.easeOut',
  });
}

export function slashSwipe(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facing: number,
  color = 0xffe080,
  wide = false,
): void {
  const w = wide ? 160 : 90;
  const h = wide ? 28 : 14;
  const slash = scene.add.rectangle(x + facing * 40, y, w, h, color, 0.85).setAngle(facing > 0 ? -20 : 200);
  scene.tweens.add({
    targets: slash,
    alpha: 0,
    scaleX: 1.4,
    x: x + facing * (wide ? 120 : 80),
    duration: wide ? 160 : 110,
    onComplete: () => slash.destroy(),
  });
}

export function killPop(scene: Phaser.Scene, x: number, y: number, scoreGain: number): void {
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * 2 * i) / 8;
    const c = scene.add.circle(x, y, 4 + Math.random() * 4, 0xffd070, 0.9);
    scene.tweens.add({
      targets: c,
      x: x + Math.cos(ang) * (40 + Math.random() * 40),
      y: y + Math.sin(ang) * (40 + Math.random() * 40),
      alpha: 0,
      duration: 280 + Math.random() * 120,
      onComplete: () => c.destroy(),
    });
  }
  const t = scene.add
    .text(x, y - 20, `+${scoreGain}`, {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#ffe65a',
      stroke: '#1a1020',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setScale(0.7);
  scene.tweens.add({
    targets: t,
    y: y - 70,
    alpha: 0,
    scale: 1.15,
    duration: 520,
    onComplete: () => t.destroy(),
  });
}

export function floatDmg(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dmg: number,
  style: 'normal' | 'crit' | 'miss' | 'hurt',
): void {
  const map = {
    normal: { color: '#ffe65a', size: '22px', peak: 1.05 },
    crit: { color: '#ffd700', size: '34px', peak: 1.45 },
    miss: { color: '#8890a0', size: '18px', peak: 1 },
    hurt: { color: '#ff5a5a', size: '24px', peak: 1.1 },
  } as const;
  const s = map[style];
  const label = style === 'miss' ? '扑空' : `-${Math.floor(dmg)}`;
  const t = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: s.size,
      color: s.color,
      fontStyle: style === 'crit' ? 'bold' : undefined,
      stroke: '#1a1020',
      strokeThickness: style === 'crit' ? 6 : 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true },
    })
    .setOrigin(0.5)
    .setScale(style === 'crit' ? 0.55 : 0.85);
  scene.tweens.add({
    targets: t,
    y: y - (style === 'crit' ? 90 : 60),
    alpha: 0,
    scale: s.peak,
    duration: style === 'crit' ? 900 : 700,
    ease: style === 'crit' ? 'Back.easeOut' : 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function afterimage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  const ghost = scene.add.rectangle(x, y, w, h, color, 0.45);
  scene.tweens.add({
    targets: ghost,
    alpha: 0,
    scaleX: 1.15,
    scaleY: 0.9,
    duration: 180,
    onComplete: () => ghost.destroy(),
  });
}

export function dustPuff(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const c = scene.add.circle(x + (Math.random() - 0.5) * 20, y + 20, 3 + Math.random() * 4, 0xc8b090, 0.7);
    scene.tweens.add({
      targets: c,
      x: c.x + (Math.random() - 0.5) * 40,
      y: c.y - 10 - Math.random() * 20,
      alpha: 0,
      duration: 220 + Math.random() * 100,
      onComplete: () => c.destroy(),
    });
  }
}

/** 同帧多层：音效+震屏+闪白+斩击（顿帧由逻辑层 hitstopFrames 负责） */
export function hitConnectFx(
  scene: Phaser.Scene,
  tier: AttackTier,
  x: number,
  y: number,
  facing: number,
): void {
  const sk = SHAKE[tier];
  if (tier === 'light') {
    playSfx('hit');
    shake(scene, sk.intensity, sk.ms);
    slashSwipe(scene, x, y, facing, 0xffe080, false);
  } else if (tier === 'rake') {
    playSfx('rake');
    shake(scene, sk.intensity, sk.ms);
    screenFlash(scene, 0xffe0a0, 0.45, 110);
    slashSwipe(scene, x, y, facing, 0xff9040, true);
  } else {
    playSfx('perfect');
    shake(scene, sk.intensity, sk.ms);
    screenFlash(scene, 0xa0ffe0, 0.35, 100);
    slashSwipe(scene, x, y, facing, 0x80ffc0, false);
  }
}

/** 受击闪白 */
export function victimFlash(body: Phaser.GameObjects.Rectangle, baseColor: number, scene: Phaser.Scene): void {
  body.setFillStyle(0xffffff);
  scene.time.delayedCall(70, () => {
    if (body.active) body.setFillStyle(baseColor);
  });
}

/** 攻击动作表现：anticipate → strike → settle */
export function playAttackMotion(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Rectangle,
  facing: number,
  tier: AttackTier,
): void {
  const back = facing * (tier === 'rake' ? -16 : -8);
  const fwd = facing * (tier === 'rake' ? 28 : 14);
  scene.tweens.killTweensOf(body);
  scene.tweens.add({
    targets: body,
    x: body.x + back,
    scaleX: 0.92,
    scaleY: 1.06,
    duration: tier === 'rake' ? 90 : 45,
    yoyo: false,
    onComplete: () => {
      scene.tweens.add({
        targets: body,
        x: body.x + fwd - back,
        scaleX: 1.12,
        scaleY: 0.9,
        duration: tier === 'rake' ? 70 : 40,
        onComplete: () => {
          scene.tweens.add({
            targets: body,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
          });
        },
      });
    },
  });
}
