/**
 * 缓存管理工具函数。
 * 提供缓存大小计算、统计格式化、统计查询和缓存清除功能。
 *
 * @module cacheUtils
 */

import type { CacheStatistics } from './types';

import { getDB, isIndexedDBAvailable } from '@/utils/db';

/**
 * 计算 blob 大小数组的总大小（MB）。
 *
 * 将所有字节值求和，然后除以 (1024 * 1024) 转换为 MB，
 * 结果四舍五入到小数点后两位。始终返回非负数。
 *
 * @param blobSizes - 以字节为单位的大小数组
 * @returns 总大小（MB），四舍五入到两位小数
 *
 * @example
 * ```ts
 * calculateTotalSizeMB([1048576, 524288]);
 * // => 1.5
 *
 * calculateTotalSizeMB([]);
 * // => 0
 * ```
 *
 * Validates: Requirements 8.2
 */
export function calculateTotalSizeMB(blobSizes: number[]): number {
  const totalBytes = blobSizes.reduce((sum, size) => sum + size, 0);
  const totalMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  return Math.max(0, totalMB);
}

/**
 * 将缓存统计信息格式化为可读字符串。
 *
 * 返回格式为 "{count} soundscapes · {size} MB" 的字符串。
 * 当传入 null 或 undefined 时，返回 "Cache unavailable"。
 *
 * @param stats - 缓存统计对象，可以为 null 或 undefined
 * @returns 格式化的统计字符串
 *
 * @example
 * ```ts
 * formatCacheStats({ soundscapeCount: 5, totalSizeMB: 12.34, geocodeCount: 10, historyCount: 3 });
 * // => "5 soundscapes · 12.34 MB"
 *
 * formatCacheStats(null);
 * // => "Cache unavailable"
 * ```
 *
 * Validates: Requirements 8.3
 */
export function formatCacheStats(
  stats: CacheStatistics | null | undefined,
  formatter: CacheStatsFormatter
): string {
  if (stats == null) {
    return formatter.unavailable;
  }

  return formatter.formatSummary(stats.soundscapeCount, stats.totalSizeMB);
}

/**
 * 从 IndexedDB 查询并计算缓存统计信息。
 *
 * 查询 soundscape_cache、geocode_cache 和 location_history 三个 object store，
 * 统计各自的条目数量，并使用 calculateTotalSizeMB 计算音频缓存总大小。
 *
 * @returns 包含所有缓存统计信息的 CacheStatistics 对象
 * @throws 当 IndexedDB 不可用或查询失败时抛出错误
 *
 * @example
 * ```ts
 * const stats = await calculateCacheStatistics();
 * console.log(stats.soundscapeCount); // 缓存的音景数量
 * console.log(stats.totalSizeMB);     // 总大小（MB）
 * ```
 *
 * Validates: Requirements 8.1, 8.2, 8.5
 */
export async function calculateCacheStatistics(): Promise<CacheStatistics> {
  if (!isIndexedDBAvailable()) {
    console.error('[PinDrop Error] INDEXEDDB_UNAVAILABLE: IndexedDB is not available');
    throw new Error('IndexedDB is not available');
  }

  try {
    const db = await getDB();

    // 查询 soundscape_cache 中的所有条目
    const soundscapes = await db.getAll('soundscape_cache');
    const soundscapeCount = soundscapes.length;

    // 提取所有 sizeBytes 并计算总大小
    const blobSizes = soundscapes.map((entry) => entry.sizeBytes || 0);
    const totalSizeMB = calculateTotalSizeMB(blobSizes);

    // 统计 geocode_cache 条目数
    const geocodeCount = await db.count('geocode_cache');

    // 统计 location_history 条目数
    const historyCount = await db.count('location_history');

    return {
      soundscapeCount,
      totalSizeMB,
      geocodeCount,
      historyCount,
    };
  } catch (error) {
    console.error('[PinDrop Error] CACHE_STATS_LOAD_FAILED: Failed to load cache statistics', error);
    throw error;
  }
}

/**
 * 清除所有 IndexedDB 缓存数据。
 *
 * 依次清除 soundscape_cache、geocode_cache 和 location_history 三个 object store。
 * 如果 IndexedDB 不可用或清除过程中发生错误，会记录错误日志并抛出异常。
 *
 * @throws 当 IndexedDB 不可用或清除失败时抛出错误
 *
 * @example
 * ```ts
 * await clearAllCaches();
 * // 所有缓存已清除
 * ```
 *
 * Validates: Requirements 9.2, 9.3, 9.4, 9.5
 */
export async function clearAllCaches(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    console.error('[PinDrop Error] INDEXEDDB_UNAVAILABLE: IndexedDB is not available');
    throw new Error('IndexedDB is not available');
  }

  try {
    const db = await getDB();

    // 清除 soundscape_cache
    await db.clear('soundscape_cache');

    // 清除 geocode_cache
    await db.clear('geocode_cache');

    // 清除 location_history
    await db.clear('location_history');
  } catch (error) {
    console.error('[PinDrop Error] CACHE_CLEAR_FAILED: Failed to clear caches', error);
    throw error;
  }
}
export interface CacheStatsFormatter {
  unavailable: string;
  formatSummary: (count: number, totalSizeMB: number) => string;
}
