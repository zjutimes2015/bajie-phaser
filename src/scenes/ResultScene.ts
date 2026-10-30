import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import { shareFailText } from '../rules/SheepV1';
import { freshRun, saveBestScore, type RunState } from '../rules/RunState';
import { playRewardedAd, shareText } from '../rules/WxBridge';
import { playSfx, unlockAudio } from '../audio/Sfx';
import { addPanelButton } from '../ui/PanelButton';
import { CombatScene } from './CombatScene';
import { ART, requireTex } from '../art/ArtKeys';

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
    this.cameras.main.setBackgroundColor('#120c18');
    unlockAudio();
    const won = this.run.phase === 'won';
    playSfx(won ? 'win' : 'lose');

    saveBestScore(this.run.score);
    this.run.bestScore = Math.max(this.run.bestScore, this.run.score);

    this.add.rectangle(width / 2, height / 2, width - 28, height - 40, 0x1e1428).setStrokeStyle(3, 0x6b4a7a);

    requireTex(this, ART.bajieIdle);
    const hero = this.add
      .image(width * 0.18, height * 0.42, ART.bajieIdle)
      .setOrigin(0.5, 0.55)
      .setDepth(1)
      .setAlpha(won ? 0.9 : 0.55);
    const hh = Math.min(340, height * 0.4);
    hero.setDisplaySize((hero.width / hero.height) * hh, hh);
    if (!won) hero.setTint(0x886688);

    const title = won ? Copy.winTitle : Copy.loseTitle;
    const subtitle = won
      ? this.run.ending === 'guard'
        ? Copy.winTitleGuard
        : Copy.winTitleGreed
      : this.run.nearMiss || '';

    const titleText = this.add
      .text(width / 2, height * 0.2, title, {
        fontFamily: FONT,
        fontSize: '48px',
        color: won ? '#ffe6a8' : '#ff9080',
        stroke: '#1a1020',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0.7)
      .setAlpha(0);
    this.tweens.add({ targets: titleText, alpha: 1, scale: 1, duration: 380, ease: 'Back.easeOut' });

    const sub = this.add
      .text(width / 2, height * 0.3, subtitle, {
        fontFamily: FONT,
        fontSize: won ? '24px' : '32px',
        color: won ? '#d0c0e0' : '#ffd080',
        align: 'center',
        wordWrap: { width: width - 80 },
        stroke: won ? undefined : '#3a2010',
        strokeThickness: won ? 0 : 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 120, duration: 280 });

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
      .rectangle(width / 2, height * 0.44, 420, 56, 0x2a1c38, 0.95)
      .setStrokeStyle(2, 0x8a6098);
    this.add
      .text(
        width / 2,
        height * 0.44,
        `${Copy.score} ${this.run.score}　${Copy.best} ${this.run.bestScore}`,
        {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#fff0d0',
        },
      )
      .setOrigin(0.5);

    const buttons: { label: string; y: number; color: number; fn: () => void }[] = [
      {
        label: won ? Copy.winAgain : Copy.loseRetry,
        y: height * 0.55,
        color: 0xc45c26,
        fn: () => this.retry(),
      },
      {
        label: won ? Copy.winShare : Copy.loseShare,
        y: height * 0.65,
        color: 0x3a6a98,
        fn: () => this.share(),
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
      addPanelButton(this, {
        x: width / 2,
        y: b.y,
        w: 360,
        h: 68,
        fill: b.color,
        label: b.label,
        fontSize: '28px',
        onPress: b.fn,
      });
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
        stroke: '#1a1020',
        strokeThickness: 3,
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
