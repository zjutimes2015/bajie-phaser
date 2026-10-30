import Phaser from 'phaser';
import { Copy, FONT } from '../rules/Copy';
import {
  CRAVING_ATTACK_RISE,
  CRAVING_LOCK_SEC,
  CRAVING_PERFECT_FALL,
  CRAVING_TAKEN_MUL,
  CRAVING_AFTER_LOCK,
  addCraving,
  cravingSlots,
  nearMissLine,
  tickCravingLock,
  cravingAfterRevive,
} from '../rules/SheepV1';
import type { RunState } from '../rules/RunState';

type Kind = 'player' | 'melee' | 'ranged' | 'boss';

interface Fighter {
  kind: Kind;
  hp: number;
  maxHp: number;
  atk: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cd: number;
  dead: boolean;
  windup: number;
  phase: number;
  body: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
}

interface CombatData {
  run: RunState;
  mode: 'trash' | 'boss';
}

const ARENA_HALF = 300;
const RAKE_MAX = 8;
const MOVE_SPEED = 220;

export class CombatScene extends Phaser.Scene {
  private run!: RunState;
  private mode: 'trash' | 'boss' = 'trash';
  private player!: Fighter;
  private enemies: Fighter[] = [];
  private running = false;
  private moveDir = 0;
  private attackHeld = 0;
  charging = false;
  private iframe = 0;
  private perfectWindow = 0;
  private toastText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    atk: Phaser.Input.Keyboard.Key;
    dodge: Phaser.Input.Keyboard.Key;
    rake: Phaser.Input.Keyboard.Key;
  };
  private uiBtns: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Combat');
  }

  init(data: CombatData) {
    if (!data?.run) throw new Error('[Combat] missing run state');
    this.run = data.run;
    this.mode = data.mode ?? 'trash';
    this.enemies = [];
    this.running = false;
    this.moveDir = 0;
    this.attackHeld = 0;
    this.charging = false;
    this.iframe = 0;
    this.perfectWindow = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1220');

    this.add
      .rectangle(width / 2, height / 2 - 40, 680, 720, 0x241c30)
      .setStrokeStyle(2, 0x3a2c48);

    this.add
      .rectangle(width / 2, height / 2 + 280, 640, 40, 0x3a2c48);

    this.add
      .text(width / 2, 80, '山下妖局 · 一关定生死', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#c8b4dc',
      })
      .setOrigin(0.5);

    this.hudText = this.add
      .text(24, 24, '', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffe8c0',
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    this.toastText = this.add
      .text(width / 2, 160, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffd070',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.spawnPlayer();
    if (this.mode === 'trash') {
      this.run.phase = 'trash';
      this.spawnTrash();
    } else {
      this.run.phase = 'boss';
      this.spawnBoss();
      if (this.run.bossBreak) this.toast('莲娘驱邪成功！Boss 破防');
      this.toast(Copy.mirrorHint);
    }

    this.buildControls();
    this.bindKeys();
    this.running = true;
    this.refreshHud();
  }

  private cx() {
    return this.scale.width / 2;
  }

  private cy() {
    return this.scale.height / 2;
  }

  private spawnPlayer() {
    const f = this.makeFighter(
      'player',
      this.cx() - 120,
      this.cy() + 200,
      100,
      12,
      70,
      90,
      0xffa050,
      Copy.title.charAt(0) || '戒',
    );
    if (this.mode === 'boss' && this.run.playerHp > 0) {
      f.hp = this.run.playerHp;
      f.maxHp = this.run.playerMaxHp;
    }
    this.player = f;
    this.refreshFighter(f);
  }

  private spawnTrash() {
    this.spawnEnemy('melee', this.cx() + 140, this.cy() + 200, 40, 10, 56, 0x78c878, Copy.mobMelee);
    this.spawnEnemy('ranged', this.cx() + 220, this.cy() + 100, 28, 8, 48, 0xa08cff, Copy.mobRanged);
  }

  private spawnBoss() {
    const b = this.spawnEnemy(
      'boss',
      this.cx() + 160,
      this.cy() + 180,
      120,
      16,
      100,
      0xdc466e,
      Copy.bossName,
    );
    if (this.run.bossBreak) {
      b.hp = Math.floor(b.maxHp * 0.85);
      this.refreshFighter(b);
    }
  }

  private spawnEnemy(
    kind: Kind,
    x: number,
    y: number,
    hp: number,
    atk: number,
    w: number,
    color: number,
    name: string,
  ) {
    const f = this.makeFighter(kind, x, y, hp, atk, w, w + 20, color, name);
    f.cd = 0.5 + Math.random();
    this.enemies.push(f);
    this.refreshFighter(f);
    return f;
  }

  private makeFighter(
    kind: Kind,
    x: number,
    y: number,
    hp: number,
    atk: number,
    w: number,
    h: number,
    color: number,
    name: string,
  ): Fighter {
    const body = this.add.rectangle(x, y, w, h, color).setStrokeStyle(2, 0xffffff, 0.3);
    const nameText = this.add
      .text(x, y - h / 2 - 18, name, {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const hpText = this.add
      .text(x, y + h / 2 + 14, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffe6b4',
      })
      .setOrigin(0.5);
    return {
      kind,
      hp,
      maxHp: hp,
      atk,
      x,
      y,
      w,
      h,
      cd: 0,
      dead: false,
      windup: 0,
      phase: 1,
      body,
      nameText,
      hpText,
    };
  }

  private place(f: Fighter) {
    f.body.setPosition(f.x, f.y);
    f.nameText.setPosition(f.x, f.y - f.h / 2 - 18);
    f.hpText.setPosition(f.x, f.y + f.h / 2 + 14);
  }

  private refreshFighter(f: Fighter) {
    f.hpText.setText(`${Math.ceil(f.hp)}/${f.maxHp}`);
    f.body.setVisible(!f.dead);
    f.nameText.setVisible(!f.dead);
    f.hpText.setVisible(!f.dead);
  }

  private buildControls() {
    const { width, height } = this.scale;
    const y = height - 90;
    const mk = (x: number, label: string, onDown: () => void, onUp?: () => void) => {
      const r = this.add
        .rectangle(x, y, 100, 64, 0x3a2848)
        .setStrokeStyle(2, 0x9a80b0)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(x, y, label, { fontFamily: FONT, fontSize: '22px', color: '#fff0d8' })
        .setOrigin(0.5);
      r.on('pointerdown', onDown);
      if (onUp) {
        r.on('pointerup', onUp);
        r.on('pointerout', onUp);
      }
      this.uiBtns.push(r, t);
    };
    mk(width * 0.12, Copy.moveLeft, () => { this.moveDir = -1; }, () => { if (this.moveDir < 0) this.moveDir = 0; });
    mk(width * 0.28, Copy.moveRight, () => { this.moveDir = 1; }, () => { if (this.moveDir > 0) this.moveDir = 0; });
    mk(width * 0.55, Copy.attack, () => this.pressAttack(), () => this.releaseAttack());
    mk(width * 0.72, Copy.dodge, () => this.tapDodge());
    mk(width * 0.9, '钉耙', () => this.tryRake());
  }

  private bindKeys() {
    if (!this.input.keyboard) return;
    this.keys = {
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      atk: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      dodge: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      rake: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
    };
    this.keys.atk.on('down', () => this.pressAttack());
    this.keys.atk.on('up', () => this.releaseAttack());
    this.keys.dodge.on('down', () => this.tapDodge());
    this.keys.rake.on('down', () => this.tryRake());
  }

  update(_t: number, delta: number) {
    if (!this.running || !this.player) return;
    const dt = delta / 1000;

    if (this.keys) {
      if (this.keys.left.isDown) this.moveDir = -1;
      else if (this.keys.right.isDown) this.moveDir = 1;
      else if (!this.input.activePointer.isDown) {
        /* touch buttons set moveDir */
      }
    }

    if (this.run.rakeCd > 0) this.run.rakeCd = Math.max(0, this.run.rakeCd - dt);
    if (this.run.cravingLockLeft > 0) {
      const next = tickCravingLock(
        { craving: this.run.craving, lockLeft: this.run.cravingLockLeft },
        dt,
        CRAVING_AFTER_LOCK,
      );
      this.run.craving = next.craving;
      this.run.cravingLockLeft = next.lockLeft;
    }
    if (this.iframe > 0) this.iframe = Math.max(0, this.iframe - dt);
    if (this.perfectWindow > 0) this.perfectWindow = Math.max(0, this.perfectWindow - dt);
    if (this.attackHeld > 0) {
      this.attackHeld += dt;
      if (this.attackHeld >= 0.55 && !this.charging) {
        this.charging = true;
        this.toast('蓄力中…');
      }
    }

    if (this.moveDir !== 0) {
      this.player.x += this.moveDir * MOVE_SPEED * dt;
      this.player.x = Phaser.Math.Clamp(this.player.x, this.cx() - ARENA_HALF, this.cx() + ARENA_HALF);
      this.place(this.player);
    }

    for (const e of this.enemies) {
      if (!e.dead) this.tickEnemy(e, dt);
    }

    this.refreshHud();
    this.checkTrashClear();
  }

  private pressAttack() {
    this.attackHeld = 0.01;
    this.charging = false;
  }

  private releaseAttack() {
    if (this.attackHeld <= 0) return;
    if (this.charging && this.run.rakeCd <= 0) {
      if (this.run.cravingLockLeft > 0) {
        this.toast(Copy.toastCravingRakeLock);
        this.doAttack();
      } else {
        this.doRake();
      }
    } else if (!this.charging) {
      this.doAttack();
    } else if (this.run.rakeCd > 0) {
      this.toast(Copy.rakeCool);
      this.doAttack();
    }
    this.attackHeld = 0;
    this.charging = false;
  }

  private tryRake() {
    if (this.run.rakeCd > 0) {
      this.toast(Copy.rakeCool);
      return;
    }
    if (this.run.cravingLockLeft > 0) {
      this.toast(Copy.toastCravingRakeLock);
      return;
    }
    this.doRake();
  }

  private tapDodge() {
    if (!this.running || this.player.dead) return;
    this.iframe = 0.45;
    const leap = this.moveDir !== 0 ? this.moveDir * 80 : Math.random() > 0.5 ? 70 : -70;
    this.player.x = Phaser.Math.Clamp(
      this.player.x + leap,
      this.cx() - ARENA_HALF,
      this.cx() + ARENA_HALF,
    );
    this.place(this.player);

    if (this.perfectWindow > 0) {
      this.perfectWindow = 0;
      this.toast(Copy.perfectDodge);
      this.applyCraving(-CRAVING_PERFECT_FALL);
      const prev = this.run.dmgMul;
      this.run.dmgMul = Math.min(2, this.run.dmgMul * 1.5);
      this.time.delayedCall(2000, () => {
        this.run.dmgMul = Math.max(1, prev);
      });
      this.doAttack(1.5, false);
    }
  }

  private doAttack(mul = 1, raiseCraving = true) {
    if (this.player.dead) return;
    if (raiseCraving) this.applyCraving(CRAVING_ATTACK_RISE);
    const range = 110;
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.player.x) <= range && Math.abs(e.y - this.player.y) <= 120) {
        this.hurt(e, this.player.atk * this.run.dmgMul * mul);
        hit = true;
      }
    }
    if (!hit) this.toast('扑空了');
  }

  private doRake() {
    if (this.player.dead) return;
    if (this.run.cravingLockLeft > 0) {
      this.toast(Copy.toastCravingRakeLock);
      return;
    }
    this.run.rakeCd = RAKE_MAX;
    const range = 180;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.player.x) <= range) {
        this.hurt(e, this.player.atk * 2.4 * this.run.dmgMul);
      }
    }
    this.toast('钉耙砸！！');
    this.refreshHud();
  }

  private hurt(e: Fighter, dmg: number) {
    if (e.dead) return;
    e.hp -= dmg;
    this.run.score += Math.floor(dmg * 10);
    this.floatDmg(e.x, e.y - 40, dmg, '#ffe65a');
    e.body.setFillStyle(0xffffff);
    this.time.delayedCall(80, () => {
      if (!e.dead) {
        const colors: Record<Kind, number> = {
          player: 0xffa050,
          melee: 0x78c878,
          ranged: 0xa08cff,
          boss: 0xdc466e,
        };
        e.body.setFillStyle(colors[e.kind]);
      }
    });
    if (e.kind === 'boss') this.checkBossPhase(e);
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      this.run.score += e.kind === 'boss' ? 3000 : 500;
      this.refreshFighter(e);
      if (e.kind === 'boss') this.win();
      return;
    }
    this.refreshFighter(e);
    this.refreshHud();
  }

  private checkBossPhase(e: Fighter) {
    const r = e.hp / e.maxHp;
    if (e.phase < 2 && r <= 0.7) {
      e.phase = 2;
      e.atk = Math.floor(e.atk * 1.25);
      this.toast(Copy.phaseHint + ' · 二阶段');
    }
    if (e.phase < 3 && r <= 0.4) {
      e.phase = 3;
      e.atk = Math.floor(e.atk * 1.2);
      this.toast(Copy.phaseHint + ' · 三阶段');
    }
  }

  private tickEnemy(e: Fighter, dt: number) {
    if (this.player.dead) return;
    e.cd -= dt;
    if (e.kind === 'melee') {
      const dir = Math.sign(this.player.x - e.x) || 1;
      e.x += dir * 90 * dt;
      this.place(e);
      if (e.cd <= 0 && Math.abs(e.x - this.player.x) < 70) {
        this.hitPlayer(e.atk);
        e.cd = 1.1;
      }
    } else if (e.kind === 'ranged') {
      if (e.cd <= 0) {
        if (Math.abs(e.x - this.player.x) < 260) this.hitPlayer(e.atk);
        e.cd = 1.6;
      }
    } else if (e.kind === 'boss') {
      const dir = Math.sign(this.player.x - e.x) || 1;
      e.x += dir * (70 + e.phase * 15) * dt;
      this.place(e);
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          this.perfectWindow = 0;
          if (Math.abs(e.x - this.player.x) < 100) {
            this.hitPlayer(e.atk * (1 + e.phase * 0.15));
          }
          e.cd = 1.2 - e.phase * 0.1;
        }
      } else if (e.cd <= 0) {
        e.windup = 0.55;
        this.perfectWindow = 0.55;
        this.toast('将军挥刀！快闪避');
        e.cd = 99;
      }
    }
  }

  private hitPlayer(raw: number) {
    if (this.player.dead || this.iframe > 0) return;
    let dmg = raw * this.run.takenMul;
    if (this.run.cravingLockLeft > 0) dmg *= CRAVING_TAKEN_MUL;
    this.player.hp -= dmg;
    this.iframe = 0.25;
    this.floatDmg(this.player.x, this.player.y - 40, dmg, '#ff5a5a');
    this.player.body.setFillStyle(0xff7878);
    this.time.delayedCall(200, () => {
      if (!this.player.dead) this.player.body.setFillStyle(0xffa050);
    });
    this.refreshFighter(this.player);
    this.refreshHud();
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.dead = true;
      this.lose();
    }
  }

  private floatDmg(x: number, y: number, dmg: number, color: string) {
    const t = this.add
      .text(x, y, `-${Math.floor(dmg)}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  private applyCraving(delta: number) {
    const { state, justLocked } = addCraving(
      { craving: this.run.craving, lockLeft: this.run.cravingLockLeft },
      delta,
      CRAVING_LOCK_SEC,
    );
    this.run.craving = state.craving;
    this.run.cravingLockLeft = state.lockLeft;
    if (justLocked) this.toast(Copy.toastCravingFull);
  }

  private checkTrashClear() {
    if (this.run.phase !== 'trash') return;
    if (this.enemies.some((e) => !e.dead)) return;
    this.running = false;
    this.run.phase = 'dialog';
    this.syncRunFromFighters();
    this.scene.start('Dialog', { run: this.run });
  }

  private win() {
    this.running = false;
    this.run.phase = 'won';
    this.syncRunFromFighters();
    this.run.nearMiss = this.buildNearMiss();
    this.scene.start('Result', { run: this.run });
  }

  private lose() {
    this.running = false;
    this.run.phase = 'lost';
    this.syncRunFromFighters();
    this.run.nearMiss = this.buildNearMiss();
    this.scene.start('Result', { run: this.run });
  }

  private syncRunFromFighters() {
    this.run.playerHp = Math.max(0, this.player.hp);
    this.run.playerMaxHp = this.player.maxHp;
    const boss = this.enemies.find((e) => e.kind === 'boss' && !e.dead);
    this.run.bossHpRatio = boss ? boss.hp / boss.maxHp : null;
  }

  private buildNearMiss(): string {
    const boss = this.enemies.find((e) => e.kind === 'boss' && !e.dead);
    return nearMissLine({
      phase: this.run.phase === 'won' || this.run.phase === 'lost' ? this.run.phase : this.run.phase === 'boss' ? 'boss' : 'trash',
      craving: this.run.craving,
      lockLeft: this.run.cravingLockLeft,
      rakeCd: this.run.rakeCd,
      score: this.run.score,
      bossHpRatio: boss ? boss.hp / boss.maxHp : null,
      playerHpRatio: this.player ? this.player.hp / this.player.maxHp : null,
      templates: {
        cravingLock: Copy.nearMissCravingLock,
        bossHp: Copy.nearMissBossHp,
        winClose: Copy.nearMissWinClose,
        rakeCd: Copy.nearMissRakeCd,
        cravingAlmost: Copy.nearMissCravingAlmost,
        score: Copy.nearMissScore,
      },
    });
  }

  /** 给 Result 复活回调用：清锁、回血、继续当前 mode。 */
  static applyRevive(run: RunState): void {
    const next = cravingAfterRevive({ craving: run.craving, lockLeft: run.cravingLockLeft });
    run.craving = next.craving;
    run.cravingLockLeft = next.lockLeft;
    run.playerHp = Math.max(1, Math.floor(run.playerMaxHp * 0.5));
    run.reviveUsed = true;
    run.phase = run.bossHpRatio !== null || run.choice !== null ? 'boss' : 'trash';
  }



  private refreshHud() {
    const slots = cravingSlots(this.run.craving);
    const bar = '◆'.repeat(slots) + '◇'.repeat(7 - slots);
    const rake =
      this.run.cravingLockLeft > 0
        ? `${Copy.cravingLock} ${this.run.cravingLockLeft.toFixed(1)}s`
        : this.run.rakeCd > 0
          ? `${Copy.rakeCd} ${this.run.rakeCd.toFixed(1)}s`
          : Copy.rakeReady;
    this.hudText.setText(
      [
        `${Copy.hp} ${Math.ceil(this.player.hp)}/${this.player.maxHp}`,
        `${Copy.craving} ${bar}`,
        rake,
        `${Copy.score} ${this.run.score}  ${Copy.best} ${this.run.bestScore}`,
      ].join('\n'),
    );
  }

  private toast(msg: string) {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 900,
      duration: 400,
    });
  }
}
