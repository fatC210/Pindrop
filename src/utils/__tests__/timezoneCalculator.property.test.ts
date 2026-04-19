/**
 * TimezoneCalculator 属性测试
 * Feature: 04-time-system
 *
 * 使用 fast-check 对 calculateTimezone 进行属性测试，
 * 验证输出完整性与一致性。
 */

import { describe, test, expect, vi } from 'vitest';
import fc from 'fast-check';
import { calculateTimezone } from '@/utils/geocoding/timezoneCalculator';
import { getTimeSlot, type TimeSlot } from '@/utils/timeSlot';
import { interpolate } from '@/utils/soundscape/timeInterpolator';

/**
 * COUNTRY_TIMEZONE_MAP 中的 67 个已知国家名称
 * 由于 COUNTRY_TIMEZONE_MAP 未导出，在测试文件中定义已知国家列表
 */
const KNOWN_COUNTRIES: string[] = [
  // 欧洲 (22)
  'France',
  'Germany',
  'United Kingdom',
  'Italy',
  'Spain',
  'Portugal',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Poland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Greece',
  'Russia',
  'Ukraine',
  'Romania',
  'Czech Republic',
  'Hungary',
  'Ireland',
  // 亚洲 (22)
  'Japan',
  'China',
  'South Korea',
  'India',
  'Thailand',
  'Vietnam',
  'Indonesia',
  'Malaysia',
  'Singapore',
  'Philippines',
  'Hong Kong',
  'Taiwan',
  'Pakistan',
  'Bangladesh',
  'Myanmar',
  'Cambodia',
  'Saudi Arabia',
  'United Arab Emirates',
  'Israel',
  'Turkey',
  'Iran',
  'Iraq',
  // 美洲 (12)
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Colombia',
  'Peru',
  'Venezuela',
  'Ecuador',
  'Cuba',
  'Jamaica',
  // 非洲 (9)
  'Egypt',
  'South Africa',
  'Nigeria',
  'Kenya',
  'Morocco',
  'Algeria',
  'Tunisia',
  'Ethiopia',
  'Ghana',
  // 大洋洲 (2)
  'Australia',
  'New Zealand',
];

/** 有效的 TimeSlot 值 */
const VALID_TIME_SLOTS: TimeSlot[] = ['dawn', 'day', 'dusk', 'night'];

