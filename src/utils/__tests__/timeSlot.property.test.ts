/**
 * Property-based tests for time slot utilities
 * Feature: 01-map-interaction
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  getTimeSlot,
  getTimeSlotColor,
  generateCacheKey,
  parseCacheKey,
  TIME_SLOTS,
  type TimeSlot,
} from '../timeSlot';

describe('Time Slot Utilities - Property Tests', () => {
  // Feature: 01-map-interaction, Property 3: Cache Key Format Consistency
  // Validates: Requirements 8.3, 8.4
  describe('Property 3: Cache Key Format Consistency', () => {
    const timeSlotArbitrary = fc.constantFrom<TimeSlot>('dawn', 'day', 'dusk', 'night');

    test('produces string in format "{lat},{lng}-{timeSlot}" with 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          timeSlotArbitrary,
          (lat, lng, timeSlot) => {
            const cacheKey = generateCacheKey(lat, lng, timeSlot);

            // Check format with regex
            const formatRegex = /^-?\d+\.\d{2},-?\d+\.\d{2}-(dawn|day|dusk|night)$/;
            expect(cacheKey).toMatch(formatRegex);

            // Check that it ends with the time slot
            expect(cacheKey).toContain(`-${timeSlot}`);

            // Parse and verify
            const parsed = parseCacheKey(cacheKey);
            expect(parsed).not.toBeNull();
            expect(parsed?.timeSlot).toBe(timeSlot);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('is idempotent (same coordinates and time slot always produce same key)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          timeSlotArbitrary,
          (lat, lng, timeSlot) => {
            const key1 = generateCacheKey(lat, lng, timeSlot);
            const key2 = generateCacheKey(lat, lng, timeSlot);
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rounded coordinates produce same key', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          timeSlotArbitrary,
          (lat, lng, timeSlot) => {
            // Generate key from original coordinates
            const key1 = generateCacheKey(lat, lng, timeSlot);

            // Parse to get rounded coordinates
            const parsed = parseCacheKey(key1);
            expect(parsed).not.toBeNull();

            // Generate key from rounded coordinates
            const [roundedLat, roundedLng] = parsed!.coordinates;
            const key2 = generateCacheKey(roundedLat, roundedLng, timeSlot);

            // Should be identical
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('parse and generate are inverse operations', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          timeSlotArbitrary,
          (lat, lng, timeSlot) => {
            const originalKey = generateCacheKey(lat, lng, timeSlot);
            const parsed = parseCacheKey(originalKey);
            expect(parsed).not.toBeNull();

            const [parsedLat, parsedLng] = parsed!.coordinates;
            const regeneratedKey = generateCacheKey(
              parsedLat,
              parsedLng,
              parsed!.timeSlot
            );

            expect(regeneratedKey).toBe(originalKey);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 01-map-interaction, Property 4: Time Slot Color Mapping Completeness
  // Validates: Requirements 3.6, 3.7, 3.8, 3.9
  describe('Property 4: Time Slot Color Mapping Completeness', () => {
    const timeSlotArbitrary = fc.constantFrom<TimeSlot>('dawn', 'day', 'dusk', 'night');

    test('returns valid hex color code for all time slots', () => {
      fc.assert(
        fc.property(timeSlotArbitrary, (timeSlot) => {
          const color = getTimeSlotColor(timeSlot);

          // Check hex color format
          expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        }),
        { numRuns: 100 }
      );
    });

    test('mapping is bijective (each slot maps to exactly one unique color)', () => {
      const colorMap = new Map<TimeSlot, string>();

      TIME_SLOTS.forEach((def) => {
        const color = getTimeSlotColor(def.slot);
        colorMap.set(def.slot, color);
      });

      // Check all slots are mapped
      expect(colorMap.size).toBe(4);
      expect(colorMap.has('dawn')).toBe(true);
      expect(colorMap.has('day')).toBe(true);
      expect(colorMap.has('dusk')).toBe(true);
      expect(colorMap.has('night')).toBe(true);

      // Check all colors are unique
      const colors = Array.from(colorMap.values());
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });

    test('specific color mappings are correct', () => {
      expect(getTimeSlotColor('dawn')).toBe('#FFA500');
      expect(getTimeSlotColor('day')).toBe('#22C55E');
      expect(getTimeSlotColor('dusk')).toBe('#FBBF24');
      expect(getTimeSlotColor('night')).toBe('#3B82F6');
    });
  });

  describe('Time Slot Calculation', () => {
    test('maps hours to correct time slots', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
          const slot = getTimeSlot(hour);

          // Verify slot is one of the valid values
          expect(['dawn', 'day', 'dusk', 'night']).toContain(slot);

          // Verify specific ranges
          if (hour >= 5 && hour <= 8) {
            expect(slot).toBe('dawn');
          } else if (hour >= 9 && hour <= 16) {
            expect(slot).toBe('day');
          } else if (hour >= 17 && hour <= 19) {
            expect(slot).toBe('dusk');
          } else {
            // hour >= 20 || hour <= 4
            expect(slot).toBe('night');
          }
        }),
        { numRuns: 100 }
      );
    });

    test('handles midnight rollover correctly', () => {
      // Night spans 20:00 - 04:59
      expect(getTimeSlot(20)).toBe('night');
      expect(getTimeSlot(23)).toBe('night');
      expect(getTimeSlot(0)).toBe('night');
      expect(getTimeSlot(4)).toBe('night');

      // Dawn starts at 5:00
      expect(getTimeSlot(5)).toBe('dawn');
    });

    test('handles negative hours (wraps around)', () => {
      // -1 should be 23 (night)
      expect(getTimeSlot(-1)).toBe('night');
      // -5 should be 19 (dusk)
      expect(getTimeSlot(-5)).toBe('dusk');
    });

    test('handles hours > 23 (wraps around)', () => {
      // 24 should be 0 (night)
      expect(getTimeSlot(24)).toBe('night');
      // 30 should be 6 (dawn)
      expect(getTimeSlot(30)).toBe('dawn');
    });
  });
});
