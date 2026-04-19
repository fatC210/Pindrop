/**
 * 地理编码缓存属性测试
 * Feature: 06-caching-storage
 *
 * 使用 fast-check 对 geocodeCache 模块进行属性测试，
 * 通过 in-memory Map 模拟 IndexedDB 的 put/get 操作。
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import type { GeocodingResult } from '../geocodeCache';

// ─── Mock IndexedDB ──────────────────────────────────────────────────────────
// 使用 in-memory Map 模拟 IndexedDB 存储
let store: Map<string, { key: string; result: GeocodingResult; cachedAt: number }>;

function createMockDB() {
  return {
    get: vi.fn(async (_storeName: string, key: string) => {
      return store.get(key) ?? undefined;
    }),
    put: vi.fn(async (_storeName: string, value: { key: string; result: GeocodingResult; cachedAt: number }) => {
      store.set(value.key, { ...value });
    }),
  };
}

vi.mock('@/utils/db', () => ({
  getDB: vi.fn(),
  isIndexedDBAvailable: vi.fn(() => true),
}));

// ─── fast-check 生成器 ──────────────────────────────────────────────────────

/** 生成有效纬度范围内的浮点数 */
const latArb = fc.float({ min: -90, max: 90, noNaN: true });

/** 生成有效经度范围内的浮点数 */
const lngArb = fc.float({ min: -180, max: 180, noNaN: true });

/** 生成随机地理编码结果 */
const geocodingResultArb: fc.Arbitrary<GeocodingResult> = fc.record({
  cityName: fc.string({ minLength: 1, maxLength: 50 }),
  countryName: fc.string({ minLength: 1, maxLength: 50 }),
  administrativeRegion: fc.string({ minLength: 0, maxLength: 50 }),
  timezone: fc.string({ minLength: 1, maxLength: 30 }),
  language: fc.string({ minLength: 1, maxLength: 10 }),
  isInferred: fc.boolean(),
});

// ─── 测试 ────────────────────────────────────────────────────────────────────

describe('Geocode Cache - Property Tests', () => {
  beforeEach(async () => {
    store = new Map();
    const mockDB = createMockDB();
    const { getDB } = await import('@/utils/db');
    vi.mocked(getDB).mockResolvedValue(mockDB as never);
  });

  // Feature: 06-caching-storage, Property 5: 地理编码缓存往返一致性
  // **Validates: Requirements 6.1, 6.2, 6.3**
  describe('Property 5: 地理编码缓存往返一致性', () => {
    test('写入后使用相同坐标（0.01° 精度内）查询返回等价的地理编码结果', async () => {
      const { cacheGeocode, getCachedGeocode } = await import(
        '../geocodeCache'
      );

      await fc.assert(
        fc.asyncProperty(
          latArb,
          lngArb,
          geocodingResultArb,
          async (lat, lng, result) => {
            // 每次迭代重置存储
            store.clear();

            // 写入地理编码缓存
            await cacheGeocode(lat, lng, result);

            // 使用相同坐标查询
            const cached = await getCachedGeocode(lat, lng);

            // 验证缓存命中
            expect(cached).not.toBeNull();

            // 验证所有字段等价
            expect(cached!.cityName).toBe(result.cityName);
            expect(cached!.countryName).toBe(result.countryName);
            expect(cached!.administrativeRegion).toBe(result.administrativeRegion);
            expect(cached!.timezone).toBe(result.timezone);
            expect(cached!.language).toBe(result.language);
            expect(cached!.isInferred).toBe(result.isInferred);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
