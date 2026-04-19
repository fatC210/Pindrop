/**
 * 缓存工具函数的属性测试。
 * Feature: 06-caching-storage
 *
 * 使用 fast-check 验证 calculateTotalSizeMB 和 formatCacheStats 的通用正确性属性。
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import type { CacheStatistics } from '../types';
import { calculateTotalSizeMB, formatCacheStats } from '../cacheUtils';

// ---------------------------------------------------------------------------
// Property 6: calculateTotalSizeMB 计算正确性
// ---------------------------------------------------------------------------

describe('Property 6: calculateTotalSizeMB 计算正确性', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * 对于任意非负整数数组 blobSizes，calculateTotalSizeMB(blobSizes) 应等于
   * Math.round(sum(blobSizes) / (1024 * 1024) * 100) / 100，且结果始终非负。
   */
  test('计算结果等于 Math.round(sum / (1024*1024) * 100) / 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 1_000_000_000 })),
        (blobSizes) => {
          const result = calculateTotalSizeMB(blobSizes);
          const sum = blobSizes.reduce((acc, size) => acc + size, 0);
          const expected = Math.round((sum / (1024 * 1024)) * 100) / 100;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('结果始终非负', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 1_000_000_000 })),
        (blobSizes) => {
          const result = calculateTotalSizeMB(blobSizes);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: formatCacheStats 格式一致性
// ---------------------------------------------------------------------------

// 生成随机 CacheStatistics 对象的 arbitrary
const cacheStatisticsArb = fc.record({
  soundscapeCount: fc.nat({ max: 10000 }),
  totalSizeMB: fc.float({ min: 0, max: 100000, noNaN: true, noDefaultInfinity: true }),
  geocodeCount: fc.nat({ max: 10000 }),
  historyCount: fc.nat({ max: 10000 }),
});

describe('Property 7: formatCacheStats 格式一致性', () => {
  /**
   * **Validates: Requirements 8.3, 8.6**
   *
   * 对于任意有效的 CacheStatistics 对象，formatCacheStats(stats) 应返回
   * 格式为 "{soundscapeCount} soundscapes · {totalSizeMB} MB" 的字符串。
   */
  test('有效 CacheStatistics 返回 "{soundscapeCount} soundscapes · {totalSizeMB} MB" 格式', () => {
    fc.assert(
      fc.property(
        cacheStatisticsArb,
        (stats: CacheStatistics) => {
          const result = formatCacheStats(stats);
          const expected = `${stats.soundscapeCount} soundscapes · ${stats.totalSizeMB} MB`;

          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * 对于 null 或 undefined 输入，formatCacheStats 应返回 "Cache unavailable"。
   */
  test('null 输入返回 "Cache unavailable"', () => {
    expect(formatCacheStats(null)).toBe('Cache unavailable');
  });

  test('undefined 输入返回 "Cache unavailable"', () => {
    expect(formatCacheStats(undefined)).toBe('Cache unavailable');
  });
});
