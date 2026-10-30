import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { shareFailText } from '../rules/SheepV1';
import { freshRun, saveBestScore, type RunState } from '../rules/RunState';
import { playRewardedAd, shareText } from '../rules/WxBridge';
import { playSfx, unlockAudio } from '../audio/Sfx';
import { CombatScene } from './CombatScene';

interface ResultData {
  run: RunState;
}

export class ResultScene extends Phaser.Scene {
  private run!: RunState;

  constructor() {
    super('Result');
  }

  init(data: ResultData) {
    if (!data?.run) throw new Error('[Result] missing run state');
    this.run = data.run;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1220');
    unlockAudio();
    const won = this.run.phase === 'won';
    playSfx(won ? 'win' : 'lose');

    saveBestScore(this.run.score);
    this.run.bestScore = Math.max(this.run.bestScore, this.run.score);

    const title = won
      ? Copy.winTitle
      : Copy.loseTitle;
    const subtitle = won
      ? this.run.ending === 'guard'
        ? Copy.winTitleGuard
        : Copy.winTitleGreed
      : this.run.nearMiss || '';

    this.add
      .text(width / 2, height * 0.22, title, {
        fontFamily: FONT,
        fontSize: '48px',
        color: won ? '#ffe6a8' : '#ff9080',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.30, subtitle, {
        fontFamily: FONT,
        fontSize: won ? '24px' : '30px',
        color: won ? '#d0c0e0' : '#ffd080',
        align: 'center',
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);

    if (this.run.comboPeak > 0) {
      this.add
        .text(width / 2, height * 0.37, `${Copy.peakCombo} ×${this.run.comboPeak}`, {
          fontFamily: FONT,
          fontSize: '22px',
          color: '#ffe080',
        })
        .setOrigin(0.5);
    }

    this.add
      .text(
        width / 2,
        height * 0.44,
        `${Copy.score} ${this.run.score}　${Copy.best} ${this.run.bestScore}`,
        {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#fff0d0',
        },
      )
      .setOrigin(0.5);

    const buttons: { label: string; y: number; color: number; fn: () => void }[] = [
      {
        label: won ? Copy.winAgain : Copy.loseRetry,
        y: height * 0.55,
        color: 0xc45c26,
        fn: () => { playSfx('ui'); this.retry(); },
      },
      {
        label: won ? Copy.winShare : Copy.loseShare,
        y: height * 0.65,
        color: 0x3a6a98,
        fn: () => { playSfx('ui'); this.share(); },
      },
    ];

    if (!won && !this.run.reviveUsed) {
      buttons.splice(1, 0, {
        label: Copy.loseRevive,
        y: height * 0.65,
        color: 0x3a8a5a,
        fn: () => void this.revive(),
      });
      buttons[2].y = height * 0.75;
    }

    for (const b of buttons) {
      const r = this.add
        .rectangle(width / 2, b.y, 360, 70, b.color)
        .setStrokeStyle(2, 0xffd080)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(width / 2, b.y, b.label, {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#fff8e8',
        })
        .setOrigin(0.5);
      r.on('pointerdown', b.fn);
    }
  }

  private retry() {
    const run = freshRun();
    run.phase = 'trash';
    this.scene.start('Combat', { run, mode: 'trash' });
  }

  private share() {
    unlockAudio();
    const won = this.run.phase === 'won';
    playSfx(won ? 'win' : 'lose');
    const title = won
      ? `${Copy.sharePrefix} ${this.run.score}${Copy.shareSuffix}`
      : shareFailText(this.run.score, this.run.nearMiss, Copy.shareFailDefault);
    shareText(title);
    this.flash(Copy.winShare);
  }

  private async revive() {
    if (this.run.reviveUsed) {
      this.flash(Copy.toastNoRevive);
      return;
    }
    this.flash(Copy.adPlaying);
    const ok = await playRewardedAd();
    if (!ok) {
      this.flash('广告未看完');
      return;
    }
    CombatScene.applyRevive(this.run);
    this.flash(Copy.toastRevive);
    const mode = this.run.phase === 'boss' ? 'boss' : 'trash';
    this.scene.start('Combat', { run: this.run, mode });
  }

  private flash(msg: string) {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.88, msg, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#ffe080',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1200,
      duration: 400,
      onComplete: () => t.destroy(),
    });
  }
}
