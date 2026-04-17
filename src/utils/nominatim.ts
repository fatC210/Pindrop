// Nominatim reverse geocoding API client
import { GeocodingResult, getCachedGeocode, cacheGeocode } from './geocodeCache';

export interface NominatimResponse {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    state?: string;
    county?: string;
  };
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT = 3000; // 3 seconds

/**
 * Reverse geocode coordinates using Nominatim API
 * Includes 3-second timeout and required User-Agent header
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<NominatimResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PinDrop/1.0 (https://github.com/pindrop/pindrop)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[PinDrop Error] Nominatim API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as NominatimResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[PinDrop] Nominatim request timed out after 3s');
    } else {
      console.error('[PinDrop Error] Nominatim request failed:', error);
    }
    
    return null;
  }
}

/**
 * Extract geocoding information from Nominatim response
 * Handles missing fields gracefully with fallbacks
 */
export function extractGeocodingInfo(
  response: NominatimResponse,
  lat: number,
  lng: number
): GeocodingResult {
  const address = response.address || {};
  
  // Extract city name with fallbacks
  const cityName = address.city || address.town || address.village || 'Unknown Location';
  
  // Extract country name
  const countryName = address.country || 'Unknown Country';
  
  // Extract administrative region
  const administrativeRegion = address.state || address.county || '';
  
  // Infer timezone from longitude (approximate)
  const timezone = inferTimezoneFromLongitude(lng);
  
  // Default language (can be enhanced with country-to-language mapping)
  const language = 'en';
  
  return {
    cityName,
    countryName,
    administrativeRegion,
    timezone,
    language,
    isInferred: false,
  };
}

/**
 * Infer timezone from longitude (approximate)
 * Each 15° of longitude ≈ 1 hour time difference
 */
function inferTimezoneFromLongitude(lng: number): string {
  const offset = Math.round(lng / 15);
  const sign = offset >= 0 ? '+' : '';
  return `UTC${sign}${offset}`;
}

/**
 * Check if coordinates are in ocean (simplified heuristic)
 * Returns true if likely over water
 */
function isOcean(lat: number, lng: number): boolean {
  // Simplified ocean detection - can be enhanced with actual ocean data
  // For now, use basic heuristics for major ocean areas
  
  // Pacific Ocean (large area)
  if (lng > 120 || lng < -120) {
    if (Math.abs(lat) < 60) {
      return true;
    }
  }
  
  // Atlantic Ocean
  if (lng > -60 && lng < -10 && Math.abs(lat) < 50) {
    return true;
  }
  
  // Indian Ocean
  if (lng > 40 && lng < 100 && lat < 20 && lat > -40) {
    return true;
  }
  
  return false;
}

/**
 * Check if coordinates are in polar region
 */
function isPolar(lat: number): boolean {
  return Math.abs(lat) > 66.5;
}

/**
 * Infer geocoding information from coordinates when Nominatim fails
 * Handles ocean, polar, and other edge cases
 */
export function inferFromCoordinates(lat: number, lng: number): GeocodingResult {
  // Check for ocean
  if (isOcean(lat, lng)) {
    return {
      cityName: 'Ocean',
      countryName: 'International Waters',
      administrativeRegion: '',
      timezone: inferTimezoneFromLongitude(lng),
      language: 'en',
      isInferred: true,
    };
  }
  
  // Check for polar regions
  if (isPolar(lat)) {
    const region = lat > 0 ? 'Arctic' : 'Antarctic';
    return {
      cityName: region,
      countryName: 'Polar Region',
      administrativeRegion: '',
      timezone: inferTimezoneFromLongitude(lng),
      language: 'en',
      isInferred: true,
    };
  }
  
  // Generic fallback for other cases
  return {
    cityName: `Location at ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    countryName: 'Unknown',
    administrativeRegion: '',
    timezone: inferTimezoneFromLongitude(lng),
    language: 'en',
    isInferred: true,
  };
}

/**
 * Get geocoding information for coordinates
 * Checks cache first, then calls Nominatim API, falls back to inference
 */
export async function getGeocodingInfo(
  lat: number,
  lng: number
): Promise<GeocodingResult> {
  // 1. Check cache first
  const cached = await getCachedGeocode(lat, lng);
  if (cached) {
    return cached;
  }
  
  // 2. Try Nominatim API
  const response = await reverseGeocode(lat, lng);
  
  if (response) {
    const result = extractGeocodingInfo(response, lat, lng);
    
    // Cache successful result
    await cacheGeocode(lat, lng, result);
    
    return result;
  }
  
  // 3. Fall back to coordinate inference
  const inferred = inferFromCoordinates(lat, lng);
  
  // Cache inferred result too (to avoid repeated API calls)
  await cacheGeocode(lat, lng, inferred);
  
  return inferred;
}
