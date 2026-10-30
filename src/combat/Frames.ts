/**
 * 王者手感子集 · 帧表（公开前摇/后摇原则，非逆向）。
 * 逻辑 60Hz；命中只在 active 逻辑帧结算。
 */

export const LOGIC_HZ = 60;
export const LOGIC_DT = 1 / LOGIC_HZ;

export type AttackTier = 'light' | 'rake' | 'perfect';
export type ActionKind = 'none' | 'light' | 'rake' | 'dodge';
export type ActionPhase = 'startup' | 'active' | 'recovery';

export interface FrameClip {
  startup: number;
  active: number;
  recovery: number;
  /** recovery 第几帧起可取消（0=整段不可取消，1=recovery 第1帧起） */
  cancelRecoveryFrom: number;
}

/** 轻击：短前摇、短判定、后摇可早取消进闪避/下一段 */
export const LIGHT: FrameClip = {
  startup: 5,
  active: 3,
  recovery: 9,
  cancelRecoveryFrom: 2,
};

/** 钉耙：长前摇、宽判定、后摇中段才可取消 */
export const RAKE: FrameClip = {
  startup: 12,
  active: 5,
  recovery: 18,
  cancelRecoveryFrom: 9,
};

/** 闪避：startup+active 全程无敌；可取消轻击后摇 */
export const DODGE: FrameClip = {
  startup: 2,
  active: 8,
  recovery: 4,
  cancelRecoveryFrom: 0,
};

/** 敌人完美闪避窗：前摇末尾、贴着判定落地的逻辑帧数 */
export const PERFECT_EDGE_FRAMES = 5;

/** 蓄力钉耙：按住满多少逻辑帧 */
export const CHARGE_FRAMES = 33; // ~0.55s

export interface ActionState {
  kind: ActionKind;
  phase: ActionPhase;
  frame: number;
  /** 本段 active 是否已结算过伤害（只结算一次） */
  hitResolved: boolean;
  damageMul: number;
  raiseCraving: boolean;
  isPerfect: boolean;
}

export function idleAction(): ActionState {
  return {
    kind: 'none',
    phase: 'startup',
    frame: 0,
    hitResolved: false,
    damageMul: 1,
    raiseCraving: true,
    isPerfect: false,
  };
}

export function clipFor(kind: ActionKind): FrameClip | null {
  if (kind === 'light') return LIGHT;
  if (kind === 'rake') return RAKE;
  if (kind === 'dodge') return DODGE;
  return null;
}

export function phaseLen(clip: FrameClip, phase: ActionPhase): number {
  if (phase === 'startup') return clip.startup;
  if (phase === 'active') return clip.active;
  return clip.recovery;
}

/** 推进一逻辑帧；返回是否刚进入 active（用于表现触发） */
export function advanceAction(a: ActionState): { enteredActive: boolean; finished: boolean } {
  if (a.kind === 'none') return { enteredActive: false, finished: false };
  const clip = clipFor(a.kind)!;
  a.frame += 1;
  const len = phaseLen(clip, a.phase);
  if (a.frame < len) return { enteredActive: false, finished: false };
  if (a.phase === 'startup') {
    a.phase = 'active';
    a.frame = 0;
    return { enteredActive: true, finished: false };
  }
  if (a.phase === 'active') {
    a.phase = 'recovery';
    a.frame = 0;
    return { enteredActive: false, finished: false };
  }
  // recovery done
  Object.assign(a, idleAction());
  return { enteredActive: false, finished: true };
}

export function inIframes(a: ActionState): boolean {
  return a.kind === 'dodge' && (a.phase === 'startup' || a.phase === 'active');
}

/** 轻击后摇可取消 → 闪避/轻击/钉耙；钉耙仅中段后摇可取消 */
export function canCancelInto(a: ActionState, next: ActionKind): boolean {
  if (a.kind === 'none') return true;
  if (a.phase !== 'recovery') return false;
  const clip = clipFor(a.kind)!;
  if (a.frame < clip.cancelRecoveryFrom) return false;
  if (a.kind === 'rake') return next === 'dodge' || next === 'light' || next === 'rake';
  if (a.kind === 'light') return true;
  if (a.kind === 'dodge') return next === 'light' || next === 'rake';
  return false;
}

export function canStart(a: ActionState, next: ActionKind): boolean {
  if (a.kind === 'none') return true;
  return canCancelInto(a, next);
}

/** 顿帧：逻辑冻结帧数（按档） */
export const HITSTOP_FRAMES: Record<AttackTier, number> = {
  light: 3,
  rake: 5,
  perfect: 6,
};

export const KNOCKBACK: Record<AttackTier, number> = {
  light: 18,
  rake: 42,
  perfect: 28,
};
