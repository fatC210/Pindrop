/**
 * Language Mapper — 国家到语言映射推断
 *
 * 根据国家名称推断主要语言、语言变体和次要语言。
 * 覆盖 100+ 国家，多语言国家选择最广泛使用的语言为 primary。
 *
 * 需求覆盖: 8.1-8.7
 */

import type { LanguageInfo } from '@/types/locationContext';

/**
 * 国家语言映射表内部结构
 */
interface LanguageMapEntry {
  /** ISO 639-1 语言代码 */
  lang: string;
  /** BCP 47 语言变体标签 */
  variant: string;
  /** 次要语言列表 */
  secondary: string[];
}

/**
 * 国家到语言的映射表
 *
 * 覆盖 100+ 国家，包含主要语言、语言变体和次要语言。
 * 多语言国家（如 Switzerland、Belgium、Canada）选择最广泛使用的语言为 primary。
 */
const COUNTRY_LANGUAGE_MAP: Record<string, LanguageMapEntry> = {
  // === 西欧 ===
  France: { lang: 'fr', variant: 'fr-FR', secondary: ['en', 'ar'] },
  Germany: { lang: 'de', variant: 'de-DE', secondary: ['en', 'tr'] },
  'United Kingdom': { lang: 'en', variant: 'en-GB', secondary: [] },
  Italy: { lang: 'it', variant: 'it-IT', secondary: ['en', 'de'] },
  Spain: { lang: 'es', variant: 'es-ES', secondary: ['ca', 'eu', 'gl'] },
  Netherlands: { lang: 'nl', variant: 'nl-NL', secondary: ['en', 'de'] },
  Belgium: { lang: 'nl', variant: 'nl-BE', secondary: ['fr', 'de'] },
  Switzerland: { lang: 'de', variant: 'de-CH', secondary: ['fr', 'it', 'rm'] },
  Austria: { lang: 'de', variant: 'de-AT', secondary: ['en'] },
  Portugal: { lang: 'pt', variant: 'pt-PT', secondary: ['en'] },
  Greece: { lang: 'el', variant: 'el-GR', secondary: ['en'] },
  Ireland: { lang: 'en', variant: 'en-IE', secondary: ['ga'] },
  Luxembourg: { lang: 'lb', variant: 'lb-LU', secondary: ['fr', 'de'] },
  Monaco: { lang: 'fr', variant: 'fr-MC', secondary: ['en', 'it'] },
  Andorra: { lang: 'ca', variant: 'ca-AD', secondary: ['es', 'fr'] },

  // === 北欧 ===
  Sweden: { lang: 'sv', variant: 'sv-SE', secondary: ['en'] },
  Norway: { lang: 'no', variant: 'no-NO', secondary: ['en'] },
  Denmark: { lang: 'da', variant: 'da-DK', secondary: ['en'] },
  Finland: { lang: 'fi', variant: 'fi-FI', secondary: ['sv', 'en'] },
  Iceland: { lang: 'is', variant: 'is-IS', secondary: ['en'] },

  // === 东欧 ===
  Russia: { lang: 'ru', variant: 'ru-RU', secondary: ['en'] },
  Poland: { lang: 'pl', variant: 'pl-PL', secondary: ['en', 'de'] },
  Ukraine: { lang: 'uk', variant: 'uk-UA', secondary: ['ru', 'en'] },
  'Czech Republic': { lang: 'cs', variant: 'cs-CZ', secondary: ['en', 'de'] },
  Romania: { lang: 'ro', variant: 'ro-RO', secondary: ['en', 'hu'] },
  Hungary: { lang: 'hu', variant: 'hu-HU', secondary: ['en', 'de'] },
  Bulgaria: { lang: 'bg', variant: 'bg-BG', secondary: ['en', 'ru'] },
  Serbia: { lang: 'sr', variant: 'sr-RS', secondary: ['en'] },
  Croatia: { lang: 'hr', variant: 'hr-HR', secondary: ['en', 'de'] },
  Slovakia: { lang: 'sk', variant: 'sk-SK', secondary: ['en', 'hu'] },
  Slovenia: { lang: 'sl', variant: 'sl-SI', secondary: ['en', 'de'] },
  Lithuania: { lang: 'lt', variant: 'lt-LT', secondary: ['en', 'ru'] },
  Latvia: { lang: 'lv', variant: 'lv-LV', secondary: ['en', 'ru'] },
  Estonia: { lang: 'et', variant: 'et-EE', secondary: ['en', 'ru'] },
  Belarus: { lang: 'be', variant: 'be-BY', secondary: ['ru'] },
  Moldova: { lang: 'ro', variant: 'ro-MD', secondary: ['ru', 'uk'] },
  Albania: { lang: 'sq', variant: 'sq-AL', secondary: ['en', 'it'] },
  'North Macedonia': { lang: 'mk', variant: 'mk-MK', secondary: ['en', 'sq'] },
  'Bosnia and Herzegovina': {
    lang: 'bs',
    variant: 'bs-BA',
    secondary: ['hr', 'sr'],
  },
  Montenegro: { lang: 'sr', variant: 'sr-ME', secondary: ['en'] },

  // === 北美 ===
  'United States': { lang: 'en', variant: 'en-US', secondary: ['es'] },
  Canada: { lang: 'en', variant: 'en-CA', secondary: ['fr'] },
  Mexico: { lang: 'es', variant: 'es-MX', secondary: ['en'] },

  // === 中美洲与加勒比 ===
  Guatemala: { lang: 'es', variant: 'es-GT', secondary: [] },
  Honduras: { lang: 'es', variant: 'es-HN', secondary: [] },
  'El Salvador': { lang: 'es', variant: 'es-SV', secondary: [] },
  Nicaragua: { lang: 'es', variant: 'es-NI', secondary: [] },
  'Costa Rica': { lang: 'es', variant: 'es-CR', secondary: [] },
  Panama: { lang: 'es', variant: 'es-PA', secondary: ['en'] },
  Cuba: { lang: 'es', variant: 'es-CU', secondary: [] },
  'Dominican Republic': { lang: 'es', variant: 'es-DO', secondary: [] },
  Jamaica: { lang: 'en', variant: 'en-JM', secondary: [] },
  'Trinidad and Tobago': { lang: 'en', variant: 'en-TT', secondary: [] },

  // === 南美 ===
  Brazil: { lang: 'pt', variant: 'pt-BR', secondary: ['es', 'en'] },
  Argentina: { lang: 'es', variant: 'es-AR', secondary: ['en', 'it'] },
  Chile: { lang: 'es', variant: 'es-CL', secondary: ['en'] },
  Colombia: { lang: 'es', variant: 'es-CO', secondary: ['en'] },
  Peru: { lang: 'es', variant: 'es-PE', secondary: ['qu', 'ay'] },
  Venezuela: { lang: 'es', variant: 'es-VE', secondary: ['en'] },
  Ecuador: { lang: 'es', variant: 'es-EC', secondary: ['qu'] },
  Bolivia: { lang: 'es', variant: 'es-BO', secondary: ['qu', 'ay'] },
  Paraguay: { lang: 'es', variant: 'es-PY', secondary: ['gn'] },
  Uruguay: { lang: 'es', variant: 'es-UY', secondary: ['en'] },
  Guyana: { lang: 'en', variant: 'en-GY', secondary: [] },
  Suriname: { lang: 'nl', variant: 'nl-SR', secondary: ['en'] },

  // === 东亚 ===
  China: { lang: 'zh', variant: 'zh-CN', secondary: ['en'] },
  Japan: { lang: 'ja', variant: 'ja-JP', secondary: ['en'] },
  'South Korea': { lang: 'ko', variant: 'ko-KR', secondary: ['en'] },
  'North Korea': { lang: 'ko', variant: 'ko-KP', secondary: [] },
  Taiwan: { lang: 'zh', variant: 'zh-TW', secondary: ['en'] },
  'Hong Kong': { lang: 'zh', variant: 'zh-HK', secondary: ['en'] },
  Mongolia: { lang: 'mn', variant: 'mn-MN', secondary: ['ru'] },

  // === 东南亚 ===
  Thailand: { lang: 'th', variant: 'th-TH', secondary: ['en'] },
  Vietnam: { lang: 'vi', variant: 'vi-VN', secondary: ['en', 'fr'] },
  Indonesia: { lang: 'id', variant: 'id-ID', secondary: ['en', 'jv'] },
  Philippines: { lang: 'tl', variant: 'tl-PH', secondary: ['en', 'es'] },
  Malaysia: { lang: 'ms', variant: 'ms-MY', secondary: ['en', 'zh', 'ta'] },
  Singapore: { lang: 'en', variant: 'en-SG', secondary: ['zh', 'ms', 'ta'] },
  Myanmar: { lang: 'my', variant: 'my-MM', secondary: ['en'] },
  Cambodia: { lang: 'km', variant: 'km-KH', secondary: ['en', 'fr'] },
  Laos: { lang: 'lo', variant: 'lo-LA', secondary: ['en', 'fr'] },
  'Brunei': { lang: 'ms', variant: 'ms-BN', secondary: ['en'] },
  'Timor-Leste': { lang: 'pt', variant: 'pt-TL', secondary: ['tet'] },

  // === 南亚 ===
  India: { lang: 'hi', variant: 'hi-IN', secondary: ['en', 'bn', 'te', 'mr'] },
  Pakistan: { lang: 'ur', variant: 'ur-PK', secondary: ['en', 'pa'] },
  Bangladesh: { lang: 'bn', variant: 'bn-BD', secondary: ['en'] },
  Nepal: { lang: 'ne', variant: 'ne-NP', secondary: ['en'] },
  'Sri Lanka': { lang: 'si', variant: 'si-LK', secondary: ['ta', 'en'] },
  Afghanistan: { lang: 'fa', variant: 'fa-AF', secondary: ['ps'] },
  Bhutan: { lang: 'dz', variant: 'dz-BT', secondary: ['en'] },
  Maldives: { lang: 'dv', variant: 'dv-MV', secondary: ['en'] },

  // === 中东 ===
  'Saudi Arabia': { lang: 'ar', variant: 'ar-SA', secondary: ['en'] },
  Iran: { lang: 'fa', variant: 'fa-IR', secondary: ['en'] },
  Iraq: { lang: 'ar', variant: 'ar-IQ', secondary: ['ku'] },
  Turkey: { lang: 'tr', variant: 'tr-TR', secondary: ['en', 'ku'] },
  Israel: { lang: 'he', variant: 'he-IL', secondary: ['ar', 'en'] },
  'United Arab Emirates': { lang: 'ar', variant: 'ar-AE', secondary: ['en'] },
  Jordan: { lang: 'ar', variant: 'ar-JO', secondary: ['en'] },
  Lebanon: { lang: 'ar', variant: 'ar-LB', secondary: ['fr', 'en'] },
  Syria: { lang: 'ar', variant: 'ar-SY', secondary: ['ku'] },
  Yemen: { lang: 'ar', variant: 'ar-YE', secondary: [] },
  Oman: { lang: 'ar', variant: 'ar-OM', secondary: ['en'] },
  Kuwait: { lang: 'ar', variant: 'ar-KW', secondary: ['en'] },
  Qatar: { lang: 'ar', variant: 'ar-QA', secondary: ['en'] },
  Bahrain: { lang: 'ar', variant: 'ar-BH', secondary: ['en'] },
  Palestine: { lang: 'ar', variant: 'ar-PS', secondary: ['en'] },
  Cyprus: { lang: 'el', variant: 'el-CY', secondary: ['tr', 'en'] },

  // === 中亚 ===
  Kazakhstan: { lang: 'kk', variant: 'kk-KZ', secondary: ['ru'] },
  Uzbekistan: { lang: 'uz', variant: 'uz-UZ', secondary: ['ru'] },
  Turkmenistan: { lang: 'tk', variant: 'tk-TM', secondary: ['ru'] },
  Kyrgyzstan: { lang: 'ky', variant: 'ky-KG', secondary: ['ru'] },
  Tajikistan: { lang: 'tg', variant: 'tg-TJ', secondary: ['ru'] },

  // === 北非 ===
  Egypt: { lang: 'ar', variant: 'ar-EG', secondary: ['en', 'fr'] },
  Morocco: { lang: 'ar', variant: 'ar-MA', secondary: ['fr', 'ber'] },
  Algeria: { lang: 'ar', variant: 'ar-DZ', secondary: ['fr', 'ber'] },
  Tunisia: { lang: 'ar', variant: 'ar-TN', secondary: ['fr'] },
  Libya: { lang: 'ar', variant: 'ar-LY', secondary: ['en', 'it'] },
  Sudan: { lang: 'ar', variant: 'ar-SD', secondary: ['en'] },

  // === 撒哈拉以南非洲 ===
  Nigeria: { lang: 'en', variant: 'en-NG', secondary: ['ha', 'yo', 'ig'] },
  'South Africa': {
    lang: 'en',
    variant: 'en-ZA',
    secondary: ['af', 'zu', 'xh'],
  },
  Kenya: { lang: 'sw', variant: 'sw-KE', secondary: ['en'] },
  Ethiopia: { lang: 'am', variant: 'am-ET', secondary: ['en', 'om'] },
  Tanzania: { lang: 'sw', variant: 'sw-TZ', secondary: ['en'] },
  Ghana: { lang: 'en', variant: 'en-GH', secondary: ['ak', 'ee'] },
  Uganda: { lang: 'en', variant: 'en-UG', secondary: ['sw', 'lg'] },
  Senegal: { lang: 'fr', variant: 'fr-SN', secondary: ['wo'] },
  'Ivory Coast': { lang: 'fr', variant: 'fr-CI', secondary: [] },
  Cameroon: { lang: 'fr', variant: 'fr-CM', secondary: ['en'] },
  Zimbabwe: { lang: 'en', variant: 'en-ZW', secondary: ['sn', 'nd'] },
  Rwanda: { lang: 'rw', variant: 'rw-RW', secondary: ['fr', 'en'] },
  Somalia: { lang: 'so', variant: 'so-SO', secondary: ['ar', 'en'] },
  Madagascar: { lang: 'mg', variant: 'mg-MG', secondary: ['fr'] },
  Mozambique: { lang: 'pt', variant: 'pt-MZ', secondary: [] },
  Angola: { lang: 'pt', variant: 'pt-AO', secondary: [] },
  Zambia: { lang: 'en', variant: 'en-ZM', secondary: ['bem', 'ny'] },
  Malawi: { lang: 'en', variant: 'en-MW', secondary: ['ny'] },
  Botswana: { lang: 'en', variant: 'en-BW', secondary: ['tn'] },
  Namibia: { lang: 'en', variant: 'en-NA', secondary: ['af', 'de'] },

  // === 大洋洲 ===
  Australia: { lang: 'en', variant: 'en-AU', secondary: [] },
  'New Zealand': { lang: 'en', variant: 'en-NZ', secondary: ['mi'] },
  'Papua New Guinea': { lang: 'en', variant: 'en-PG', secondary: ['tpi'] },
  Fiji: { lang: 'en', variant: 'en-FJ', secondary: ['fj', 'hi'] },
  Samoa: { lang: 'sm', variant: 'sm-WS', secondary: ['en'] },
  Tonga: { lang: 'to', variant: 'to-TO', secondary: ['en'] },

  // === 其他 ===
  Malta: { lang: 'mt', variant: 'mt-MT', secondary: ['en'] },
  Armenia: { lang: 'hy', variant: 'hy-AM', secondary: ['ru'] },
  Georgia: { lang: 'ka', variant: 'ka-GE', secondary: ['ru', 'en'] },
  Azerbaijan: { lang: 'az', variant: 'az-AZ', secondary: ['ru'] },
};

