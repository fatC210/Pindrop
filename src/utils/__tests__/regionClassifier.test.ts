/**
 * RegionClassifier 单元测试
 *
 * 测试区域类型分类和城市密度推断：
 * - city → city_center (0.9)
 * - city + suburb → city_suburb (0.6)
 * - town → town (0.3)
 * - village → village (0.15)
 * - 仅 county/state → rural (0.05)
 * - 空 address → rural 兜底
 *
 * 需求覆盖: 9.1-9.6
 */

import { describe, it, expect } from 'vitest';
import { classifyRegion } from '@/utils/geocoding/regionClassifier';
import type { NominatimResponse } from '@/utils/nominatim';

describe('RegionClassifier Unit Tests', () => {
  it('city 字段应返回 city_center (urbanDensity: 0.9)', () => {
    const address: NominatimResponse['address'] = {
      city: 'Paris',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('city_center');
    expect(result.urbanDensity).toBe(0.9);
  });

  it('city + suburb 应返回 city_suburb (urbanDensity: 0.6)', () => {
    const address: NominatimResponse['address'] = {
      city: 'Paris',
      suburb: 'Montmartre',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('city_suburb');
    expect(result.urbanDensity).toBe(0.6);
  });

  it('town 应返回 town (urbanDensity: 0.3)', () => {
    const address: NominatimResponse['address'] = {
      town: 'Grasse',
      county: 'Alpes-Maritimes',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('town');
    expect(result.urbanDensity).toBe(0.3);
  });

  it('village 应返回 village (urbanDensity: 0.15)', () => {
    const address: NominatimResponse['address'] = {
      village: 'Gordes',
      county: 'Vaucluse',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('village');
    expect(result.urbanDensity).toBe(0.15);
  });

  it('hamlet 应返回 village (urbanDensity: 0.15)', () => {
    const address: NominatimResponse['address'] = {
      hamlet: 'Small Hamlet',
      county: 'Rural County',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('village');
    expect(result.urbanDensity).toBe(0.15);
  });

  it('仅 county/state 应返回 rural (urbanDensity: 0.05)', () => {
    const address: NominatimResponse['address'] = {
      county: 'Rural County',
      state: 'Some State',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('rural');
    expect(result.urbanDensity).toBe(0.05);
  });

  it('空 address 应返回 rural 兜底', () => {
    const address: NominatimResponse['address'] = {};

    const result = classifyRegion(address);

    expect(result.regionType).toBe('rural');
    expect(result.urbanDensity).toBe(0.05);
  });

  it('undefined address 应返回 rural 兜底', () => {
    const result = classifyRegion(undefined as any);

    expect(result.regionType).toBe('rural');
    expect(result.urbanDensity).toBe(0.05);
  });

  it('优先级测试：city + suburb 优先于 city', () => {
    const address: NominatimResponse['address'] = {
      city: 'Paris',
      suburb: 'Montmartre',
      town: 'SomeTown', // 应被忽略
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('city_suburb');
    expect(result.urbanDensity).toBe(0.6);
  });

  it('优先级测试：city 优先于 town', () => {
    const address: NominatimResponse['address'] = {
      city: 'Paris',
      town: 'SomeTown', // 应被忽略
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('city_center');
    expect(result.urbanDensity).toBe(0.9);
  });

  it('优先级测试：town 优先于 village', () => {
    const address: NominatimResponse['address'] = {
      town: 'Grasse',
      village: 'SomeVillage', // 应被忽略
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('town');
    expect(result.urbanDensity).toBe(0.3);
  });

  it('优先级测试：village 优先于 county', () => {
    const address: NominatimResponse['address'] = {
      village: 'Gordes',
      county: 'Vaucluse',
      country: 'France',
    };

    const result = classifyRegion(address);

    expect(result.regionType).toBe('village');
    expect(result.urbanDensity).toBe(0.15);
  });
});
