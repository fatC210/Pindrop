// Geocoding cache operations with 0.01° precision matching
import { getDB } from './db';
import { roundCoordinates } from './coordinates';

export interface GeocodingResult {
  cityName: string;
  countryName: string;
  administrativeRegion: string;
  timezone: string;
  language: string;
  isInferred: boolean;
}

/**
 * Generate cache key for geocoding results with 0.01° precision
 */
function generateGeocodeKey(lat: number, lng: number): string {
  const [roundedLat, roundedLng] = roundCoordinates(lat, lng);
  return `${roundedLat.toFixed(2)},${roundedLng.toFixed(2)}`;
}

/**
 * Get cached geocoding result for coordinates
 * Uses 0.01° precision matching
 */
export async function getCachedGeocode(
  lat: number,
  lng: number
): Promise<GeocodingResult | null> {
  try {
    const db = await getDB();
    const key = generateGeocodeKey(lat, lng);
    const cached = await db.get('geocode_cache', key);
    
    if (cached) {
      return cached.result;
    }
    
    return null;
  } catch (error) {
    console.error('[PinDrop Error] Failed to get cached geocode:', error);
    return null;
  }
}

/**
 * Cache geocoding result with 0.01° precision
 */
export async function cacheGeocode(
  lat: number,
  lng: number,
  result: GeocodingResult
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateGeocodeKey(lat, lng);
    
    await db.put('geocode_cache', {
      key,
      result,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('[PinDrop Error] Failed to cache geocode:', error);
    // Continue without caching - non-critical error
  }
}
