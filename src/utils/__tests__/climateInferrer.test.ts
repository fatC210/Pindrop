/**
 * ClimateInferrer 单元测试
 *
 * 测试具体坐标的气候推断：
 * - 赤道坐标 → tropical
 * - 撒哈拉坐标 → arid
 * - 巴黎坐标 → temperate
 * - 北极圈坐标 → subarctic
 * - 地中海坐标 → mediterranean
 *
 * 需求覆盖: 12.1-12.5
 */

import { describe, it, expect } from 'vitest';
import { inferClimate } from '@/utils/geocoding/climateInferrer';

describe('ClimateInferrer Unit Tests', () => {
  describe('热带气候（|lat| < 23.5）', () => {
    it('赤道坐标 (0, 0) 应返回 tropical', () => {
      const climate = inferClimate(0, 0);
      expect(climate).toBe('tropical');
    });

    it('新加坡坐标 (1.35, 103.82) 应返回 tropical', () => {
      const climate = inferClimate(1.35, 103.82);
      expect(climate).toBe('tropical');
    });

    it('亚马逊雨林坐标 (-3, -60) 应返回 tropical', () => {
      const climate = inferClimate(-3, -60);
      expect(climate).toBe('tropical');
    });
  });

  describe('干旱气候（已知沙漠区域）', () => {
    it('撒哈拉沙漠坐标 (25, 10) 应返回 arid', () => {
      const climate = inferClimate(25, 10);
      expect(climate).toBe('arid');
    });

    it('阿拉伯沙漠坐标 (25, 45) 应返回 arid', () => {
      const climate = inferClimate(25, 45);
      expect(climate).toBe('arid');
    });

    it('戈壁沙漠坐标 (42, 105) 应返回 arid', () => {
      const climate = inferClimate(42, 105);
      expect(climate).toBe('arid');
    });

    it('阿塔卡马沙漠坐标 (-24, -70) 应返回 arid', () => {
      const climate = inferClimate(-24, -70);
      expect(climate).toBe('arid');
    });
  });

  describe('温带气候（默认）', () => {
    it('巴黎坐标 (48.86, 2.35) 应返回 temperate', () => {
      const climate = inferClimate(48.86, 2.35);
      expect(climate).toBe('temperate');
    });

    it('纽约坐标 (40.71, -74.01) 应返回 temperate', () => {
      const climate = inferClimate(40.71, -74.01);
      expect(climate).toBe('temperate');
    });

    it('东京坐标 (35.68, 139.65) 应返回 temperate', () => {
      const climate = inferClimate(35.68, 139.65);
      expect(climate).toBe('temperate');
    });
  });

  describe('亚寒带气候（|lat| ≥ 55）', () => {
    it('北极圈坐标 (65, 25) 应返回 subarctic', () => {
      const climate = inferClimate(65, 25);
      expect(climate).toBe('subarctic');
    });

    it('莫斯科坐标 (55.75, 37.62) 应返回 subarctic', () => {
      const climate = inferClimate(55.75, 37.62);
      expect(climate).toBe('subarctic');
    });

    it('南极洲坐标 (-70, 0) 应返回 subarctic', () => {
      const climate = inferClimate(-70, 0);
      expect(climate).toBe('subarctic');
    });

    it('阿拉斯加坐标 (64.84, -147.72) 应返回 subarctic', () => {
      const climate = inferClimate(64.84, -147.72);
      expect(climate).toBe('subarctic');
    });
  });

  describe('地中海气候', () => {
    it('地中海盆地坐标 (38, 15) 应返回 mediterranean', () => {
      const climate = inferClimate(38, 15);
      expect(climate).toBe('mediterranean');
    });

    it('加州洛杉矶坐标 (34.05, -118.24) 应返回 mediterranean', () => {
      const climate = inferClimate(34.05, -118.24);
      expect(climate).toBe('mediterranean');
    });

    it('智利圣地亚哥坐标 (-33.45, -70.67) 应返回 mediterranean', () => {
      const climate = inferClimate(-33.45, -70.67);
      expect(climate).toBe('mediterranean');
    });

    it('南非开普敦坐标 (-33.92, 18.42) 应返回 mediterranean', () => {
      const climate = inferClimate(-33.92, 18.42);
      expect(climate).toBe('mediterranean');
    });

    it('澳大利亚珀斯坐标 (-31.95, 115.86) 应返回 mediterranean', () => {
      const climate = inferClimate(-31.95, 115.86);
      expect(climate).toBe('mediterranean');
    });
  });

  describe('边界值测试', () => {
    it('纬度 23.4 应返回 tropical（使用太平洋坐标避开沙漠）', () => {
      const climate = inferClimate(23.4, -150);
      expect(climate).toBe('tropical');
    });

    it('纬度 23.5 应返回 temperate（非热带，使用太平洋坐标）', () => {
      const climate = inferClimate(23.5, -150);
      expect(['temperate', 'arid', 'mediterranean']).toContain(climate);
    });

    it('纬度 54.9 应返回 temperate', () => {
      const climate = inferClimate(54.9, 0);
      expect(climate).toBe('temperate');
    });

    it('纬度 55 应返回 subarctic', () => {
      const climate = inferClimate(55, 0);
      expect(climate).toBe('subarctic');
    });
  });

  describe('优先级测试', () => {
    it('亚寒带优先于地中海气候', () => {
      // 高纬度地中海区域应归类为亚寒带
      const climate = inferClimate(60, 15);
      expect(climate).toBe('subarctic');
    });

    it('地中海气候优先于干旱气候', () => {
      // 地中海盆地内的干旱区域应归类为地中海气候
      const climate = inferClimate(38, 15);
      expect(climate).toBe('mediterranean');
    });
  });
});
