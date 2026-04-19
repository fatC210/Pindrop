/**
 * Timezone Calculator
 *
 * 从国家名称和坐标计算时区、当地时间和时间档。
 * 优先使用 Intl.DateTimeFormat 解析国家对应的 IANA 时区，
 * 降级时使用经度估算时区偏移。
 *
 * 需求覆盖: 10.1-10.6
 */

import { getTimeSlot, type TimeSlot } from '@/utils/timeSlot';
import type { TimezoneInfo } from '@/types/locationContext';

/**
 * 国家名称到 IANA 时区的映射表
 * 覆盖主要国家和地区
 */
const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  // 欧洲
  France: 'Europe/Paris',
  Germany: 'Europe/Berlin',
  'United Kingdom': 'Europe/London',
  Italy: 'Europe/Rome',
  Spain: 'Europe/Madrid',
  Portugal: 'Europe/Lisbon',
  Netherlands: 'Europe/Amsterdam',
  Belgium: 'Europe/Brussels',
  Switzerland: 'Europe/Zurich',
  Austria: 'Europe/Vienna',
  Poland: 'Europe/Warsaw',
  Sweden: 'Europe/Stockholm',
  Norway: 'Europe/Oslo',
  Denmark: 'Europe/Copenhagen',
  Finland: 'Europe/Helsinki',
  Greece: 'Europe/Athens',
  Russia: 'Europe/Moscow',
  Ukraine: 'Europe/Kiev',
  Romania: 'Europe/Bucharest',
  'Czech Republic': 'Europe/Prague',
  Hungary: 'Europe/Budapest',
  Ireland: 'Europe/Dublin',

  // 亚洲
  Japan: 'Asia/Tokyo',
  China: 'Asia/Shanghai',
  'South Korea': 'Asia/Seoul',
  India: 'Asia/Kolkata',
  Thailand: 'Asia/Bangkok',
  Vietnam: 'Asia/Ho_Chi_Minh',
  Indonesia: 'Asia/Jakarta',
  Malaysia: 'Asia/Kuala_Lumpur',
  Singapore: 'Asia/Singapore',
  Philippines: 'Asia/Manila',
  'Hong Kong': 'Asia/Hong_Kong',
  Taiwan: 'Asia/Taipei',
  Pakistan: 'Asia/Karachi',
  Bangladesh: 'Asia/Dhaka',
  Myanmar: 'Asia/Yangon',
  Cambodia: 'Asia/Phnom_Penh',
  'Saudi Arabia': 'Asia/Riyadh',
  'United Arab Emirates': 'Asia/Dubai',
  Israel: 'Asia/Jerusalem',
  Turkey: 'Europe/Istanbul',
  Iran: 'Asia/Tehran',
  Iraq: 'Asia/Baghdad',

  // 美洲
  'United States': 'America/New_York',
  Canada: 'America/Toronto',
  Mexico: 'America/Mexico_City',
  Brazil: 'America/Sao_Paulo',
  Argentina: 'America/Argentina/Buenos_Aires',
  Chile: 'America/Santiago',
  Colombia: 'America/Bogota',
  Peru: 'America/Lima',
  Venezuela: 'America/Caracas',
  Ecuador: 'America/Guayaquil',
  Cuba: 'America/Havana',
  Jamaica: 'America/Jamaica',

  // 非洲
  Egypt: 'Africa/Cairo',
  'South Africa': 'Africa/Johannesburg',
  Nigeria: 'Africa/Lagos',
  Kenya: 'Africa/Nairobi',
  Morocco: 'Africa/Casablanca',
  Algeria: 'Africa/Algiers',
  Tunisia: 'Africa/Tunis',
  Ethiopia: 'Africa/Addis_Ababa',
  Ghana: 'Africa/Accra',

  // 大洋洲
  Australia: 'Australia/Sydney',
  'New Zealand': 'Pacific/Auckland',
};

/**
 * 从国家名称获取 IANA 时区
 *
 * @param countryName - 国家名称
 * @returns IANA 时区字符串，未找到时返回 null
 */
function getTimezoneByCountry(countryName: string): string | null {
  if (Object.hasOwn(COUNTRY_TIMEZONE_MAP, countryName)) {
    return COUNTRY_TIMEZONE_MAP[countryName];
  }
  return null;
}

/**
 * 从经度估算时区偏移
 *
 * 使用公式：offset = Math.round(lng / 15)
 * 返回格式：UTC+N 或 UTC-N
 *
 * @param lng - 经度值
 * @returns UTC 偏移字符串，如 "UTC+9" 或 "UTC-5"
 */
function estimateTimezoneFromLongitude(lng: number): string {
  const offset = Math.round(lng / 15);
  if (offset === 0) {
    return 'UTC+0';
  }
  return offset > 0 ? `UTC+${offset}` : `UTC${offset}`;
}

/**
 * 获取指定时区的当前小时
 *
 * 使用 Intl.DateTimeFormat 解析时区的当前时间。
 * 对于 UTC±N 格式的时区，手动计算偏移。
 *
 * @param timezone - IANA 时区字符串或 UTC±N 格式
 * @returns 当前小时 (0-23)
 */
function getCurrentHourInTimezone(timezone: string): number {
  try {
    // 处理 UTC±N 格式
    if (timezone.startsWith('UTC')) {
      const match = timezone.match(/^UTC([+-]?\d+)$/);
      if (match) {
        const offset = parseInt(match[1], 10);
        const now = new Date();
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + offset + 24) % 24;
        return localHour;
      }
    }

    // 使用 Intl.DateTimeFormat 解析 IANA 时区
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((part) => part.type === 'hour');

    if (hourPart) {
      const hour = parseInt(hourPart.value, 10);
      // 处理 24 小时制的午夜 (24 → 0)
      return hour === 24 ? 0 : hour;
    }

    // 降级：返回 UTC 小时
    return new Date().getUTCHours();
  } catch (error) {
    // 时区解析失败，返回 UTC 小时
    console.error(`[PinDrop Error] TimezoneCalculator: Failed to parse timezone ${timezone}`, error);
    return new Date().getUTCHours();
  }
}

/**
 * 计算时区信息
 *
 * 优先使用国家名称查询 IANA 时区，降级时使用经度估算。
 * 计算当地当前小时并映射到时间档。
 *
 * 需求覆盖: 10.1-10.6
 *
 * @param countryName - 国家名称，可为 null
 * @param lat - 纬度值
 * @param lng - 经度值
 * @returns 时区信息对象
 */
export function calculateTimezone(
  countryName: string | null,
  lat: number,
  lng: number
): TimezoneInfo {
  let timezone: string;
  let currentLocalHour: number;

  // 优先使用国家名称查询 IANA 时区
  if (countryName) {
    const ianaTimezone = getTimezoneByCountry(countryName);
    if (ianaTimezone) {
      timezone = ianaTimezone;
      currentLocalHour = getCurrentHourInTimezone(timezone);
    } else {
      // 国家名称未匹配，降级到经度估算
      timezone = estimateTimezoneFromLongitude(lng);
      currentLocalHour = getCurrentHourInTimezone(timezone);
    }
  } else {
    // 无国家名称，使用经度估算
    timezone = estimateTimezoneFromLongitude(lng);
    currentLocalHour = getCurrentHourInTimezone(timezone);
  }

  // 计算时间档
  const timeSlot: TimeSlot = getTimeSlot(currentLocalHour);

  return {
    timezone,
    currentLocalHour,
    timeSlot,
  };
}
