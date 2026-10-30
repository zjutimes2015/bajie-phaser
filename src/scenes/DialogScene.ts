import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { buffsFromChoice, type ChoiceId, type RunState } from '../rules/RunState';
import { CRAVING_LOCK_SEC, addCraving, dialogCravingDelta } from '../rules/SheepV1';
import { playSfx, unlockAudio } from '../audio/Sfx';

interface DialogData {
  run: RunState;
}

const QTE_NEED = 8;
const QTE_SEC = 3.2;

export class DialogScene extends Phaser.Scene {
  private run!: RunState;
  private qteHits = 0;
  private qteOpen = false;
  private qteBar!: Phaser.GameObjects.Rectangle;
  private qteLabel!: Phaser.GameObjects.Text;
  private choiceRoot: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Dialog');
  }

  init(data: DialogData) {
    if (!data?.run) throw new Error('[Dialog] missing run state');
    this.run = data.run;
    this.qteHits = 0;
    this.qteOpen = false;
  }

  create() {
    unlockAudio();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1220');

    this.add.rectangle(width / 2, height / 2, width - 40, height - 80, 0x2a1c38).setStrokeStyle(3, 0x8a6098);

    this.add
      .text(width / 2, 120, Copy.dialogTitle, {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#ffd0e8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 220, Copy.dialogBody, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#e8d8f0',
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5, 0);

    this.drawChoices();
  }

  private drawChoices() {
    const { width } = this.scale;
    const items: { id: ChoiceId; label: string; tip: string }[] = [
      { id: 'feed', label: Copy.choiceFeed, tip: Copy.choiceFeedTip },
      { id: 'boast', label: Copy.choiceBoast, tip: Copy.choiceBoastTip },
      { id: 'exorcise', label: Copy.choiceExorcise, tip: Copy.choiceExorciseTip },
    ];
    items.forEach((it, i) => {
      const y = 420 + i * 110;
      const r = this.add
        .rectangle(width / 2, y, 520, 88, 0x3e2a52)
        .setStrokeStyle(2, 0xc8a0d8)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(width / 2, y - 12, it.label, {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#fff8f0',
        })
        .setOrigin(0.5);
      const tip = this.add
        .text(width / 2, y + 22, it.tip, {
          fontFamily: FONT,
          fontSize: '16px',
          color: '#b0a0c0',
        })
        .setOrigin(0.5);
      r.on('pointerdown', () => { playSfx('ui'); this.pick(it.id); });
      this.choiceRoot.push(r, t, tip);
    });
  }

  private clearChoices() {
    for (const g of this.choiceRoot) g.destroy();
    this.choiceRoot = [];
  }

  private pick(id: ChoiceId) {
    if (id === 'exorcise') {
      this.clearChoices();
      this.startQte();
      return;
    }
    this.finish(id, false);
  }

  private startQte() {
    const { width, height } = this.scale;
    this.qteOpen = true;
    this.qteHits = 0;

    this.add
      .text(width / 2, height * 0.42, Copy.qtePrompt, {
        fontFamily: FONT,
        fontSize: '36px',
        color: '#ffe080',
      })
      .setOrigin(0.5);

    this.qteLabel = this.add
      .text(width / 2, height * 0.5, `0 / ${QTE_NEED}`, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, height * 0.58, 400, 24, 0x3a2848);
    this.qteBar = this.add.rectangle(width / 2 - 200, height * 0.58, 0, 24, 0x70d070).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height * 0.62, 400, 10, 0x3a2848);
    const timerFill = this.add.rectangle(width / 2 - 200, height * 0.62, 400, 10, 0xffd070).setOrigin(0, 0.5);
    this.tweens.add({ targets: timerFill, width: 0, duration: QTE_SEC * 1000, ease: 'Linear' });

    const tap = this.add
      .rectangle(width / 2, height * 0.72, 280, 90, 0xc45c26)
      .setStrokeStyle(3, 0xffd080)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height * 0.72, '连点！', {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#fff8e8',
      })
      .setOrigin(0.5);

    tap.on('pointerdown', () => this.qteTap());
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-Z', () => this.qteTap());
      this.input.keyboard.on('keydown-SPACE', () => this.qteTap());
    }

    this.time.delayedCall(QTE_SEC * 1000, () => {
      if (this.qteOpen) this.failQte();
    });
  }

  private qteTap() {
    if (!this.qteOpen) return;
    playSfx('hit');
    this.qteHits += 1;
    this.qteLabel.setText(`${this.qteHits} / ${QTE_NEED}`);
    this.qteBar.width = Math.min(400, (400 * this.qteHits) / QTE_NEED);
    if (this.qteHits >= QTE_NEED) {
      this.qteOpen = false;
      playSfx('perfect');
      this.add.text(this.scale.width/2, this.scale.height*0.35, Copy.qteOk, { fontFamily: FONT, fontSize: '36px', color: '#80ffc0' }).setOrigin(0.5);
      this.time.delayedCall(450, () => this.finish('exorcise', true));
      return;
    }
  }

  private failQte() {
    if (!this.qteOpen) return;
    this.qteOpen = false;
    playSfx('hurt');
    this.add.text(this.scale.width/2, this.scale.height*0.35, Copy.qteFail, { fontFamily: FONT, fontSize: '28px', color: '#ff8080' }).setOrigin(0.5);
    this.cameras.main.shake(150, 0.01);
    this.time.delayedCall(500, () => this.finish('exorcise', false));
  }

  private finish(choice: ChoiceId, bossBreak: boolean) {
    const buffs = buffsFromChoice(choice, bossBreak);
    this.run.choice = buffs.choice;
    this.run.ending = buffs.ending;
    this.run.dmgMul = buffs.dmgMul;
    this.run.takenMul = buffs.takenMul;
    this.run.bossBreak = buffs.bossBreak;
    this.run.playerHp = Math.max(
      1,
      Math.min(
        this.run.playerMaxHp,
        this.run.playerHp + this.run.playerMaxHp * buffs.healRatio,
      ),
    );
    const cravingDelta = dialogCravingDelta(buffs.choice, buffs.bossBreak);
    if (cravingDelta !== 0) {
      const { state } = addCraving(
        { craving: this.run.craving, lockLeft: this.run.cravingLockLeft },
        cravingDelta,
        CRAVING_LOCK_SEC,
      );
      this.run.craving = state.craving;
      this.run.cravingLockLeft = state.lockLeft;
    }
    this.run.phase = 'boss';
    this.scene.start('Combat', { run: this.run, mode: 'boss' });
  }
}
