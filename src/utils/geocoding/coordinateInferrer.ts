/**
 * Coordinate Inferrer
 *
 * 三级降级推断：极地 → 海洋 → 荒野。
 * 当 Nominatim 无结果时，根据坐标特征构建 LocationContext。
 *
 * 需求覆盖: 4.1-4.6, 5.1-5.7, 6.1-6.5
 */

import type { LocationContext } from '@/types/locationContext';
import { calculateTimezone } from './timezoneCalculator';
import { inferClimate } from './climateInferrer';

/**
 * 极地检测：|lat| > 66.5
 *
 * 66.5° 是北极圈/南极圈的近似纬度。
 *
 * 需求覆盖: 5.1
 *
 * @param lat - 纬度值
 * @returns 是否为极地
 */
export function isPolar(lat: number): boolean {
  return Math.abs(lat) > 66.5;
}

/**
 * 海洋检测：无 Nominatim 结果且非极地
 *
 * 使用简化的海洋区域启发式判断。
 *
 * 需求覆盖: 4.1
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否为海洋
 */
export function isOcean(lat: number, lng: number): boolean {
  // 极地区域优先级更高，不归类为海洋
  if (isPolar(lat)) {
    return false;
  }

  // 简化的海洋检测启发式
  // 太平洋（大面积）
  if (lng > 120 || lng < -120) {
    if (Math.abs(lat) < 60) {
      return true;
    }
  }

  // 大西洋
  if (lng > -60 && lng < -10 && Math.abs(lat) < 50) {
    return true;
  }

  // 印度洋
  if (lng > 40 && lng < 100 && lat < 20 && lat > -40) {
    return true;
  }

  return false;
}

/**
 * 构建极地 LocationContext
 *
 * 极地特征：
 * - cityName: "Arctic" 或 "Antarctic"
 * - regionType: "polar"
 * - climate: "subarctic"
 * - terrain: "tundra"
 * - urbanDensity: 0
 * - economicLevel: 0
 *
 * 需求覆盖: 5.1-5.7
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 极地 LocationContext
 */
export function buildPolarContext(lat: number, lng: number): LocationContext {
  const cityName = lat > 0 ? 'Arctic' : 'Antarctic';
  const timezoneInfo = calculateTimezone(null, lat, lng);

  return {
    // 基础地理
    cityName,
    countryName: 'Polar Region',
    regionType: 'polar',
    coordinates: [lat, lng],

    // 语言
    primaryLanguage: 'en',
    languageVariant: 'en-US',
    secondaryLanguages: [],

    // 时间
    timezone: timezoneInfo.timezone,
    currentLocalHour: timezoneInfo.currentLocalHour,
    timeSlot: timezoneInfo.timeSlot,

    // 文化推断
    cultureRegion: 'unknown',
    dominantReligion: 'none',
    urbanDensity: 0,

    // 地理特征
    terrain: 'tundra',
    nearWater: null,
    climate: 'subarctic',

    // 经济水平
    economicLevel: 0,
  };
}

/**
 * 构建海洋 LocationContext
 *
 * 海洋特征：
 * - cityName: "Ocean"
 * - regionType: "ocean"
 * - terrain: "coast"
 * - nearWater: "sea"
 * - climate: "temperate"
 * - urbanDensity: 0
 * - economicLevel: 0
 *
 * 需求覆盖: 4.1-4.6
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 海洋 LocationContext
 */
export function buildOceanContext(lat: number, lng: number): LocationContext {
  const timezoneInfo = calculateTimezone(null, lat, lng);

  return {
    // 基础地理
    cityName: 'Ocean',
    countryName: 'International Waters',
    regionType: 'ocean',
    coordinates: [lat, lng],

    // 语言
    primaryLanguage: 'en',
    languageVariant: 'en-US',
    secondaryLanguages: [],

    // 时间
    timezone: timezoneInfo.timezone,
    currentLocalHour: timezoneInfo.currentLocalHour,
    timeSlot: timezoneInfo.timeSlot,

    // 文化推断
    cultureRegion: 'unknown',
    dominantReligion: 'none',
    urbanDensity: 0,

    // 地理特征
    terrain: 'coast',
    nearWater: 'sea',
    climate: 'temperate',

    // 经济水平
    economicLevel: 0,
  };
}

/**
 * 构建荒野 LocationContext
 *
 * 荒野特征：
 * - cityName: "Location at {lat}°, {lng}°"
 * - regionType: "wilderness"
 * - climate: 基于纬度推断
 * - terrain: "plain"（默认）
 * - urbanDensity: 0
 * - economicLevel: 0
 *
 * 需求覆盖: 6.1-6.5
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 荒野 LocationContext
 */
export function buildWildernessContext(
  lat: number,
  lng: number
): LocationContext {
  const cityName = `Location at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
  const timezoneInfo = calculateTimezone(null, lat, lng);
  const climate = inferClimate(lat, lng);

  return {
    // 基础地理
    cityName,
    countryName: 'Unknown',
    regionType: 'wilderness',
    coordinates: [lat, lng],

    // 语言
    primaryLanguage: 'en',
    languageVariant: 'en-US',
    secondaryLanguages: [],

    // 时间
    timezone: timezoneInfo.timezone,
    currentLocalHour: timezoneInfo.currentLocalHour,
    timeSlot: timezoneInfo.timeSlot,

    // 文化推断
    cultureRegion: 'unknown',
    dominantReligion: 'none',
    urbanDensity: 0,

    // 地理特征
    terrain: 'plain',
    nearWater: null,
    climate,

    // 经济水平
    economicLevel: 0,
  };
}

/**
 * 三级降级推断入口
 *
 * 降级优先级：
 * 1. 极地检测（|lat| > 66.5）
 * 2. 海洋检测（启发式判断）
 * 3. 荒野兜底
 *
 * 需求覆盖: 4.1-4.6, 5.1-5.7, 6.1-6.5
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 推断的 LocationContext
 */
export function inferFromCoordinates(
  lat: number,
  lng: number
): LocationContext {
  // 优先级 1: 极地检测
  if (isPolar(lat)) {
    return buildPolarContext(lat, lng);
  }

  // 优先级 2: 海洋检测
  if (isOcean(lat, lng)) {
    return buildOceanContext(lat, lng);
  }

  // 优先级 3: 荒野兜底
  return buildWildernessContext(lat, lng);
}
