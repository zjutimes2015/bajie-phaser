/**
 * 羊启发 v1 纯规则（无 cc 依赖）：戒心槽 / 差一点 / 失败翻车文案。
 * Combat / ShareCard 调用这里；tools/verify_sheep_v1.mjs 用同一文件做 Node 单测。
 */

export const CRAVING_MAX = 100;
export const CRAVING_LOCK_SEC = 8;
export const CRAVING_TAKEN_MUL = 1.2;
export const CRAVING_ATTACK_RISE = 3;
export const CRAVING_PERFECT_FALL = 15;
export const CRAVING_AFTER_LOCK = 70;
export const CRAVING_BOAST_RISE = 25;
export const CRAVING_FEED_FALL = 20;
export const CRAVING_EXORCISE_FALL = 25;

export interface CravingState {
    craving: number;
    lockLeft: number;
}

/** HUD 0–7 格；满值固定 7。 */
export function cravingSlots(craving: number, max = CRAVING_MAX): number {
    if (craving >= max) return 7;
    return Math.max(0, Math.floor(craving / (max / 7)));
}

/**
 * 加减戒心。从不满→满且当前无锁 → 开 lockSec 秒锁。
 * 返回 justLocked 供 toast。
 */
export function addCraving(
    state: CravingState,
    delta: number,
    lockSec = CRAVING_LOCK_SEC,
): { state: CravingState; justLocked: boolean } {
    const prev = state.craving;
    const craving = Math.max(0, Math.min(CRAVING_MAX, state.craving + delta));
    let lockLeft = state.lockLeft;
    let justLocked = false;
    if (prev < CRAVING_MAX && craving >= CRAVING_MAX && lockLeft <= 0) {
        lockLeft = lockSec;
        justLocked = true;
    }
    return { state: { craving, lockLeft }, justLocked };
}

/** 每帧扣锁；锁刚结束且仍满 → 回落到 afterLock。 */
export function tickCravingLock(
    state: CravingState,
    dt: number,
    afterLock = CRAVING_AFTER_LOCK,
): CravingState {
    if (state.lockLeft <= 0) return state;
    const lockLeft = Math.max(0, state.lockLeft - dt);
    let craving = state.craving;
    if (lockLeft <= 0 && craving >= CRAVING_MAX) {
        craving = afterLock;
    }
    return { craving, lockLeft };
}

/** 广告复活：清锁；满值回落。 */
export function cravingAfterRevive(
    state: CravingState,
    afterLock = CRAVING_AFTER_LOCK,
): CravingState {
    const craving = state.craving >= CRAVING_MAX ? afterLock : state.craving;
    return { craving, lockLeft: 0 };
}

export function dialogCravingDelta(
    choice: 'feed' | 'boast' | 'exorcise',
    bossBreak: boolean,
): number {
    if (choice === 'boast') return CRAVING_BOAST_RISE;
    if (choice === 'feed') return -CRAVING_FEED_FALL;
    if (choice === 'exorcise' && bossBreak) return -CRAVING_EXORCISE_FALL;
    return 0;
}

export interface NearMissInput {
    phase: 'trash' | 'dialog' | 'boss' | 'won' | 'lost';
    craving: number;
    lockLeft: number;
    rakeCd: number;
    score: number;
    /** Boss 仍存活时的残血比 0–1；无 Boss 或已死传 null */
    bossHpRatio: number | null;
    /** 玩家血量比；won 时用 */
    playerHpRatio: number | null;
    templates: {
        cravingLock: string;
        bossHp: string;
        winClose: string;
        rakeCd: string;
        cravingAlmost: string;
        score: string;
    };
}

function fill(tpl: string, n: string | number): string {
    return tpl.replace('{n}', String(n));
}

/**
 * 差一点文案：只挑一条。
 * 优先级：戒心罚锁 → Boss 残血 → 险胜残血 → 钉耙短 CD → 戒心差 1 格 → 分数兜底。
 */
export function nearMissLine(input: NearMissInput): string {
    const t = input.templates;
    if (input.lockLeft > 0) {
        return fill(t.cravingLock, Math.ceil(input.lockLeft));
    }
    if (input.bossHpRatio !== null && input.bossHpRatio > 0) {
        const pct = Math.max(1, Math.ceil(input.bossHpRatio * 100));
        return fill(t.bossHp, pct);
    }
    if (input.phase === 'won' && input.playerHpRatio !== null) {
        const pct = Math.max(1, Math.ceil(input.playerHpRatio * 100));
        if (pct <= 20) return fill(t.winClose, pct);
    }
    if (input.rakeCd > 0.05 && input.rakeCd <= 3) {
        return fill(t.rakeCd, input.rakeCd.toFixed(1));
    }
    const slotLeft = 7 - cravingSlots(input.craving);
    if (slotLeft > 0 && slotLeft <= 1) {
        return fill(t.cravingAlmost, slotLeft);
    }
    if (input.phase === 'lost') {
        return fill(t.score, input.score);
    }
    return '';
}

/** 失败翻车分享标题（不含 wx 副作用）。 */
export function shareFailText(
    score: number,
    nearMiss: string,
    failDefault: string,
): string {
    const detail = nearMiss && nearMiss.length > 0
        ? `｜${nearMiss}`
        : `｜才 ${score} 分`;
    return `${failDefault}${detail}`;
}
