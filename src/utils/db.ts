// IndexedDB schema and initialization for PinDrop
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { LocationContext } from '@/types/locationContext';

/**
 * Database schema for PinDrop application
 */
interface PinDropDB extends DBSchema {
  soundscape_cache: {
    key: string; // Cache key: "{lat},{lng}-{timeSlot}"
    value: {
      id: string;
      coordinates: [number, number];
      timeSlot: 'dawn' | 'day' | 'dusk' | 'night';
      cityName: string;
      countryName: string;
      administrativeRegionName?: string;
      regionName?: string;
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
      recipe?: unknown; // SoundscapeRecipe type (to be defined later)
    };
    indexes: {
      'by-lastPlayedAt': number;
      'by-coordinates': string;
    };
  };
  geocode_cache: {
    key: string; // "{lat},{lng}" with 0.01° precision
    value: {
      key: string;
      result: {
        cityName: string;
        countryName: string;
        administrativeRegion: string;
        timezone: string;
        language: string;
        isInferred: boolean;
      };
      locationContext?: LocationContext;
      cachedAt: number;
    };
    indexes: {
      'by-cachedAt': number;
    };
  };
  location_history: {
    key: number; // Auto-increment
    value: {
      id?: number;
      coordinates: [number, number];
      visitedAt: number;
      soundscapeId: string;
    };
    indexes: {
      'by-visitedAt': number;
      'by-soundscapeId': string;
    };
  };
}

const DB_NAME = 'pindrop';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PinDropDB> | null = null;

/**
 * Initialize and open the IndexedDB database
 * Creates object stores and indexes if they don't exist
 */
export async function initDB(): Promise<IDBPDatabase<PinDropDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<PinDropDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create soundscape_cache store
        if (!db.objectStoreNames.contains('soundscape_cache')) {
          const soundscapeStore = db.createObjectStore('soundscape_cache', {
            keyPath: 'id',
          });
          soundscapeStore.createIndex('by-lastPlayedAt', 'lastPlayedAt');
          soundscapeStore.createIndex('by-coordinates', 'coordinates');
        }

        // Create geocode_cache store
        if (!db.objectStoreNames.contains('geocode_cache')) {
          const geocodeStore = db.createObjectStore('geocode_cache', {
            keyPath: 'key',
          });
          geocodeStore.createIndex('by-cachedAt', 'cachedAt');
        }

        // Create location_history store
        if (!db.objectStoreNames.contains('location_history')) {
          const historyStore = db.createObjectStore('location_history', {
            keyPath: 'id',
            autoIncrement: true,
          });
          historyStore.createIndex('by-visitedAt', 'visitedAt');
          historyStore.createIndex('by-soundscapeId', 'soundscapeId');
        }
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('[PinDrop Error] IndexedDB initialization failed:', error);
    throw error;
  }
}

/**
 * Get the database instance, initializing if necessary
 */
export async function getDB(): Promise<IDBPDatabase<PinDropDB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
