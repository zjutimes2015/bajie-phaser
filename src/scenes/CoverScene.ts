import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { freshRun, type RunState } from '../rules/RunState';
import { unlockAudio } from '../audio/Sfx';
import { addPanelButton, type PanelButton } from '../ui/PanelButton';
import { ART, requireTex } from '../art/ArtKeys';
import { createDialogueBox } from '../ui/DialogueBox';
import { INTRO_LINES } from '../rules/DialogueScripts';

export class CoverScene extends Phaser.Scene {
  private playBtn: PanelButton | null = null;
  private starting = false;

  constructor() {
    super('Cover');
  }

  create() {
    this.starting = false;
    this.playBtn = null;
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#120c18');

    this.add.rectangle(width / 2, height * 0.32, width, height * 0.64, 0x1e1428);
    this.add.rectangle(width / 2, height * 0.72, width, height * 0.56, 0x16101e);
    this.add.rectangle(width / 2, height / 2, width - 24, height - 24).setStrokeStyle(3, 0x6b4a7a, 0.7);

    requireTex(this, ART.bajieIdle);
    const hero = this.add
      .image(width / 2, height * 0.58, ART.bajieIdle)
      .setOrigin(0.5, 0.55)
      .setDepth(1)
      .setAlpha(0.92);
    const targetH = Math.min(520, height * 0.52);
    hero.setDisplaySize((hero.width / hero.height) * targetH, targetH);
    this.add.ellipse(width / 2, height * 0.78, 220, 36, 0xc45c26, 0.25).setDepth(0);

    const vig = this.add.graphics().setDepth(2);
    vig.fillStyle(0x000000, 0.35);
    vig.fillRect(0, 0, width, 80);
    vig.fillRect(0, height - 100, width, 100);
    vig.fillStyle(0x000000, 0.2);
    vig.fillRect(0, 0, 40, height);
    vig.fillRect(width - 40, 0, 40, height);

    const title = this.add
      .text(width / 2, height * 0.14, Copy.title, {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#ffe6a8',
        stroke: '#3a2030',
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 8, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setScale(0.85)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });

    this.add
      .text(width / 2, height * 0.22, Copy.tagline, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#c8b4d8',
      })
      .setOrigin(0.5)
      .setDepth(3);

    const run = freshRun();
    this.add
      .rectangle(width / 2, height * 0.28, 280, 48, 0x2a1c38, 0.92)
      .setStrokeStyle(2, 0x8a6098)
      .setDepth(3);
    this.add
      .text(width / 2, height * 0.28, `${Copy.best}  ${run.bestScore}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffe080',
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.playBtn = addPanelButton(this, {
      x: width / 2,
      y: height * 0.86,
      w: 340,
      h: 76,
      fill: 0xc45c26,
      label: Copy.play,
      fontSize: '32px',
      depth: 5,
      sfx: 'button',
      onPress: () => this.beginIntro(run),
    });

    this.add
      .text(width / 2, height * 0.95, '← → 移动 · Z/攻击 · X/闪避 · 长按Z或C钉耙', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#7a6888',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  /** 开战前短对白，再进战斗（玩家能感到「有对话」）。 */
  private beginIntro(run: RunState) {
    if (this.starting) return;
    this.starting = true;
    unlockAudio();
    this.playBtn?.setEnabled(false);
    this.playBtn?.panel.setVisible(false);
    this.playBtn?.label.setVisible(false);

    const box = createDialogueBox(this, { depth: 30 });
    box.playLines(INTRO_LINES, () => {
      box.destroy();
      this.startCombat(run);
    });
  }

  private startCombat(run: RunState) {
    run.phase = 'trash';
    this.scene.start('Combat', { run, mode: 'trash' });
  }
}
