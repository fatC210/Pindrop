import { describe, expect, it } from 'vitest';

import { extractPlaceHierarchy } from '@/utils/placeHierarchy';

describe('extractPlaceHierarchy', () => {
  it('drops street-level names from the visible hierarchy when larger admin areas exist', () => {
    expect(
      extractPlaceHierarchy(
        {
          state_district: '泉州市',
          county: '丰泽区',
          town: '华大街道',
          road: '刺桐路',
          country: '中国',
        },
        {
          unknownLocationLabel: '未知地点',
          unknownCountryLabel: '未知国家',
        }
      )
    ).toEqual({
      administrativeRegionName: undefined,
      cityName: '泉州市',
      regionName: '丰泽区',
      countryName: '中国',
    });
  });

  it('uses the municipality-level admin area as the city when only county and state are returned', () => {
    expect(
      extractPlaceHierarchy(
        {
          county: '西城区',
          state: '北京市',
          country: '中国',
        },
        {
          unknownLocationLabel: '未知地点',
          unknownCountryLabel: '未知国家',
        }
      )
    ).toEqual({
      administrativeRegionName: '北京市',
      cityName: '北京市',
      regionName: '西城区',
      countryName: '中国',
    });
  });

  it('keeps a real town name when it is not street-level and uses the county as the region', () => {
    expect(
      extractPlaceHierarchy(
        {
          town: 'Springfield',
          county: 'Greene County',
          state: 'Missouri',
          country: 'United States',
        },
        {
          unknownLocationLabel: 'Unknown Location',
          unknownCountryLabel: 'Unknown Country',
        }
      )
    ).toEqual({
      administrativeRegionName: 'Missouri',
      cityName: 'Springfield',
      regionName: 'Greene County',
      countryName: 'United States',
    });
  });

  it('ignores street-level county and district names', () => {
    expect(
      extractPlaceHierarchy(
        {
          state: 'Guangdong',
          city: 'Zhaoqing',
          county: '端州区',
          district: '人民路',
          neighbourhood: '城东街道',
          country: 'China',
        },
        {
          unknownLocationLabel: 'Unknown Location',
          unknownCountryLabel: 'Unknown Country',
        }
      )
    ).toEqual({
      administrativeRegionName: 'Guangdong',
      cityName: 'Zhaoqing',
      regionName: '端州区',
      countryName: 'China',
    });
  });
});
