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
import { playSfx, unlockAudio } from '../audio/Sfx';
import { floatDmg, hitstop, killPop, shake, slashSwipe } from '../combat/Juice';

type Kind = 'player' | 'melee' | 'ranged' | 'boss';
type BossMove = 'melee' | 'sweep' | 'dash';

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
  windupMax: number;
  phase: number;
  baseColor: number;
  move: BossMove;
  dashVx: number;
  body: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  danger?: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle;
}

interface Drop {
  kind: 'rice' | 'shard';
  x: number;
  y: number;
  body: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface CombatData {
  run: RunState;
  mode: 'trash' | 'boss';
}

const ARENA_HALF = 300;
const RAKE_MAX = 8;
const MOVE_SPEED = 220;
const COMBO_WINDOW = 1.2;
const COLORS: Record<Kind, number> = {
  player: 0xffa050,
  melee: 0x78c878,
  ranged: 0xa08cff,
  boss: 0xdc466e,
};

export class CombatScene extends Phaser.Scene {
  private run!: RunState;
  private mode: 'trash' | 'boss' = 'trash';
  private player!: Fighter;
  private enemies: Fighter[] = [];
  private drops: Drop[] = [];
  private running = false;
  private moveDir = 0;
  private attackHeld = 0;
  private charging = false;
  private iframe = 0;
  private perfectWindow = 0;
  private wave = 1;
  private combo = 0;
  private comboTimer = 0;
  private facing = 1;
  private toastText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    atk: Phaser.Input.Keyboard.Key;
    dodge: Phaser.Input.Keyboard.Key;
    rake: Phaser.Input.Keyboard.Key;
  };

  // HUD graphics
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private cravingSlotsGfx: Phaser.GameObjects.Rectangle[] = [];
  private rakePie!: Phaser.GameObjects.Graphics;
  private rakeLabel!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossBarLabel!: Phaser.GameObjects.Text;
  private vignette!: Phaser.GameObjects.Rectangle;
  private perfectHint!: Phaser.GameObjects.Text;

  constructor() {
    super('Combat');
  }

  init(data: CombatData) {
    if (!data?.run) throw new Error('[Combat] missing run state');
    this.run = data.run;
    this.mode = data.mode ?? 'trash';
    this.enemies = [];
    this.drops = [];
    this.running = false;
    this.moveDir = 0;
    this.attackHeld = 0;
    this.charging = false;
    this.iframe = 0;
    this.perfectWindow = 0;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.facing = 1;
    this.cravingSlotsGfx = [];
  }

  create() {
    unlockAudio();
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1220');

    this.add.rectangle(width / 2, height / 2 - 40, 680, 720, 0x241c30).setStrokeStyle(2, 0x3a2c48);
    this.add.rectangle(width / 2, height / 2 + 280, 640, 40, 0x3a2c48);
    this.add
      .text(width / 2, 100, '山下妖局 · 一关定生死', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#c8b4dc',
      })
      .setOrigin(0.5);

    this.buildHud();

