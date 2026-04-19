/**
 * Economy Inferrer
 *
 * 根据国家名称推断经济水平（0-1 数值）。
 * 基于相对 GDP per capita 排名分档。
 *
 * 需求覆盖: 14.1-14.5
 */

/**
 * 国家到经济水平的映射表
 * 经济水平范围：0-1
 * - 0.8-1.0: 高收入国家
 * - 0.6-0.79: 中高收入国家
 * - 0.4-0.59: 中等收入国家
 * - 0.2-0.39: 中低收入国家
 * - 0.0-0.19: 低收入国家
 */
const COUNTRY_ECONOMY_MAP: Record<string, number> = {
  // 高收入国家 (0.8-1.0)
  Switzerland: 1.0,
  Norway: 0.98,
  Luxembourg: 0.97,
  'United States': 0.95,
  Ireland: 0.94,
  Denmark: 0.93,
  Singapore: 0.92,
  Iceland: 0.91,
  Qatar: 0.9,
  Australia: 0.89,
  Netherlands: 0.88,
  Sweden: 0.87,
  Austria: 0.86,
  Finland: 0.85,
  Germany: 0.84,
  Belgium: 0.83,
  Canada: 0.82,
  'United Kingdom': 0.81,
  Japan: 0.8,
  France: 0.8,
  'New Zealand': 0.8,
  Italy: 0.79,
  Spain: 0.78,
  'South Korea': 0.77,
  Israel: 0.76,
  'United Arab Emirates': 0.75,
  'Saudi Arabia': 0.74,
  Portugal: 0.73,
  Greece: 0.72,
  'Czech Republic': 0.71,
  Poland: 0.7,
  Hungary: 0.69,
  Croatia: 0.68,
  Chile: 0.67,
  Uruguay: 0.66,
  Argentina: 0.65,
  Russia: 0.64,
  Romania: 0.63,
  Turkey: 0.62,
  Malaysia: 0.61,
  'Costa Rica': 0.6,

  // 中高收入国家 (0.6-0.79)
  China: 0.68,
  Brazil: 0.65,
  Mexico: 0.63,
  Thailand: 0.62,
  Bulgaria: 0.61,
  Serbia: 0.6,
  Colombia: 0.59,
  Peru: 0.58,
  'South Africa': 0.57,
  Ecuador: 0.56,
  'Dominican Republic': 0.55,
  Jordan: 0.54,
  Tunisia: 0.53,
  Algeria: 0.52,
  Jamaica: 0.51,
  Paraguay: 0.5,

  // 中等收入国家 (0.4-0.59)
  Indonesia: 0.55,
  Philippines: 0.53,
  Egypt: 0.52,
  Morocco: 0.51,
  Ukraine: 0.5,
  'Sri Lanka': 0.49,
  Bolivia: 0.48,
  Vietnam: 0.47,
  India: 0.46,
  'El Salvador': 0.45,
  Guatemala: 0.44,
  Honduras: 0.43,
  Nicaragua: 0.42,
  Pakistan: 0.41,
  Bangladesh: 0.4,

  // 中低收入国家 (0.2-0.39)
  Nigeria: 0.38,
  Kenya: 0.37,
  Ghana: 0.36,
  Cambodia: 0.35,
  Myanmar: 0.34,
  Senegal: 0.33,
  Tanzania: 0.32,
  Uganda: 0.31,
  Nepal: 0.3,
  Ethiopia: 0.29,
  Mali: 0.28,
  Benin: 0.27,
  'Burkina Faso': 0.26,
  Haiti: 0.25,
  Afghanistan: 0.24,
  Yemen: 0.23,
  Madagascar: 0.22,
  Niger: 0.21,

  // 低收入国家 (0.0-0.19)
  'Central African Republic': 0.15,
  Burundi: 0.14,
  Malawi: 0.13,
  'Sierra Leone': 0.12,
  Chad: 0.11,
  'South Sudan': 0.1,
  Somalia: 0.09,
  Mozambique: 0.08,
};

/**
 * 推断经济水平
 *
 * 根据国家名称查询经济水平值。
 * 未匹配国家返回兜底值 0.5。
 *
 * 需求覆盖: 14.1-14.5
 *
 * @param countryName - 国家名称
 * @returns 经济水平值 (0-1)
 */
export function inferEconomicLevel(countryName: string): number {
  // 使用 hasOwnProperty 避免原型链污染
  if (Object.prototype.hasOwnProperty.call(COUNTRY_ECONOMY_MAP, countryName)) {
    return COUNTRY_ECONOMY_MAP[countryName];
  }

  // 兜底值：中等收入
  return 0.5;
}
