/**
 * Property-based tests for coordinate utilities
 * Feature: 01-map-interaction
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateCoordinates,
  roundCoordinates,
  isValidLatitude,
  isValidLongitude,
} from '../coordinates';

describe('Coordinate Utilities - Property Tests', () => {
  // Feature: 01-map-interaction, Property 1: Coordinate Validation
  // Validates: Requirements 2.2, 2.3
  describe('Property 1: Coordinate Validation', () => {
    test('correctly identifies valid/invalid coordinates across all numeric inputs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -180, max: 180, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const result = validateCoordinates(lat, lng);
            const latValid = lat >= -90 && lat <= 90;
            const lngValid = lng >= -180 && lng <= 180;
            const expectedValid = latValid && lngValid;

            expect(result.isValid).toBe(expectedValid);
            expect(result.latitude).toBe(lat);
            expect(result.longitude).toBe(lng);

            if (!expectedValid) {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('validates latitude range [-90, 90]', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (lat) => {
          const isValid = isValidLatitude(lat);
          const expected = lat >= -90 && lat <= 90;
          expect(isValid).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });

    test('validates longitude range [-180, 180]', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (lng) => {
          const isValid = isValidLongitude(lng);
          const expected = lng >= -180 && lng <= 180;
          expect(isValid).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });

    test('rejects NaN coordinates', () => {
      const result1 = validateCoordinates(NaN, 0);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toContain('valid numbers');

      const result2 = validateCoordinates(0, NaN);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toContain('valid numbers');

      const result3 = validateCoordinates(NaN, NaN);
      expect(result3.isValid).toBe(false);
      expect(result3.error).toContain('valid numbers');
    });
  });

  // Feature: 01-map-interaction, Property 2: Coordinate Rounding Precision
  // Validates: Requirements 8.1, 8.2
  describe('Property 2: Coordinate Rounding Precision', () => {
    test('produces values with exactly 0.01 degree precision (2 decimal places)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const [roundedLat, roundedLng] = roundCoordinates(lat, lng);

            // Check that values have at most 2 decimal places
            const latDecimals = (roundedLat.toString().split('.')[1] || '').length;
            const lngDecimals = (roundedLng.toString().split('.')[1] || '').length;

            expect(latDecimals).toBeLessThanOrEqual(2);
            expect(lngDecimals).toBeLessThanOrEqual(2);

            // Check that rounding is correct (within 0.01 of original)
            expect(Math.abs(roundedLat - lat)).toBeLessThanOrEqual(0.005);
            expect(Math.abs(roundedLng - lng)).toBeLessThanOrEqual(0.005);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('is idempotent (rounding twice produces same result)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -90, max: 90, noNaN: true }),
          fc.float({ min: -180, max: 180, noNaN: true }),
          (lat, lng) => {
            const [roundedLat1, roundedLng1] = roundCoordinates(lat, lng);
            const [roundedLat2, roundedLng2] = roundCoordinates(roundedLat1, roundedLng1);

            expect(roundedLat1).toBe(roundedLat2);
            expect(roundedLng1).toBe(roundedLng2);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rounds to nearest 0.01', () => {
      // Test specific examples
      expect(roundCoordinates(48.8566, 2.3522)).toEqual([48.86, 2.35]);
      expect(roundCoordinates(48.8544, 2.3578)).toEqual([48.85, 2.36]);
      expect(roundCoordinates(-33.8688, 151.2093)).toEqual([-33.87, 151.21]);
      expect(roundCoordinates(0.005, 0.005)).toEqual([0.01, 0.01]);
      expect(roundCoordinates(0.004, 0.004)).toEqual([0, 0]);
    });
  });
});
