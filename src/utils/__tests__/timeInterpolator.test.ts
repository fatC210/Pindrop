/**
 * 时间插值器单元测试
 * Feature: 04-time-system
 *
 * 验证 TIME_KEYFRAMES 常量值、KEYFRAME_HOURS 常量值、
 * 关键帧起始小时插值、设计文档插值示例、午夜跨越和超范围小时规范化。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.3, 3.4, 3.5
 */

import { describe, test, expect } from 'vitest';
import {
  TIME_KEYFRAMES,
  KEYFRAME_HOURS,
  interpolate,
} from '@/utils/soundscape/timeInterpolator';
import type { TimeSlot } from '@/utils/timeSlot';

describe('Time Interpolator - 单元测试', () => {
  // ============================================================
  // TIME_KEYFRAMES 常量验证
  // ============================================================
  describe('TIME_KEYFRAMES 常量验证', () => {
    test('恰好包含 4 个键：dawn、day、dusk、night', () => {
      const keys = Object.keys(TIME_KEYFRAMES);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('dawn');
      expect(keys).toContain('day');
      expect(keys).toContain('dusk');
      expect(keys).toContain('night');
    });

    // 验证每个关键帧的 5 个参数值与设计文档一致
    test('dawn 关键帧参数: activity=0.3, traffic=0.4, nature=0.7, humanVoice=0.3, music=0.15', () => {
      expect(TIME_KEYFRAMES.dawn).toEqual({
        activity: 0.3,
        traffic: 0.4,
        nature: 0.7,
        humanVoice: 0.3,
        music: 0.15,
      });
    });

    test('day 关键帧参数: activity=0.9, traffic=0.8, nature=0.2, humanVoice=0.8, music=0.25', () => {
      expect(TIME_KEYFRAMES.day).toEqual({
        activity: 0.9,
        traffic: 0.8,
        nature: 0.2,
        humanVoice: 0.8,
        music: 0.25,
      });
    });

    test('dusk 关键帧参数: activity=0.5, traffic=0.5, nature=0.4, humanVoice=0.4, music=0.3', () => {
      expect(TIME_KEYFRAMES.dusk).toEqual({
        activity: 0.5,
        traffic: 0.5,
        nature: 0.4,
        humanVoice: 0.4,
        music: 0.3,
      });
    });

    test('night 关键帧参数: activity=0.1, traffic=0.15, nature=0.6, humanVoice=0.1, music=0.2', () => {
      expect(TIME_KEYFRAMES.night).toEqual({
        activity: 0.1,
        traffic: 0.15,
        nature: 0.6,
        humanVoice: 0.1,
        music: 0.2,
      });
    });

    // 验证所有关键帧参数值均在 [0, 1] 范围内
    test('所有关键帧参数值均在 [0, 1] 范围内', () => {
      const slots: TimeSlot[] = ['dawn', 'day', 'dusk', 'night'];
      const paramKeys = ['activity', 'traffic', 'nature', 'humanVoice', 'music'] as const;

      for (const slot of slots) {
        for (const param of paramKeys) {
          const value = TIME_KEYFRAMES[slot][param];
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  // ============================================================
  // KEYFRAME_HOURS 常量验证
  // ============================================================
  describe('KEYFRAME_HOURS 常量验证', () => {
    test('包含 4 个条目', () => {
      expect(KEYFRAME_HOURS).toHaveLength(4);
    });

    test('起始小时分别为 5、9、17、20，对应 dawn、day、dusk、night', () => {
      expect(KEYFRAME_HOURS[0]).toEqual({ start: 5, slot: 'dawn' });
      expect(KEYFRAME_HOURS[1]).toEqual({ start: 9, slot: 'day' });
      expect(KEYFRAME_HOURS[2]).toEqual({ start: 17, slot: 'dusk' });
      expect(KEYFRAME_HOURS[3]).toEqual({ start: 20, slot: 'night' });
    });
  });

  // ============================================================
  // 关键帧起始小时 progress=0 验证
  // ============================================================
  describe('关键帧起始小时返回 progress=0 和对应的 sourceSlot/targetSlot', () => {
    test('hour=5 → sourceSlot=dawn, targetSlot=day, progress=0', () => {
      const result = interpolate(5);
      expect(result.sourceSlot).toBe('dawn');
      expect(result.targetSlot).toBe('day');
      expect(result.progress).toBe(0);
    });

    test('hour=9 → sourceSlot=day, targetSlot=dusk, progress=0', () => {
      const result = interpolate(9);
      expect(result.sourceSlot).toBe('day');
      expect(result.targetSlot).toBe('dusk');
      expect(result.progress).toBe(0);
    });

    test('hour=17 → sourceSlot=dusk, targetSlot=night, progress=0', () => {
      const result = interpolate(17);
      expect(result.sourceSlot).toBe('dusk');
      expect(result.targetSlot).toBe('night');
      expect(result.progress).toBe(0);
    });

    test('hour=20 → sourceSlot=night, targetSlot=dawn, progress=0', () => {
      const result = interpolate(20);
      expect(result.sourceSlot).toBe('night');
      expect(result.targetSlot).toBe('dawn');
      expect(result.progress).toBe(0);
    });
  });

  // ============================================================
  // 设计文档插值示例值验证
  // ============================================================
  describe('设计文档插值示例值验证', () => {
    // 浮点精度容差
    const EPSILON = 1e-3;

    test('hour=7 → dawn→day, progress=0.5', () => {
      const result = interpolate(7);
      expect(result.sourceSlot).toBe('dawn');
      expect(result.targetSlot).toBe('day');
      expect(result.progress).toBeCloseTo(0.5, 5);

      // 验证插值后的参数值（设计文档示例）
      expect(result.appliedParams.activity).toBeCloseTo(0.6, EPSILON);
      expect(result.appliedParams.traffic).toBeCloseTo(0.6, EPSILON);
      expect(result.appliedParams.nature).toBeCloseTo(0.45, EPSILON);
      expect(result.appliedParams.humanVoice).toBeCloseTo(0.55, EPSILON);
      expect(result.appliedParams.music).toBeCloseTo(0.2, EPSILON);
    });

    test('hour=13 → day→dusk, progress=0.5', () => {
      const result = interpolate(13);
      expect(result.sourceSlot).toBe('day');
      expect(result.targetSlot).toBe('dusk');
      expect(result.progress).toBeCloseTo(0.5, 5);

      // 验证插值后的参数值（设计文档示例）
      expect(result.appliedParams.activity).toBeCloseTo(0.7, EPSILON);
      expect(result.appliedParams.traffic).toBeCloseTo(0.65, EPSILON);
      expect(result.appliedParams.nature).toBeCloseTo(0.3, EPSILON);
      expect(result.appliedParams.humanVoice).toBeCloseTo(0.6, EPSILON);
      expect(result.appliedParams.music).toBeCloseTo(0.275, EPSILON);
    });

    test('hour=0 → night→dawn, progress≈0.444', () => {
      const result = interpolate(0);
      expect(result.sourceSlot).toBe('night');
      expect(result.targetSlot).toBe('dawn');
      // progress = (0 + 4) / 9 ≈ 0.4444
      expect(result.progress).toBeCloseTo(4 / 9, 3);

      // 验证插值后的参数值（设计文档示例）
      expect(result.appliedParams.activity).toBeCloseTo(0.189, EPSILON);
      expect(result.appliedParams.traffic).toBeCloseTo(0.261, EPSILON);
      expect(result.appliedParams.nature).toBeCloseTo(0.644, EPSILON);
      expect(result.appliedParams.humanVoice).toBeCloseTo(0.189, EPSILON);
      expect(result.appliedParams.music).toBeCloseTo(0.178, EPSILON);
    });
  });

  // ============================================================
  // 午夜跨越验证
  // ============================================================
  describe('午夜跨越验证', () => {
    test('hour=20 → night→dawn, progress=0', () => {
      const result = interpolate(20);
      expect(result.sourceSlot).toBe('night');
      expect(result.targetSlot).toBe('dawn');
      expect(result.progress).toBe(0);
    });

    test('hour=3 → night→dawn, progress≈0.778', () => {
      const result = interpolate(3);
      expect(result.sourceSlot).toBe('night');
      expect(result.targetSlot).toBe('dawn');
      // progress = (3 + 4) / 9 = 7/9 ≈ 0.7778
      expect(result.progress).toBeCloseTo(7 / 9, 3);
    });
  });

  // ============================================================
  // 超范围小时规范化验证
  // ============================================================
  describe('超范围小时规范化验证', () => {
    test('hour=-1 等价于 hour=23', () => {
      const resultNeg = interpolate(-1);
      const result23 = interpolate(23);

      expect(resultNeg.sourceSlot).toBe(result23.sourceSlot);
      expect(resultNeg.targetSlot).toBe(result23.targetSlot);
      expect(resultNeg.progress).toBeCloseTo(result23.progress, 10);
      expect(resultNeg.appliedParams.activity).toBeCloseTo(result23.appliedParams.activity, 10);
      expect(resultNeg.appliedParams.traffic).toBeCloseTo(result23.appliedParams.traffic, 10);
      expect(resultNeg.appliedParams.nature).toBeCloseTo(result23.appliedParams.nature, 10);
      expect(resultNeg.appliedParams.humanVoice).toBeCloseTo(result23.appliedParams.humanVoice, 10);
      expect(resultNeg.appliedParams.music).toBeCloseTo(result23.appliedParams.music, 10);
    });

    test('hour=24 等价于 hour=0', () => {
      const result24 = interpolate(24);
      const result0 = interpolate(0);

      expect(result24.sourceSlot).toBe(result0.sourceSlot);
      expect(result24.targetSlot).toBe(result0.targetSlot);
      expect(result24.progress).toBeCloseTo(result0.progress, 10);
      expect(result24.appliedParams.activity).toBeCloseTo(result0.appliedParams.activity, 10);
      expect(result24.appliedParams.traffic).toBeCloseTo(result0.appliedParams.traffic, 10);
      expect(result24.appliedParams.nature).toBeCloseTo(result0.appliedParams.nature, 10);
      expect(result24.appliedParams.humanVoice).toBeCloseTo(result0.appliedParams.humanVoice, 10);
      expect(result24.appliedParams.music).toBeCloseTo(result0.appliedParams.music, 10);
    });

    test('hour=25 等价于 hour=1', () => {
      const result25 = interpolate(25);
      const result1 = interpolate(1);

      expect(result25.sourceSlot).toBe(result1.sourceSlot);
      expect(result25.targetSlot).toBe(result1.targetSlot);
      expect(result25.progress).toBeCloseTo(result1.progress, 10);
      expect(result25.appliedParams.activity).toBeCloseTo(result1.appliedParams.activity, 10);
      expect(result25.appliedParams.traffic).toBeCloseTo(result1.appliedParams.traffic, 10);
      expect(result25.appliedParams.nature).toBeCloseTo(result1.appliedParams.nature, 10);
      expect(result25.appliedParams.humanVoice).toBeCloseTo(result1.appliedParams.humanVoice, 10);
      expect(result25.appliedParams.music).toBeCloseTo(result1.appliedParams.music, 10);
    });
  });
});
