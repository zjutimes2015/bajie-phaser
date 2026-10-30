import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { freshRun, type RunState } from '../rules/RunState';
import { playSfx, unlockAudio } from '../audio/Sfx';

export class CoverScene extends Phaser.Scene {
  constructor() {
    super('Cover');
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1220');

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x241830)
      .setStrokeStyle(4, 0x6b4a7a);

    this.add
      .text(width / 2, height * 0.28, Copy.title, {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#ffe6a8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.38, Copy.tagline, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#c8b4d8',
      })
      .setOrigin(0.5);

    const run = freshRun();
    this.add
      .text(width / 2, height * 0.48, `${Copy.best} ${run.bestScore}`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#9a88aa',
      })
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(width / 2, height * 0.62, 320, 72, 0xc45c26)
      .setStrokeStyle(3, 0xffd080)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.62, Copy.play, {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#fff8e8',
      })
      .setOrigin(0.5);

    btn.on('pointerdown', () => { unlockAudio(); playSfx('ui'); this.startCombat(run); });

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
      .setOrigin(0.5);
  }

  private startCombat(run: RunState) {
    run.phase = 'trash';
    this.scene.start('Combat', { run, mode: 'trash' });
  }
}