/**
 * 根据国家名称获取语言信息
 *
 * 查询 COUNTRY_LANGUAGE_MAP 映射表，返回主要语言、语言变体和次要语言。
 * 未匹配国家返回英语（美国）作为兜底。
 *
 * @param countryName - 国家名称（英文）
 * @returns 语言信息对象
 *
 * @example
 * ```typescript
 * getLanguageInfo('France')
 * // => { primaryLanguage: 'fr', languageVariant: 'fr-FR', secondaryLanguages: ['en', 'ar'] }
 *
 * getLanguageInfo('Switzerland')
 * // => { primaryLanguage: 'de', languageVariant: 'de-CH', secondaryLanguages: ['fr', 'it', 'rm'] }
 *
 * getLanguageInfo('Unknown Country')
 * // => { primaryLanguage: 'en', languageVariant: 'en-US', secondaryLanguages: [] }
 * ```
 */
export function getLanguageInfo(countryName: string): LanguageInfo {
  // 使用 hasOwnProperty 避免原型链污染
  if (Object.prototype.hasOwnProperty.call(COUNTRY_LANGUAGE_MAP, countryName)) {
    const entry = COUNTRY_LANGUAGE_MAP[countryName];
    return {
      primaryLanguage: entry.lang,
      languageVariant: entry.variant,
      secondaryLanguages: entry.secondary,
    };
  }

  // 兜底：未匹配国家返回英语（美国）
  return {
    primaryLanguage: 'en',
    languageVariant: 'en-US',
    secondaryLanguages: [],
  };
}
