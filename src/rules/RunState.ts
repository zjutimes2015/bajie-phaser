/** 单局运行态：场景之间只传这个对象，不做上帝 GameManager。 */

export type ChoiceId = 'feed' | 'boast' | 'exorcise';
export type EndingId = 'guard' | 'greed';

export interface DialogBuffs {
  healRatio: number;
  dmgMul: number;
  takenMul: number;
  bossBreak: boolean;
  ending: EndingId;
  choice: ChoiceId;
}

export interface RunState {
  score: number;
  bestScore: number;
  playerHp: number;
  playerMaxHp: number;
  craving: number;
  cravingLockLeft: number;
  rakeCd: number;
  dmgMul: number;
  takenMul: number;
  bossBreak: boolean;
  ending: EndingId;
  choice: ChoiceId | null;
  reviveUsed: boolean;
  nearMiss: string;
  phase: 'cover' | 'trash' | 'dialog' | 'boss' | 'won' | 'lost';
  bossHpRatio: number | null;
}

const BEST_KEY = 'bajie_phaser_best';

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  const best = Math.max(loadBestScore(), score);
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* browser private mode — ignore */
  }
}

export function freshRun(): RunState {
  return {
    score: 0,
    bestScore: loadBestScore(),
    playerHp: 100,
    playerMaxHp: 100,
    craving: 0,
    cravingLockLeft: 0,
    rakeCd: 0,
    dmgMul: 1,
    takenMul: 1,
    bossBreak: false,
    ending: 'guard',
    choice: null,
    reviveUsed: false,
    nearMiss: '',
    phase: 'cover',
    bossHpRatio: null,
  };
}

export function buffsFromChoice(
  choice: ChoiceId,
  bossBreak: boolean,
): DialogBuffs {
  if (choice === 'feed') {
    return {
      healRatio: 0.2,
      dmgMul: 1,
      takenMul: 1,
      bossBreak: false,
      ending: 'guard',
      choice,
    };
  }
  if (choice === 'boast') {
    return {
      healRatio: 0,
      dmgMul: 1.1,
      takenMul: 1.1,
      bossBreak: false,
      ending: 'greed',
      choice,
    };
  }
  if (bossBreak) {
    return {
      healRatio: 0.05,
      dmgMul: 1.05,
      takenMul: 1,
      bossBreak: true,
      ending: 'guard',
      choice: 'exorcise',
    };
  }
  return {
    healRatio: -0.15,
    dmgMul: 1,
    takenMul: 1.05,
    bossBreak: false,
    ending: 'guard',
    choice: 'exorcise',
  };
}
