/**
 * Coordinate utilities for the Map Interaction Module
 * Handles validation, rounding, and coordinate operations
 */

export type Latitude = number;  // -90 to 90
export type Longitude = number; // -180 to 180
export type Coordinates = [Latitude, Longitude];

export interface CoordinateValidationResult {
  isValid: boolean;
  latitude: number;
  longitude: number;
  error?: string;
}

export interface ValidatedCoordinates {
  lat: Latitude;
  lng: Longitude;
  rounded: Coordinates;
  precision: number; // 0.01
}

/**
 * Validates that latitude is within valid range [-90, 90]
 * @param lat - Latitude value to validate
 * @returns true if valid, false otherwise
 */
export function isValidLatitude(lat: number): boolean {
  return !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validates that longitude is within valid range [-180, 180]
 * @param lng - Longitude value to validate
 * @returns true if valid, false otherwise
 */
export function isValidLongitude(lng: number): boolean {
  return !isNaN(lng) && lng >= -180 && lng <= 180;
}

/**
 * Validates coordinate pair (latitude, longitude)
 * Requirements: 2.2, 2.3
 * 
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns Validation result with error message if invalid
 */
export function validateCoordinates(
  lat: number,
  lng: number
): CoordinateValidationResult {
  // Check for NaN
  if (isNaN(lat) || isNaN(lng)) {
    return {
      isValid: false,
      latitude: lat,
      longitude: lng,
      error: 'Coordinates must be valid numbers',
    };
  }

  // Validate latitude range
  if (!isValidLatitude(lat)) {
    return {
      isValid: false,
      latitude: lat,
      longitude: lng,
      error: `Latitude must be between -90 and 90 degrees (got ${lat})`,
    };
  }

  // Validate longitude range
  if (!isValidLongitude(lng)) {
    return {
      isValid: false,
      latitude: lat,
      longitude: lng,
      error: `Longitude must be between -180 and 180 degrees (got ${lng})`,
    };
  }

  return {
    isValid: true,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Rounds a single coordinate value to 0.01 degree precision (2 decimal places)
 * @param value - Coordinate value to round
 * @returns Rounded value with 2 decimal places
 */
function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Rounds coordinate pair to 0.01 degree precision (approximately 1.1 km)
 * Requirements: 8.1, 8.2
 * 
 * This function is idempotent: rounding twice produces the same result
 * 
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns Tuple of rounded coordinates [lat, lng]
 */
export function roundCoordinates(lat: number, lng: number): Coordinates {
  const latRounded = roundCoordinate(lat);
  const lngRounded = roundCoordinate(lng);
  return [latRounded, lngRounded];
}

/**
 * Creates a validated and rounded coordinate object
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns ValidatedCoordinates object or null if invalid
 */
export function createValidatedCoordinates(
  lat: number,
  lng: number
): ValidatedCoordinates | null {
  const validation = validateCoordinates(lat, lng);
  
  if (!validation.isValid) {
    return null;
  }

  const rounded = roundCoordinates(lat, lng);

  return {
    lat,
    lng,
    rounded,
    precision: 0.01,
  };
}
