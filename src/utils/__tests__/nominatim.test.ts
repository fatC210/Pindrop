import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLocalizedPlaceName, reverseGeocode } from '@/utils/nominatim';

describe('nominatim localization helpers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('omits the custom User-Agent header in browser runtime requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await reverseGeocode(48.8566, 2.3522);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('accept-language=en');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.headers).toBeUndefined();
  });

  it('keeps the custom User-Agent header for server-side requests', async () => {
    vi.stubGlobal('window', undefined);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        display_name: 'Paris, France',
        address: {
          city: 'Paris',
          country: 'France',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await reverseGeocode(48.8566, 2.3522);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('accept-language=en');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.headers).toEqual({
      'User-Agent': 'PinDrop/1.0 (https://github.com/pindrop/pindrop)',
    });
  });

  it('returns localized place names for Chinese UI labels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: '西城区, 北京市, 中国',
          address: {
            county: '西城区',
            state: '北京市',
            country: '中国',
          },
        }),
      })
    );

    await expect(getLocalizedPlaceName(39.9042, 116.4074, 'zh-CN')).resolves.toEqual({
      cityName: '北京市',
      regionName: '西城区',
      countryName: '中国',
    });
  });

  it('falls back to localized unknown labels when the reverse geocode payload is missing names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: 'Unknown',
          address: {},
        }),
      })
    );

    await expect(getLocalizedPlaceName(55.7558, 37.6173, 'zh-CN')).resolves.toEqual({
      cityName: '未知地点',
      countryName: '未知国家',
    });
  });
});
