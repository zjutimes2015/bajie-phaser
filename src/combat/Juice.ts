import Phaser from 'phaser';
import type { AttackTier } from './Frames';
import { playSfx } from '../audio/Sfx';

/** 同帧多层反馈 + 表现层 tween（逻辑层不管这些）。 */

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
      fontFamily: 'KaiTi, STKaiti, 楷体, serif',
      fontSize: '22px',
      color: '#ffe65a',
    })
    .setOrigin(0.5);
  scene.tweens.add({
    targets: t,
    y: y - 70,
    alpha: 0,
    duration: 500,
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
    normal: { color: '#ffe65a', size: '22px' },
    crit: { color: '#ffd700', size: '32px' },
    miss: { color: '#8890a0', size: '18px' },
    hurt: { color: '#ff5a5a', size: '22px' },
  } as const;
  const s = map[style];
  const label = style === 'miss' ? '扑空' : `-${Math.floor(dmg)}`;
  const t = scene.add
    .text(x, y, label, {
      fontFamily: 'KaiTi, STKaiti, 楷体, serif',
      fontSize: s.size,
      color: s.color,
      fontStyle: style === 'crit' ? 'bold' : undefined,
    })
    .setOrigin(0.5);
  if (style === 'crit') t.setScale(1.2);
  scene.tweens.add({
    targets: t,
    y: y - (style === 'crit' ? 80 : 60),
    alpha: 0,
    scale: style === 'crit' ? 1.4 : 1,
    duration: style === 'crit' ? 850 : 700,
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
  if (tier === 'light') {
    playSfx('hit');
    shake(scene, 0.005, 70);
    slashSwipe(scene, x, y, facing, 0xffe080, false);
  } else if (tier === 'rake') {
    playSfx('rake');
    shake(scene, 0.014, 180);
    screenFlash(scene, 0xffe0a0, 0.4, 100);
    slashSwipe(scene, x, y, facing, 0xff9040, true);
  } else {
    playSfx('perfect');
    shake(scene, 0.01, 120);
    screenFlash(scene, 0xa0ffe0, 0.3, 90);
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
  const y0 = body.y;
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
  void y0;
}
