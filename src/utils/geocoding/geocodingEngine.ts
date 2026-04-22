/**
 * Geocoding Engine — 反向地理编码与语境推断协调器
 *
 * 顶层协调器，编排 cache → Nominatim → infer → build 的完整流程。
 * 确保任意有效坐标都能产出完整的 LocationContext。
 *
 * 需求覆盖: 15.1-15.7, 16.1-16.6
 */

import type { LocationContext } from '@/types/locationContext';
import type { NominatimResponse } from '@/utils/nominatim';
import { reverseGeocode } from '@/utils/nominatim';
import {
  getCachedLocationContext,
  cacheLocationContext,
} from '@/utils/geocodeCache';
import { extractPlaceHierarchy } from '@/utils/placeHierarchy';
import { classifyRegion } from './regionClassifier';
import { getLanguageInfo } from './languageMapper';
import { calculateTimezone } from './timezoneCalculator';
import { inferTerrain } from './terrainInferrer';
import { inferClimate } from './climateInferrer';
import { inferCulture } from './cultureInferrer';
import { inferEconomicLevel } from './economyInferrer';
import { inferFromCoordinates } from './coordinateInferrer';
import { inferLocalScene } from './localSceneInferrer';

/**
 * 验证坐标有效性
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 坐标是否有效
 */
function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * 从 Nominatim 响应构建完整 LocationContext
 *
 * 依次调用所有推断器，任何单个推断步骤失败时使用默认值继续构建。
 *
 * 需求覆盖: 15.3, 15.7
 *
 * @param response - Nominatim API 响应
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 完整的 LocationContext
 */
export function buildLocationContext(
  response: NominatimResponse,
  lat: number,
  lng: number
): LocationContext {
  const address = response.address || {};
  const placeHierarchy = extractPlaceHierarchy(address, {
    unknownLocationLabel: 'Unknown Location',
    unknownCountryLabel: 'Unknown',
  });

  // 推断器集群调用（带错误处理）
  let regionClassification;
  try {
    regionClassification = classifyRegion(address);
  } catch (error) {
    console.error('[PinDrop Error] RegionClassifier:', error);
    regionClassification = { regionType: 'rural' as const, urbanDensity: 0.05 };
  }

  let languageInfo;
  try {
    languageInfo = getLanguageInfo(placeHierarchy.countryName);
  } catch (error) {
    console.error('[PinDrop Error] LanguageMapper:', error);
    languageInfo = {
      primaryLanguage: 'en',
      languageVariant: 'en-US',
      secondaryLanguages: [],
    };
  }

  let timezoneInfo;
  try {
    timezoneInfo = calculateTimezone(placeHierarchy.countryName, lat, lng);
  } catch (error) {
    console.error('[PinDrop Error] TimezoneCalculator:', error);
    const now = new Date();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    timezoneInfo = {
      timezone: 'UTC+0',
      currentLocalHour: utcHour,
      timeSlot: 'day' as const,
    };
  }

  let terrainResult;
  try {
    terrainResult = inferTerrain(lat, lng, address);
  } catch (error) {
    console.error('[PinDrop Error] TerrainInferrer:', error);
    terrainResult = { terrain: 'plain' as const, nearWater: null };
  }

  let climate;
  try {
    climate = inferClimate(lat, lng);
  } catch (error) {
    console.error('[PinDrop Error] ClimateInferrer:', error);
    climate = 'temperate' as const;
  }

  let cultureInfo;
  try {
    cultureInfo = inferCulture(placeHierarchy.countryName);
  } catch (error) {
    console.error('[PinDrop Error] CultureInferrer:', error);
    cultureInfo = { cultureRegion: 'unknown', dominantReligion: 'none' };
  }

  let economicLevel;
  try {
    economicLevel = inferEconomicLevel(placeHierarchy.countryName);
  } catch (error) {
    console.error('[PinDrop Error] EconomyInferrer:', error);
    economicLevel = 0.5;
  }

  let sceneInference;
  try {
    sceneInference = inferLocalScene(response, {
      regionType: regionClassification.regionType,
      terrain: terrainResult.terrain,
      nearWater: terrainResult.nearWater,
      urbanDensity: regionClassification.urbanDensity,
    });
  } catch (error) {
    console.error('[PinDrop Error] LocalSceneInferrer:', error);
    sceneInference = undefined;
  }

  // 构建完整 LocationContext
  return {
    // 基础地理
    administrativeRegionName: placeHierarchy.administrativeRegionName,
    cityName: placeHierarchy.cityName,
    regionName: placeHierarchy.regionName,
    countryName: placeHierarchy.countryName,
    regionType: regionClassification.regionType,
    coordinates: [lat, lng],

    // 语言
    primaryLanguage: languageInfo.primaryLanguage,
    languageVariant: languageInfo.languageVariant,
    secondaryLanguages: languageInfo.secondaryLanguages,

    // 时间
    timezone: timezoneInfo.timezone,
    currentLocalHour: timezoneInfo.currentLocalHour,
    timeSlot: timezoneInfo.timeSlot,

    // 文化推断
    cultureRegion: cultureInfo.cultureRegion,
    dominantReligion: cultureInfo.dominantReligion,
    urbanDensity: regionClassification.urbanDensity,

    // 地理特征
    terrain: terrainResult.terrain,
    nearWater: terrainResult.nearWater,
    climate,

    // 经济水平
    economicLevel,

    // 局部场景推断
    sceneType: sceneInference?.sceneType,
    sceneConfidence: sceneInference?.sceneConfidence,
    sceneTags: sceneInference?.sceneTags,
  };
}

