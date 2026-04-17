// Request throttling and rate limiting for Nominatim API
import { roundCoordinates } from './coordinates';

interface QueuedRequest {
  lat: number;
  lng: number;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

class RequestThrottleManager {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly minInterval = 1000; // 1 second between requests

  /**
   * Add request to queue and process sequentially
   * Ensures 1 request per second rate limit
   */
  async enqueue<T>(
    lat: number,
    lng: number,
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ lat, lng, resolve: resolve as (value: unknown) => void, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      // Wait if necessary to maintain 1 req/sec
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        // Execute the request (passed from caller)
        // Note: This is a simplified version - actual implementation
        // would need to pass the request function through the queue
        this.lastRequestTime = Date.now();
        request.resolve(null);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }
}

// Singleton instance
const throttleManager = new RequestThrottleManager();

/**
 * Throttle Nominatim requests to 1 per second
 */
export async function throttleNominatimRequest<T>(
  lat: number,
  lng: number,
  requestFn: () => Promise<T>
): Promise<T> {
  // For now, implement simple time-based throttling
  // Queue-based throttling can be added if needed
  const now = Date.now();
  const key = 'nominatim_last_request';
  const lastRequest = parseInt(localStorage.getItem(key) || '0', 10);
  
  const timeSinceLastRequest = now - lastRequest;
  if (timeSinceLastRequest < 1000) {
    // Wait for remaining time
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 - timeSinceLastRequest)
    );
  }
  
  localStorage.setItem(key, Date.now().toString());
  return requestFn();
}

// Cooldown tracking for coordinates
interface CooldownEntry {
  timestamp: number;
  coordinates: string; // Rounded coordinates as key
}

const cooldownMap = new Map<string, number>();
const COOLDOWN_PERIOD = 10000; // 10 seconds

/**
 * Generate cooldown key from coordinates with 0.01° precision
 */
function generateCooldownKey(lat: number, lng: number): string {
  const [roundedLat, roundedLng] = roundCoordinates(lat, lng);
  return `${roundedLat.toFixed(2)},${roundedLng.toFixed(2)}`;
}

/**
 * Check if a request should be allowed based on cooldown period
 * Enforces 10-second cooldown per coordinate (0.01° precision)
 */
export function shouldAllowRequest(lat: number, lng: number): boolean {
  const key = generateCooldownKey(lat, lng);
  const lastRequestTime = cooldownMap.get(key);
  
  if (!lastRequestTime) {
    return true;
  }
  
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  return timeSinceLastRequest >= COOLDOWN_PERIOD;
}

/**
 * Record a request for cooldown tracking
 */
export function recordRequest(lat: number, lng: number): void {
  const key = generateCooldownKey(lat, lng);
  cooldownMap.set(key, Date.now());
  
  // Clean up old entries (older than cooldown period)
  const now = Date.now();
  for (const [k, timestamp] of cooldownMap.entries()) {
    if (now - timestamp > COOLDOWN_PERIOD) {
      cooldownMap.delete(k);
    }
  }
}
