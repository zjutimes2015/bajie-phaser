import Phaser from 'phaser';
import { ART } from '../art/ArtKeys';

/** Preload character plates then Cover. Fail Fast on missing files via Phaser loader. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#1a1220');
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 320, 18, 0x3a2848);
    const bar = this.add.rectangle(width / 2 - 158, height / 2, 4, 14, 0xffd070).setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 36, '装载立绘…', {
        fontFamily: 'KaiTi, STKaiti, "Songti SC", serif',
        fontSize: '20px',
        color: '#c8b4dc',
      })
      .setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 4 + 312 * v;
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      throw new Error(`[Boot] failed to load ${file.key} (${file.url})`);
    });

    const jobs: [string, string][] = [
      [ART.bajieIdle, 'art/characters/bajie/bajie_idle.png'],
      [ART.bajieAtk, 'art/characters/bajie/bajie_atk.png'],
      [ART.bajieHurt, 'art/characters/bajie/bajie_hurt.png'],
      [ART.lianniangIdle, 'art/characters/lianniang/lianniang_idle.png'],
      [ART.bossIdle, 'art/characters/jinghua/boss_jinghua_idle.png'],
      [ART.bossAtk, 'art/characters/jinghua/boss_jinghua_atk.png'],
      [ART.mobMeleeIdle, 'art/characters/xiaoyao/mobs_melee.png'],
      [ART.mobMeleeAtk, 'art/characters/xiaoyao/mobs_melee_atk.png'],
      [ART.mobRangedIdle, 'art/characters/xiaoyao/mobs_ranged.png'],
      [ART.mobRangedAtk, 'art/characters/xiaoyao/mobs_ranged_atk.png'],
    ];
    for (const [key, url] of jobs) this.load.image(key, url);
    // silence unused
  }

  create() {
    this.scene.start('Cover');
  }
}
