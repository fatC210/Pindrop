// Utility functions exports
export { validateCoordinates, roundCoordinates } from './coordinates';
export { calculateDistance, clampZoom } from './distance';
export { getTimeSlot, getTimeSlotColor } from './timeSlot';
export { generateCacheKey, generateCacheKeyNow } from './cacheKey';
export { initDB, getDB, isIndexedDBAvailable } from './db';
export {
  getCachedGeocode,
  cacheGeocode,
  getCachedLocationContext,
  cacheLocationContext,
} from './geocodeCache';
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
export { getApiKeyHeader, hasApiKey } from './apiHeaders';
export type { ApiKeyHeader } from './apiHeaders';
export {
  FAVORITES_KEY,
  loadFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
  getFavoritesCount,
} from './favoritesStore';
export {
  addLocationHistory,
  getLocationHistory,
  getHistoryBySoundscapeId,
  clearLocationHistory,
} from './locationHistory';
export type { LocationHistoryEntry } from './locationHistory';
