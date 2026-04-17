// Utility functions exports
export { validateCoordinates, roundCoordinates } from './coordinates';
export { calculateDistance, clampZoom } from './distance';
export { getTimeSlot, getTimeSlotColor } from './timeSlot';
export { generateCacheKey, generateCacheKeyNow } from './cacheKey';
export { initDB, getDB, isIndexedDBAvailable } from './db';
export { getCachedGeocode, cacheGeocode } from './geocodeCache';
export type { GeocodingResult } from './geocodeCache';
export {
  getCachedSoundscape,
  cacheSoundscape,
  checkCacheExists,
  getCachedMarkers,
  updatePlayStats,
  evictLRU,
  handleStorageQuotaExceeded,
} from './soundscapeCache';
export type { CachedSoundscape } from './soundscapeCache';
export {
  reverseGeocode,
  extractGeocodingInfo,
  inferFromCoordinates,
  getGeocodingInfo,
} from './nominatim';
export type { NominatimResponse } from './nominatim';
export {
  throttleNominatimRequest,
  shouldAllowRequest,
  recordRequest,
} from './throttle';
