/**
 * 区域类型分类器
 *
 * 根据 Nominatim 返回的 address 字段推断区域类型（RegionType）和城市密度（urbanDensity）。
 * 分类逻辑按优先级从高到低：
 *   1. city + suburb → city_suburb (0.6)
 *   2. city（无 suburb）→ city_center (0.9)
 *   3. town → town (0.3)
 *   4. village 或 hamlet → village (0.15)
 *   5. 仅 county/state → rural (0.05)
 *
 * 当 address 为空/undefined 或无匹配字段时，默认返回 rural (0.05)。
 *
 * 需求覆盖: 9.1-9.6
 */

import type { RegionType } from '@/types/locationContext';
import type { NominatimResponse } from '@/utils/nominatim';

/** 区域分类结果 — 包含区域类型和城市密度 */
export interface RegionClassification {
  regionType: RegionType;
  urbanDensity: number;
}

/**
 * 根据 Nominatim address 推断区域类型和城市密度
 *
 * @param address - Nominatim 响应中的 address 对象
 * @returns 区域分类结果，包含 regionType 和 urbanDensity
 */
export function classifyRegion(
  address: NominatimResponse['address']
): RegionClassification {
  // 空地址或 undefined 时返回默认值
  if (!address) {
    return { regionType: 'rural', urbanDensity: 0.05 };
  }

  // 优先级 1：city + suburb → city_suburb
  if (address.city && address.suburb) {
    return { regionType: 'city_suburb', urbanDensity: 0.6 };
  }

  // 优先级 2：city（无 suburb）→ city_center
  if (address.city) {
    return { regionType: 'city_center', urbanDensity: 0.9 };
  }

  // 优先级 3：town → town
  if (address.town) {
    return { regionType: 'town', urbanDensity: 0.3 };
  }

  // 优先级 4：village 或 hamlet → village
  if (address.village || address.hamlet) {
    return { regionType: 'village', urbanDensity: 0.15 };
  }

  // 优先级 5：仅 county/state → rural
  if (address.county || address.state) {
    return { regionType: 'rural', urbanDensity: 0.05 };
  }

  // 无匹配字段时返回默认值
  return { regionType: 'rural', urbanDensity: 0.05 };
}
