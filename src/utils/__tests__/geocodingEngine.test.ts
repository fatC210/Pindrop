import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLocationContext, resolveLocation } from '@/utils/geocoding/geocodingEngine';
import * as geocodeCacheModule from '@/utils/geocodeCache';
import * as nominatimModule from '@/utils/nominatim';
import type { NominatimResponse } from '@/utils/nominatim';

describe('GeocodingEngine Unit Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('coordinate validation', () => {
    it('rejects invalid latitude below -90', async () => {
      await expect(resolveLocation(-91, 0)).rejects.toThrow('Invalid coordinates');
    });

    it('rejects invalid latitude above 90', async () => {
      await expect(resolveLocation(91, 0)).rejects.toThrow('Invalid coordinates');
    });

    it('rejects invalid longitude below -180', async () => {
      await expect(resolveLocation(0, -181)).rejects.toThrow('Invalid coordinates');
    });

    it('rejects invalid longitude above 180', async () => {
      await expect(resolveLocation(0, 181)).rejects.toThrow('Invalid coordinates');
    });

    it('accepts valid coordinates', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);

      await expect(resolveLocation(0, 0)).resolves.toBeDefined();
    });
  });

  describe('successful Nominatim path', () => {
    it('builds a complete LocationContext from a Nominatim response', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
          country_code: 'fr',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(mockResponse);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(48.86, 2.35);

      expect(context.administrativeRegionName).toBeUndefined();
      expect(context.cityName).toBe('Paris');
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.coordinates).toEqual([48.86, 2.35]);
    });

    it('caches successful results', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Tokyo, Japan',
        address: {
          city: 'Tokyo',
          country: 'Japan',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(mockResponse);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      const cacheLocationContextSpy = vi
        .spyOn(geocodeCacheModule, 'cacheLocationContext')
        .mockResolvedValue();

      await resolveLocation(35.68, 139.65);

      expect(cacheLocationContextSpy).toHaveBeenCalled();
    });
  });

  describe('fallback path', () => {
    it('falls back to coordinate inference when Nominatim returns null', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(0, -30);

      expect(['wilderness', 'ocean', 'polar']).toContain(context.regionType);
      expect(context.coordinates).toEqual([0, -30]);
    });

    it('returns polar context for polar coordinates', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(85, 0);

      expect(context.regionType).toBe('polar');
      expect(context.cityName).toBe('Arctic');
    });

    it('caches inferred fallback results too', async () => {
      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      const cacheLocationContextSpy = vi
        .spyOn(geocodeCacheModule, 'cacheLocationContext')
        .mockResolvedValue();

      await resolveLocation(0, -30);

      expect(cacheLocationContextSpy).toHaveBeenCalled();
    });
  });

  describe('buildLocationContext', () => {
    it('constructs a complete context from Nominatim data', () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
        },
      };

      const context = buildLocationContext(mockResponse, 48.86, 2.35);

      expect(context.administrativeRegionName).toBeUndefined();
      expect(context.cityName).toBe('Paris');
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.urbanDensity).toBe(0.9);
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.cultureRegion).toBe('western_europe');
      expect(context.dominantReligion).toBe('christianity');
      expect(context.coordinates).toEqual([48.86, 2.35]);
    });

    it('uses defaults when address fields are missing', () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Unknown Location',
        address: {},
      };

      const context = buildLocationContext(mockResponse, 0, 0);

      expect(context.cityName).toBe('Unknown Location');
      expect(context.countryName).toBe('Unknown');
      expect(context.regionType).toBe('rural');
      expect(context.urbanDensity).toBe(0.05);
      expect(context.primaryLanguage).toBe('en');
      expect(context.languageVariant).toBe('en-US');
    });
  });

  describe('full example', () => {
    it('keeps province/state separate from city and district', async () => {
      const mockResponse: NominatimResponse = {
        display_name: 'Paris, Île-de-France, France',
        address: {
          city: 'Paris',
          state: 'Île-de-France',
          country: 'France',
          country_code: 'fr',
        },
      };

      vi.spyOn(nominatimModule, 'reverseGeocode').mockResolvedValue(mockResponse);
      vi.spyOn(geocodeCacheModule, 'getCachedLocationContext').mockResolvedValue(null);
      vi.spyOn(geocodeCacheModule, 'cacheLocationContext').mockResolvedValue();

      const context = await resolveLocation(48.86, 2.35);

      expect(context.administrativeRegionName).toBe('Île-de-France');
      expect(context.cityName).toBe('Paris');
      expect(context.regionName).toBeUndefined();
      expect(context.countryName).toBe('France');
      expect(context.regionType).toBe('city_center');
      expect(context.coordinates).toEqual([48.86, 2.35]);
      expect(context.primaryLanguage).toBe('fr');
      expect(context.languageVariant).toBe('fr-FR');
      expect(context.secondaryLanguages).toContain('en');
      expect(context.timezone).toBe('Europe/Paris');
      expect(context.currentLocalHour).toBeGreaterThanOrEqual(0);
      expect(context.currentLocalHour).toBeLessThan(24);
      expect(['dawn', 'day', 'dusk', 'night']).toContain(context.timeSlot);
      expect(context.cultureRegion).toBe('western_europe');
      expect(context.dominantReligion).toBe('christianity');
      expect(context.urbanDensity).toBe(0.9);
      expect(context.terrain).toBe('plain');
      expect(context.nearWater).toBe(null);
      expect(context.climate).toBe('temperate');
      expect(context.economicLevel).toBe(0.8);
    });
  });

  describe('logging', () => {
    it('logs invalid coordinate errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      await expect(resolveLocation(91, 0)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PinDrop Error] GeocodingEngine')
      );
    });
  });
});
