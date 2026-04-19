/**
 * 时间插值器属性测试
 * Feature: 04-time-system
 *
 * 使用 fast-check 对 lerp 函数进行属性测试，
 * 验证数学正确性和有界性。
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { lerp, interpolate, TIME_KEYFRAMES } from '@/utils/soundscape/timeInterpolator';
import type { TimeSlot } from '@/utils/timeSlot';

describe('Time Interpolator - Property Tests', () => {
  /**
   * Feature: 04-time-system, Property 4: lerp 数学正确性与有界性
   *
   * 对任意 a, b ∈ [0, 1] 和 t ∈ [0, 1]，lerp(a, b, t) 应满足：
   * 1. 返回值等于 a + (b - a) * t（浮点精度容差 1e-10）
   * 2. 返回值 ∈ [min(a, b), max(a, b)]（浮点精度容差 1e-10）
   *
   * **Validates: Requirements 8.1, 8.5**
   */
  describe('Property 4: lerp 数学正确性与有界性', () => {
    test('lerp(a, b, t) 等于 a + (b - a) * t（浮点精度容差 1e-10）', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (a, b, t) => {
            const result = lerp(a, b, t);
            const expected = a + (b - a) * t;

            // 验证 lerp 计算结果与公式 a + (b - a) * t 一致
            expect(Math.abs(result - expected)).toBeLessThanOrEqual(1e-10);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('lerp(a, b, t) 返回值 ∈ [min(a, b), max(a, b)]（浮点精度容差 1e-10）', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (a, b, t) => {
            const result = lerp(a, b, t);
            const lower = Math.min(a, b);
            const upper = Math.max(a, b);

            // 验证返回值在 [min(a, b), max(a, b)] 范围内
            expect(result).toBeGreaterThanOrEqual(lower - 1e-10);
            expect(result).toBeLessThanOrEqual(upper + 1e-10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 04-time-system, Property 2: interpolate() 输出有效性与范围不变量
   *
   * 对任意数值型小时输入（整数或浮点数），interpolate(hour) 应返回一个 TimeInterpolation 对象，满足：
   * 1. sourceSlot 和 targetSlot 均为有效 TimeSlot 且互不相同
   * 2. sourceSlot → targetSlot 在循环序列 dawn→day→dusk→night→dawn 中相邻
   * 3. progress ∈ [0, 1]
   * 4. appliedParams 的 5 个参数均 ∈ [0, 1]
   *
   * **Validates: Requirements 3.1, 3.5, 3.6, 3.7, 9.2**
   */
  describe('Feature: 04-time-system, Property 2: interpolate() 输出有效性与范围不变量', () => {
    // 有效的 TimeSlot 值
    const VALID_SLOTS: TimeSlot[] = ['dawn', 'day', 'dusk', 'night'];

    // fc.float 要求 max 为 32-bit float
    const MAX_HOUR = Math.fround(23.99);

    // 循环相邻序列：dawn→day→dusk→night→dawn
    const ADJACENT_MAP: Record<TimeSlot, TimeSlot> = {
      dawn: 'day',
      day: 'dusk',
      dusk: 'night',
      night: 'dawn',
    };

    test('sourceSlot 和 targetSlot 均为有效 TimeSlot 且互不相同', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: MAX_HOUR, noNaN: true }),
          (hour) => {
            const result = interpolate(hour);

            // 验证 sourceSlot 为有效 TimeSlot
            expect(VALID_SLOTS).toContain(result.sourceSlot);

            // 验证 targetSlot 为有效 TimeSlot
            expect(VALID_SLOTS).toContain(result.targetSlot);

            // 验证 sourceSlot 和 targetSlot 互不相同
            expect(result.sourceSlot).not.toBe(result.targetSlot);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('sourceSlot → targetSlot 在循环序列 dawn→day→dusk→night→dawn 中相邻', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: MAX_HOUR, noNaN: true }),
          (hour) => {
            const result = interpolate(hour);

            // 验证 targetSlot 是 sourceSlot 在循环序列中的下一个
            expect(result.targetSlot).toBe(ADJACENT_MAP[result.sourceSlot]);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('progress ∈ [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: MAX_HOUR, noNaN: true }),
          (hour) => {
            const result = interpolate(hour);

            // 验证 progress 在 [0, 1] 范围内
            expect(result.progress).toBeGreaterThanOrEqual(0);
            expect(result.progress).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('appliedParams 的 5 个参数（activity、traffic、nature、humanVoice、music）均 ∈ [0, 1]', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: MAX_HOUR, noNaN: true }),
          (hour) => {
            const result = interpolate(hour);
            const params = result.appliedParams;

            // 验证 activity ∈ [0, 1]
            expect(params.activity).toBeGreaterThanOrEqual(0);
            expect(params.activity).toBeLessThanOrEqual(1);

            // 验证 traffic ∈ [0, 1]
            expect(params.traffic).toBeGreaterThanOrEqual(0);
            expect(params.traffic).toBeLessThanOrEqual(1);

            // 验证 nature ∈ [0, 1]
            expect(params.nature).toBeGreaterThanOrEqual(0);
            expect(params.nature).toBeLessThanOrEqual(1);

            // 验证 humanVoice ∈ [0, 1]
            expect(params.humanVoice).toBeGreaterThanOrEqual(0);
            expect(params.humanVoice).toBeLessThanOrEqual(1);

            // 验证 music ∈ [0, 1]
            expect(params.music).toBeGreaterThanOrEqual(0);
            expect(params.music).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 04-time-system, Property 3: interpolate() 代数正确性
   *
   * 对任意数值型小时输入，interpolate(hour) 返回的 appliedParams 中每个参数值
   * 应等于（在浮点精度范围内）clamp(lerp(TIME_KEYFRAMES[sourceSlot][param],
   * TIME_KEYFRAMES[targetSlot][param], progress), 0, 1)。
   * 即插值结果严格遵循线性插值公式加 clamp。
   *
   * **Validates: Requirements 3.2**
   */
  describe('Feature: 04-time-system, Property 3: interpolate() 代数正确性', () => {
    // 5 个声景参数名
    const PARAM_KEYS: Array<keyof import('@/types/soundscapeRecipe').TimeParams> = [
      'activity',
      'traffic',
      'nature',
      'humanVoice',
      'music',
    ];

    // clamp 辅助函数，与 timeInterpolator.ts 内部实现一致
    function clamp(value: number, min: number, max: number): number {
      return Math.min(Math.max(value, min), max);
    }

    test('appliedParams 中每个参数等于 clamp(lerp(source[param], target[param], progress), 0, 1)（浮点精度容差 1e-10）', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(23.99), noNaN: true }),
          (hour) => {
            const result = interpolate(hour);
            const { sourceSlot, targetSlot, progress, appliedParams } = result;

            const sourceParams = TIME_KEYFRAMES[sourceSlot];
            const targetParams = TIME_KEYFRAMES[targetSlot];

            // 对每个参数验证代数正确性
            for (const param of PARAM_KEYS) {
              const expected = clamp(
                lerp(sourceParams[param], targetParams[param], progress),
                0,
                1
              );
              const actual = appliedParams[param];

              // 验证插值结果与手动计算的 clamp(lerp(...)) 一致
              expect(
                Math.abs(actual - expected)
              ).toBeLessThanOrEqual(1e-10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
