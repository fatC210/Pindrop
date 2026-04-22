import { describe, expect, it } from 'vitest';

import type { NominatimResponse } from '@/utils/nominatim';
import { inferLocalScene } from '@/utils/geocoding/localSceneInferrer';

describe('localSceneInferrer', () => {
  it('infers a transit hub from station-like point semantics rather than city alone', () => {
    const response: NominatimResponse = {
      display_name: 'West Kowloon Station, Austin Road West, Yau Tsim Mong, Hong Kong, China',
      name: 'West Kowloon Station',
      category: 'railway',
      type: 'station',
      addresstype: 'railway',
      address: {
        city: 'Hong Kong',
        road: 'Austin Road West',
        railway: 'West Kowloon Station',
        country: 'China',
      },
    };

    const result = inferLocalScene(response, {
      regionType: 'city_center',
      terrain: 'plain',
      nearWater: null,
      urbanDensity: 0.92,
    });

    expect(result.sceneType).toBe('transit_hub');
    expect(result.sceneTags).toContain('transit');
    expect(result.sceneConfidence).toBeGreaterThan(0.6);
  });

  it('infers a park from point-level green-space cues inside a dense city', () => {
    const response: NominatimResponse = {
      display_name: 'Temple of Heaven Park, Beijing, China',
      name: 'Temple of Heaven Park',
      category: 'leisure',
      type: 'park',
      addresstype: 'park',
      address: {
        city: 'Beijing',
        leisure: 'Temple of Heaven Park',
        road: 'Tiantan East Road',
        country: 'China',
      },
    };

    const result = inferLocalScene(response, {
      regionType: 'city_center',
      terrain: 'plain',
      nearWater: null,
      urbanDensity: 0.94,
    });

    expect(result.sceneType).toBe('park');
    expect(result.sceneTags).toContain('park');
  });

  it('infers a harbor from dockside semantics on a coastal point', () => {
    const response: NominatimResponse = {
      display_name: 'Victoria Harbour, Tsim Sha Tsui Pier, Hong Kong, China',
      name: 'Tsim Sha Tsui Pier',
      category: 'amenity',
      type: 'ferry_terminal',
      addresstype: 'amenity',
      address: {
        city: 'Hong Kong',
        pier: 'Tsim Sha Tsui Pier',
        harbour: 'Victoria Harbour',
        country: 'China',
      },
    };

    const result = inferLocalScene(response, {
      regionType: 'city_center',
      terrain: 'coast',
      nearWater: 'sea',
      urbanDensity: 0.88,
    });

    expect(result.sceneType).toBe('harbor');
    expect(result.sceneTags).toContain('harbor');
  });
});
