/**
 * 圆角面板按钮：hover 提亮 + press scale punch。
 * 原则来自 saltmire-juice / phaser-ui-tools（不整库依赖）。
 */

import Phaser from 'phaser';
import { FONT } from '../rules/Copy';
import { playSfx } from '../audio/Sfx';

export interface PanelButton {
  panel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  /** 冷却遮罩（自顶向下盖住），0=无遮罩 1=全遮 */
  setCoolRatio: (ratio: number) => void;
  setEnabled: (on: boolean) => void;
}

export interface PanelButtonOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: number;
  label: string;
  fontSize?: string;
  stroke?: number;
  depth?: number;
  sfx?: 'button' | 'ui' | 'none';
  onPress: () => void;
  onRelease?: () => void;
}

export function addPanelButton(scene: Phaser.Scene, opts: PanelButtonOpts): PanelButton {
  const {
    x,
    y,
    w,
    h,
    fill,
    label,
    fontSize = '28px',
    stroke = 0xffd080,
    depth = 10,
    sfx = 'button',
    onPress,
    onRelease,
  } = opts;

  const panel = scene.add
    .rectangle(x, y, w, h, fill)
    .setStrokeStyle(3, stroke)
    .setInteractive({ useHandCursor: true })
    .setDepth(depth);

  const text = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize,
      color: '#fff8e8',
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const cool = scene.add
    .rectangle(x, y - h / 2, w - 6, 0, 0x0a0810, 0.55)
    .setOrigin(0.5, 0)
    .setDepth(depth + 2)
    .setVisible(false);

  let enabled = true;
  const baseScale = 1;

  panel.on('pointerover', () => {
    if (!enabled) return;
    panel.setFillStyle(Phaser.Display.Color.IntegerToColor(fill).brighten(18).color);
  });
  panel.on('pointerout', () => {
    panel.setFillStyle(fill);
    panel.setScale(baseScale);
    text.setScale(baseScale);
    onRelease?.();
  });
  panel.on('pointerdown', () => {
    if (!enabled) return;
    if (sfx !== 'none') playSfx(sfx);
    scene.tweens.killTweensOf([panel, text]);
    panel.setScale(0.92);
    text.setScale(0.92);
    scene.tweens.add({
      targets: [panel, text],
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        panel.setScale(baseScale);
        text.setScale(baseScale);
      },
    });
    onPress();
  });
  if (onRelease) {
    panel.on('pointerup', onRelease);
  }
  panel.on('destroy', () => {
    cool.destroy();
    text.destroy();
  });

  return {
    panel,
    label: text,
    setCoolRatio(ratio: number) {
      const r = Math.max(0, Math.min(1, ratio));
      if (r <= 0.01) {
        cool.setVisible(false);
        cool.height = 0;
        return;
      }
      cool.setVisible(true);
      cool.height = (h - 6) * r;
    },
    setEnabled(on: boolean) {
      enabled = on;
      panel.setAlpha(on ? 1 : 0.55);
      text.setAlpha(on ? 1 : 0.55);
      if (!on) panel.setFillStyle(fill);
    },
  };
}
