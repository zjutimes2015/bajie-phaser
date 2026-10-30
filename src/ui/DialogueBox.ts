/**
 * 底部对白盒：speaker 名牌 + 打字机 + 点按跳过/推进 + 选项按钮。
 * 模式学自 robingamedev/visual-novel-dialogue、lizgw/phaser-ink-demo；
 * 不依赖第三方对话插件（KISS / YAGNI）。
 */

import Phaser from 'phaser';
import { FONT } from '../rules/Copy';
import { playSfx } from '../audio/Sfx';
import { addPanelButton } from './PanelButton';
import type { DialogueChoiceDef, DialogueLine } from '../rules/DialogueScripts';

const CHAR_MS = 28;
const BOX_H = 240;

export type DialogueBox = {
  playLines: (lines: DialogueLine[], onDone: () => void) => void;
  showChoices: (choices: DialogueChoiceDef[], onPick: (id: DialogueChoiceDef['id']) => void) => void;
  destroy: () => void;
};

export function createDialogueBox(
  scene: Phaser.Scene,
  opts?: { depth?: number },
): DialogueBox {
  const depth = opts?.depth ?? 40;
  const { width, height } = scene.scale;
  const boxY = height - BOX_H / 2 - 20;

  const dim = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x000000, 0.35)
    .setDepth(depth)
    .setScrollFactor(0)
    .setInteractive();

  const panel = scene.add
    .rectangle(width / 2, boxY, width - 48, BOX_H, 0x1e1428, 0.96)
    .setStrokeStyle(3, 0xc8a0d8)
    .setDepth(depth + 1)
    .setScrollFactor(0)
    .setInteractive();

  const nameBg = scene.add
    .rectangle(72, boxY - BOX_H / 2 + 26, 140, 34, 0x3e2a52)
    .setStrokeStyle(2, 0xffd080)
    .setDepth(depth + 2)
    .setScrollFactor(0)
    .setOrigin(0, 0.5);

  const nameText = scene.add
    .text(72 + 70, boxY - BOX_H / 2 + 26, '', {
      fontFamily: FONT,
      fontSize: '22px',
      color: '#ffe6a8',
    })
    .setOrigin(0.5)
    .setDepth(depth + 3)
    .setScrollFactor(0);

  const bodyText = scene.add
    .text(56, boxY - BOX_H / 2 + 52, '', {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#f0e8f8',
      wordWrap: { width: width - 120 },
      lineSpacing: 8,
    })
    .setOrigin(0, 0)
    .setDepth(depth + 3)
    .setScrollFactor(0);

  const hint = scene.add
    .text(width - 64, boxY + BOX_H / 2 - 24, '▼ 点击继续', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#a090b0',
    })
    .setOrigin(1, 0.5)
    .setDepth(depth + 3)
    .setScrollFactor(0)
    .setAlpha(0)
    .setVisible(false);

  scene.tweens.add({
    targets: hint,
    alpha: { from: 0.4, to: 1 },
    duration: 520,
    yoyo: true,
    repeat: -1,
  });

  let lines: DialogueLine[] = [];
  let lineIndex = 0;
  let fullText = '';
  let shown = 0;
  let typing = false;
  let waitingAdvance = false;
  let choicesOpen = false;
  let onLinesDone: (() => void) | null = null;
  let timer: Phaser.Time.TimerEvent | null = null;
  const choiceNodes: Phaser.GameObjects.GameObject[] = [];
  let destroyed = false;

  const clearTimer = () => {
    if (timer) {
      timer.remove(false);
      timer = null;
    }
  };

  const clearChoices = () => {
    for (const g of choiceNodes) g.destroy();
    choiceNodes.length = 0;
    choicesOpen = false;
  };

  const setSpeaker = (speaker: string) => {
    nameText.setText(speaker);
    nameBg.width = Math.max(140, nameText.width + 36);
  };

  const finishTypewriter = () => {
    clearTimer();
    typing = false;
    shown = fullText.length;
    bodyText.setText(fullText);
    waitingAdvance = true;
    hint.setVisible(true);
  };

  const startTypewriter = () => {
    clearTimer();
    typing = true;
    waitingAdvance = false;
    shown = 0;
    bodyText.setText('');
    hint.setVisible(false);
    timer = scene.time.addEvent({
      delay: CHAR_MS,
      loop: true,
      callback: () => {
        if (destroyed) return;
        shown += 1;
        bodyText.setText(fullText.slice(0, shown));
        if (shown >= fullText.length) finishTypewriter();
      },
    });
  };

  const showLine = (i: number) => {
    if (i >= lines.length) {
      waitingAdvance = false;
      hint.setVisible(false);
      const done = onLinesDone;
      onLinesDone = null;
      done?.();
      return;
    }
    lineIndex = i;
    const line = lines[i];
    if (!line) throw new Error(`[DialogueBox] missing line ${i}`);
    setSpeaker(line.speaker);
    fullText = line.text;
    playSfx('ui');
    startTypewriter();
  };

  const advance = () => {
    if (destroyed || choicesOpen) return;
    if (typing) {
      finishTypewriter();
      playSfx('ui');
      return;
    }
    if (!waitingAdvance) return;
    waitingAdvance = false;
    showLine(lineIndex + 1);
  };

  dim.on('pointerdown', () => advance());
  panel.on('pointerdown', () => advance());

  const onSpace = () => advance();
  const onEnter = () => advance();
  const onZ = () => advance();
  if (scene.input.keyboard) {
    scene.input.keyboard.on('keydown-SPACE', onSpace);
    scene.input.keyboard.on('keydown-ENTER', onEnter);
    scene.input.keyboard.on('keydown-Z', onZ);
  }

  return {
    playLines(nextLines, onDone) {
      if (!nextLines.length) {
        onDone();
        return;
      }
      clearChoices();
      panel.setVisible(true);
      nameBg.setVisible(true);
      nameText.setVisible(true);
      bodyText.setVisible(true);
      lines = nextLines;
      onLinesDone = onDone;
      showLine(0);
    },

    showChoices(choices, onPick) {
      if (!choices.length) throw new Error('[DialogueBox] showChoices needs ≥1 choice');
      clearChoices();
      choicesOpen = true;
      waitingAdvance = false;
      typing = false;
      clearTimer();
      hint.setVisible(false);
      // 底栏收成一句提示；选项放在画面中部（好点）
      setSpeaker('莲娘');
      bodyText.setText('你怎么做？');
      panel.setVisible(true);

      choices.forEach((ch, i) => {
        const y = height * 0.38 + i * 100;
        const btn = addPanelButton(scene, {
          x: width / 2,
          y,
          w: Math.min(520, width - 100),
          h: 84,
          fill: 0x3e2a52,
          stroke: 0xc8a0d8,
          label: ch.label,
          fontSize: '28px',
          depth: depth + 5,
          onPress: () => {
            if (!choicesOpen) return;
            clearChoices();
            onPick(ch.id);
          },
        });
        btn.label.setY(y - 12);
        const tip = scene.add
          .text(width / 2, y + 20, ch.tip, {
            fontFamily: FONT,
            fontSize: '15px',
            color: '#b0a0c0',
          })
          .setOrigin(0.5)
          .setDepth(depth + 6)
          .setScrollFactor(0);
        choiceNodes.push(btn.panel, btn.label, tip);
      });
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimer();
      clearChoices();
      if (scene.input.keyboard) {
        scene.input.keyboard.off('keydown-SPACE', onSpace);
        scene.input.keyboard.off('keydown-ENTER', onEnter);
        scene.input.keyboard.off('keydown-Z', onZ);
      }
      dim.destroy();
      panel.destroy();
      nameBg.destroy();
      nameText.destroy();
      bodyText.destroy();
      hint.destroy();
    },
  };
}