describe('TimezoneCalculator - Property Tests', () => {
  /**
   * Feature: 04-time-system, Property 5: calculateTimezone 输出完整性与一致性
   *
   * 对任意输入组合（countryName 为任意字符串或 null，lat ∈ [-90, 90]，lng ∈ [-180, 180]），
   * calculateTimezone(countryName, lat, lng) 应返回一个 TimezoneInfo 对象，满足：
   * 1. timezone 为非空字符串
   * 2. currentLocalHour 为 [0, 24) 范围内的有限数值
   * 3. timeSlot 为 4 个有效 TimeSlot 值之一
   * 4. timeSlot === getTimeSlot(currentLocalHour)（一致性不变量）
   *
   * **Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  describe('Feature: 04-time-system, Property 5: calculateTimezone 输出完整性与一致性', () => {
    // 混合生成器：已知国家 | 随机字符串 | null
    const countryNameArb = fc.oneof(
      fc.constantFrom(...KNOWN_COUNTRIES),
      fc.string(),
      fc.constant(null)
    );

    // 纬度生成器：[-90, 90]
    const latArb = fc.float({ min: -90, max: 90, noNaN: true });

    // 经度生成器：[-180, 180]
    const lngArb = fc.float({ min: -180, max: 180, noNaN: true });

    test('timezone 为非空字符串', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            const result = calculateTimezone(countryName, lat, lng);

            // 验证 timezone 为字符串类型
            expect(typeof result.timezone).toBe('string');

            // 验证 timezone 非空
            expect(result.timezone.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('currentLocalHour 为 [0, 24) 范围内的有限数值', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            const result = calculateTimezone(countryName, lat, lng);

            // 验证 currentLocalHour 为有限数值
            expect(Number.isFinite(result.currentLocalHour)).toBe(true);

            // 验证 currentLocalHour ∈ [0, 24)
            expect(result.currentLocalHour).toBeGreaterThanOrEqual(0);
            expect(result.currentLocalHour).toBeLessThan(24);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('timeSlot 为 4 个有效 TimeSlot 值之一', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            const result = calculateTimezone(countryName, lat, lng);

            // 验证 timeSlot 为有效值
            expect(VALID_TIME_SLOTS).toContain(result.timeSlot);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('timeSlot === getTimeSlot(currentLocalHour)（一致性不变量）', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            const result = calculateTimezone(countryName, lat, lng);

            // 验证 timeSlot 与 getTimeSlot(currentLocalHour) 一致
            const expectedTimeSlot = getTimeSlot(result.currentLocalHour);
            expect(result.timeSlot).toBe(expectedTimeSlot);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 04-time-system, Property 6: 端到端管道有效性
   *
   * 对任意坐标（lat ∈ [-90, 90]，lng ∈ [-180, 180]）和可选国家名称，
   * 将 calculateTimezone() 的 currentLocalHour 输出传入 interpolate()
   * 应产出有效的 TimeInterpolation 结果，其中所有 5 个 appliedParams 值均 ∈ [0, 1]。
   *
   * **Validates: Requirements 9.1, 9.3**
   */
  describe('Feature: 04-time-system, Property 6: 端到端管道有效性', () => {
    // 混合生成器：已知国家 | 随机字符串 | null
    const countryNameArb = fc.oneof(
      fc.constantFrom(...KNOWN_COUNTRIES),
      fc.string(),
      fc.constant(null)
    );

    // 纬度生成器：[-90, 90]
    const latArb = fc.float({ min: -90, max: 90, noNaN: true });

    // 经度生成器：[-180, 180]
    const lngArb = fc.float({ min: -180, max: 180, noNaN: true });

    test('interpolate() 返回有效的 TimeInterpolation', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            // 步骤 1: 计算时区信息
            const timezoneInfo = calculateTimezone(countryName, lat, lng);

            // 步骤 2: 将 currentLocalHour 传入 interpolate()
            const timeInterpolation = interpolate(timezoneInfo.currentLocalHour);

            // 验证返回的对象包含必需字段
            expect(timeInterpolation).toHaveProperty('sourceSlot');
            expect(timeInterpolation).toHaveProperty('targetSlot');
            expect(timeInterpolation).toHaveProperty('progress');
            expect(timeInterpolation).toHaveProperty('appliedParams');

            // 验证 sourceSlot 和 targetSlot 为有效 TimeSlot
            expect(VALID_TIME_SLOTS).toContain(timeInterpolation.sourceSlot);
            expect(VALID_TIME_SLOTS).toContain(timeInterpolation.targetSlot);

            // 验证 progress ∈ [0, 1]
            expect(timeInterpolation.progress).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.progress).toBeLessThanOrEqual(1);

            // 验证 appliedParams 包含 5 个字段
            expect(timeInterpolation.appliedParams).toHaveProperty('activity');
            expect(timeInterpolation.appliedParams).toHaveProperty('traffic');
            expect(timeInterpolation.appliedParams).toHaveProperty('nature');
            expect(timeInterpolation.appliedParams).toHaveProperty('humanVoice');
            expect(timeInterpolation.appliedParams).toHaveProperty('music');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('appliedParams 的 5 个参数均 ∈ [0, 1]', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            // 步骤 1: 计算时区信息
            const timezoneInfo = calculateTimezone(countryName, lat, lng);

            // 步骤 2: 将 currentLocalHour 传入 interpolate()
            const timeInterpolation = interpolate(timezoneInfo.currentLocalHour);

            // 验证 activity ∈ [0, 1]
            expect(timeInterpolation.appliedParams.activity).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.appliedParams.activity).toBeLessThanOrEqual(1);

            // 验证 traffic ∈ [0, 1]
            expect(timeInterpolation.appliedParams.traffic).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.appliedParams.traffic).toBeLessThanOrEqual(1);

            // 验证 nature ∈ [0, 1]
            expect(timeInterpolation.appliedParams.nature).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.appliedParams.nature).toBeLessThanOrEqual(1);

            // 验证 humanVoice ∈ [0, 1]
            expect(timeInterpolation.appliedParams.humanVoice).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.appliedParams.humanVoice).toBeLessThanOrEqual(1);

            // 验证 music ∈ [0, 1]
            expect(timeInterpolation.appliedParams.music).toBeGreaterThanOrEqual(0);
            expect(timeInterpolation.appliedParams.music).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: 04-time-system, Property 7: 管道确定性
   *
   * 对任意坐标（lat ∈ [-90, 90]，lng ∈ [-180, 180]）和可选国家名称，
   * 在相同系统时间下（使用 vi.useFakeTimers() 固定时间），
   * 连续两次调用完整管道（calculateTimezone → interpolate）
   * 应产出完全相同的 TimeInterpolation 结果（sourceSlot、targetSlot、progress、appliedParams）。
   *
   * **Validates: Requirements 9.4**
   */
  describe('Feature: 04-time-system, Property 7: 管道确定性', () => {
    // 混合生成器：已知国家 | 随机字符串 | null
    const countryNameArb = fc.oneof(
      fc.constantFrom(...KNOWN_COUNTRIES),
      fc.string(),
      fc.constant(null)
    );

    // 纬度生成器：[-90, 90]
    const latArb = fc.float({ min: -90, max: 90, noNaN: true });

    // 经度生成器：[-180, 180]
    const lngArb = fc.float({ min: -180, max: 180, noNaN: true });

    test('相同输入在相同系统时间下产出相同的 TimeInterpolation 结果', () => {
      fc.assert(
        fc.property(
          countryNameArb,
          latArb,
          lngArb,
          (countryName, lat, lng) => {
            // 使用 vi.useFakeTimers() 固定系统时间
            // 固定到一个特定时间点：2024-01-15 12:00:00 UTC
            const fixedTime = new Date('2024-01-15T12:00:00Z');
            vi.useFakeTimers();
            vi.setSystemTime(fixedTime);

            try {
              // 第一次调用完整管道
              const timezoneInfo1 = calculateTimezone(countryName, lat, lng);
              const timeInterpolation1 = interpolate(timezoneInfo1.currentLocalHour);

              // 第二次调用完整管道（相同输入，相同系统时间）
              const timezoneInfo2 = calculateTimezone(countryName, lat, lng);
              const timeInterpolation2 = interpolate(timezoneInfo2.currentLocalHour);

              // 验证 sourceSlot 相同
              expect(timeInterpolation1.sourceSlot).toBe(timeInterpolation2.sourceSlot);

              // 验证 targetSlot 相同
              expect(timeInterpolation1.targetSlot).toBe(timeInterpolation2.targetSlot);

              // 验证 progress 相同
              expect(timeInterpolation1.progress).toBe(timeInterpolation2.progress);

              // 验证 appliedParams 的 5 个参数完全相同
              expect(timeInterpolation1.appliedParams.activity).toBe(
                timeInterpolation2.appliedParams.activity
              );
              expect(timeInterpolation1.appliedParams.traffic).toBe(
                timeInterpolation2.appliedParams.traffic
              );
              expect(timeInterpolation1.appliedParams.nature).toBe(
                timeInterpolation2.appliedParams.nature
              );
              expect(timeInterpolation1.appliedParams.humanVoice).toBe(
                timeInterpolation2.appliedParams.humanVoice
              );
              expect(timeInterpolation1.appliedParams.music).toBe(
                timeInterpolation2.appliedParams.music
              );
            } finally {
              // 恢复真实时间
              vi.useRealTimers();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
