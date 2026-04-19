/**
 * LocationContext 类型定义
 *
 * 定义 Geocoding Engine 的核心数据结构，包括所有枚举类型、
 * 主接口 LocationContext、辅助类型以及序列化/反序列化函数。
 *
 * 需求覆盖: 7.1-7.11, 17.1-17.5
 */

// 重新导出已有的 TimeSlot 类型
export { type TimeSlot } from '@/utils/timeSlot';

// === 枚举类型 ===

/** 区域类型 — 描述位置的城市化程度和特殊地理分类 */
export type RegionType =
  | 'city_center'
  | 'city_suburb'
  | 'town'
  | 'village'
  | 'rural'
  | 'wilderness'
  | 'ocean'
  | 'polar';

/** 地形类型 — 描述位置的自然地形特征 */
export type TerrainType =
  | 'mountain'
  | 'plain'
  | 'coast'
  | 'desert'
  | 'forest'
  | 'tundra'
  | 'jungle'
  | 'river'
  | 'lake';

/** 气候类型 — 描述位置的气候带 */
export type ClimateType =
  | 'tropical'
  | 'temperate'
  | 'subarctic'
  | 'arid'
  | 'mediterranean';

/** 水体类型 — 描述位置附近的水体特征 */
export type WaterType = 'sea' | 'river' | 'lake' | 'canal';

// === 主接口 ===

/** 位置语境 — Geocoding Engine 的核心输出数据结构，包含全部 17 个推断字段 */
export interface LocationContext {
  // 基础地理
  /** 城市/位置名称 */
  cityName: string;
  /** 国家名称 */
  countryName: string;
  /** 区域类型 */
  regionType: RegionType;
  /** 坐标 [纬度, 经度] */
  coordinates: [number, number];

  // 语言
  /** 主要语言，ISO 639-1 编码，如 "fr" */
  primaryLanguage: string;
  /** 语言变体，BCP 47 标签，如 "fr-FR" */
  languageVariant: string;
  /** 其他可能听到的语言 */
  secondaryLanguages: string[];

  // 时间
  /** 时区，IANA 格式或 "UTC±N" */
  timezone: string;
  /** 当地当前小时，0-23.999...，支持分钟精度小数小时 */
  currentLocalHour: number;
  /** 时间档 */
  timeSlot: import('@/utils/timeSlot').TimeSlot;

  // 文化推断
  /** 文化区域，如 "western_europe" */
  cultureRegion: string;
  /** 主要宗教，如 "christianity" */
  dominantReligion: string;
  /** 城市密度，0-1 */
  urbanDensity: number;

  // 地理特征
  /** 地形类型 */
  terrain: TerrainType;
  /** 附近水体类型，无水体时为 null */
  nearWater: WaterType | null;
  /** 气候类型 */
  climate: ClimateType;

  // 经济水平
  /** 经济水平，0-1 */
  economicLevel: number;
}

// === 辅助类型 ===

/** 语言信息 — 从国家推断的语言相关字段 */
export interface LanguageInfo {
  primaryLanguage: string;
  languageVariant: string;
  secondaryLanguages: string[];
}

/** 文化信息 — 从国家推断的文化相关字段 */
export interface CultureInfo {
  cultureRegion: string;
  dominantReligion: string;
}

/** 时区信息 — 从国家/坐标计算的时间相关字段 */
export interface TimezoneInfo {
  timezone: string;
  currentLocalHour: number;
  timeSlot: import('@/utils/timeSlot').TimeSlot;
}

// === 验证常量 ===

/** 所有有效的 RegionType 值 */
const VALID_REGION_TYPES: readonly RegionType[] = [
  'city_center',
  'city_suburb',
  'town',
  'village',
  'rural',
  'wilderness',
  'ocean',
  'polar',
] as const;

/** 所有有效的 TerrainType 值 */
const VALID_TERRAIN_TYPES: readonly TerrainType[] = [
  'mountain',
  'plain',
  'coast',
  'desert',
  'forest',
  'tundra',
  'jungle',
  'river',
  'lake',
] as const;

/** 所有有效的 ClimateType 值 */
const VALID_CLIMATE_TYPES: readonly ClimateType[] = [
  'tropical',
  'temperate',
  'subarctic',
  'arid',
  'mediterranean',
] as const;

/** 所有有效的 WaterType 值 */
const VALID_WATER_TYPES: readonly WaterType[] = [
  'sea',
  'river',
  'lake',
  'canal',
] as const;

