/**
 * 收藏列表模块的属性测试。
 * Feature: 06-caching-storage
 *
 * 使用 fast-check 验证收藏列表添加/移除往返一致性和去重幂等性的通用正确性属性。
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  addFavorite,
  removeFavorite,
  isFavorite,
  loadFavorites,
  FAVORITES_KEY,
} from '../favoritesStore';

// ---------------------------------------------------------------------------
// Arbitraries（生成器）
// ---------------------------------------------------------------------------

/** 时间档类型 */
const timeSlotArb = fc.constantFrom('dawn', 'day', 'dusk', 'night');

/**
 * 生成格式为 "{lat},{lng}-{timeSlot}" 的缓存键。
 * 纬度范围 [-90, 90]，经度范围 [-180, 180]，精度 0.01°。
 */
const cacheKeyArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    timeSlotArb,
  )
  .map(([lat, lng, slot]) => {
    const roundedLat = (Math.round(lat * 100) / 100).toFixed(2);
    const roundedLng = (Math.round(lng * 100) / 100).toFixed(2);
    return `${roundedLat},${roundedLng}-${slot}`;
  });

// ---------------------------------------------------------------------------
// Property 10: 收藏列表添加/移除往返
// ---------------------------------------------------------------------------

describe('Property 10: 收藏列表添加/移除往返', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * **Validates: Requirements 11.2, 11.3, 11.5**
   *
   * 对于任意声景缓存键，添加到收藏列表后查询该键返回 true；
   * 移除后查询返回 false。
   */
  test('添加后查询返回 true，移除后查询返回 false', () => {
    fc.assert(
      fc.property(cacheKeyArb, (key: string) => {
        // 确保每次迭代从干净状态开始
        localStorage.clear();

        // 添加到收藏
        addFavorite(key);

        // 查询应返回 true
        expect(isFavorite(key)).toBe(true);

        // 移除收藏
        removeFavorite(key);

        // 查询应返回 false
        expect(isFavorite(key)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: 收藏列表去重幂等性
// ---------------------------------------------------------------------------

describe('Property 11: 收藏列表去重幂等性', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * 对于任意声景缓存键和随机重复次数 N（1-10），
   * 将同一键添加 N 次后，收藏列表中该键仅出现 1 次。
   */
  test('同一键添加 N 次后仅出现 1 次', () => {
    fc.assert(
      fc.property(
        cacheKeyArb,
        fc.integer({ min: 1, max: 10 }),
        (key: string, repeatCount: number) => {
          // 确保每次迭代从干净状态开始
          localStorage.clear();

          // 将同一键添加 N 次
          for (let i = 0; i < repeatCount; i++) {
            addFavorite(key);
          }

          // 加载收藏列表
          const favorites = loadFavorites();

          // 该键在列表中仅出现 1 次
          const occurrences = favorites.filter((k) => k === key).length;
          expect(occurrences).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
