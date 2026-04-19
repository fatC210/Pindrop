/**
 * LocationContext 序列化属性测试
 *
 * 使用 fast-check 进行属性测试，验证：
 * - Property 5: LocationContext 序列化往返一致性
 * - Property 6: 语言映射兜底保证
 *
 * 需求覆盖: 8.3, 17.3, 17.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  serializeLocationContext,
  parseLocationContext,
  type LocationContext,
  type RegionType,
  type TerrainType,
  type ClimateType,
  type WaterType,
  type TimeSlot,
} from '@/types/locationContext';
import { getLanguageInfo } from '@/utils/geocoding/languageMapper';

describe('LocationContext Property Tests', () => {
  describe('Property 5: LocationContext 序列化往返一致性', () => {
    // 定义 LocationContext 生成器
    const locationContextArbitrary = fc.record({
      cityName: fc.string({ minLength: 1 }),
      countryName: fc.string({ minLength: 1 }),
      regionType: fc.constantFrom<RegionType>(
        'city_center',
        'city_suburb',
        'town',
        'village',
        'rural',
        'wilderness',
        'ocean',
        'polar'
      ),
      coordinates: fc.tuple(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true })
      ) as fc.Arbitrary<[number, number]>,
      primaryLanguage: fc.string({ minLength: 2, maxLength: 3 }),
      languageVariant: fc.string({ minLength: 5, maxLength: 10 }),
      secondaryLanguages: fc.array(fc.string({ minLength: 2, maxLength: 3 })),
      timezone: fc.string({ minLength: 1 }),
      currentLocalHour: fc.integer({ min: 0, max: 23 }),
      timeSlot: fc.constantFrom<TimeSlot>('dawn', 'day', 'dusk', 'night'),
      cultureRegion: fc.string({ minLength: 1 }),
      dominantReligion: fc.string({ minLength: 1 }),
      urbanDensity: fc.double({ min: 0, max: 1, noNaN: true }),
      terrain: fc.constantFrom<TerrainType>(
        'mountain',
        'plain',
        'coast',
        'desert',
        'forest',
        'tundra',
        'jungle',
        'river',
        'lake'
      ),
      nearWater: fc.option(
        fc.constantFrom<WaterType>('sea', 'river', 'lake', 'canal'),
        { nil: null }
      ),
      climate: fc.constantFrom<ClimateType>(
        'tropical',
        'temperate',
        'subarctic',
        'arid',
        'mediterranean'
      ),
      economicLevel: fc.double({ min: 0, max: 1, noNaN: true }),
    });

    it('serialize → parse 应产出与原始等价的对象', () => {
      fc.assert(
        fc.property(locationContextArbitrary, (ctx) => {
          const serialized = serializeLocationContext(ctx);
          const parsed = parseLocationContext(serialized);

          expect(parsed).not.toBeNull();

          if (parsed) {
            // 验证所有字段
            expect(parsed.cityName).toBe(ctx.cityName);
            expect(parsed.countryName).toBe(ctx.countryName);
            expect(parsed.regionType).toBe(ctx.regionType);
            
            // 注意：JSON 不支持 -0，序列化后 -0 会变成 0
            const normalizedCoords: [number, number] = [
              Object.is(ctx.coordinates[0], -0) ? 0 : ctx.coordinates[0],
              Object.is(ctx.coordinates[1], -0) ? 0 : ctx.coordinates[1],
            ];
            expect(parsed.coordinates).toEqual(normalizedCoords);
            
            expect(parsed.primaryLanguage).toBe(ctx.primaryLanguage);
            expect(parsed.languageVariant).toBe(ctx.languageVariant);
            expect(parsed.secondaryLanguages).toEqual(ctx.secondaryLanguages);
            expect(parsed.timezone).toBe(ctx.timezone);
            expect(parsed.currentLocalHour).toBe(ctx.currentLocalHour);
            expect(parsed.timeSlot).toBe(ctx.timeSlot);
            expect(parsed.cultureRegion).toBe(ctx.cultureRegion);
            expect(parsed.dominantReligion).toBe(ctx.dominantReligion);
            expect(parsed.urbanDensity).toBe(ctx.urbanDensity);
            expect(parsed.terrain).toBe(ctx.terrain);
            expect(parsed.nearWater).toBe(ctx.nearWater);
            expect(parsed.climate).toBe(ctx.climate);
            expect(parsed.economicLevel).toBe(ctx.economicLevel);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('数值精度应被完整保留', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -90, max: 90, noNaN: true }),
          fc.double({ min: -180, max: 180, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          (lat, lng, urbanDensity, economicLevel) => {
            const ctx: LocationContext = {
              cityName: 'Test City',
              countryName: 'Test Country',
              regionType: 'city_center',
              coordinates: [lat, lng],
              primaryLanguage: 'en',
              languageVariant: 'en-US',
              secondaryLanguages: [],
              timezone: 'UTC+0',
              currentLocalHour: 12,
              timeSlot: 'day',
              cultureRegion: 'test',
              dominantReligion: 'none',
              urbanDensity,
              terrain: 'plain',
              nearWater: null,
              climate: 'temperate',
              economicLevel,
            };

            const serialized = serializeLocationContext(ctx);
            const parsed = parseLocationContext(serialized);

            expect(parsed).not.toBeNull();

            if (parsed) {
              // 验证数值精度
              // 注意：JSON 不支持 -0，序列化后 -0 会变成 0
              const normalizedLat = Object.is(lat, -0) ? 0 : lat;
              const normalizedLng = Object.is(lng, -0) ? 0 : lng;
              const normalizedUrbanDensity = Object.is(urbanDensity, -0)
                ? 0
                : urbanDensity;
              const normalizedEconomicLevel = Object.is(economicLevel, -0)
                ? 0
                : economicLevel;

              expect(parsed.coordinates[0]).toBe(normalizedLat);
              expect(parsed.coordinates[1]).toBe(normalizedLng);
              expect(parsed.urbanDensity).toBe(normalizedUrbanDensity);
              expect(parsed.economicLevel).toBe(normalizedEconomicLevel);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('无效 JSON 应返回 null', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidJson) => {
            const parsed = parseLocationContext(invalidJson);
            expect(parsed).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: 语言映射兜底保证', () => {
    it('任意字符串应返回有效的 LanguageInfo', () => {
      fc.assert(
        fc.property(fc.string(), (countryName) => {
          const languageInfo = getLanguageInfo(countryName);

          // 验证返回值有效
          expect(languageInfo).toBeDefined();
          expect(languageInfo.primaryLanguage).toBeTruthy();
          expect(typeof languageInfo.primaryLanguage).toBe('string');
          expect(languageInfo.primaryLanguage.length).toBeGreaterThan(0);

          expect(languageInfo.languageVariant).toBeTruthy();
          expect(typeof languageInfo.languageVariant).toBe('string');
          expect(languageInfo.languageVariant.length).toBeGreaterThan(0);

          expect(Array.isArray(languageInfo.secondaryLanguages)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('未知国家应返回 en/en-US', () => {
      fc.assert(
        fc.property(
          // 生成不太可能是真实国家名的字符串
          fc.string({ minLength: 50 }),
          (countryName) => {
            const languageInfo = getLanguageInfo(countryName);

            // 未知国家应返回英语兜底
            expect(languageInfo.primaryLanguage).toBe('en');
            expect(languageInfo.languageVariant).toBe('en-US');
            expect(languageInfo.secondaryLanguages).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
