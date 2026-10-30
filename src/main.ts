import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CoverScene } from './scenes/CoverScene';
import { CombatScene } from './scenes/CombatScene';
import { DialogScene } from './scenes/DialogScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: 720,
  height: 1280,
  backgroundColor: '#1a1220',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, CoverScene, CombatScene, DialogScene, ResultScene],
  input: {
    activePointers: 3,
  },
};

new Phaser.Game(config);
