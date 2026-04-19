/**
 * 缓存工具函数的单元测试。
 * Feature: 07-settings-ui
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.5, 9.2, 9.3, 9.4, 9.5
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CacheStatistics } from '../types';

// 在顶层 mock db 模块，所有测试共享
const mockGetAll = vi.fn();
const mockCount = vi.fn();
const mockClear = vi.fn();
const mockGetDB = vi.fn();
const mockIsIndexedDBAvailable = vi.fn();

vi.mock('@/utils/db', () => ({
  getDB: (...args: unknown[]) => mockGetDB(...args),
  isIndexedDBAvailable: (...args: unknown[]) => mockIsIndexedDBAvailable(...args),
}));

import {
  calculateTotalSizeMB,
  formatCacheStats,
  calculateCacheStatistics,
  clearAllCaches,
} from '../cacheUtils';

// ---------------------------------------------------------------------------
// calculateTotalSizeMB
// ---------------------------------------------------------------------------

describe('calculateTotalSizeMB', () => {
  test('returns 0 for an empty array', () => {
    expect(calculateTotalSizeMB([])).toBe(0);
  });

  test('converts a single value from bytes to MB', () => {
    // 1 MB = 1048576 bytes
    expect(calculateTotalSizeMB([1048576])).toBe(1);
  });

  test('sums multiple blob sizes and converts to MB', () => {
    // 1 MB + 0.5 MB = 1.5 MB
    expect(calculateTotalSizeMB([1048576, 524288])).toBe(1.5);
  });

  test('handles an array of all zeros', () => {
    expect(calculateTotalSizeMB([0, 0, 0])).toBe(0);
  });

  test('rounds to 2 decimal places', () => {
    // 1000 bytes = 1000 / 1048576 ≈ 0.000953674... → 0
    expect(calculateTotalSizeMB([1000])).toBe(0);

    // 100000 bytes = 100000 / 1048576 ≈ 0.09536... → 0.1
    expect(calculateTotalSizeMB([100000])).toBe(0.1);
  });

  test('returns non-negative for valid inputs', () => {
    const result = calculateTotalSizeMB([500, 1000, 2000]);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('handles large byte values', () => {
    // 1 GB = 1073741824 bytes = 1024 MB
    expect(calculateTotalSizeMB([1073741824])).toBe(1024);
  });
});

// ---------------------------------------------------------------------------
// formatCacheStats
// ---------------------------------------------------------------------------

describe('formatCacheStats', () => {
  test('formats valid stats into the expected string', () => {
    const stats: CacheStatistics = {
      soundscapeCount: 5,
      totalSizeMB: 12.34,
      geocodeCount: 10,
      historyCount: 3,
    };
    expect(formatCacheStats(stats)).toBe('5 soundscapes · 12.34 MB');
  });

  test('formats zero stats correctly', () => {
    const stats: CacheStatistics = {
      soundscapeCount: 0,
      totalSizeMB: 0,
      geocodeCount: 0,
      historyCount: 0,
    };
    expect(formatCacheStats(stats)).toBe('0 soundscapes · 0 MB');
  });

  test('returns "Cache unavailable" for null', () => {
    expect(formatCacheStats(null)).toBe('Cache unavailable');
  });

  test('returns "Cache unavailable" for undefined', () => {
    expect(formatCacheStats(undefined)).toBe('Cache unavailable');
  });

  test('formats stats with a single soundscape', () => {
    const stats: CacheStatistics = {
      soundscapeCount: 1,
      totalSizeMB: 0.5,
      geocodeCount: 1,
      historyCount: 1,
    };
    expect(formatCacheStats(stats)).toBe('1 soundscapes · 0.5 MB');
  });
});

// ---------------------------------------------------------------------------
// calculateCacheStatistics (mocked IndexedDB)
// ---------------------------------------------------------------------------

describe('calculateCacheStatistics', () => {
  beforeEach(() => {
    mockGetAll.mockReset();
    mockCount.mockReset();
    mockGetDB.mockReset();
    mockIsIndexedDBAvailable.mockReset();

    // 默认：IndexedDB 可用，返回带有 getAll/count 方法的 mock db
    mockIsIndexedDBAvailable.mockReturnValue(true);
    mockGetDB.mockResolvedValue({
      getAll: mockGetAll,
      count: mockCount,
    });
  });

  test('returns correct statistics from IndexedDB', async () => {
    mockGetAll.mockResolvedValue([
      { id: '1', sizeBytes: 1048576 },
      { id: '2', sizeBytes: 524288 },
    ]);
    mockCount
      .mockResolvedValueOnce(5)  // geocode_cache
      .mockResolvedValueOnce(10); // location_history

    const stats = await calculateCacheStatistics();

    expect(stats).toEqual({
      soundscapeCount: 2,
      totalSizeMB: 1.5,
      geocodeCount: 5,
      historyCount: 10,
    });
  });

  test('returns zero stats when all stores are empty', async () => {
    mockGetAll.mockResolvedValue([]);
    mockCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const stats = await calculateCacheStatistics();

    expect(stats).toEqual({
      soundscapeCount: 0,
      totalSizeMB: 0,
      geocodeCount: 0,
      historyCount: 0,
    });
  });

  test('handles entries with missing sizeBytes (defaults to 0)', async () => {
    mockGetAll.mockResolvedValue([
      { id: '1' },
      { id: '2', sizeBytes: 1048576 },
    ]);
    mockCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const stats = await calculateCacheStatistics();

    expect(stats.soundscapeCount).toBe(2);
    expect(stats.totalSizeMB).toBe(1);
  });

  test('throws when IndexedDB is unavailable', async () => {
    mockIsIndexedDBAvailable.mockReturnValue(false);

    await expect(calculateCacheStatistics()).rejects.toThrow('IndexedDB is not available');
  });

  test('throws when getDB fails', async () => {
    mockGetDB.mockRejectedValue(new Error('DB init failed'));

    await expect(calculateCacheStatistics()).rejects.toThrow('DB init failed');
  });
});

// ---------------------------------------------------------------------------
// clearAllCaches (mocked IndexedDB)
// ---------------------------------------------------------------------------

describe('clearAllCaches', () => {
  beforeEach(() => {
    mockClear.mockReset();
    mockGetDB.mockReset();
    mockIsIndexedDBAvailable.mockReset();

    mockIsIndexedDBAvailable.mockReturnValue(true);
    mockGetDB.mockResolvedValue({
      clear: mockClear,
    });
  });

  test('clears all three object stores', async () => {
    mockClear.mockResolvedValue(undefined);

    await clearAllCaches();

    expect(mockClear).toHaveBeenCalledTimes(3);
    expect(mockClear).toHaveBeenCalledWith('soundscape_cache');
    expect(mockClear).toHaveBeenCalledWith('geocode_cache');
    expect(mockClear).toHaveBeenCalledWith('location_history');
  });

  test('throws when IndexedDB is unavailable', async () => {
    mockIsIndexedDBAvailable.mockReturnValue(false);

    await expect(clearAllCaches()).rejects.toThrow('IndexedDB is not available');
  });

  test('throws when clear operation fails', async () => {
    mockClear.mockRejectedValue(new Error('Clear failed'));

    await expect(clearAllCaches()).rejects.toThrow('Clear failed');
  });
});
