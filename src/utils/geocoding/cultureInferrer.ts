/**
 * Culture Inferrer
 *
 * 根据国家名称推断文化区域和主要宗教。
 * 覆盖主要国家的文化和宗教映射。
 *
 * 需求覆盖: 13.1-13.5
 */

import type { CultureInfo } from '@/types/locationContext';

/**
 * 国家到文化信息的映射表
 * 包含文化区域和主要宗教
 */
const COUNTRY_CULTURE_MAP: Record<string, CultureInfo> = {
  // 西欧
  France: { cultureRegion: 'western_europe', dominantReligion: 'christianity' },
  Germany: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  'United Kingdom': {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Italy: { cultureRegion: 'western_europe', dominantReligion: 'christianity' },
  Spain: { cultureRegion: 'western_europe', dominantReligion: 'christianity' },
  Portugal: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Netherlands: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Belgium: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Switzerland: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Austria: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Ireland: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Sweden: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Norway: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Denmark: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Finland: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },
  Greece: {
    cultureRegion: 'western_europe',
    dominantReligion: 'christianity',
  },

  // 东欧
  Russia: { cultureRegion: 'eastern_europe', dominantReligion: 'christianity' },
  Poland: { cultureRegion: 'eastern_europe', dominantReligion: 'christianity' },
  Ukraine: {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },
  Romania: {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },
  'Czech Republic': {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },
  Hungary: {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },
  Bulgaria: {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },
  Serbia: { cultureRegion: 'eastern_europe', dominantReligion: 'christianity' },
  Croatia: {
    cultureRegion: 'eastern_europe',
    dominantReligion: 'christianity',
  },

  // 东亚
  China: { cultureRegion: 'east_asia', dominantReligion: 'folk_religion' },
  Japan: { cultureRegion: 'east_asia', dominantReligion: 'shinto' },
  'South Korea': { cultureRegion: 'east_asia', dominantReligion: 'buddhism' },
  'North Korea': { cultureRegion: 'east_asia', dominantReligion: 'none' },
  Taiwan: { cultureRegion: 'east_asia', dominantReligion: 'folk_religion' },
  'Hong Kong': { cultureRegion: 'east_asia', dominantReligion: 'folk_religion' },
  Mongolia: { cultureRegion: 'central_asia', dominantReligion: 'buddhism' },

  // 南亚
  India: { cultureRegion: 'south_asia', dominantReligion: 'hinduism' },
  Pakistan: { cultureRegion: 'south_asia', dominantReligion: 'islam' },
  Bangladesh: { cultureRegion: 'south_asia', dominantReligion: 'islam' },
  Nepal: { cultureRegion: 'south_asia', dominantReligion: 'hinduism' },
  'Sri Lanka': { cultureRegion: 'south_asia', dominantReligion: 'buddhism' },
  Bhutan: { cultureRegion: 'south_asia', dominantReligion: 'buddhism' },
  Afghanistan: { cultureRegion: 'south_asia', dominantReligion: 'islam' },

  // 东南亚
  Thailand: { cultureRegion: 'southeast_asia', dominantReligion: 'buddhism' },
  Vietnam: { cultureRegion: 'southeast_asia', dominantReligion: 'folk_religion' },
  Indonesia: { cultureRegion: 'southeast_asia', dominantReligion: 'islam' },
  Malaysia: { cultureRegion: 'southeast_asia', dominantReligion: 'islam' },
  Singapore: { cultureRegion: 'southeast_asia', dominantReligion: 'buddhism' },
  Philippines: {
    cultureRegion: 'southeast_asia',
    dominantReligion: 'christianity',
  },
  Myanmar: { cultureRegion: 'southeast_asia', dominantReligion: 'buddhism' },
  Cambodia: { cultureRegion: 'southeast_asia', dominantReligion: 'buddhism' },
  Laos: { cultureRegion: 'southeast_asia', dominantReligion: 'buddhism' },

  // 中东
  'Saudi Arabia': { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Iran: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Iraq: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Turkey: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  'United Arab Emirates': {
    cultureRegion: 'middle_east',
    dominantReligion: 'islam',
  },
  Israel: { cultureRegion: 'middle_east', dominantReligion: 'judaism' },
  Jordan: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Lebanon: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Syria: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Yemen: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Oman: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Kuwait: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Qatar: { cultureRegion: 'middle_east', dominantReligion: 'islam' },
  Bahrain: { cultureRegion: 'middle_east', dominantReligion: 'islam' },

  // 北非
  Egypt: { cultureRegion: 'north_africa', dominantReligion: 'islam' },
  Morocco: { cultureRegion: 'north_africa', dominantReligion: 'islam' },
  Algeria: { cultureRegion: 'north_africa', dominantReligion: 'islam' },
  Tunisia: { cultureRegion: 'north_africa', dominantReligion: 'islam' },
  Libya: { cultureRegion: 'north_africa', dominantReligion: 'islam' },
  Sudan: { cultureRegion: 'north_africa', dominantReligion: 'islam' },

  // 撒哈拉以南非洲
  Nigeria: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Kenya: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Ethiopia: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  'South Africa': {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Ghana: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Tanzania: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Uganda: {
    cultureRegion: 'sub_saharan_africa',
    dominantReligion: 'christianity',
  },
  Senegal: { cultureRegion: 'sub_saharan_africa', dominantReligion: 'islam' },
  Mali: { cultureRegion: 'sub_saharan_africa', dominantReligion: 'islam' },
  Niger: { cultureRegion: 'sub_saharan_africa', dominantReligion: 'islam' },

  // 拉丁美洲
  Brazil: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Mexico: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Argentina: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Colombia: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Peru: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Venezuela: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Chile: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Ecuador: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Guatemala: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Cuba: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Bolivia: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  'Dominican Republic': {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Honduras: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Paraguay: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Nicaragua: {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  'El Salvador': {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  'Costa Rica': {
    cultureRegion: 'latin_america',
    dominantReligion: 'christianity',
  },
  Panama: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },
  Uruguay: { cultureRegion: 'latin_america', dominantReligion: 'christianity' },

  // 北美
  'United States': {
    cultureRegion: 'north_america',
    dominantReligion: 'christianity',
  },
  Canada: { cultureRegion: 'north_america', dominantReligion: 'christianity' },

  // 中亚
  Kazakhstan: { cultureRegion: 'central_asia', dominantReligion: 'islam' },
  Uzbekistan: { cultureRegion: 'central_asia', dominantReligion: 'islam' },
  Turkmenistan: { cultureRegion: 'central_asia', dominantReligion: 'islam' },
  Kyrgyzstan: { cultureRegion: 'central_asia', dominantReligion: 'islam' },
  Tajikistan: { cultureRegion: 'central_asia', dominantReligion: 'islam' },

  // 大洋洲
  Australia: { cultureRegion: 'oceania', dominantReligion: 'christianity' },
  'New Zealand': { cultureRegion: 'oceania', dominantReligion: 'christianity' },
  'Papua New Guinea': {
    cultureRegion: 'oceania',
    dominantReligion: 'christianity',
  },
  Fiji: { cultureRegion: 'oceania', dominantReligion: 'christianity' },
};

/**
 * 推断文化信息
 *
 * 根据国家名称查询文化区域和主要宗教。
 * 未匹配国家返回兜底值。
 *
 * 需求覆盖: 13.1-13.5
 *
 * @param countryName - 国家名称
 * @returns 文化信息对象
 */
export function inferCulture(countryName: string): CultureInfo {
  const cultureInfo = COUNTRY_CULTURE_MAP[countryName];

  if (cultureInfo) {
    return cultureInfo;
  }

  // 兜底值
  return {
    cultureRegion: 'unknown',
    dominantReligion: 'none',
  };
}
