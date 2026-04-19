/**
 * 地理编码缓存单元测试
 * Feature: 06-caching-storage, Task 11.1
 *
 * 测试 geocodeCache.ts 中所有函数的正常流程、错误处理和边界条件。
 * 通过 vi.mock 模拟 IndexedDB 操作。
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ─── Mock IndexedDB ──────────────────────────────────────────────────────────

let mockGet: ReturnType<typeof vi.fn>;
let mockPut: ReturnType<typeof vi.fn>;

function createMockDB() {
  return {
    get: mockGet,
    put: mockPut,
  };
}

vi.mock('@/utils/db', () => ({
  getDB: vi.fn(),
  isIndexedDBAvailable: vi.fn(() => true),
}));

// ─── 测试数据 ────────────────────────────────────────────────────────────────

const sampleResult = {
  cityName: 'Paris',
  countryName: 'France',
  administrativeRegion: 'Île-de-France',
  timezone: 'Europe/Paris',
  language: 'fr',
  isInferred: false,
};

// ─── 测试 ────────────────────────────────────────────────────────────────────

describe('Geocode Cache - Unit Tests', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();

    mockGet = vi.fn();
    mockPut = vi.fn();

    const { getDB } = await import('@/utils/db');
    vi.mocked(getDB).mockResolvedValue(createMockDB() as never);
  });

  // ─── getCachedGeocode ──────────────────────────────────────────────────

  describe('getCachedGeocode', () => {
    // Validates: Requirement 6.3 — 缓存命中返回正确的 GeocodingResult
    test('缓存命中时返回正确的 GeocodingResult', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      mockGet.mockResolvedValue({
        key: '48.86,2.35',
        result: sampleResult,
        cachedAt: 1700000000000,
      });

      const result = await getCachedGeocode(48.8566, 2.3522);

      expect(result).toEqual(sampleResult);
      expect(result!.cityName).toBe('Paris');
      expect(result!.countryName).toBe('France');
      expect(mockGet).toHaveBeenCalledWith('geocode_cache', '48.86,2.35');
    });

    // Validates: Requirement 6.4 — 缓存未命中返回 null
    test('缓存未命中时返回 null', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      mockGet.mockResolvedValue(undefined);

      const result = await getCachedGeocode(10.0, 20.0);

      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('geocode_cache', '10.00,20.00');
    });

    // Validates: Requirement 6.6 — 读取失败记录错误日志并返回 null
    test('读取失败时记录 [PinDrop Error] 日志并返回 null', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('IndexedDB read failed');
      mockGet.mockRejectedValue(dbError);

      const result = await getCachedGeocode(48.86, 2.35);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to get cached geocode:',
        dbError
      );
    });
  });

  // ─── cacheGeocode ──────────────────────────────────────────────────────

  describe('cacheGeocode', () => {
    // Validates: Requirements 6.1, 6.2 — 成功写入地理编码缓存
    test('成功写入地理编码缓存', async () => {
      const { cacheGeocode } = await import('../geocodeCache');
      mockPut.mockResolvedValue(undefined);

      await cacheGeocode(48.8566, 2.3522, sampleResult);

      expect(mockPut).toHaveBeenCalledWith('geocode_cache', {
        key: '48.86,2.35',
        result: sampleResult,
        cachedAt: expect.any(Number),
      });
    });

    // Validates: Requirement 6.5 — 写入失败记录错误日志但不阻塞
    test('写入失败时记录 [PinDrop Error] 日志但不抛出异常', async () => {
      const { cacheGeocode } = await import('../geocodeCache');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dbError = new Error('Write failed');
      mockPut.mockRejectedValue(dbError);

      // 不应抛出异常
      await expect(cacheGeocode(48.86, 2.35, sampleResult)).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PinDrop Error] Failed to cache geocode:',
        dbError
      );
    });
  });

  // ─── 坐标精度 0.01° 键生成 ────────────────────────────────────────────

  describe('坐标精度 0.01° 键生成', () => {
    // Validates: Requirements 6.1, 6.3 — 相近坐标命中同一缓存
    test('相近坐标（0.01° 精度内）生成相同的缓存键', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      mockGet.mockResolvedValue({
        key: '48.86,2.35',
        result: sampleResult,
        cachedAt: 1700000000000,
      });

      // 两组相近坐标：(48.8566, 2.3522) 和 (48.8599, 2.3501)
      // 四舍五入后都是 (48.86, 2.35)
      await getCachedGeocode(48.8566, 2.3522);
      const firstCallKey = mockGet.mock.calls[0][1];

      mockGet.mockClear();
      await getCachedGeocode(48.8599, 2.3501);
      const secondCallKey = mockGet.mock.calls[0][1];

      expect(firstCallKey).toBe('48.86,2.35');
      expect(secondCallKey).toBe('48.86,2.35');
      expect(firstCallKey).toBe(secondCallKey);
    });

    // Validates: Requirement 6.1 — 负数坐标键生成正确
    test('负数坐标生成正确的缓存键', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      mockGet.mockResolvedValue(undefined);

      await getCachedGeocode(-33.8688, 151.2093);

      expect(mockGet).toHaveBeenCalledWith('geocode_cache', '-33.87,151.21');
    });

    // Validates: Requirement 6.1 — 零坐标键生成正确
    test('零坐标生成正确的缓存键', async () => {
      const { getCachedGeocode } = await import('../geocodeCache');
      mockGet.mockResolvedValue(undefined);

      await getCachedGeocode(0, 0);

      expect(mockGet).toHaveBeenCalledWith('geocode_cache', '0.00,0.00');
    });

    // Validates: Requirement 6.1 — 写入时也使用相同精度的键
    test('写入时使用 0.01° 精度的缓存键', async () => {
      const { cacheGeocode } = await import('../geocodeCache');
      mockPut.mockResolvedValue(undefined);

      await cacheGeocode(48.8566, 2.3522, sampleResult);

      const putCall = mockPut.mock.calls[0];
      expect(putCall[1].key).toBe('48.86,2.35');
    });
  });
});
