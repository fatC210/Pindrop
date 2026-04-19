/**
 * 缓存键生成模块 — 主入口
 *
 * 本模块是项目中生成声景缓存键的唯一公共入口。
 * 外部调用方应始终通过本模块的 `generateCacheKey(lat, lng, hour)` 或
 * `generateCacheKeyNow(lat, lng)` 生成缓存键，而非直接使用 `timeSlot.ts` 中的同名函数。
 *
 * `timeSlot.ts` 中的 `generateCacheKey(lat, lng, timeSlot)` 仅供内部使用
 * （如属性测试中验证坐标+时间档→缓存键的映射关系）。
 *
 * 缓存键格式：`"{lat},{lng}-{timeSlot}"`
 * - 坐标四舍五入到 0.01° 精度（小数点后 2 位）
 * - 始终输出 2 位小数（例如 `"0.00,0.00-day"`）
 * - 负数坐标保留负号（例如 `"-33.87,151.21-night"`）
 * - 时间档映射：dawn（5-8）、day（9-16）、dusk（17-19）、night（20-4）
 *
 * @module cacheKey
 * @see {@link ../timeSlot.ts} 时间档映射与内部缓存键生成
 * @see {@link ../coordinates.ts} 坐标四舍五入工具
 */

import { roundCoordinates } from './coordinates';
import { getTimeSlot } from './timeSlot';

/**
 * 根据坐标和小时数生成声景缓存键。
 *
 * 这是项目中生成缓存键的主要入口函数。内部流程：
 * 1. 调用 `roundCoordinates(lat, lng)` 将坐标四舍五入到 0.01° 精度
 * 2. 调用 `getTimeSlot(hour)` 将小时数映射为时间档（dawn/day/dusk/night）
 * 3. 拼接为 `"{roundedLat},{roundedLng}-{timeSlot}"` 格式
 *
 * @param lat - 纬度值（-90 到 90）
 * @param lng - 经度值（-180 到 180）
 * @param hour - 24 小时制的小时数（0-23）
 * @returns 格式为 `"{lat},{lng}-{timeSlot}"` 的缓存键字符串
 *
 * @example
 * // 巴黎坐标，清晨 7 点
 * generateCacheKey(48.8566, 2.3522, 7); // "48.86,2.35-dawn"
 *
 * @example
 * // 负数坐标，夜间 22 点
 * generateCacheKey(-33.8688, 151.2093, 22); // "-33.87,151.21-night"
 *
 * @example
 * // 零坐标，白天 12 点
 * generateCacheKey(0, 0, 12); // "0.00,0.00-day"
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */
export function generateCacheKey(
  lat: number,
  lng: number,
  hour: number
): string {
  const [roundedLat, roundedLng] = roundCoordinates(lat, lng);
  const timeSlot = getTimeSlot(hour);

  return `${roundedLat.toFixed(2)},${roundedLng.toFixed(2)}-${timeSlot}`;
}

/**
 * 使用当前时间生成声景缓存键。
 *
 * 便捷函数，内部获取当前小时数后调用 `generateCacheKey`。
 *
 * @param lat - 纬度值（-90 到 90）
 * @param lng - 经度值（-180 到 180）
 * @returns 格式为 `"{lat},{lng}-{timeSlot}"` 的缓存键字符串
 *
 * @example
 * // 根据当前时间自动确定时间档
 * generateCacheKeyNow(48.8566, 2.3522); // 例如 "48.86,2.35-day"（取决于当前时间）
 *
 * Validates: Requirements 2.1, 2.2, 2.7
 */
export function generateCacheKeyNow(lat: number, lng: number): string {
  const now = new Date();
  const hour = now.getHours();
  return generateCacheKey(lat, lng, hour);
}
