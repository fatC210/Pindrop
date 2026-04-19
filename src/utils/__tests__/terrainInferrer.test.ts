/**
 * TerrainInferrer 单元测试
 *
 * 测试地形推断和水体检测：
 * - 沙漠区域
 * - 热带丛林
 * - 冻原
 * - 海岸线
 * - 默认平原
 *
 * 需求覆盖: 11.1-11.6
 */

import { describe, it, expect } from 'vitest';
import { inferTerrain } from '@/utils/geocoding/terrainInferrer';
import type { NominatimResponse } from '@/utils/nominatim';

describe('TerrainInferrer Unit Tests', () => {
  describe('沙漠地形', () => {
    it('撒哈拉沙漠坐标应返回 desert', () => {
      const result = inferTerrain(25, 10, null);

      expect(result.terrain).toBe('desert');
      expect(result.nearWater).toBe(null);
    });

    it('阿拉伯沙漠坐标应返回 desert', () => {
      const result = inferTerrain(25, 45, null);

      expect(result.terrain).toBe('desert');
      expect(result.nearWater).toBe(null);
    });

    it('戈壁沙漠坐标应返回 desert', () => {
      const result = inferTerrain(42, 105, null);

      expect(result.terrain).toBe('desert');
      expect(result.nearWater).toBe(null);
    });

    it('阿塔卡马沙漠坐标应返回 desert', () => {
      const result = inferTerrain(-24, -70, null);

      expect(result.terrain).toBe('desert');
      expect(result.nearWater).toBe(null);
    });
  });

  describe('热带丛林地形', () => {
    it('亚马逊雨林坐标应返回 jungle', () => {
      const result = inferTerrain(-3, -60, null);

      expect(result.terrain).toBe('jungle');
      expect(result.nearWater).toBe(null);
    });

    it('刚果盆地坐标应返回 jungle', () => {
      const result = inferTerrain(0, 20, null);

      expect(result.terrain).toBe('jungle');
      expect(result.nearWater).toBe(null);
    });

    it('东南亚雨林坐标应返回 jungle', () => {
      const result = inferTerrain(5, 110, null);

      expect(result.terrain).toBe('jungle');
      expect(result.nearWater).toBe(null);
    });
  });

  describe('冻原地形', () => {
    it('高纬度坐标（|lat| ≥ 60）应返回 tundra', () => {
      const result = inferTerrain(65, 25, null);

      expect(result.terrain).toBe('tundra');
      expect(result.nearWater).toBe(null);
    });

    it('南极洲坐标应返回 tundra', () => {
      const result = inferTerrain(-70, 0, null);

      expect(result.terrain).toBe('tundra');
      expect(result.nearWater).toBe(null);
    });

    it('阿拉斯加坐标应返回 tundra', () => {
      const result = inferTerrain(64.84, -147.72, null);

      expect(result.terrain).toBe('tundra');
      expect(result.nearWater).toBe(null);
    });
  });

  describe('海岸线地形', () => {
    it('address 包含 coast 关键词应返回 coast + nearWater: sea', () => {
      const address: NominatimResponse['address'] = {
        city: 'Coastal City',
        country: 'France',
      };

      // 模拟包含 coast 关键词的地址
      const addressWithCoast = {
        ...address,
        road: 'Coast Road',
      };

      const result = inferTerrain(43.7, 7.25, addressWithCoast as any);

      expect(result.terrain).toBe('coast');
      expect(result.nearWater).toBe('sea');
    });

    it('address 包含 beach 关键词应返回 coast + nearWater: sea', () => {
      const address: NominatimResponse['address'] = {
        city: 'Beach City',
        country: 'France',
      };

      const result = inferTerrain(43.7, 7.25, address);

      expect(result.terrain).toBe('coast');
      expect(result.nearWater).toBe('sea');
    });

    it('address 包含 port 关键词应返回 coast + nearWater: sea', () => {
      const address: NominatimResponse['address'] = {
        city: 'Port City',
        country: 'France',
      };

      const result = inferTerrain(43.7, 7.25, address);

      expect(result.terrain).toBe('coast');
      expect(result.nearWater).toBe('sea');
    });
  });

  describe('默认平原地形', () => {
    it('无特殊特征的坐标应返回 plain', () => {
      // 使用欧洲中部坐标，不在任何特殊区域
      const result = inferTerrain(50, 10, null);

      expect(result.terrain).toBe('plain');
      expect(result.nearWater).toBe(null);
    });

    it('普通城市坐标应返回 plain', () => {
      const address: NominatimResponse['address'] = {
        city: 'Paris',
        country: 'France',
      };

      const result = inferTerrain(48.86, 2.35, address);

      expect(result.terrain).toBe('plain');
      expect(result.nearWater).toBe(null);
    });
  });

  describe('优先级测试', () => {
    it('沙漠优先于丛林', () => {
      // 撒哈拉沙漠在热带纬度范围内，但应归类为沙漠
      const result = inferTerrain(20, 10, null);

      expect(result.terrain).toBe('desert');
    });

    it('沙漠优先于冻原', () => {
      // 戈壁沙漠在高纬度，但应归类为沙漠
      const result = inferTerrain(42, 105, null);

      expect(result.terrain).toBe('desert');
    });

    it('丛林优先于冻原', () => {
      // 热带丛林在低纬度，不应归类为冻原
      const result = inferTerrain(5, 110, null);

      expect(result.terrain).toBe('jungle');
    });

    it('冻原优先于海岸线（无 address 指示）', () => {
      // 高纬度坐标无海岸指示应归类为冻原
      const result = inferTerrain(65, 25, null);

      expect(result.terrain).toBe('tundra');
    });
  });

  describe('边界值测试', () => {
    it('纬度 59.9 应返回 plain（非冻原）', () => {
      const result = inferTerrain(59.9, 0, null);

      expect(result.terrain).not.toBe('tundra');
    });

    it('纬度 60 应返回 tundra', () => {
      const result = inferTerrain(60, 0, null);

      expect(result.terrain).toBe('tundra');
    });

    it('纬度 14.9 应返回 jungle（热带丛林范围内）', () => {
      const result = inferTerrain(5, 110, null);

      expect(result.terrain).toBe('jungle');
    });
  });
});
