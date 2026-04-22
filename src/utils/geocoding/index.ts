/**
 * Geocoding Engine Module Exports
 *
 * 导出所有推断器函数和 GeocodingEngine 协调器。
 *
 * 需求覆盖: 15.1
 */

// 推断器集群
export { classifyRegion } from './regionClassifier';
export type { RegionClassification } from './regionClassifier';

export { getLanguageInfo } from './languageMapper';

export { calculateTimezone } from './timezoneCalculator';

export { inferTerrain } from './terrainInferrer';
export type { TerrainResult } from './terrainInferrer';

export { inferClimate } from './climateInferrer';

export { inferCulture } from './cultureInferrer';

export { inferEconomicLevel } from './economyInferrer';

export { inferLocalScene } from './localSceneInferrer';
export type { SceneInference } from './localSceneInferrer';

// CoordinateInferrer
export {
  inferFromCoordinates,
  isPolar,
  isOcean,
  buildPolarContext,
  buildOceanContext,
  buildWildernessContext,
} from './coordinateInferrer';

// GeocodingEngine 协调器
export { resolveLocation, buildLocationContext } from './geocodingEngine';
