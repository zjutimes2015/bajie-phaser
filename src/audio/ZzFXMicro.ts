/**
 * ZzFXMicro — Zuper Zmall Zound Zynth v1.4.0 by Frank Force
 * https://github.com/KilledByAPixel/ZzFX
 *
 * Vendored into bajie-phaser with lazy AudioContext (browser autoplay-safe).
 * Full MIT text: ./ZzFX-LICENSE.txt
 *
 * MIT License — Copyright (c) 2019 Frank Force
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

/** Master volume scale (ZzFXMicro zzfxV). */
export let zzfxVolume = 0.3;

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const C =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    audioCtx = new C();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

/** Resume / create AudioContext after a user gesture. */
export function unlockZzfx(): void {
  getAudioCtx();
}

/**
 * Play one ZzFX sound from parameter list.
 * Params match ZzFXMicro: volume, randomness, frequency, attack, sustain, release,
 * shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime,
 * noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo, filter.
 */
export function zzfx(
  volume = 1,
  randomness = 0.05,
  frequency = 220,
  attack = 0,
  sustain = 0,
  release = 0.1,
  shape = 0,
  shapeCurve = 1,
  slide = 0,
  deltaSlide = 0,
  pitchJump = 0,
  pitchJumpTime = 0,
  repeatTime = 0,
  noise = 0,
  modulation = 0,
  bitCrush = 0,
  delay = 0,
  sustainVolume = 1,
  decay = 0,
  tremolo = 0,
  filter = 0,
): AudioBufferSourceNode | null {
  const zzfxX = getAudioCtx();
  if (!zzfxX) return null;

  const sampleRate = 44100;
  const PI2 = Math.PI * 2;
  const abs = Math.abs;
  const sign = (v: number) => (v < 0 ? -1 : 1);

  let startSlide = (slide *= (500 * PI2) / sampleRate / sampleRate);
  let startFrequency = (frequency *=
    (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate);
  let modOffset = 0;
  let repeat = 0;
  let crush = 0;
  let jump = 1;
  let length = 0;
  const b: number[] = [];
  let t = 0;
  let i = 0;
  let s = 0;
  let f = 0;

  const source = zzfxX.createBufferSource();

  const quality = 2;
  const w = (PI2 * abs(filter) * 2) / sampleRate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / 2 / quality;
  const a0 = 1 + alpha;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const b0 = (1 + sign(filter) * cos) / 2 / a0;
  const b1 = -(sign(filter) + cos) / a0;
  const b2 = b0;
  let x2 = 0;
  let x1 = 0;
  let y2 = 0;
  let y1 = 0;

  const minAttack = 9;
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= (500 * PI2) / sampleRate ** 3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = (repeatTime * sampleRate) | 0;
  volume *= zzfxVolume;

  for (
    length = (attack + decay + sustain + release + delay) | 0;
    i < length;
    b[i++] = s * volume
  ) {
    if (!(++crush % ((bitCrush * 100) | 0))) {
      s = shape
        ? shape > 1
          ? shape > 2
            ? shape > 3
              ? shape > 4
                ? ((t / PI2) % 1 < shapeCurve / 2 ? 1 : 0) * 2 - 1
                : Math.sin(t ** 3)
              : Math.max(Math.min(Math.tan(t), 1), -1)
            : 1 - (((2 * t) / PI2) % 2 + 2) % 2
          : 1 - 4 * abs(Math.round(t / PI2) - t / PI2)
        : Math.sin(t);

      s =
        (repeatTime ? 1 - tremolo + tremolo * Math.sin((PI2 * i) / repeatTime) : 1) *
        (shape > 4 ? s : sign(s) * abs(s) ** shapeCurve) *
        (i < attack
          ? i / attack
          : i < attack + decay
            ? 1 - ((i - attack) / decay) * (1 - sustainVolume)
            : i < attack + decay + sustain
              ? sustainVolume
              : i < length - delay
                ? ((length - i - delay) / release) * sustainVolume
                : 0);

      s = delay
        ? s / 2 +
          (delay > i
            ? 0
            : (i < length - delay ? 1 : (length - i) / delay) * b[(i - delay) | 0] / 2 / volume)
        : s;

      if (filter) s = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = s) - a2 * y2 - a1 * (y2 = y1);
    }

    f = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
    t += f + f * noise * (((i * i * PI2) % 2) - 1);

    if (jump && ++jump > pitchJumpTime) {
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    }

    if (repeatTime && !(++repeat % repeatTime)) {
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }

  if (b.length === 0) return null;
  const buffer = zzfxX.createBuffer(1, b.length, sampleRate);
  buffer.getChannelData(0).set(b);
  source.buffer = buffer;
  source.connect(zzfxX.destination);
  source.start();
  return source;
}

/** Spread params array into zzfx (same call style as upstream `zzfx(...params)`). */
export function zzfxPlay(params: number[]): AudioBufferSourceNode | null {
  return zzfx(...(params as [number]));
}
