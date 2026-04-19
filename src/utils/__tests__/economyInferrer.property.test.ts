/**
 * EconomyInferrer 属性测试
 *
 * 使用 fast-check 进行属性测试，验证：
 * - Property 9: 经济水平范围约束
 *
 * 需求覆盖: 14.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { inferEconomicLevel } from '@/utils/geocoding/economyInferrer';

describe('EconomyInferrer Property Tests', () => {
  describe('Property 9: 经济水平范围约束', () => {
    it('任意国家名应返回 [0, 1] 范围内的数值', () => {
      fc.assert(
        fc.property(
          // 生成任意字符串作为国家名
          fc.string(),
          (countryName) => {
            const economicLevel = inferEconomicLevel(countryName);

            // 验证返回值在 [0, 1] 范围内
            expect(economicLevel).toBeGreaterThanOrEqual(0);
            expect(economicLevel).toBeLessThanOrEqual(1);

            // 验证返回值是数字
            expect(typeof economicLevel).toBe('number');
            expect(Number.isFinite(economicLevel)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('已知国家应返回 [0, 1] 范围内的数值', () => {
      const knownCountries = [
        'Switzerland',
        'United States',
        'China',
        'India',
        'Nigeria',
        'Somalia',
        'France',
        'Brazil',
        'Egypt',
        'Bangladesh',
      ];

      knownCountries.forEach((country) => {
        const economicLevel = inferEconomicLevel(country);

        expect(economicLevel).toBeGreaterThanOrEqual(0);
        expect(economicLevel).toBeLessThanOrEqual(1);
        expect(typeof economicLevel).toBe('number');
        expect(Number.isFinite(economicLevel)).toBe(true);
      });
    });

    it('未知国家应返回兜底值 0.5', () => {
      fc.assert(
        fc.property(
          // 生成不太可能是真实国家名的字符串
          fc.string({ minLength: 50 }),
          (countryName) => {
            const economicLevel = inferEconomicLevel(countryName);

            // 未知国家应返回兜底值 0.5
            expect(economicLevel).toBe(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
