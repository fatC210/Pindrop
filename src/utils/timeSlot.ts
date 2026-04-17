/**
 * Time slot utilities for the Map Interaction Module
 * Handles time slot calculation, color mapping, and cache key generation
 */

import { roundCoordinates, type Coordinates } from './coordinates';

export type TimeSlot = 'dawn' | 'day' | 'dusk' | 'night';

export interface TimeSlotDefinition {
  slot: TimeSlot;
  startHour: number;
  endHour: number;
  color: string;
  emoji: string;
}

/**
 * Time slot definitions with hour ranges and visual properties
 * Requirements: 3.6, 3.7, 3.8, 3.9
 */
export const TIME_SLOTS: TimeSlotDefinition[] = [
  { slot: 'dawn', startHour: 5, endHour: 8, color: '#FFA500', emoji: '🌅' },
  { slot: 'day', startHour: 9, endHour: 16, color: '#22C55E', emoji: '☀️' },
  { slot: 'dusk', startHour: 17, endHour: 19, color: '#FBBF24', emoji: '🌇' },
  { slot: 'night', startHour: 20, endHour: 4, color: '#3B82F6', emoji: '🌙' },
];

/**
 * Maps hour (0-23) to time slot (dawn/day/dusk/night)
 * Requirements: 3.6, 3.7, 3.8, 3.9
 * 
 * Time slot ranges:
 * - dawn: 05:00 - 08:59
 * - day: 09:00 - 16:59
 * - dusk: 17:00 - 19:59
 * - night: 20:00 - 04:59 (handles midnight rollover)
 * 
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Time slot identifier
 */
export function getTimeSlot(hour: number): TimeSlot {
  // Normalize hour to 0-23 range
  const normalizedHour = ((hour % 24) + 24) % 24;

  // Night spans midnight (20:00 - 04:59)
  if (normalizedHour >= 20 || normalizedHour <= 4) {
    return 'night';
  }

  // Dawn: 05:00 - 08:59
  if (normalizedHour >= 5 && normalizedHour <= 8) {
    return 'dawn';
  }

  // Day: 09:00 - 16:59
  if (normalizedHour >= 9 && normalizedHour <= 16) {
    return 'day';
  }

  // Dusk: 17:00 - 19:59
  return 'dusk';
}

/**
 * Gets the color hex code for a given time slot
 * Requirements: 3.6, 3.7, 3.8, 3.9
 * 
 * Color mapping:
 * - dawn → #FFA500 (orange)
 * - day → #22C55E (green)
 * - dusk → #FBBF24 (yellow)
 * - night → #3B82F6 (blue)
 * 
 * @param timeSlot - Time slot identifier
 * @returns Hex color code
 */
export function getTimeSlotColor(timeSlot: TimeSlot): string {
  const definition = TIME_SLOTS.find((def) => def.slot === timeSlot);
  return definition?.color || '#3B82F6'; // Default to night color
}

/**
 * Gets the emoji for a given time slot
 * @param timeSlot - Time slot identifier
 * @returns Emoji character
 */
export function getTimeSlotEmoji(timeSlot: TimeSlot): string {
  const definition = TIME_SLOTS.find((def) => def.slot === timeSlot);
  return definition?.emoji || '🌙'; // Default to night emoji
}

/**
 * Gets the time slot definition for a given slot
 * @param timeSlot - Time slot identifier
 * @returns Time slot definition or undefined
 */
export function getTimeSlotDefinition(
  timeSlot: TimeSlot
): TimeSlotDefinition | undefined {
  return TIME_SLOTS.find((def) => def.slot === timeSlot);
}

/**
 * Generates a cache key for a soundscape based on coordinates and time slot
 * Requirements: 8.3, 8.4
 * 
 * Format: "{lat},{lng}-{timeSlot}"
 * Example: "48.86,2.36-dawn"
 * 
 * Coordinates are rounded to 0.01 degree precision (2 decimal places)
 * 
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @param timeSlot - Time slot identifier
 * @returns Cache key string
 */
export function generateCacheKey(
  lat: number,
  lng: number,
  timeSlot: TimeSlot
): string {
  const [roundedLat, roundedLng] = roundCoordinates(lat, lng);
  return `${roundedLat.toFixed(2)},${roundedLng.toFixed(2)}-${timeSlot}`;
}

/**
 * Parses a cache key back into coordinates and time slot
 * @param cacheKey - Cache key string
 * @returns Parsed coordinates and time slot, or null if invalid
 */
export function parseCacheKey(cacheKey: string): {
  coordinates: Coordinates;
  timeSlot: TimeSlot;
} | null {
  const match = cacheKey.match(/^(-?\d+\.\d{2}),(-?\d+\.\d{2})-(\w+)$/);
  
  if (!match) {
    return null;
  }

  const [, latStr, lngStr, timeSlotStr] = match;
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const timeSlot = timeSlotStr as TimeSlot;

  // Validate time slot
  if (!['dawn', 'day', 'dusk', 'night'].includes(timeSlot)) {
    return null;
  }

  return {
    coordinates: [lat, lng],
    timeSlot,
  };
}
