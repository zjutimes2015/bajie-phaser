/** 中文文案集中处（楷体 UI 用）。 */

/**
 * 戒心槽规则（羊启发 v1）
 * 数值权威：SheepV1.ts；Combat / ShareCard 调用之；下文仅中文说明。
 *
 * 量程：0–100；HUD 0–7 格（满=7）。
 * 涨：普攻 +3；吹牛皮 +25。
 * 落：完美闪避 −15（反击不计普攻涨）；送斋饭 −20；驱邪成功 −25。
 * 满 100：钉耙锁 8s + 受伤 ×1.2；不即死；锁结束仍满 → 回落 70。
 */
export const FONT = 'KaiTi, STKaiti, 楷体, DFKai-SB, serif';

export const Copy = {
    title: '八戒下山',
    tagline: '贪吃好色又心软 · 下山闯一关',
    play: '▶ 开始闯荡',
    hp: '血量',
    craving: '戒心',
    cravingFull: '戒心满!',
    cravingLock: '戒心锁',
    rakeCd: '钉耙',
    score: '本局',
    best: '最高',
    moveLeft: '←',
    moveRight: '→',
    attack: '攻击',
    dodge: '闪避',
    rakeReady: '钉耙砸!',
    rakeCool: '钉耙冷却',
    dialogTitle: '莲娘',
    dialogBody: '客栈灯火摇晃……她被妖气缠身，望向你。你怎么做？',
    choiceFeed: '送斋饭',
    choiceFeedTip: '回 20% 血 · 戒心−',
    choiceBoast: '吹牛皮',
    choiceBoastTip: '攻+10% 挨打+10% · 戒心+',
    choiceExorcise: '帮她驱邪',
    choiceExorciseTip: '成则 Boss 破防 / 败则自损',
    qtePrompt: '连点驱邪！',
    loseTitle: '又嘴馋了？',
    loseRetry: '再来一局',
    loseRevive: '看广告续命',
    loseShare: '分享求助',
    winTitle: '今日戒心未灭',
    winTitleGuard: '护花使者',
    winTitleGreed: '贪心不改',
    winAgain: '再闯一关',
    winShare: '分享战绩',
    adPlaying: '广告播放中…',
    bossName: '镜花将军',
    mobMelee: '小妖',
    mobRanged: '飞蝠',
    phaseHint: '妖气变招！',
    perfectDodge: '完美闪避！反击',
    mirrorHint: '镜中闪过齐天残响……',
    toastRevive: '续命成功，继续闯！',
    toastNoRevive: '本局续命已用完',
    toastCravingFull: '嘴馋犯了！钉耙锁 8 秒，挨打更疼',
    toastCravingRakeLock: '戒心未定，钉耙砸不出去',
    sharePrefix: '我在《八戒下山》打出',
    shareSuffix: '，你敢超？',
    /** 失败默认翻车分享（羊启发：你也来翻车） */
    shareFailDefault: '我在《八戒下山》又嘴馋了，帮我出这一耙',
    /** 差一点文案：带一个具体数字 {n} */
    nearMissBossHp: 'Boss 还剩 {n}% 血',
    nearMissCravingLock: '戒心罚中 · 钉耙还锁 {n}s',
    nearMissCravingAlmost: '戒心差 {n} 格就满罚',
    nearMissRakeCd: '钉耙还差 {n}s',
    nearMissWinClose: '险胜 · 血量只剩 {n}%',
    nearMissScore: '本局才 {n} 分',
    combo: '连击',
    wave1: '第一波妖众',
    wave2: '第二波来了！',
    bossSweep: '镜光横扫！快闪',
    bossDash: '残影冲刺！',
    dropRice: '斋饭 +8 血',
    dropShard: '金箍碎片',
    qteOk: '驱邪成功！',
    qteFail: '驱邪失手，自损气血',
    peakCombo: '最高连击',
};
