/**
 * 时间插值器 — 基于 4 档关键帧的连续声景参数插值
 *
 * 定义 dawn/day/dusk/night 四个时间关键帧的声景参数，
 * 并根据当前本地小时在相邻关键帧之间进行线性插值（lerp），
 * 正确处理午夜跨越（night 20:00 → dawn 5:00）。
 *
 * 需求覆盖: 4.1-4.7, 5.1-5.7, 16.3
 */

import type { TimeSlot } from '@/utils/timeSlot';
import type { TimeInterpolation, TimeParams } from '@/types/soundscapeRecipe';

/**
 * 4 档时间关键帧 — 每个 TimeSlot 对应的 5 个声景参数
 *
 * 参数说明：
 * - activity: 环境活动度（影响环境音和标志性声音）
 * - traffic: 交通密度
 * - nature: 自然声强度
 * - humanVoice: 人声密度（影响对话层）
 * - music: 音乐强度（影响氛围层）
 */
export const TIME_KEYFRAMES: Record<TimeSlot, TimeParams> = {
  dawn:  { activity: 0.3,  traffic: 0.4,  nature: 0.7,  humanVoice: 0.3,  music: 0.15 },
  day:   { activity: 0.9,  traffic: 0.8,  nature: 0.2,  humanVoice: 0.8,  music: 0.25 },
  dusk:  { activity: 0.5,  traffic: 0.5,  nature: 0.4,  humanVoice: 0.4,  music: 0.3  },
  night: { activity: 0.1,  traffic: 0.15, nature: 0.6,  humanVoice: 0.1,  music: 0.2  },
};

/**
 * 关键帧起始小时 — 按时间顺序排列
 *
 * dawn  从 5:00 开始
 * day   从 9:00 开始
 * dusk  从 17:00 开始
 * night 从 20:00 开始
 */
export const KEYFRAME_HOURS: Array<{ start: number; slot: TimeSlot }> = [
  { start: 5,  slot: 'dawn'  },
  { start: 9,  slot: 'day'   },
  { start: 17, slot: 'dusk'  },
  { start: 20, slot: 'night' },
];

/**
 * 线性插值辅助函数
 *
 * 计算 a 和 b 之间在进度 t 处的线性插值值。
 *
 * @param a - 起始值
 * @param b - 目标值
 * @param t - 插值进度 (0-1)
 * @returns 插值结果: a + (b - a) * t
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 将数值限制在 [min, max] 范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 对 TimeParams 的所有 5 个参数执行线性插值
 */
function lerpParams(source: TimeParams, target: TimeParams, t: number): TimeParams {
  return {
    activity:   clamp(lerp(source.activity,   target.activity,   t), 0, 1),
    traffic:    clamp(lerp(source.traffic,    target.traffic,    t), 0, 1),
    nature:     clamp(lerp(source.nature,     target.nature,     t), 0, 1),
    humanVoice: clamp(lerp(source.humanVoice, target.humanVoice, t), 0, 1),
    music:      clamp(lerp(source.music,      target.music,      t), 0, 1),
  };
}

/**
 * 根据当前本地小时计算时间插值参数
 *
 * 在两个相邻关键帧之间进行线性插值，正确处理午夜跨越。
 *
 * 区间划分：
 * - hours 0-4:   night → dawn（午夜跨越，区间 9 小时）
 * - hours 5-8:   dawn → day（区间 4 小时）
 * - hours 9-16:  day → dusk（区间 8 小时）
 * - hours 17-19: dusk → night（区间 3 小时）
 * - hours 20-23: night → dawn（午夜跨越，区间 9 小时）
 *
 * @param currentLocalHour - 当地当前小时（支持任意数值，自动规范化到 0-23）
 * @returns 时间插值结果，包含源/目标时间档、进度和插值后的参数
 */
export function interpolate(currentLocalHour: number): TimeInterpolation {
  // 规范化小时到 [0, 23] 范围，处理负数和超出范围的值
  const hour: number = ((currentLocalHour % 24) + 24) % 24;

  let sourceSlot: TimeSlot;
  let targetSlot: TimeSlot;
  let progress: number;

  if (hour >= 20 || hour < 5) {
    // 午夜跨越区间：night(20) → dawn(5)，总长 9 小时
    sourceSlot = 'night';
    targetSlot = 'dawn';
    let elapsed: number;
    if (hour >= 20) {
      elapsed = hour - 20;
    } else {
      // hour < 5: 已经过了午夜，elapsed = (24 - 20) + hour = 4 + hour
      elapsed = hour + 4;
    }
    progress = elapsed / 9;
  } else if (hour >= 5 && hour < 9) {
    // dawn(5) → day(9)，总长 4 小时
    sourceSlot = 'dawn';
    targetSlot = 'day';
    progress = (hour - 5) / 4;
  } else if (hour >= 9 && hour < 17) {
    // day(9) → dusk(17)，总长 8 小时
    sourceSlot = 'day';
    targetSlot = 'dusk';
    progress = (hour - 9) / 8;
  } else {
    // hour >= 17 && hour < 20: dusk(17) → night(20)，总长 3 小时
    sourceSlot = 'dusk';
    targetSlot = 'night';
    progress = (hour - 17) / 3;
  }

  // 对所有 5 个参数执行线性插值
  const sourceParams: TimeParams = TIME_KEYFRAMES[sourceSlot];
  const targetParams: TimeParams = TIME_KEYFRAMES[targetSlot];
  const appliedParams: TimeParams = lerpParams(sourceParams, targetParams, progress);

  return {
    sourceSlot,
    targetSlot,
    progress,
    appliedParams,
  };
}