    this.toastText = this.add
      .text(width / 2, 200, '', { fontFamily: FONT, fontSize: '24px', color: '#ffd070' })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);

    this.comboText = this.add
      .text(width - 28, 120, '', { fontFamily: FONT, fontSize: '28px', color: '#ffe080' })
      .setOrigin(1, 0)
      .setDepth(15)
      .setAlpha(0);

    this.perfectHint = this.add
      .text(width / 2, height / 2 - 200, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#80ffc0',
      })
      .setOrigin(0.5)
      .setDepth(18)
      .setAlpha(0);

    this.vignette = this.add
      .rectangle(width / 2, height / 2, width, height, 0x880000, 0)
      .setDepth(30)
      .setScrollFactor(0);

    this.spawnPlayer();
    if (this.mode === 'trash') {
      this.run.phase = 'trash';
      this.spawnWave(1);
      this.toast(Copy.wave1);
    } else {
      this.run.phase = 'boss';
      this.spawnBoss();
      if (this.run.bossBreak) this.toast('莲娘驱邪成功！Boss 破防');
      this.time.delayedCall(600, () => this.toast(Copy.mirrorHint));
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

  private buildHud() {
    const pad = 24;
    // HP bar
    this.add.text(pad, 18, Copy.hp, { fontFamily: FONT, fontSize: '16px', color: '#ffe8c0' });
    this.hpBarBg = this.add.rectangle(pad + 50, 26, 200, 16, 0x3a2848).setOrigin(0, 0.5);
    this.hpBarFill = this.add.rectangle(pad + 50, 26, 200, 16, 0x70d070).setOrigin(0, 0.5);

    // Craving 7 slots
    this.add.text(pad, 48, Copy.craving, { fontFamily: FONT, fontSize: '16px', color: '#ffe8c0' });
    for (let i = 0; i < 7; i++) {
      const s = this.add.rectangle(pad + 50 + i * 26, 56, 22, 14, 0x3a2848).setOrigin(0, 0.5);
      this.cravingSlotsGfx.push(s);
    }

    // Rake pie
    this.rakePie = this.add.graphics().setPosition(this.scale.width - 70, 50);
    this.rakeLabel = this.add
      .text(this.scale.width - 70, 50, '耙', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#fff0d8',
      })
      .setOrigin(0.5);

    this.scoreText = this.add.text(pad, 78, '', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#ffe8c0',
    });

    // Boss bar (hidden until boss)
    const bw = 560;
    this.bossBarBg = this.add
      .rectangle(this.cx(), 140, bw, 18, 0x3a2030)
      .setOrigin(0.5)
      .setVisible(false);
    this.bossBarFill = this.add
      .rectangle(this.cx() - bw / 2, 140, bw, 18, 0xdc466e)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.bossBarLabel = this.add
      .text(this.cx(), 118, Copy.bossName, {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#ffb0c8',
      })
      .setOrigin(0.5)
      .setVisible(false);
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
      COLORS.player,
      Copy.title.charAt(0) || '戒',
    );
    if (this.mode === 'boss' && this.run.playerHp > 0) {
      f.hp = this.run.playerHp;
      f.maxHp = this.run.playerMaxHp;
    } else if (this.run.playerHp > 0 && this.run.playerHp !== 100) {
      f.hp = this.run.playerHp;
    }
    this.player = f;
    this.refreshFighter(f);
  }

  private spawnWave(n: number) {
    this.wave = n;
    if (n === 1) {
      this.spawnEnemy('melee', this.cx() + 140, this.cy() + 200, 40, 10, 56, Copy.mobMelee);
      this.spawnEnemy('ranged', this.cx() + 220, this.cy() + 100, 28, 8, 48, Copy.mobRanged);
    } else {
      this.spawnEnemy('melee', this.cx() + 100, this.cy() + 200, 40, 10, 56, Copy.mobMelee);
      this.spawnEnemy('melee', this.cx() + 200, this.cy() + 210, 40, 11, 56, Copy.mobMelee);
      this.spawnEnemy('ranged', this.cx() + 240, this.cy() + 90, 28, 9, 48, Copy.mobRanged);
    }
  }

  private spawnBoss() {
    const b = this.spawnEnemy('boss', this.cx() + 160, this.cy() + 180, 120, 16, 100, Copy.bossName);
    if (this.run.bossBreak) {
      b.hp = Math.floor(b.maxHp * 0.85);
      b.atk = Math.floor(b.atk * 0.85);
      this.refreshFighter(b);
    }
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossBarLabel.setVisible(true);
  }

  private spawnEnemy(kind: Kind, x: number, y: number, hp: number, atk: number, w: number, name: string) {
    const f = this.makeFighter(kind, x, y, hp, atk, w, w + 20, COLORS[kind], name);
    f.cd = 0.6 + Math.random() * 0.5;
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
      .text(x, y - h / 2 - 18, name, { fontFamily: FONT, fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5);
    const hpText = this.add
      .text(x, y + h / 2 + 14, '', { fontFamily: FONT, fontSize: '14px', color: '#ffe6b4' })
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
      windupMax: 0,
      phase: 1,
      baseColor: color,
      move: 'melee',
      dashVx: 0,
      body,
      nameText,
      hpText,
    };
  }

  private place(f: Fighter) {
    f.body.setPosition(f.x, f.y);
    f.nameText.setPosition(f.x, f.y - f.h / 2 - 18);
    f.hpText.setPosition(f.x, f.y + f.h / 2 + 14);
    if (f.danger) {
      if (f.move === 'sweep') f.danger.setPosition(f.x, f.y);
      else f.danger.setPosition(f.x, f.y - f.h / 2 - 8);
    }
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
        .setInteractive({ useHandCursor: true })
        .setDepth(25);
      const t = this.add
        .text(x, y, label, { fontFamily: FONT, fontSize: '22px', color: '#fff0d8' })
        .setOrigin(0.5)
        .setDepth(26);
      r.on('pointerdown', () => {
        playSfx('ui');
        onDown();
      });
      if (onUp) {
        r.on('pointerup', onUp);
        r.on('pointerout', onUp);
      }
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
    const dt = Math.min(0.05, delta / 1000);

    if (this.keys) {
      if (this.keys.left.isDown) this.moveDir = -1;
      else if (this.keys.right.isDown) this.moveDir = 1;
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
    if (this.perfectWindow > 0) {
      this.perfectWindow = Math.max(0, this.perfectWindow - dt);
      this.perfectHint.setAlpha(this.perfectWindow > 0 ? 1 : 0);
      if (this.perfectWindow <= 0) this.perfectHint.setText('');
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.attackHeld > 0) {
      this.attackHeld += dt;
      if (this.attackHeld >= 0.55 && !this.charging) {
        this.charging = true;
        this.toast('蓄力中…');
      }
    }

    if (this.moveDir !== 0) {
      this.facing = this.moveDir > 0 ? 1 : -1;
      this.player.x += this.moveDir * MOVE_SPEED * dt;
      this.player.x = Phaser.Math.Clamp(this.player.x, this.cx() - ARENA_HALF, this.cx() + ARENA_HALF);
      this.place(this.player);
    }

    for (const e of this.enemies) {
      if (!e.dead) this.tickEnemy(e, dt);
    }
    this.tickDrops();
    this.refreshHud();
    this.checkTrashClear();
    this.pulseVignette(dt);
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
    const leap = this.moveDir !== 0 ? this.moveDir * 80 : this.facing * 70;
    this.facing = leap >= 0 ? 1 : -1;
    this.player.x = Phaser.Math.Clamp(
      this.player.x + leap,
      this.cx() - ARENA_HALF,
      this.cx() + ARENA_HALF,
    );
    this.place(this.player);

    if (this.perfectWindow > 0) {
      this.perfectWindow = 0;
      this.perfectHint.setAlpha(0).setText('');
      this.toast(Copy.perfectDodge);
      playSfx('perfect');
      this.applyCraving(-CRAVING_PERFECT_FALL);
      const prev = this.run.dmgMul;
      this.run.dmgMul = Math.min(2, this.run.dmgMul * 1.5);
      this.time.delayedCall(2000, () => {
        this.run.dmgMul = Math.max(1, prev);
      });
      this.doAttack(1.5, false, true);
    }
  }

  private doAttack(mul = 1, raiseCraving = true, isPerfect = false) {
    if (this.player.dead) return;
    if (raiseCraving) this.applyCraving(CRAVING_ATTACK_RISE);
    slashSwipe(this, this.player.x, this.player.y, this.facing, isPerfect ? 0x80ffc0 : 0xffe080, false);
    const range = 110;
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.player.x) <= range && Math.abs(e.y - this.player.y) <= 120) {
        this.hurt(e, this.player.atk * this.run.dmgMul * mul, isPerfect || mul > 1.2);
        hit = true;
      }
    }
    if (!hit) {
      floatDmg(this, this.player.x + this.facing * 50, this.player.y - 30, 0, 'miss');
    }
  }

  private doRake() {
    if (this.player.dead) return;
    if (this.run.cravingLockLeft > 0) {
      this.toast(Copy.toastCravingRakeLock);
      return;
    }
    this.run.rakeCd = RAKE_MAX;
    playSfx('rake');
    shake(this, 0.012, 180);
    slashSwipe(this, this.player.x, this.player.y, this.facing, 0xff9040, true);
    hitstop(this, 70);
    const range = 180;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - this.player.x) <= range) {
        this.hurt(e, this.player.atk * 2.4 * this.run.dmgMul, true);
      }
    }
    this.toast('钉耙砸！！');
    this.refreshHud();
  }

  private bumpCombo() {
    if (this.comboTimer > 0) this.combo += 1;
    else this.combo = 1;
    this.comboTimer = COMBO_WINDOW;
    if (this.combo > this.run.comboPeak) this.run.comboPeak = this.combo;
    if (this.combo >= 2) {
      this.comboText.setText(`${Copy.combo} ×${this.combo}`).setAlpha(1);
      this.tweens.killTweensOf(this.comboText);
      this.tweens.add({ targets: this.comboText, alpha: 0.4, delay: 800, duration: 400 });
    }
  }

  private comboMul(): number {
    return 1 + 0.05 * Math.min(this.combo, 10);
  }

  private hurt(e: Fighter, dmg: number, crit = false) {
    if (e.dead) return;
    this.bumpCombo();
    const final = dmg * this.comboMul();
    e.hp -= final;
    const scoreGain = Math.floor(final * 10 * this.comboMul());
    this.run.score += scoreGain;
    playSfx('hit');
    hitstop(this, crit ? 70 : 45);
    floatDmg(this, e.x, e.y - 40, final, crit ? 'crit' : 'normal');
    e.body.setFillStyle(0xffffff);
    this.time.delayedCall(80, () => {
      if (!e.dead && e.windup <= 0) e.body.setFillStyle(e.baseColor);
    });
    if (e.kind === 'boss') this.checkBossPhase(e);
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      const bonus = e.kind === 'boss' ? 3000 : 500;
      this.run.score += bonus;
      this.clearDanger(e);
      this.tweens.add({
        targets: [e.body],
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0,
        duration: 180,
        onComplete: () => this.refreshFighter(e),
      });
      killPop(this, e.x, e.y, bonus);
      this.maybeDrop(e);
      if (e.kind === 'boss') this.win();
      return;
    }
    this.refreshFighter(e);
    this.refreshHud();
  }

  private maybeDrop(e: Fighter) {
    if (e.kind === 'boss') return;
    if (Math.random() > 0.45) return;
    const kind: Drop['kind'] = Math.random() < 0.55 ? 'rice' : 'shard';
    const color = kind === 'rice' ? 0xf0d080 : 0x80d0ff;
    const body = this.add.rectangle(e.x, e.y, 28, 28, color).setStrokeStyle(2, 0xffffff);
    const label = this.add
      .text(e.x, e.y - 22, kind === 'rice' ? '斋' : '片', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.drops.push({ kind, x: e.x, y: e.y, body, label });
  }

  private tickDrops() {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (Math.abs(d.x - this.player.x) < 50 && Math.abs(d.y - this.player.y) < 60) {
        if (d.kind === 'rice') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
          this.toast(Copy.dropRice);
        } else {
          this.run.score += 200;
          this.toast(Copy.dropShard + ' +200');
        }
        playSfx('pickup');
        d.body.destroy();
        d.label.destroy();
        this.drops.splice(i, 1);
        this.refreshFighter(this.player);
      }
    }
  }

  private checkBossPhase(e: Fighter) {
    const r = e.hp / e.maxHp;
    if (e.phase < 2 && r <= 0.7) {
      e.phase = 2;
      e.atk = Math.floor(e.atk * 1.15);
      playSfx('phase');
      shake(this, 0.01, 200);
      this.toast(Copy.phaseHint + ' · 镜光横扫');
    }
    if (e.phase < 3 && r <= 0.4) {
      e.phase = 3;
      e.atk = Math.floor(e.atk * 1.15);
      playSfx('phase');
      shake(this, 0.014, 240);
      this.toast(Copy.phaseHint + ' · 残影冲刺');
    }
  }

  private clearDanger(e: Fighter) {
    if (e.danger) {
      e.danger.destroy();
      e.danger = undefined;
    }
  }

  private startWindup(e: Fighter, sec: number, move: BossMove | 'melee' | 'ranged') {
    e.windup = sec;
    e.windupMax = sec;
    e.body.setFillStyle(0xff6030);
    this.clearDanger(e);
    if (move === 'sweep') {
      e.danger = this.add
        .rectangle(e.x, e.y, 280, e.h + 20, 0xff4060, 0.25)
        .setStrokeStyle(2, 0xff8080, 0.6);
    } else {
      e.danger = this.add.arc(e.x, e.y - e.h / 2 - 8, 28, 270, 270 + 1, false, 0xffa040, 0.55);
    }
    // Perfect window opens in last 0.35s of windup
    const openAt = Math.max(0, sec - 0.35);
    this.time.delayedCall(openAt * 1000, () => {
      if (e.dead || e.windup <= 0) return;
      this.perfectWindow = Math.min(0.35, e.windup);
      this.perfectHint.setText('！可完美闪避').setAlpha(1);
    });
  }

  private tickEnemy(e: Fighter, dt: number) {
    if (this.player.dead) return;

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.danger && e.danger instanceof Phaser.GameObjects.Arc && e.windupMax > 0) {
        const progress = 1 - e.windup / e.windupMax;
        (e.danger as Phaser.GameObjects.Arc).setEndAngle(270 + progress * 359);
      }
      if (e.kind === 'boss' && e.move === 'dash' && e.dashVx !== 0) {
        e.x += e.dashVx * dt;
        e.x = Phaser.Math.Clamp(e.x, this.cx() - ARENA_HALF, this.cx() + ARENA_HALF);
        this.place(e);
      }
      if (e.windup <= 0) {
        this.resolveEnemyAttack(e);
      }
      return;
    }

    e.cd -= dt;

    if (e.kind === 'melee') {
      const dir = Math.sign(this.player.x - e.x) || 1;
      e.x += dir * 90 * dt;
      this.place(e);
      if (e.cd <= 0 && Math.abs(e.x - this.player.x) < 90) {
        e.move = 'melee';
        this.startWindup(e, 0.45, 'melee');
        e.cd = 99;
      }
    } else if (e.kind === 'ranged') {
      if (e.cd <= 0) {
        e.move = 'melee';
        this.startWindup(e, 0.55, 'ranged');
        e.cd = 99;
      }
    } else if (e.kind === 'boss') {
      this.tickBoss(e, dt);
    }
  }

  private tickBoss(e: Fighter, dt: number) {
    if (e.cd > 0) {
      // slow approach between attacks
      const dir = Math.sign(this.player.x - e.x) || 1;
      e.x += dir * (50 + e.phase * 10) * dt;
      this.place(e);
      return;
    }

    if (e.phase >= 3 && Math.random() < 0.45) {
      e.move = 'dash';
      e.dashVx = (Math.sign(this.player.x - e.x) || 1) * (380 + e.phase * 40);
      this.toast(Copy.bossDash);
      this.startWindup(e, 0.4, 'dash');
      e.cd = 99;
      return;
    }
    if (e.phase >= 2 && Math.random() < 0.5) {
      e.move = 'sweep';
      e.dashVx = 0;
      this.toast(Copy.bossSweep);
      this.startWindup(e, 0.7, 'sweep');
      e.cd = 99;
      return;
    }
    e.move = 'melee';
    e.dashVx = 0;
    this.startWindup(e, 0.55, 'melee');
    e.cd = 99;
  }

  private resolveEnemyAttack(e: Fighter) {
    this.clearDanger(e);
    e.body.setFillStyle(e.baseColor);
    e.dashVx = 0;

    let range = 100;
    let mul = 1 + e.phase * 0.1;
    if (e.move === 'sweep') {
      range = 160;
      mul = 1.35 + e.phase * 0.1;
    } else if (e.move === 'dash') {
      range = 120;
      mul = 1.2 + e.phase * 0.12;
    } else if (e.kind === 'ranged') {
      range = 280;
      mul = 1;
    }

    if (Math.abs(e.x - this.player.x) < range) {
      this.hitPlayer(e.atk * mul);
    }

    if (e.kind === 'boss') {
      e.cd = e.phase >= 3 ? 0.75 : e.phase >= 2 ? 1.0 : 1.25;
    } else if (e.kind === 'ranged') {
      e.cd = 1.6;
    } else {
      e.cd = 1.1;
    }
  }

  private hitPlayer(raw: number) {
    if (this.player.dead || this.iframe > 0) return;
    let dmg = raw * this.run.takenMul;
    if (this.run.cravingLockLeft > 0) dmg *= CRAVING_TAKEN_MUL;
    this.player.hp -= dmg;
    this.iframe = 0.25;
    playSfx('hurt');
    shake(this, 0.008, 100);
    floatDmg(this, this.player.x, this.player.y - 40, dmg, 'hurt');
    this.player.body.setFillStyle(0xff7878);
    this.time.delayedCall(200, () => {
      if (!this.player.dead) this.player.body.setFillStyle(COLORS.player);
    });
    this.refreshFighter(this.player);
    this.refreshHud();
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.dead = true;
      this.lose();
    }
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
    if (this.wave === 1) {
      this.wave = 2;
      this.toast(Copy.wave2);
      playSfx('phase');
      this.time.delayedCall(700, () => {
        if (!this.running) return;
        this.spawnWave(2);
      });
      return;
    }
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
    playSfx('win');
    this.scene.start('Result', { run: this.run });
  }

  private lose() {
    this.running = false;
    this.run.phase = 'lost';
    this.syncRunFromFighters();
    this.run.nearMiss = this.buildNearMiss();
    playSfx('lose');
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
    const phase =
      this.run.phase === 'won' || this.run.phase === 'lost'
        ? this.run.phase
        : this.run.phase === 'boss'
          ? 'boss'
          : 'trash';
    return nearMissLine({
      phase,
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

  static applyRevive(run: RunState): void {
    const next = cravingAfterRevive({ craving: run.craving, lockLeft: run.cravingLockLeft });
    run.craving = next.craving;
    run.cravingLockLeft = next.lockLeft;
    run.playerHp = Math.max(1, Math.floor(run.playerMaxHp * 0.5));
    run.reviveUsed = true;
    run.phase = run.choice !== null ? 'boss' : 'trash';
  }

  private refreshHud() {
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBarFill.width = 200 * hpRatio;
    this.hpBarFill.setFillStyle(hpRatio < 0.25 ? 0xff5050 : hpRatio < 0.5 ? 0xe0c040 : 0x70d070);

    const slots = cravingSlots(this.run.craving);
    for (let i = 0; i < 7; i++) {
      const locked = this.run.cravingLockLeft > 0;
      this.cravingSlotsGfx[i].setFillStyle(
        i < slots ? (locked ? 0xff6060 : 0xd080ff) : 0x3a2848,
      );
    }

    // rake pie
    this.rakePie.clear();
    const ready = this.run.rakeCd <= 0 && this.run.cravingLockLeft <= 0;
    this.rakePie.fillStyle(ready ? 0xc45c26 : 0x3a2848, 1);
    this.rakePie.fillCircle(0, 0, 28);
    if (this.run.rakeCd > 0) {
      const p = 1 - this.run.rakeCd / RAKE_MAX;
      this.rakePie.fillStyle(0xffd080, 0.9);
      this.rakePie.slice(0, 0, 28, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * p), false);
      this.rakePie.fillPath();
      this.rakeLabel.setText(this.run.rakeCd.toFixed(1));
    } else if (this.run.cravingLockLeft > 0) {
      this.rakeLabel.setText('锁');
    } else {
      this.rakeLabel.setText('耙');
    }

    this.scoreText.setText(
      `${Copy.score} ${this.run.score}  ${Copy.best} ${this.run.bestScore}` +
        (this.combo >= 2 ? `  ${Copy.combo}×${this.combo}` : ''),
    );

    if (this.mode === 'boss') {
      const boss = this.enemies.find((e) => e.kind === 'boss' && !e.dead);
      if (boss) {
        const r = Math.max(0, boss.hp / boss.maxHp);
        this.bossBarFill.width = 560 * r;
        this.bossBarLabel.setText(`${Copy.bossName}  ${Math.ceil(boss.hp)}/${boss.maxHp}`);
      }
    }
  }

  private pulseVignette(_dt: number) {
    const low = this.player && this.player.hp / this.player.maxHp < 0.25 && !this.player.dead;
    if (!low) {
      this.vignette.setAlpha(0);
      return;
    }
    const a = 0.12 + Math.sin(this.time.now / 200) * 0.08;
    this.vignette.setAlpha(a);
  }

  private toast(msg: string) {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1000,
      duration: 400,
    });
  }
}
