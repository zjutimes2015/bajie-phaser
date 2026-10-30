/** Texture keys + display heights. Fail Fast if Boot forgot to load. */
export const ART = {
  bajieIdle: 'bajie_idle',
  bajieAtk: 'bajie_atk',
  bajieHurt: 'bajie_hurt',
  lianniangIdle: 'lianniang_idle',
  bossIdle: 'boss_jinghua_idle',
  bossAtk: 'boss_jinghua_atk',
  mobMeleeIdle: 'mobs_melee',
  mobMeleeAtk: 'mobs_melee_atk',
  mobRangedIdle: 'mobs_ranged',
  mobRangedAtk: 'mobs_ranged_atk',
} as const;

export type ArtKey = (typeof ART)[keyof typeof ART];

/** Combat display height (px). Player/Boss larger, trash smaller. */
export const DISPLAY_H: Record<'player' | 'melee' | 'ranged' | 'boss', number> = {
  player: 190,
  boss: 210,
  melee: 150,
  ranged: 140,
};

export function requireTex(scene: Phaser.Scene, key: string): void {
  if (!scene.textures.exists(key)) {
    throw new Error(`[art] missing texture "${key}" — BootScene must preload public/art`);
  }
}
