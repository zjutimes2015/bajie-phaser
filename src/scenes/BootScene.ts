import Phaser from 'phaser';

/** 启动：设缩放后进封面。无资源预载（v1 色块）。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1220');
    this.scene.start('Cover');
  }
}
