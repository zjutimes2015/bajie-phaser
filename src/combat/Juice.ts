import Phaser from 'phaser';
import type { AttackTier } from './Frames';
import { playSfx } from '../audio/Sfx';
import { FONT } from '../rules/Copy';

/** 同帧多层反馈 + 表现层 tween（逻辑层不管这些）。 */

type BodyLike = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

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

/** Sprite residual: tinted copy of current texture (fallback to rect if no tex). */
export function spriteAfterimage(scene: Phaser.Scene, body: BodyLike, color: number): void {
  if (body instanceof Phaser.GameObjects.Image) {
    const ghost = scene.add
      .image(body.x, body.y, body.texture.key)
      .setDisplaySize(body.displayWidth, body.displayHeight)
      .setFlipX(body.flipX)
      .setTint(color)
      .setAlpha(0.4)
      .setDepth(body.depth - 1);
    scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: body.scaleX * 1.08,
      scaleY: body.scaleY * 0.95,
      duration: 180,
      onComplete: () => ghost.destroy(),
    });
    return;
  }
  afterimage(scene, body.x, body.y, body.width, body.height, color);
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

/** 受击闪白 — Image 用 tint，Rectangle 用 fill。Fail Fast on unknown type. */
export function victimFlash(body: BodyLike, baseColor: number, scene: Phaser.Scene): void {
  if (body instanceof Phaser.GameObjects.Image) {
    body.setTint(0xffffff);
    scene.time.delayedCall(70, () => {
      if (body.active) body.clearTint();
    });
    return;
  }
  if (body instanceof Phaser.GameObjects.Rectangle) {
    body.setFillStyle(0xffffff);
    scene.time.delayedCall(70, () => {
      if (body.active) body.setFillStyle(baseColor);
    });
    return;
  }
  throw new Error(`[juice] victimFlash: unsupported body type ${typeof body}`);
}

/** 攻击动作表现：anticipate → strike → settle（Image / Rectangle 均可） */
export function playAttackMotion(
  scene: Phaser.Scene,
  body: BodyLike,
  facing: number,
  tier: AttackTier,
): void {
  if (!body || !('x' in body)) {
    throw new Error('[juice] playAttackMotion: body missing');
  }
  const back = facing * (tier === 'rake' ? -16 : -8);
  const fwd = facing * (tier === 'rake' ? 28 : 14);
  const baseSX = body.scaleX;
  const baseSY = body.scaleY;
  scene.tweens.killTweensOf(body);
  scene.tweens.add({
    targets: body,
    x: body.x + back,
    scaleX: baseSX * 0.92,
    scaleY: baseSY * 1.06,
    duration: tier === 'rake' ? 90 : 45,
    yoyo: false,
    onComplete: () => {
      scene.tweens.add({
        targets: body,
        x: body.x + fwd - back,
        scaleX: baseSX * 1.12,
        scaleY: baseSY * 0.9,
        duration: tier === 'rake' ? 70 : 40,
        onComplete: () => {
          scene.tweens.add({
            targets: body,
            scaleX: baseSX,
            scaleY: baseSY,
            duration: 80,
          });
        },
      });
    },
  });
}
