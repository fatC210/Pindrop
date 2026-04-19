/**
 * CoordinateInferrer 属性测试
 *
 * 使用 fast-check 进行属性测试，验证：
 * - Property 2: 极地检测阈值一致性
 * - Property 3: 降级优先级正确性
 *
 * 需求覆盖: 5.1, 5.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isPolar, inferFromCoordinates } from '@/utils/geocoding/coordinateInferrer';

describe('CoordinateInferrer Property Tests', () => {
  describe('Property 2: 极地检测阈值一致性', () => {
    it('|lat| > 66.5 时返回 true，|lat| ≤ 66.5 时返回 false', () => {
      fc.assert(
        fc.property(
          // 生成 -90 到 90 之间的纬度值
          fc.double({ min: -90, max: 90, noNaN: true }),
          (lat) => {
            const result = isPolar(lat);
            const absLat = Math.abs(lat);

            if (absLat > 66.5) {
              // 极地区域应返回 true
              expect(result).toBe(true);
            } else {
              // 非极地区域应返回 false
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('边界值测试：66.5 应返回 false，66.6 应返回 true', () => {
      // 正好 66.5 度不是极地
      expect(isPolar(66.5)).toBe(false);
      expect(isPolar(-66.5)).toBe(false);

      // 超过 66.5 度是极地
      expect(isPolar(66.6)).toBe(true);
      expect(isPolar(-66.6)).toBe(true);
    });
  });

  describe('Property 3: 降级优先级正确性', () => {
    it('|lat| > 66.5 时 inferFromCoordinates 返回 regionType: "polar"', () => {
      fc.assert(
        fc.property(
          // 生成极地纬度：66.6 到 90 或 -90 到 -66.6
          fc.oneof(
            fc.double({ min: 66.6, max: 90, noNaN: true }),
            fc.double({ min: -90, max: -66.6, noNaN: true })
          ),
          // 生成任意经度
          fc.double({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const context = inferFromCoordinates(lat, lng);

            // 极地坐标应返回 regionType: "polar"
            expect(context.regionType).toBe('polar');

            // 验证其他极地特征
            expect(context.climate).toBe('subarctic');
            expect(context.terrain).toBe('tundra');
            expect(context.urbanDensity).toBe(0);
            expect(context.economicLevel).toBe(0);

            // 验证城市名称
            if (lat > 0) {
              expect(context.cityName).toBe('Arctic');
            } else {
              expect(context.cityName).toBe('Antarctic');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('极地检测优先于海洋检测', () => {
      // 北冰洋坐标（极地 + 海洋区域）
      const arcticOceanLat = 85;
      const arcticOceanLng = 0;

      const context = inferFromCoordinates(arcticOceanLat, arcticOceanLng);

      // 应归类为极地，而非海洋
      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Arctic');
    });
  });
});
