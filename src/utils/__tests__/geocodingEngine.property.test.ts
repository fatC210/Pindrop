/**
 * GeocodingEngine 属性测试
 *
 * 使用 fast-check 进行属性测试，验证：
 * - Property 1: 坐标验证完备性
 * - Property 10: resolveLocation 总是返回完整 LocationContext
 *
 * 需求覆盖: 15.6, 15.7, 16.4, 16.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { resolveLocation } from '@/utils/geocoding/geocodingEngine';
import * as nominatimModule from '@/utils/nominatim';

describe('GeocodingEngine Property Tests', () => {
  // Mock Nominatim API
  beforeEach(() => {
    vi.spyOn(nominatimModule, 'reverseGeocode').mockImplementation(
      async (lat: number, lng: number) => {
        // 随机返回成功或失败
        const shouldSucceed = Math.random() > 0.3;

        if (shouldSucceed) {
          return {
            display_name: `Test Location at ${lat}, ${lng}`,
            address: {
              city: 'Test City',
              country: 'Test Country',
            },
          };
        }

        return null;
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 1: 坐标验证完备性', () => {
    it('无效坐标应抛出错误', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成无效纬度（< -90 或 > 90）
          fc.oneof(
            fc.double({ min: -1000, max: -90.1, noNaN: true }),
            fc.double({ min: 90.1, max: 1000, noNaN: true })
          ),
          // 生成任意经度
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (lat, lng) => {
            // 无效纬度应抛出错误
            await expect(resolveLocation(lat, lng)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('无效经度应抛出错误', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成有效纬度
          fc.double({ min: -90, max: 90, noNaN: true }),
          // 生成无效经度（< -180 或 > 180）
          fc.oneof(
            fc.double({ min: -1000, max: -180.1, noNaN: true }),
            fc.double({ min: 180.1, max: 1000, noNaN: true })
          ),
          async (lat, lng) => {
            // 无效经度应抛出错误
            await expect(resolveLocation(lat, lng)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('有效坐标应返回 LocationContext', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成有效纬度
          fc.double({ min: -90, max: 90, noNaN: true }),
          // 生成有效经度
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (lat, lng) => {
            // 有效坐标应返回 LocationContext
            const context = await resolveLocation(lat, lng);

            expect(context).toBeDefined();
            expect(context.coordinates).toEqual([lat, lng]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 10: resolveLocation 总是返回完整 LocationContext', () => {
    it('任意有效坐标应返回所有字段已填充的 LocationContext', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成有效纬度
          fc.double({ min: -90, max: 90, noNaN: true }),
          // 生成有效经度
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (lat, lng) => {
            const context = await resolveLocation(lat, lng);

            // 验证所有字段已填充
            expect(context.cityName).toBeDefined();
            expect(typeof context.cityName).toBe('string');

            expect(context.countryName).toBeDefined();
            expect(typeof context.countryName).toBe('string');

            expect(context.regionType).toBeDefined();
            expect([
              'city_center',
              'city_suburb',
              'town',
              'village',
              'rural',
              'wilderness',
              'ocean',
              'polar',
            ]).toContain(context.regionType);

            expect(context.coordinates).toEqual([lat, lng]);

            expect(context.primaryLanguage).toBeDefined();
            expect(typeof context.primaryLanguage).toBe('string');

            expect(context.languageVariant).toBeDefined();
            expect(typeof context.languageVariant).toBe('string');

            expect(Array.isArray(context.secondaryLanguages)).toBe(true);

            expect(context.timezone).toBeDefined();
            expect(typeof context.timezone).toBe('string');

            expect(context.currentLocalHour).toBeGreaterThanOrEqual(0);
            expect(context.currentLocalHour).toBeLessThan(24);

            expect(['dawn', 'day', 'dusk', 'night']).toContain(
              context.timeSlot
            );

            expect(context.cultureRegion).toBeDefined();
            expect(typeof context.cultureRegion).toBe('string');

            expect(context.dominantReligion).toBeDefined();
            expect(typeof context.dominantReligion).toBe('string');

            expect(context.urbanDensity).toBeGreaterThanOrEqual(0);
            expect(context.urbanDensity).toBeLessThanOrEqual(1);

            expect(context.terrain).toBeDefined();
            expect([
              'mountain',
              'plain',
              'coast',
              'desert',
              'forest',
              'tundra',
              'jungle',
              'river',
              'lake',
            ]).toContain(context.terrain);

            if (context.nearWater !== null) {
              expect(['sea', 'river', 'lake', 'canal']).toContain(
                context.nearWater
              );
            }

            expect(context.climate).toBeDefined();
            expect([
              'tropical',
              'temperate',
              'subarctic',
              'arid',
              'mediterranean',
            ]).toContain(context.climate);

            expect(context.economicLevel).toBeGreaterThanOrEqual(0);
            expect(context.economicLevel).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Nominatim 失败时应降级到坐标推断', async () => {
      // Mock Nominatim 总是失败
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);

      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          async (lat, lng) => {
            const context = await resolveLocation(lat, lng);

            // 应返回完整的 LocationContext
            expect(context).toBeDefined();
            expect(context.coordinates).toEqual([lat, lng]);

            // 验证降级路径的特征
            expect(['wilderness', 'ocean', 'polar']).toContain(
              context.regionType
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