/** 所有有效的 TimeSlot 值 */
const VALID_TIME_SLOTS: readonly string[] = [
  'dawn',
  'day',
  'dusk',
  'night',
] as const;

// === 序列化函数 ===

/**
 * 将 LocationContext 序列化为 JSON 字符串
 *
 * 使用 JSON.stringify 进行序列化，保留所有数值精度。
 * 注意：JavaScript 的 JSON.stringify 会将 -0 转换为 0，
 * 这是 JSON 规范的标准行为。
 *
 * @param ctx - 要序列化的 LocationContext 对象
 * @returns JSON 字符串
 */
export function serializeLocationContext(ctx: LocationContext): string {
  // 创建副本以避免修改原对象
  const normalized = {
    ...ctx,
    // 规范化 -0 为 0（JSON 标准行为）
    coordinates: [
      Object.is(ctx.coordinates[0], -0) ? 0 : ctx.coordinates[0],
      Object.is(ctx.coordinates[1], -0) ? 0 : ctx.coordinates[1],
    ] as [number, number],
    urbanDensity: Object.is(ctx.urbanDensity, -0) ? 0 : ctx.urbanDensity,
    economicLevel: Object.is(ctx.economicLevel, -0) ? 0 : ctx.economicLevel,
  };
  return JSON.stringify(normalized);
}

/**
 * 将 JSON 字符串解析为 LocationContext 对象
 *
 * 使用 JSON.parse 解析后进行完整的类型验证，
 * 确保所有字段存在且类型正确。无效输入返回 null。
 *
 * @param json - 要解析的 JSON 字符串
 * @returns 解析后的 LocationContext 对象，无效输入返回 null
 */
export function parseLocationContext(json: string): LocationContext | null {
  try {
    const parsed: unknown = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const obj = parsed as Record<string, unknown>;

    // 验证基础地理字段
    if (typeof obj.cityName !== 'string') return null;
    if (typeof obj.countryName !== 'string') return null;
    if (
      typeof obj.regionType !== 'string' ||
      !VALID_REGION_TYPES.includes(obj.regionType as RegionType)
    ) {
      return null;
    }
    if (
      !Array.isArray(obj.coordinates) ||
      obj.coordinates.length !== 2 ||
      typeof obj.coordinates[0] !== 'number' ||
      typeof obj.coordinates[1] !== 'number'
    ) {
      return null;
    }

    // 验证语言字段
    if (typeof obj.primaryLanguage !== 'string') return null;
    if (typeof obj.languageVariant !== 'string') return null;
    if (
      !Array.isArray(obj.secondaryLanguages) ||
      !obj.secondaryLanguages.every((lang: unknown) => typeof lang === 'string')
    ) {
      return null;
    }

    // 验证时间字段
    if (typeof obj.timezone !== 'string') return null;
    if (
      typeof obj.currentLocalHour !== 'number' ||
      obj.currentLocalHour < 0 ||
      obj.currentLocalHour >= 24
    ) {
      return null;
    }
    if (
      typeof obj.timeSlot !== 'string' ||
      !VALID_TIME_SLOTS.includes(obj.timeSlot)
    ) {
      return null;
    }

    // 验证文化推断字段
    if (typeof obj.cultureRegion !== 'string') return null;
    if (typeof obj.dominantReligion !== 'string') return null;
    if (
      typeof obj.urbanDensity !== 'number' ||
      obj.urbanDensity < 0 ||
      obj.urbanDensity > 1
    ) {
      return null;
    }

    // 验证地理特征字段
    if (
      typeof obj.terrain !== 'string' ||
      !VALID_TERRAIN_TYPES.includes(obj.terrain as TerrainType)
    ) {
      return null;
    }
    if (
      obj.nearWater !== null &&
      (typeof obj.nearWater !== 'string' ||
        !VALID_WATER_TYPES.includes(obj.nearWater as WaterType))
    ) {
      return null;
    }
    if (
      typeof obj.climate !== 'string' ||
      !VALID_CLIMATE_TYPES.includes(obj.climate as ClimateType)
    ) {
      return null;
    }

    // 验证经济水平字段
    if (
      typeof obj.economicLevel !== 'number' ||
      obj.economicLevel < 0 ||
      obj.economicLevel > 1
    ) {
      return null;
    }

    return obj as unknown as LocationContext;
  } catch {
    return null;
  }
}