/**
 * 解析位置坐标，返回完整 LocationContext
 *
 * 执行流程：
 * 1. 验证坐标有效性
 * 2. 检查 GeocodeCache
 * 3. 缓存未命中时调用 Nominatim API
 * 4. Nominatim 成功时构建完整 LocationContext
 * 5. Nominatim 失败时降级到坐标推断
 * 6. 缓存 Nominatim 响应（成功时）
 *
 * 需求覆盖: 15.1-15.7, 16.1-16.6
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 完整的 LocationContext
 * @throws 坐标无效时抛出错误
 */
export async function resolveLocation(
  lat: number,
  lng: number
): Promise<LocationContext> {
  // 步骤 1: 验证坐标
  if (!validateCoordinates(lat, lng)) {
    const error = `Invalid coordinates lat=${lat}, lng=${lng}`;
    console.error(`[PinDrop Error] GeocodingEngine: ${error}`);
    throw new Error(error);
  }

  // 步骤 2: 检查缓存
  try {
    const cachedContext = await getCachedLocationContext(lat, lng);
    if (cachedContext) {
      return cachedContext;
    }
  } catch (error) {
    console.error('[PinDrop Error] Failed to get cached location context:', error);
    // 继续执行，不阻塞流程
  }

  // 步骤 3: 调用 Nominatim API
  let nominatimResponse: NominatimResponse | null = null;
  try {
    nominatimResponse = await reverseGeocode(lat, lng);
  } catch (error) {
    console.error('[PinDrop Error] Nominatim request failed:', error);
    // 继续执行，降级到坐标推断
  }

  // 步骤 4: Nominatim 成功时构建 LocationContext
  if (nominatimResponse) {
    const locationContext = buildLocationContext(nominatimResponse, lat, lng);

    try {
      await cacheLocationContext(lat, lng, locationContext);
    } catch (error) {
      console.error('[PinDrop Error] Failed to cache location context:', error);
      // 继续执行，不阻塞流程
    }

    return locationContext;
  }

  // 步骤 5: Nominatim 失败时降级到坐标推断
  const inferredContext = inferFromCoordinates(lat, lng);

  // 缓存推断结果
  try {
    await cacheLocationContext(lat, lng, inferredContext);
  } catch (error) {
    console.error('[PinDrop Error] Failed to cache inferred location context:', error);
    // 继续执行，不阻塞流程
  }

  return inferredContext;
}
