// Soundscape cache operations
import { getDB } from './db';

export interface CachedSoundscape {
  id: string;
  coordinates: [number, number];
  timeSlot: 'dawn' | 'day' | 'dusk' | 'night';
  cityName: string;
  countryName: string;
  generatedAt: number;
  playCount: number;
  lastPlayedAt: number;
  sizeBytes: number;
  audioBlobs?: {
    ambient?: Blob;
    signature?: Blob;
    dialogue?: Blob;
    secondaryDialogue?: Blob;
    atmosphere?: Blob;
  };
  recipe?: unknown;
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'QuotaExceededError' || error.message.includes('QuotaExceeded');
}

async function writeSoundscapeCacheEntry(
  cacheKey: string,
  data: Omit<CachedSoundscape, 'id'>
): Promise<void> {
  const db = await getDB();

  await db.put('soundscape_cache', {
    ...data,
    id: cacheKey,
  });
}

/**
 * Get cached soundscape by cache key
 */
export async function getCachedSoundscape(
  cacheKey: string
): Promise<CachedSoundscape | null> {
  try {
    const db = await getDB();
    const cached = await db.get('soundscape_cache', cacheKey);
    
    if (cached) {
      return cached;
    }
    
    return null;
  } catch (error) {
    console.error('[PinDrop Error] Failed to get cached soundscape:', error);
    return null;
  }
}

/**
 * Cache soundscape data
 */
export async function cacheSoundscape(
  cacheKey: string,
  data: Omit<CachedSoundscape, 'id'>
): Promise<void> {
  try {
    await writeSoundscapeCacheEntry(cacheKey, data);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      try {
        await evictLRU();
        await writeSoundscapeCacheEntry(cacheKey, data);
        return;
      } catch (retryError) {
        console.error('[PinDrop Error] Failed to cache soundscape after LRU eviction:', retryError);
        return;
      }
    }

    console.error('[PinDrop Error] Failed to cache soundscape:', error);
  }
}

/**
 * Check if a soundscape exists in cache
 */
export async function checkCacheExists(cacheKey: string): Promise<boolean> {
  try {
    const db = await getDB();
    const cached = await db.get('soundscape_cache', cacheKey);
    return cached !== undefined;
  } catch (error) {
    console.error('[PinDrop Error] Failed to check cache existence:', error);
    return false;
  }
}

/**
 * Get all cached soundscape markers
 */
export async function getCachedMarkers(): Promise<CachedSoundscape[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('soundscape_cache');
    return all;
  } catch (error) {
    console.error('[PinDrop Error] Failed to get cached markers:', error);
    return [];
  }
}

/**
 * Update last played timestamp and increment play count
 */
export async function updatePlayStats(cacheKey: string): Promise<void> {
  try {
    const db = await getDB();
    const cached = await db.get('soundscape_cache', cacheKey);
    
    if (cached) {
      cached.lastPlayedAt = Date.now();
      cached.playCount += 1;
      await db.put('soundscape_cache', cached);
    }
  } catch (error) {
    console.error('[PinDrop Error] Failed to update play stats:', error);
  }
}

/**
 * Evict least recently used soundscape from cache
 * Called when storage quota is exceeded
 */
export async function evictLRU(): Promise<void> {
  try {
    const db = await getDB();
    
    // Get all soundscapes sorted by lastPlayedAt
    const tx = db.transaction('soundscape_cache', 'readwrite');
    const index = tx.store.index('by-lastPlayedAt');
    
    // Get the oldest entry (LRU)
    const cursor = await index.openCursor();
    
    if (cursor) {
      const oldestKey = cursor.value.id;
      await db.delete('soundscape_cache', oldestKey);
      console.log(`[PinDrop] Evicted LRU soundscape: ${oldestKey}`);
    }
    
    await tx.done;
  } catch (error) {
    console.error('[PinDrop Error] Failed to evict LRU:', error);
    throw error;
  }
}

/**
 * Handle storage quota exceeded error with LRU eviction
 */
export async function handleStorageQuotaExceeded(
  cacheKey: string,
  data: Omit<CachedSoundscape, 'id'>
): Promise<void> {
  try {
    // Evict LRU entry
    await evictLRU();
    
    // Retry caching
    await writeSoundscapeCacheEntry(cacheKey, data);
  } catch (error) {
    console.error('[PinDrop Error] Failed to handle storage quota:', error);
    throw error;
  }
}
