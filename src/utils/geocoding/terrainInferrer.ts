/**
 * Terrain Inferrer
 *
 * 根据地理位置和区域特征推断地形类型和附近水体。
 * 按优先级推断：沙漠区域 → 热带丛林 → 冻原 → 海岸线 → 默认平原。
 *
 * 需求覆盖: 11.1-11.6
 */

import type { TerrainType, WaterType } from '@/types/locationContext';
import type { NominatimResponse } from '@/utils/nominatim';

/**
 * 地形推断结果
 */
export interface TerrainResult {
  terrain: TerrainType;
  nearWater: WaterType | null;
}

/**
 * 沙漠区域定义
 * 包含主要沙漠的坐标范围
 */
interface DesertRegion {
  name: string;
  latRange: [number, number];
  lngRange: [number, number];
}

const DESERT_REGIONS: DesertRegion[] = [
  { name: 'Sahara', latRange: [15, 35], lngRange: [-17, 40] },
  { name: 'Arabian', latRange: [12, 32], lngRange: [35, 60] },
  { name: 'Gobi', latRange: [37, 50], lngRange: [90, 115] },
  { name: 'Kalahari', latRange: [-28, -18], lngRange: [17, 27] },
  { name: 'Atacama', latRange: [-30, -18], lngRange: [-72, -68] },
  { name: 'Sonoran', latRange: [25, 35], lngRange: [-115, -108] },
];

/**
 * 检查坐标是否在已知沙漠区域内
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否在沙漠区域
 */
function isInDesertRegion(lat: number, lng: number): boolean {
  return DESERT_REGIONS.some((region) => {
    const [minLat, maxLat] = region.latRange;
    const [minLng, maxLng] = region.lngRange;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

/**
 * 检查坐标是否在热带丛林区域
 *
 * 热带丛林：|lat| < 15 且高降水可能性区域
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否在热带丛林区域
 */
function isInTropicalJungle(lat: number, lng: number): boolean {
  const absLat = Math.abs(lat);
  
  // 纬度必须在热带范围内
  if (absLat >= 15) {
    return false;
  }

  // 排除已知干旱区域
  if (isInDesertRegion(lat, lng)) {
    return false;
  }

  // 热带丛林主要分布区域
  // 亚马逊流域
  if (lat >= -10 && lat <= 5 && lng >= -80 && lng <= -45) {
    return true;
  }

  // 刚果盆地
  if (lat >= -5 && lat <= 5 && lng >= 10 && lng <= 30) {
    return true;
  }

  // 东南亚
  if (lat >= -5 && lat <= 15 && lng >= 95 && lng <= 140) {
    return true;
  }

  return false;
}

/**
 * 检查 Nominatim address 是否指示海岸线位置
 *
 * @param address - Nominatim 地址对象
 * @returns 是否为海岸线
 */
function isCoastalFromAddress(
  address: NominatimResponse['address'] | null
): boolean {
  if (!address) {
    return false;
  }

  // 检查地址字段中是否包含海岸相关关键词
  const addressString = JSON.stringify(address).toLowerCase();
  const coastalKeywords = ['coast', 'beach', 'port', 'harbor', 'bay', 'shore'];

  return coastalKeywords.some((keyword) => addressString.includes(keyword));
}

/**
 * 推断地形类型和附近水体
 *
 * 按优先级推断：
 * 1. 沙漠区域 → desert
 * 2. 热带丛林 → jungle
 * 3. 冻原（|lat| ≥ 60）→ tundra
 * 4. 海岸线指示 → coast + nearWater: sea
 * 5. 默认 → plain
 *
 * 需求覆盖: 11.1-11.6
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @param address - Nominatim 地址对象，可为 null
 * @returns 地形推断结果
 */
export function inferTerrain(
  lat: number,
  lng: number,
  address: NominatimResponse['address'] | null
): TerrainResult {
  const absLat = Math.abs(lat);

  // 优先级 1: 沙漠区域
  if (isInDesertRegion(lat, lng)) {
    return {
      terrain: 'desert',
      nearWater: null,
    };
  }

  // 优先级 2: 热带丛林
  if (isInTropicalJungle(lat, lng)) {
    return {
      terrain: 'jungle',
      nearWater: null,
    };
  }

  // 优先级 3: 冻原（高纬度）
  if (absLat >= 60) {
    return {
      terrain: 'tundra',
      nearWater: null,
    };
  }

  // 优先级 4: 海岸线
  if (isCoastalFromAddress(address)) {
    return {
      terrain: 'coast',
      nearWater: 'sea',
    };
  }

  // 默认: 平原
  return {
    terrain: 'plain',
    nearWater: null,
  };
}
