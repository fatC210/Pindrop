/**
 * CoordinateInferrer 单元测试
 *
 * 测试具体示例和边界条件：
 * - 海洋坐标
 * - 极地坐标（北极/南极）
 * - 荒野坐标
 * - 极地边界值
 * - 荒野气候推断
 *
 * 需求覆盖: 4.1-4.6, 5.1-5.7, 6.1-6.5
 */

import { describe, it, expect } from 'vitest';
import {
  isPolar,
  isOcean,
  inferFromCoordinates,
  buildPolarContext,
  buildOceanContext,
  buildWildernessContext,
} from '@/utils/geocoding/coordinateInferrer';

describe('CoordinateInferrer Unit Tests', () => {
  describe('isPolar', () => {
    it('应正确检测极地纬度', () => {
      // 极地
      expect(isPolar(85)).toBe(true);
      expect(isPolar(-85)).toBe(true);
      expect(isPolar(67)).toBe(true);
      expect(isPolar(-67)).toBe(true);

      // 非极地
      expect(isPolar(66.5)).toBe(false);
      expect(isPolar(-66.5)).toBe(false);
      expect(isPolar(0)).toBe(false);
      expect(isPolar(45)).toBe(false);
    });

    it('边界值：66.5 非极地，66.6 极地', () => {
      expect(isPolar(66.5)).toBe(false);
      expect(isPolar(-66.5)).toBe(false);
      expect(isPolar(66.6)).toBe(true);
      expect(isPolar(-66.6)).toBe(true);
    });
  });

  describe('isOcean', () => {
    it('应检测太平洋坐标', () => {
      expect(isOcean(0, -150)).toBe(true); // 太平洋中部
      expect(isOcean(0, 150)).toBe(true); // 太平洋西部
    });

    it('应检测大西洋坐标', () => {
      expect(isOcean(0, -30)).toBe(true); // 大西洋
    });

    it('应检测印度洋坐标', () => {
      expect(isOcean(0, 70)).toBe(true); // 印度洋
    });

    it('极地区域不应归类为海洋', () => {
      expect(isOcean(85, 0)).toBe(false); // 北极
      expect(isOcean(-85, 0)).toBe(false); // 南极
    });
  });

  describe('buildPolarContext', () => {
    it('北极坐标应返回 Arctic', () => {
      const context = buildPolarContext(85, 0);

      expect(context.cityName).toBe('Arctic');
      expect(context.countryName).toBe('Polar Region');
      expect(context.regionType).toBe('polar');
      expect(context.climate).toBe('subarctic');
      expect(context.terrain).toBe('tundra');
      expect(context.urbanDensity).toBe(0);
      expect(context.economicLevel).toBe(0);
      expect(context.coordinates).toEqual([85, 0]);
    });

    it('南极坐标应返回 Antarctic', () => {
      const context = buildPolarContext(-85, 0);

      expect(context.cityName).toBe('Antarctic');
      expect(context.countryName).toBe('Polar Region');
      expect(context.regionType).toBe('polar');
      expect(context.climate).toBe('subarctic');
      expect(context.terrain).toBe('tundra');
      expect(context.urbanDensity).toBe(0);
      expect(context.economicLevel).toBe(0);
      expect(context.coordinates).toEqual([-85, 0]);
    });
  });

  describe('buildOceanContext', () => {
    it('海洋坐标应返回正确的 LocationContext', () => {
      const context = buildOceanContext(0, -30);

      expect(context.cityName).toBe('Ocean');
      expect(context.countryName).toBe('International Waters');
      expect(context.regionType).toBe('ocean');
      expect(context.terrain).toBe('coast');
      expect(context.nearWater).toBe('sea');
      expect(context.climate).toBe('temperate');
      expect(context.urbanDensity).toBe(0);
      expect(context.economicLevel).toBe(0);
      expect(context.coordinates).toEqual([0, -30]);
    });
  });

  describe('buildWildernessContext', () => {
    it('荒野坐标应返回格式化的位置名称', () => {
      const context = buildWildernessContext(45, 90);

      expect(context.cityName).toBe('Location at 45.00°, 90.00°');
      expect(context.countryName).toBe('Unknown');
      expect(context.regionType).toBe('wilderness');
      expect(context.terrain).toBe('plain');
      expect(context.nearWater).toBe(null);
      expect(context.urbanDensity).toBe(0);
      expect(context.economicLevel).toBe(0);
      expect(context.coordinates).toEqual([45, 90]);
    });

    it('荒野气候应基于纬度推断', () => {
      // 热带（|lat| < 23.5）- 使用太平洋坐标
      const tropical = buildWildernessContext(10, -150);
      expect(tropical.climate).toBe('tropical');

      // 温带（35 ≤ |lat| < 55）- 使用北美西部坐标，避开所有特殊区域
      const temperate = buildWildernessContext(45, -100);
      expect(temperate.climate).toBe('temperate');

      // 亚寒带（|lat| ≥ 55）- 使用加拿大北部坐标
      const subarctic = buildWildernessContext(60, -100);
      expect(subarctic.climate).toBe('subarctic');
    });
  });

  describe('inferFromCoordinates', () => {
    it('海洋坐标应返回 regionType: ocean', () => {
      const context = inferFromCoordinates(0, -30);

      expect(context.regionType).toBe('ocean');
      expect(context.cityName).toBe('Ocean');
    });

    it('北极坐标应返回 regionType: polar', () => {
      const context = inferFromCoordinates(85, 0);

      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Arctic');
    });

    it('南极坐标应返回 regionType: polar', () => {
      const context = inferFromCoordinates(-85, 0);

      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Antarctic');
    });

    it('荒野坐标应返回 regionType: wilderness', () => {
      const context = inferFromCoordinates(45, 90);

      expect(context.regionType).toBe('wilderness');
      expect(context.cityName).toContain('Location at');
    });

    it('极地边界值测试', () => {
      // 66.5 度不是极地
      const nonPolar = inferFromCoordinates(66.5, 0);
      expect(nonPolar.regionType).not.toBe('polar');

      // 66.6 度是极地
      const polar = inferFromCoordinates(66.6, 0);
      expect(polar.regionType).toBe('polar');
    });

    it('极地检测优先于海洋检测', () => {
      // 北冰洋坐标（极地 + 海洋）
      const context = inferFromCoordinates(85, -150);

      // 应归类为极地
      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Arctic');
    });
  });
});
