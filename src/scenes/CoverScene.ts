import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { freshRun, type RunState } from '../rules/RunState';
import { unlockAudio } from '../audio/Sfx';
import { addPanelButton } from '../ui/PanelButton';

export class CoverScene extends Phaser.Scene {
  constructor() {
    super('Cover');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#120c18');

    // 分区底 + vignette（非纯色块）
    this.add.rectangle(width / 2, height * 0.32, width, height * 0.64, 0x1e1428);
    this.add.rectangle(width / 2, height * 0.72, width, height * 0.56, 0x16101e);
    this.add.rectangle(width / 2, height / 2, width - 24, height - 24).setStrokeStyle(3, 0x6b4a7a, 0.7);
    // 四角压暗
    const vig = this.add.graphics().setDepth(1);
    vig.fillStyle(0x000000, 0.35);
    vig.fillRect(0, 0, width, 80);
    vig.fillRect(0, height - 100, width, 100);
    vig.fillStyle(0x000000, 0.2);
    vig.fillRect(0, 0, 40, height);
    vig.fillRect(width - 40, 0, 40, height);

    const title = this.add
      .text(width / 2, height * 0.26, Copy.title, {
        fontFamily: FONT,
        fontSize: '68px',
        color: '#ffe6a8',
        stroke: '#3a2030',
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setScale(0.85)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });

    this.add
      .text(width / 2, height * 0.36, Copy.tagline, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#c8b4d8',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const run = freshRun();
    // 最高分卡片
    this.add
      .rectangle(width / 2, height * 0.46, 280, 52, 0x2a1c38, 0.92)
      .setStrokeStyle(2, 0x8a6098)
      .setDepth(2);
    this.add
      .text(width / 2, height * 0.46, `${Copy.best}  ${run.bestScore}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffe080',
      })
      .setOrigin(0.5)
      .setDepth(3);

    addPanelButton(this, {
      x: width / 2,
      y: height * 0.62,
      w: 340,
      h: 76,
      fill: 0xc45c26,
      label: Copy.play,
      fontSize: '32px',
      depth: 5,
      sfx: 'button',
      onPress: () => {
        unlockAudio();
        this.startCombat(run);
      },
    });

    this.add
      .text(
        width / 2,
        height * 0.88,
        '← → 移动 · Z/攻击 · X/闪避 · 长按Z或C钉耙',
        {
          fontFamily: FONT,
          fontSize: '16px',
          color: '#7a6888',
          align: 'center',
        },
      )
      .setOrigin(0.5)
      .setDepth(2);
  }

  private startCombat(run: RunState) {
    run.phase = 'trash';
    this.scene.start('Combat', { run, mode: 'trash' });
  }
}
