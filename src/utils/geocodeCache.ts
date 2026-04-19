// Geocoding cache operations with 0.01° precision matching
import { getDB } from './db';
import { roundCoordinates } from './coordinates';
import type { LocationContext } from '@/types/locationContext';

export interface GeocodingResult {
  cityName: string;
  countryName: string;
  administrativeRegion: string;
  timezone: string;
  language: string;
  isInferred: boolean;
}

function toLegacyResult(locationContext: LocationContext): GeocodingResult {
  return {
    cityName: locationContext.cityName,
    countryName: locationContext.countryName,
    administrativeRegion: '',
    timezone: locationContext.timezone,
    language: locationContext.primaryLanguage,
    isInferred: locationContext.regionType === 'ocean' || locationContext.regionType === 'polar',
  };
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
    
    if (cached?.locationContext) {
      return toLegacyResult(cached.locationContext);
    }

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

/**
 * Get cached LocationContext for coordinates when available.
 * Falls back to null for legacy cache entries.
 */
export async function getCachedLocationContext(
  lat: number,
  lng: number
): Promise<LocationContext | null> {
  try {
    const db = await getDB();
    const key = generateGeocodeKey(lat, lng);
    const cached = await db.get('geocode_cache', key);
    return cached?.locationContext ?? null;
  } catch (error) {
    console.error('[PinDrop Error] Failed to get cached location context:', error);
    return null;
  }
}

/**
 * Cache a full LocationContext while keeping a legacy-compatible geocode result.
 */
export async function cacheLocationContext(
  lat: number,
  lng: number,
  locationContext: LocationContext
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateGeocodeKey(lat, lng);

    await db.put('geocode_cache', {
      key,
      result: toLegacyResult(locationContext),
      locationContext,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('[PinDrop Error] Failed to cache location context:', error);
  }
}
