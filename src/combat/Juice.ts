import Phaser from 'phaser';

/** 场景级手感：顿帧、震屏、斩击、击杀粒子。 */

export function hitstop(scene: Phaser.Scene, ms: number): void {
  if (ms <= 0) return;
  scene.time.timeScale = 0.05;
  scene.time.delayedCall(ms * 0.05, () => {
    scene.time.timeScale = 1;
  });
}

export function shake(scene: Phaser.Scene, intensity = 0.006, duration = 120): void {
  scene.cameras.main.shake(duration, intensity);
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
