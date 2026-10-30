/**
 * 短对白脚本（全中文）。
 * 对标模式来自：
 * - robingamedev/visual-novel-dialogue：speaker + typewriter + choices
 * - lizgw/phaser-ink-demo（17★）：continueStory → createChoices → choiceClick
 * - juwalbose/phaser3_visualnovelengine（7★）：JSON lines + branch labels
 * 本仓不引 inkjs / 整库插件，只学模式（YAGNI）。
 */

export type DialogueLine = {
  speaker: string;
  text: string;
};

export type DialogueChoiceDef = {
  id: 'feed' | 'boast' | 'exorcise';
  label: string;
  tip: string;
};

/** 封面 → 开战前：八戒自言自语，让玩家感到「有对话」。 */
export const INTRO_LINES: DialogueLine[] = [
  { speaker: '八戒', text: '师父不在，山下倒清静……肚子倒先叫了。' },
  { speaker: '八戒', text: '前面妖气乱窜。钉耙备好，先打一顿再寻斋饭！' },
  { speaker: '八戒', text: '记住：闪避卡在刀尖上，戒心别顶满——嘴馋要吃亏。' },
];

/** 清完两波后：莲娘多句对白，再出三选。 */
export const LIANNIANG_LINES: DialogueLine[] = [
  { speaker: '莲娘', text: '客栈灯火摇晃……你身上有戒香，却也有人间烟火气。' },
  { speaker: '八戒', text: '嘿嘿，贫僧路过，闻见妖气缠人。姑娘可无恙？' },
  { speaker: '莲娘', text: '我被镜中残响缠身。你怎么做，便决定今夜结局。' },
];

export const LIANNIANG_CHOICES: DialogueChoiceDef[] = [
  { id: 'feed', label: '送斋饭', tip: '回 20% 血 · 戒心−' },
  { id: 'boast', label: '吹牛皮', tip: '攻+10% 挨打+10% · 戒心+' },
  { id: 'exorcise', label: '帮她驱邪', tip: '成则 Boss 破防 / 败则自损' },
];

/** 波次间（第一波清完）：暂停战斗说一句，再刷第二波。 */
export const WAVE2_LINES: DialogueLine[] = [
  { speaker: '八戒', text: '这帮小的倒挺敢扑……第二波来了，钉耙别手软！' },
];

/** 三选结算后、进 Boss 前的短反应。 */
export const AFTER_CHOICE_LINES: Record<'feed' | 'boast' | 'exorcise_ok' | 'exorcise_fail', DialogueLine[]> = {
  feed: [
    { speaker: '莲娘', text: '……谢谢。这口斋饭，我记下了。' },
    { speaker: '八戒', text: '吃饱再打镜花！走！' },
  ],
  boast: [
    { speaker: '八戒', text: '当年俺老猪可是天蓬元帅——镜花算什么！' },
    { speaker: '莲娘', text: '口气不小……小心戒心反噬。' },
  ],
  exorcise_ok: [
    { speaker: '莲娘', text: '妖气退了半分！镜花破绽露出来了——去吧。' },
    { speaker: '八戒', text: '成了！这一耙，砸他个稀碎！' },
  ],
  exorcise_fail: [
    { speaker: '八戒', text: '唔……反噬到自家气血了。' },
    { speaker: '莲娘', text: '别硬撑。镜花还在，你仍要闯。' },
  ],
};

/** Boss 开场一句（Combat 进 boss 时叠在 toast 前用对话盒更清晰；此处备文案）。 */
export const BOSS_OPEN_LINES: DialogueLine[] = [
  { speaker: '镜花将军', text: '镜中闪过齐天残响……猪妖，可敢一战？' },
  { speaker: '八戒', text: '敢！俺老猪就怕你不照！' },
];
