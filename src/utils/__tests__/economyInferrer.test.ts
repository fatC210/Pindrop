/**
 * EconomyInferrer 单元测试
 *
 * 测试经济水平推断：
 * - 高收入国家（0.8-1.0）
 * - 中高收入国家（0.6-0.79）
 * - 中等收入国家（0.4-0.59）
 * - 中低收入国家（0.2-0.39）
 * - 低收入国家（0.0-0.19）
 * - 未知国家兜底（0.5）
 *
 * 需求覆盖: 14.1-14.5
 */

import { describe, it, expect } from 'vitest';
import { inferEconomicLevel } from '@/utils/geocoding/economyInferrer';

describe('EconomyInferrer Unit Tests', () => {
  describe('高收入国家（0.8-1.0）', () => {
    it('Switzerland 应返回 1.0', () => {
      const level = inferEconomicLevel('Switzerland');
      expect(level).toBe(1.0);
    });

    it('United States 应返回 0.95', () => {
      const level = inferEconomicLevel('United States');
      expect(level).toBe(0.95);
    });

    it('Germany 应返回 0.84', () => {
      const level = inferEconomicLevel('Germany');
      expect(level).toBe(0.84);
    });

    it('Japan 应返回 0.8', () => {
      const level = inferEconomicLevel('Japan');
      expect(level).toBe(0.8);
    });

    it('France 应返回 0.8', () => {
      const level = inferEconomicLevel('France');
      expect(level).toBe(0.8);
    });

    it('高收入国家应在 0.8-1.0 范围内', () => {
      const highIncomeCountries = [
        'Switzerland',
        'Norway',
        'United States',
        'Germany',
        'Japan',
        'France',
        'United Kingdom',
        'Canada',
        'Australia',
      ];

      highIncomeCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0.8);
        expect(level).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('中高收入国家（0.6-0.79）', () => {
    it('China 应返回 0.68', () => {
      const level = inferEconomicLevel('China');
      expect(level).toBe(0.68);
    });

    it('Brazil 应返回 0.65', () => {
      const level = inferEconomicLevel('Brazil');
      expect(level).toBe(0.65);
    });

    it('Mexico 应返回 0.63', () => {
      const level = inferEconomicLevel('Mexico');
      expect(level).toBe(0.63);
    });

    it('Turkey 应返回 0.62', () => {
      const level = inferEconomicLevel('Turkey');
      expect(level).toBe(0.62);
    });

    it('中高收入国家应在 0.6-0.79 范围内', () => {
      const upperMiddleIncomeCountries = [
        'China',
        'Brazil',
        'Mexico',
        'Turkey',
        'Russia',
        'Argentina',
        'Malaysia',
        'Thailand',
      ];

      upperMiddleIncomeCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0.6);
        expect(level).toBeLessThanOrEqual(0.79);
      });
    });
  });

  describe('中等收入国家（0.4-0.59）', () => {
    it('Indonesia 应返回 0.55', () => {
      const level = inferEconomicLevel('Indonesia');
      expect(level).toBe(0.55);
    });

    it('Philippines 应返回 0.53', () => {
      const level = inferEconomicLevel('Philippines');
      expect(level).toBe(0.53);
    });

    it('Egypt 应返回 0.52', () => {
      const level = inferEconomicLevel('Egypt');
      expect(level).toBe(0.52);
    });

    it('India 应返回 0.46', () => {
      const level = inferEconomicLevel('India');
      expect(level).toBe(0.46);
    });

    it('Vietnam 应返回 0.47', () => {
      const level = inferEconomicLevel('Vietnam');
      expect(level).toBe(0.47);
    });

    it('中等收入国家应在 0.4-0.59 范围内', () => {
      const middleIncomeCountries = [
        'Indonesia',
        'Philippines',
        'Egypt',
        'India',
        'Vietnam',
        'Pakistan',
        'Bangladesh',
        'Morocco',
      ];

      middleIncomeCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0.4);
        expect(level).toBeLessThanOrEqual(0.59);
      });
    });
  });

  describe('中低收入国家（0.2-0.39）', () => {
    it('Nigeria 应返回 0.38', () => {
      const level = inferEconomicLevel('Nigeria');
      expect(level).toBe(0.38);
    });

    it('Kenya 应返回 0.37', () => {
      const level = inferEconomicLevel('Kenya');
      expect(level).toBe(0.37);
    });

    it('Ethiopia 应返回 0.29', () => {
      const level = inferEconomicLevel('Ethiopia');
      expect(level).toBe(0.29);
    });

    it('Nepal 应返回 0.3', () => {
      const level = inferEconomicLevel('Nepal');
      expect(level).toBe(0.3);
    });

    it('中低收入国家应在 0.2-0.39 范围内', () => {
      const lowerMiddleIncomeCountries = [
        'Nigeria',
        'Kenya',
        'Ghana',
        'Cambodia',
        'Myanmar',
        'Tanzania',
        'Uganda',
        'Nepal',
        'Ethiopia',
      ];

      lowerMiddleIncomeCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0.2);
        expect(level).toBeLessThanOrEqual(0.39);
      });
    });
  });

  describe('低收入国家（0.0-0.19）', () => {
    it('Somalia 应返回 0.09', () => {
      const level = inferEconomicLevel('Somalia');
      expect(level).toBe(0.09);
    });

    it('Chad 应返回 0.11', () => {
      const level = inferEconomicLevel('Chad');
      expect(level).toBe(0.11);
    });

    it('Burundi 应返回 0.14', () => {
      const level = inferEconomicLevel('Burundi');
      expect(level).toBe(0.14);
    });

    it('低收入国家应在 0.0-0.19 范围内', () => {
      const lowIncomeCountries = [
        'Somalia',
        'Chad',
        'Burundi',
        'Malawi',
        'Mozambique',
      ];

      lowIncomeCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0.0);
        expect(level).toBeLessThanOrEqual(0.19);
      });
    });
  });

  describe('未知国家兜底', () => {
    it('未知国家应返回 0.5', () => {
      const level = inferEconomicLevel('Unknown Country');
      expect(level).toBe(0.5);
    });

    it('空字符串应返回 0.5', () => {
      const level = inferEconomicLevel('');
      expect(level).toBe(0.5);
    });

    it('随机字符串应返回 0.5', () => {
      const level = inferEconomicLevel('XYZ123');
      expect(level).toBe(0.5);
    });
  });

  describe('范围验证', () => {
    it('所有已知国家的经济水平应在 [0, 1] 范围内', () => {
      const allCountries = [
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
        'Japan',
        'Germany',
        'Mexico',
        'Indonesia',
        'Kenya',
        'Ethiopia',
      ];

      allCountries.forEach((country) => {
        const level = inferEconomicLevel(country);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
      });
    });
  });
});
