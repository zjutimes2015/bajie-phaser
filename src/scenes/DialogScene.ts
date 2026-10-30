import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { buffsFromChoice, type ChoiceId, type RunState } from '../rules/RunState';
import { CRAVING_LOCK_SEC, addCraving, dialogCravingDelta } from '../rules/SheepV1';
import { playSfx, unlockAudio } from '../audio/Sfx';
import { addPanelButton } from '../ui/PanelButton';
import { ART, requireTex } from '../art/ArtKeys';
import { createDialogueBox, type DialogueBox } from '../ui/DialogueBox';
import {
  AFTER_CHOICE_LINES,
  LIANNIANG_CHOICES,
  LIANNIANG_LINES,
} from '../rules/DialogueScripts';

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
  private box: DialogueBox | null = null;

  constructor() {
    super('Dialog');
  }

  init(data: DialogData) {
    if (!data?.run) throw new Error('[Dialog] missing run state');
    this.run = data.run;
    this.qteHits = 0;
    this.qteOpen = false;
    this.box = null;
  }

  create() {
    unlockAudio();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#120c18');

    this.add.rectangle(width / 2, height / 2, width - 40, height - 80, 0x2a1c38).setStrokeStyle(3, 0x8a6098);

    requireTex(this, ART.lianniangIdle);
    const portrait = this.add
      .image(width * 0.22, height * 0.38, ART.lianniangIdle)
      .setOrigin(0.5, 0.55)
      .setDepth(2)
      .setAlpha(0.95);
    const ph = Math.min(400, height * 0.44);
    portrait.setDisplaySize((portrait.width / portrait.height) * ph, ph);
    this.add.ellipse(width * 0.22, height * 0.58, 140, 28, 0xc8a0d8, 0.22).setDepth(1);

    this.add
      .text(width * 0.62, 90, Copy.dialogTitle, {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#ffd0e8',
        stroke: '#2a1030',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.box = createDialogueBox(this, { depth: 20 });
    this.box.playLines(LIANNIANG_LINES, () => this.offerChoices());
  }

  private offerChoices() {
    if (!this.box) throw new Error('[Dialog] box missing before choices');
    this.box.showChoices(LIANNIANG_CHOICES, (id) => this.pick(id));
  }

  private pick(id: ChoiceId) {
    if (id === 'exorcise') {
      this.box?.destroy();
      this.box = null;
      this.startQte();
      return;
    }
    this.playAftermath(id, false);
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
        stroke: '#1a1020',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.qteLabel = this.add
      .text(width / 2, height * 0.5, `0 / ${QTE_NEED}`, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.add.rectangle(width / 2, height * 0.58, 400, 24, 0x3a2848).setDepth(10);
    this.qteBar = this.add.rectangle(width / 2 - 200, height * 0.58, 0, 24, 0x70d070).setOrigin(0, 0.5).setDepth(11);
    this.add.rectangle(width / 2, height * 0.62, 400, 10, 0x3a2848).setDepth(10);
    const timerFill = this.add.rectangle(width / 2 - 200, height * 0.62, 400, 10, 0xffd070).setOrigin(0, 0.5).setDepth(11);
    this.tweens.add({ targets: timerFill, width: 0, duration: QTE_SEC * 1000, ease: 'Linear' });

    addPanelButton(this, {
      x: width / 2,
      y: height * 0.72,
      w: 280,
      h: 90,
      fill: 0xc45c26,
      label: '连点！',
      fontSize: '32px',
      sfx: 'none',
      depth: 12,
      onPress: () => this.qteTap(),
    });

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
      this.add
        .text(this.scale.width / 2, this.scale.height * 0.35, Copy.qteOk, {
          fontFamily: FONT,
          fontSize: '36px',
          color: '#80ffc0',
          stroke: '#102018',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(15);
      this.time.delayedCall(450, () => this.playAftermath('exorcise', true));
    }
  }

  private failQte() {
    if (!this.qteOpen) return;
    this.qteOpen = false;
    playSfx('hurt');
    this.add
      .text(this.scale.width / 2, this.scale.height * 0.35, Copy.qteFail, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ff8080',
        stroke: '#201010',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(15);
    this.cameras.main.shake(150, 0.01);
    this.time.delayedCall(500, () => this.playAftermath('exorcise', false));
  }

  private playAftermath(choice: ChoiceId, bossBreak: boolean) {
    const key =
      choice === 'feed' ? 'feed' : choice === 'boast' ? 'boast' : bossBreak ? 'exorcise_ok' : 'exorcise_fail';
    const lines = AFTER_CHOICE_LINES[key];
    this.box?.destroy();
    this.box = createDialogueBox(this, { depth: 25 });
    this.box.playLines(lines, () => this.finish(choice, bossBreak));
  }

  private finish(choice: ChoiceId, bossBreak: boolean) {
    this.box?.destroy();
    this.box = null;
    const buffs = buffsFromChoice(choice, bossBreak);
    this.run.choice = buffs.choice;
    this.run.ending = buffs.ending;
    this.run.dmgMul = buffs.dmgMul;
    this.run.takenMul = buffs.takenMul;
    this.run.bossBreak = buffs.bossBreak;
    this.run.playerHp = Math.max(
      1,
      Math.min(this.run.playerMaxHp, this.run.playerHp + this.run.playerMaxHp * buffs.healRatio),
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
