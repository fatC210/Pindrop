/**
 * Property-based tests for distance calculation utilities
 * Feature: 01-map-interaction
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateDistance,
  isWithinDistance,
  clampZoom,
  calculatePreviewVolume,
} from '../distance';
import type { Coordinates } from '../coordinates';

describe('Distance Utilities - Property Tests', () => {
  // Arbitrary for valid coordinates
  const coordinateArbitrary = fc.tuple(
    fc.float({ min: -90, max: 90, noNaN: true }),
    fc.float({ min: -180, max: 180, noNaN: true })
  ) as fc.Arbitrary<Coordinates>;

  // Feature: 01-map-interaction, Property 5: Hover Throttling Distance Calculation
  // Validates: Requirements 4.5, 12.3
  describe('Property 5: Hover Throttling Distance Calculation', () => {
    test('distance from A to B equals distance from B to A (symmetry)', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          (coord1, coord2) => {
            const distanceAB = calculateDistance(coord1, coord2);
            const distanceBA = calculateDistance(coord2, coord1);

            // Allow small floating point differences
            expect(Math.abs(distanceAB - distanceBA)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('distance from A to A is zero', () => {
      fc.assert(
        fc.property(coordinateArbitrary, (coord) => {
          const distance = calculateDistance(coord, coord);
          expect(distance).toBeLessThan(0.0001); // Essentially zero
        }),
        { numRuns: 100 }
      );
    });

    test('distance is always non-negative', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          (coord1, coord2) => {
            const distance = calculateDistance(coord1, coord2);
            expect(distance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('correctly detects 5-degree threshold', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          (coord1, coord2) => {
            const distance = calculateDistance(coord1, coord2);
            const withinThreshold = isWithinDistance(coord1, coord2, 5);

            if (distance < 5) {
              expect(withinThreshold).toBe(true);
            } else {
              expect(withinThreshold).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('triangle inequality holds (d(A,C) <= d(A,B) + d(B,C))', () => {
      fc.assert(
        fc.property(
          coordinateArbitrary,
          coordinateArbitrary,
          coordinateArbitrary,
          (coordA, coordB, coordC) => {
            const distanceAB = calculateDistance(coordA, coordB);
            const distanceBC = calculateDistance(coordB, coordC);
            const distanceAC = calculateDistance(coordA, coordC);

            // Triangle inequality with small tolerance for floating point
            expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC + 0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 01-map-interaction, Property 8: Zoom Level Boundary Enforcement
  // Validates: Requirements 6.5, 6.6
  describe('Property 8: Zoom Level Boundary Enforcement', () => {
    test('always returns value in range [2, 18]', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBeGreaterThanOrEqual(2);
          expect(clamped).toBeLessThanOrEqual(18);
        }),
        { numRuns: 100 }
      );
    });

    test('is idempotent (clamping twice produces same result)', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (zoom) => {
          const clamped1 = clampZoom(zoom);
          const clamped2 = clampZoom(clamped1);
          expect(clamped1).toBe(clamped2);
        }),
        { numRuns: 100 }
      );
    });

    test('preserves values already in range', () => {
      fc.assert(
        fc.property(fc.float({ min: 2, max: 18, noNaN: true }), (zoom) => {
          const clamped = clampZoom(zoom);
          expect(Math.abs(clamped - zoom)).toBeLessThan(0.0001);
        }),
        { numRuns: 100 }
      );
    });

    test('clamps values below minimum to 2', () => {
      fc.assert(
        fc.property(fc.float({ max: Math.fround(1.99), noNaN: true }), (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(2);
        }),
        { numRuns: 100 }
      );
    });

    test('clamps values above maximum to 18', () => {
      fc.assert(
        fc.property(fc.float({ min: Math.fround(18.01), max: Math.fround(100), noNaN: true }), (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(18);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: 01-map-interaction, Property 9: Preview Volume Calculation
  // Validates: Requirement 4.3
  describe('Property 9: Preview Volume Calculation', () => {
    test('preview volume is exactly 30% of configured volume', () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (ambientVolume) => {
          const previewVolume = calculatePreviewVolume(ambientVolume);
          const expected = ambientVolume * 0.3;
          expect(Math.abs(previewVolume - expected)).toBeLessThan(0.0001);
        }),
        { numRuns: 100 }
      );
    });

    test('result is always in range [0, 1]', () => {
      fc.assert(
        fc.property(fc.float({ noNaN: true }), (ambientVolume) => {
          const previewVolume = calculatePreviewVolume(ambientVolume);
          expect(previewVolume).toBeGreaterThanOrEqual(0);
          expect(previewVolume).toBeLessThanOrEqual(1);
        }),
        { numRuns: 100 }
      );
    });

    test('handles edge cases correctly', () => {
      expect(calculatePreviewVolume(0)).toBe(0);
      expect(calculatePreviewVolume(1)).toBe(0.3);
      expect(calculatePreviewVolume(0.5)).toBeCloseTo(0.15, 5);
    });

    test('clamps out-of-range input volumes', () => {
      // Volumes > 1 should be clamped to 1, resulting in 0.3
      expect(calculatePreviewVolume(2)).toBe(0.3);
      expect(calculatePreviewVolume(10)).toBe(0.3);

      // Volumes < 0 should be clamped to 0, resulting in 0
      expect(calculatePreviewVolume(-1)).toBe(0);
      expect(calculatePreviewVolume(-10)).toBe(0);
    });
  });

  describe('Distance Calculation - Specific Examples', () => {
    test('calculates known distances correctly', () => {
      // Paris to London (approximately 344 km ≈ 3.1 degrees)
      const paris: Coordinates = [48.8566, 2.3522];
      const london: Coordinates = [51.5074, -0.1278];
      const distance = calculateDistance(paris, london);
      expect(distance).toBeGreaterThan(2.5);
      expect(distance).toBeLessThan(4);

      // New York to Los Angeles (approximately 3944 km ≈ 35.5 degrees)
      const newYork: Coordinates = [40.7128, -74.006];
      const losAngeles: Coordinates = [34.0522, -118.2437];
      const distanceUSA = calculateDistance(newYork, losAngeles);
      expect(distanceUSA).toBeGreaterThan(30);
      expect(distanceUSA).toBeLessThan(40);
    });

    test('handles coordinates across the antimeridian', () => {
      // Tokyo (139.6503°E) to San Francisco (-122.4194°W)
      const tokyo: Coordinates = [35.6762, 139.6503];
      const sanFrancisco: Coordinates = [37.7749, -122.4194];
      const distance = calculateDistance(tokyo, sanFrancisco);
      
      // Should be positive and reasonable (not wrapping the wrong way)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(180); // Less than half the Earth
    });

    test('handles polar coordinates', () => {
      const northPole: Coordinates = [90, 0];
      const southPole: Coordinates = [-90, 0];
      const distance = calculateDistance(northPole, southPole);
      
      // Should be approximately 180 degrees (half the Earth)
      expect(distance).toBeGreaterThan(170);
      expect(distance).toBeLessThan(190);
    });
  });
});
