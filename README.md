# 八戒下山（Phaser 3 重做）

竖屏 HTML5 可玩原型：封面对白 → 清小怪（波次对白）→ 莲娘对白三选 → Boss 对白 → 胜负结算。  
规则与文案从 Cocos 版 `/workspace/bajie-downhill` 的 `SheepV1` / `Copy` 原样迁入。

## 为什么用 Phaser（不是八引擎合体）

已 fork 作参考（**不要改这些 fork**）：

| 仓库 | 学什么 |
|---|---|
| [godot](https://github.com/zjutimes2015/godot) | 场景树 / 一键导出 |
| [bevy](https://github.com/zjutimes2015/bevy) | 数据驱动、系统可替换 |
| [pixijs](https://github.com/zjutimes2015/pixijs) | 渲染管线独立 |
| [phaser](https://github.com/zjutimes2015/phaser) | **本项目用**：Scene 状态机 + HTML5 |
| [raylib](https://github.com/zjutimes2015/raylib) | 最小例子、短反馈 |
| [GDevelop](https://github.com/zjutimes2015/GDevelop) | 事件与数值分离 |
| [Babylon.js](https://github.com/zjutimes2015/Babylon.js) | Playground 即时试错 |
| [libgdx](https://github.com/zjutimes2015/libgdx) | 平台 backends 抽象 |

本游戏用 **npm `phaser`**，不把 fork 源码塞进工程。微信上传仍需正式 AppID + 小游戏适配器（本仓未做）。

Spec：仓库旁 `../specs/bajie-wechat-spec-a.md`（或你本地同路径）。

## 怎么玩

```bash
npm install
npm run dev          # 浏览器 http://localhost:5173
npm run build        # → dist/
npm run preview      # 预览 dist
npm test             # SheepV1 纯规则单测
```

操作：← → 移动 · **Z** 攻击（长按蓄力钉耙）· **X** 闪避 · **C** 钉耙砸；亦可点屏幕底部按钮。

## 文件地图

```
src/main.ts                 Phaser 配置 720×1280 FIT
src/rules/SheepV1.ts        戒心/差一点/翻车分享（纯 TS）
src/rules/Copy.ts           中文文案 + 楷体栈
src/rules/RunState.ts       单局数据，场景间传递
src/rules/WxBridge.ts       分享/激励广告：有 wx 调真，否则 mock
src/audio/Sfx.ts            Oscillator 短音效
src/combat/Frames.ts        60Hz 帧表 + 动作状态机
src/combat/Juice.ts         同帧多层反馈 / 残影 / 扬尘
src/art/ArtKeys.ts          纹理 key + 显示高度
src/scenes/BootScene.ts     预载立绘 → Cover
src/scenes/CoverScene.ts    封面（八戒主视觉）
src/scenes/CombatScene.ts   小怪 + Boss 战斗（多帧换图）
src/ui/DialogueBox.ts       打字机对白盒（名牌/点推/选项）
src/rules/DialogueScripts.ts 开场/波次/莲娘/Boss 中文脚本
src/scenes/DialogScene.ts   莲娘对白流 + 三选 + 驱邪 QTE
src/scenes/ResultScene.ts   胜负 / 再来 / 分享 / 广告续命
public/art/characters/      透明 PNG 立绘（idle/atk/hurt）
tools/prepare_art.py        抠紫底 + 脚底居中 + 小妖左右拆
tools/verify_sheep_v1.mjs   Node 单测
```

## Feel（王者手感子集 · 公开原则，非逆向）

逻辑 **60Hz** 固定步；表现层插值坐标 + tween。命中只在 **active 逻辑帧**结算。顿帧冻逻辑不冻表现。

| 动作 | startup | active | recovery | 取消 |
|---|---|---|---|---|
| 轻击 light | 5 | 3 | 9 | recovery≥2 → 闪避/轻击/钉耙 |
| 钉耙 rake | 12 | 5 | 18 | recovery≥9 才可取消 |
| 闪避 dodge | 2 | 8 | 4 | startup+active 无敌；可取消轻击后摇 |

同帧多层（命中瞬间）：逻辑 hitstop 3/5/6 帧 + 击退 + 表现层 SFX/震屏/闪白/斩击。  
敌人完美窗 = 前摇末 **5** 逻辑帧（贴判定落地）。  
表现：anticipate→strike→settle、闪避残影、扬尘、钉耙闪屏。

**诚实差距**：无英雄池/皮肤/帧同步联网/骨骼动画；这是单机竖屏原型的「打击感骨架 + 静帧换图」，不是《王者荣耀》还原。

## 手感深化（v1.1）

- Hitstop / 震屏 / 斩击条 / 击杀粒子 / WebAudio 哔哔
- 小怪两波；敌人前摇变色 + 危险弧；Boss 镜光横扫 / 残影冲刺
- 连击倍率、斋饭/金箍碎片掉落
- HP 条、戒心 7 格、钉耙饼、Boss 血条、残血 vignette

## 已实现 / 仍是桩

| 已实现 | 仍是桩 |
|---|---|
| Cover→Combat→Dialog→Boss→Result 全流程 | 微信正式 AppID / 开发者工具上传 |
| 戒心槽、完美闪避反击、Boss 70%/40% 阶段 | 流量主 adUnitId（`WxBridge` 空串 → mock） |
| 莲娘对白流 + 三选 + QTE；开场/波次/Boss 短对白 | 骨骼动画 / 多方向走帧（现静帧换图） |
| 浏览器分享 clipboard mock | 战绩卡 Canvas 美化 |
| `npm test` SheepV1 | 微信适配器打包 |


## 美术（v1.2 · Universal-LPC 思路，非 Spine）

GitHub 对标：[Universal-LPC](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)（多帧动作表换图，不整库搬西幻 LPC 脸）。

| 角色 | 帧 |
|---|---|
| 八戒 | idle / atk / hurt |
| 小妖近战·远程 | idle / atk（合板左右拆） |
| 镜花 Boss | idle / atk |
| 莲娘 | idle（对话立绘） |

- 素材：Cocos 工程自产 idle 立绘 + 本轮生成动作帧；`tools/prepare_art.py` 抠近 `#1a1220` 紫底为透明、提亮、脚底落画布。
- **不是** Spine / `.skel`；战斗用 `Image` 按状态切纹理 + `flipX` 朝向。
- 许可证：自用（本仓角色图，勿当第三方 LPC 资产再分发）。

**诚实差距**：无骨骼动画、无多方向走帧、无 atlas 合图管线；暗场高对比立绘在战斗里靠脚下色盘托轮廓。


## 对话（v1.3 · 打字机 + 点推 + 三选）

GitHub 对标（学模式，不整库搬）：

| 仓库 | stars | 学到的模式 |
|---|---|---|
| [lizgw/phaser-ink-demo](https://github.com/lizgw/phaser-ink-demo) | 17 | `continueStory` → `createChoices` → `choiceClick` |
| [juwalbose/phaser3_visualnovelengine](https://github.com/juwalbose/phaser3_visualnovelengine) | 7 | JSON 行驱动、speaker、最多 6 选项、立绘情绪切 |
| [robingamedev/visual-novel-dialogue](https://github.com/robingamedev/visual-novel-dialogue) | npm 插件 | nameplate + typewriter + tap skip/advance + label 跳转 |

本仓实现：`src/ui/DialogueBox.ts` + `src/rules/DialogueScripts.ts`（不引 inkjs）。

### 怎么玩对话

1. 封面点「开始闯荡」→ **开场三句**（打字机，点屏幕 / 空格 / Z 跳过或推进）
2. 清完第一波 → **波次间一句**，再刷第二波
3. 清完小怪 → **莲娘多句对白** → 三选（送斋饭 / 吹牛皮 / 驱邪）；驱邪仍进 QTE
4. 三选结算后 → **短反应对白** → Boss
5. Boss 开场 → **镜花对吼两句**，再开打

文案全中文；不是完整视觉小说。

## 心法

遵循 `AGENT.md`：YAGNI / KISS / 命名是设计 / Fail Fast。场景拆开，不用一个 GameManager 糊所有 UI。
