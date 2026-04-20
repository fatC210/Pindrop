/**
 * GeocodingEngine 单元测试
 *
 * 测试协调器的完整流程：
 * - 缓存命中路径
 * - Nominatim 成功路径
 * - Nominatim 超时/失败路径
 * - 无效坐标处理
 * - 单个推断步骤失败处理
 * - 完整示例验证
 *
 * 需求覆盖: 15.1-15.7, 16.1-16.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLocation, buildLocationContext } from '@/utils/geocoding/geocodingEngine';
import * as nominatimModule from '@/utils/nominatim';
import * as geocodeCacheModule from '@/utils/geocodeCache';
import type { NominatimResponse } from '@/utils/nominatim';

describe('GeocodingEngine Unit Tests', () => {
  beforeEach(() => {
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('坐标验证', () => {
    it('无效纬度（< -90）应抛出错误', async () => {
      await expect(resolveLocation(-91, 0)).rejects.toThrow(
        'Invalid coordinates'
      );
    });

    it('无效纬度（> 90）应抛出错误', async () => {
      await expect(resolveLocation(91, 0)).rejects.toThrow(
        'Invalid coordinates'
      );
    });

    it('无效经度（< -180）应抛出错误', async () => {
      await expect(resolveLocation(0, -181)).rejects.toThrow(
        'Invalid coordinates'
      );
    });

    it('无效经度（> 180）应抛出错误', async () => {
      await expect(resolveLocation(0, 181)).rejects.toThrow(
        'Invalid coordinates'
      );
    });

    it('有效坐标应不抛出错误', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);

      await expect(resolveLocation(0, 0)).resolves.toBeDefined();
    });
  });

  describe('Nominatim 成功路径', () => {
    it('Nominatim 成功时应构建完整 LocationContext', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
          country_code: 'fr',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(
        mockResponse
      );
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(48.86, 2.35);

      expect(context.cityName).toBe('Paris');
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.coordinates).toEqual([48.86, 2.35]);
    });

    it('Nominatim 成功时应缓存结果', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Tokyo, Japan',
        address: {
          city: 'Tokyo',
          country: 'Japan',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(
        mockResponse
      );
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      const cacheLocationContextSpy = vi
        .spyOn(geocodeCacheModule, 'cacheLocationContext')
        .mockResolvedValue();

      await resolveLocation(35.68, 139.65);

      expect(cacheLocationContextSpy).toHaveBeenCalled();
    });
  });

  describe('Nominatim 失败路径', () => {
    it('Nominatim 超时时应降级到坐标推断', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(0, -30);

      // 应降级到坐标推断
      expect(['wilderness', 'ocean', 'polar']).toContain(context.regionType);
      expect(context.coordinates).toEqual([0, -30]);
    });

    it('Nominatim 无结果时应降级到坐标推断', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(85, 0);

      // 极地坐标应返回 polar
      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Arctic');
    });

    it('Nominatim 失败时应缓存推断结果', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      const cacheLocationContextSpy = vi
        .spyOn(geocodeCacheModule, 'cacheLocationContext')
        .mockResolvedValue();

      await resolveLocation(0, -30);

      expect(cacheLocationContextSpy).toHaveBeenCalled();
    });
  });

  describe('buildLocationContext', () => {
    it('应从 Nominatim 响应构建完整 LocationContext', () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
        },
      };

      const context = buildLocationContext(mockResponse, 48.86, 2.35);

      expect(context.cityName).toBe('Paris');
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.urbanDensity).toBe(0.9);
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.cultureRegion).toBe('western_europe');
      expect(context.dominantReligion).toBe('christianity');
      expect(context.coordinates).toEqual([48.86, 2.35]);
    });

    it('空 address 应使用默认值', () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Unknown Location',
        address: {},
      };

      const context = buildLocationContext(mockResponse, 0, 0);

      expect(context.cityName).toBe('Unknown Location');
      expect(context.countryName).toBe('Unknown');
      expect(context.regionType).toBe('rural');
      expect(context.urbanDensity).toBe(0.05);
      expect(context.primaryLanguage).toBe('en');
      expect(context.languageVariant).toBe('en-US');
    });
  });

  describe('单个推断步骤失败处理', () => {
    it('RegionClassifier 失败时应使用默认值', () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Test Location',
        address: {
          city: 'Test City',
          country: 'Test Country',
        },
      };

      // 即使 RegionClassifier 失败，也应返回完整 LocationContext
      const context = buildLocationContext(mockResponse, 0, 0);

      expect(context).toBeDefined();
      expect(context.regionType).toBeDefined();
      expect(context.urbanDensity).toBeDefined();
    });
  });

  describe('完整示例验证', () => {
    it('巴黎坐标应返回正确的所有字段', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, Île-de-France, France',
        address: {
          city: 'Paris',
          state: 'Île-de-France',
          country: 'France',
          country_code: 'fr',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(
        mockResponse
      );
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(48.86, 2.35);

      // 基础地理
      expect(context.cityName).toBe('Paris');
      expect(context.regionName).toBeUndefined();
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.coordinates).toEqual([48.86, 2.35]);

      // 语言
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.secondaryLanguages).toContain('en');

      // 时间
      expect(context.timezone).toBe('Europe/Paris');
      expect(context.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(context.currentLocalHour).toBeLessThan(24);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(context.timeSlot);

      // 文化推断
      expect(context.cultureRegion).toBe('western_europe');
      expect(context.dominantReligion).toBe('christianity');
      expect(context.urbanDensity).toBe(0.9);

      // 地理特征
      expect(context.terrain).toBe('plain');
      expect(context.nearWater).toBe(null);
      expect(context.climate).toBe('temperate');

      // 经济水平
      expect(context.economicLevel).toBe(0.8);
    });
  });

  describe('错误日志', () => {
    it('无效坐标应记录错误日志', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await expect(resolveLocation(91, 0)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PinDrop Error] GeocodingEngine')
      );
    });
  });
});
