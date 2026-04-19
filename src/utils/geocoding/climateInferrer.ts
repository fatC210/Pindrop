/**
 * Climate Inferrer
 *
 * 根据纬度和地理区域推断气候类型。
 * 按优先级推断：亚寒带 → 地中海 → 干旱 → 热带 → 默认温带。
 *
 * 需求覆盖: 12.1-12.5
 */

import type { ClimateType } from '@/types/locationContext';

/**
 * 地中海气候区域定义
 * 包含主要地中海气候区的坐标范围
 */
interface MediterraneanRegion {
  name: string;
  latRange: [number, number];
  lngRange: [number, number];
}

const MEDITERRANEAN_REGIONS: MediterraneanRegion[] = [
  {
    name: 'Mediterranean Basin',
    latRange: [30, 45],
    lngRange: [-10, 40],
  },
  {
    name: 'California',
    latRange: [32, 42],
    lngRange: [-125, -115],
  },
  {
    name: 'Central Chile',
    latRange: [-40, -30],
    lngRange: [-75, -70],
  },
  {
    name: 'South Africa Cape',
    latRange: [-35, -31],
    lngRange: [17, 26],
  },
  {
    name: 'SW Australia',
    latRange: [-37, -30],
    lngRange: [114, 120],
  },
];

/**
 * 干旱区域定义（与 terrainInferrer 中的沙漠区域一致）
 */
interface AridRegion {
  name: string;
  latRange: [number, number];
  lngRange: [number, number];
}

const ARID_REGIONS: AridRegion[] = [
  { name: 'Sahara', latRange: [15, 35], lngRange: [-17, 40] },
  { name: 'Arabian', latRange: [12, 32], lngRange: [35, 60] },
  { name: 'Gobi', latRange: [37, 50], lngRange: [90, 115] },
  { name: 'Kalahari', latRange: [-28, -18], lngRange: [17, 27] },
  { name: 'Atacama', latRange: [-30, -18], lngRange: [-72, -68] },
  { name: 'Sonoran', latRange: [25, 35], lngRange: [-115, -108] },
  // 额外的干旱区域
  { name: 'Great Basin', latRange: [35, 42], lngRange: [-120, -110] },
  { name: 'Patagonian', latRange: [-50, -40], lngRange: [-72, -65] },
  { name: 'Great Victoria', latRange: [-32, -24], lngRange: [125, 135] },
];

/**
 * 检查坐标是否在地中海气候区域内
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否在地中海气候区
 */
function isInMediterraneanRegion(lat: number, lng: number): boolean {
  return MEDITERRANEAN_REGIONS.some((region) => {
    const [minLat, maxLat] = region.latRange;
    const [minLng, maxLng] = region.lngRange;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

/**
 * 检查坐标是否在干旱区域内
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 是否在干旱区域
 */
function isInAridRegion(lat: number, lng: number): boolean {
  return ARID_REGIONS.some((region) => {
    const [minLat, maxLat] = region.latRange;
    const [minLng, maxLng] = region.lngRange;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  });
}

/**
 * 推断气候类型
 *
 * 按优先级推断：
 * 1. |lat| ≥ 55 → subarctic
 * 2. 坐标在地中海气候区 → mediterranean
 * 3. 坐标在已知干旱区域且 23.5 ≤ |lat| < 35 → arid
 * 4. |lat| < 23.5 → tropical
 * 5. 默认 → temperate
 *
 * 需求覆盖: 12.1-12.5
 *
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 气候类型
 */
export function inferClimate(lat: number, lng: number): ClimateType {
  const absLat = Math.abs(lat);

  // 优先级 1: 亚寒带（高纬度）
  if (absLat >= 55) {
    return 'subarctic';
  }

  // 优先级 2: 地中海气候
  if (isInMediterraneanRegion(lat, lng)) {
    return 'mediterranean';
  }

  // 优先级 3: 干旱气候（已知干旱区域）
  if (isInAridRegion(lat, lng)) {
    return 'arid';
  }

  // 优先级 4: 热带气候（低纬度）
  if (absLat < 23.5) {
    return 'tropical';
  }

  // 默认: 温带气候
  return 'temperate';
}
