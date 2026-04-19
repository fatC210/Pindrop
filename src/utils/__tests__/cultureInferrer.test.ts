/**
 * CultureInferrer 单元测试
 *
 * 测试文化区域和宗教映射：
 * - 主要国家的文化区域
 * - 主要国家的宗教
 * - 未知国家兜底
 *
 * 需求覆盖: 13.1-13.5
 */

import { describe, it, expect } from 'vitest';
import { inferCulture } from '@/utils/geocoding/cultureInferrer';

describe('CultureInferrer Unit Tests', () => {
  describe('西欧文化区域', () => {
    it('France 应返回 western_europe + christianity', () => {
      const result = inferCulture('France');

      expect(result.cultureRegion).toBe('western_europe');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Germany 应返回 western_europe + christianity', () => {
      const result = inferCulture('Germany');

      expect(result.cultureRegion).toBe('western_europe');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('United Kingdom 应返回 western_europe + christianity', () => {
      const result = inferCulture('United Kingdom');

      expect(result.cultureRegion).toBe('western_europe');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('东欧文化区域', () => {
    it('Russia 应返回 eastern_europe + christianity', () => {
      const result = inferCulture('Russia');

      expect(result.cultureRegion).toBe('eastern_europe');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Poland 应返回 eastern_europe + christianity', () => {
      const result = inferCulture('Poland');

      expect(result.cultureRegion).toBe('eastern_europe');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('东亚文化区域', () => {
    it('China 应返回 east_asia + folk_religion', () => {
      const result = inferCulture('China');

      expect(result.cultureRegion).toBe('east_asia');
      expect(result.dominantReligion).toBe('folk_religion');
    });

    it('Japan 应返回 east_asia + shinto', () => {
      const result = inferCulture('Japan');

      expect(result.cultureRegion).toBe('east_asia');
      expect(result.dominantReligion).toBe('shinto');
    });

    it('South Korea 应返回 east_asia + buddhism', () => {
      const result = inferCulture('South Korea');

      expect(result.cultureRegion).toBe('east_asia');
      expect(result.dominantReligion).toBe('buddhism');
    });
  });

  describe('南亚文化区域', () => {
    it('India 应返回 south_asia + hinduism', () => {
      const result = inferCulture('India');

      expect(result.cultureRegion).toBe('south_asia');
      expect(result.dominantReligion).toBe('hinduism');
    });

    it('Pakistan 应返回 south_asia + islam', () => {
      const result = inferCulture('Pakistan');

      expect(result.cultureRegion).toBe('south_asia');
      expect(result.dominantReligion).toBe('islam');
    });

    it('Bangladesh 应返回 south_asia + islam', () => {
      const result = inferCulture('Bangladesh');

      expect(result.cultureRegion).toBe('south_asia');
      expect(result.dominantReligion).toBe('islam');
    });
  });

  describe('东南亚文化区域', () => {
    it('Thailand 应返回 southeast_asia + buddhism', () => {
      const result = inferCulture('Thailand');

      expect(result.cultureRegion).toBe('southeast_asia');
      expect(result.dominantReligion).toBe('buddhism');
    });

    it('Indonesia 应返回 southeast_asia + islam', () => {
      const result = inferCulture('Indonesia');

      expect(result.cultureRegion).toBe('southeast_asia');
      expect(result.dominantReligion).toBe('islam');
    });

    it('Philippines 应返回 southeast_asia + christianity', () => {
      const result = inferCulture('Philippines');

      expect(result.cultureRegion).toBe('southeast_asia');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('中东文化区域', () => {
    it('Saudi Arabia 应返回 middle_east + islam', () => {
      const result = inferCulture('Saudi Arabia');

      expect(result.cultureRegion).toBe('middle_east');
      expect(result.dominantReligion).toBe('islam');
    });

    it('Israel 应返回 middle_east + judaism', () => {
      const result = inferCulture('Israel');

      expect(result.cultureRegion).toBe('middle_east');
      expect(result.dominantReligion).toBe('judaism');
    });

    it('Turkey 应返回 middle_east + islam', () => {
      const result = inferCulture('Turkey');

      expect(result.cultureRegion).toBe('middle_east');
      expect(result.dominantReligion).toBe('islam');
    });
  });

  describe('北非文化区域', () => {
    it('Egypt 应返回 north_africa + islam', () => {
      const result = inferCulture('Egypt');

      expect(result.cultureRegion).toBe('north_africa');
      expect(result.dominantReligion).toBe('islam');
    });

    it('Morocco 应返回 north_africa + islam', () => {
      const result = inferCulture('Morocco');

      expect(result.cultureRegion).toBe('north_africa');
      expect(result.dominantReligion).toBe('islam');
    });
  });

  describe('撒哈拉以南非洲文化区域', () => {
    it('Nigeria 应返回 sub_saharan_africa + christianity', () => {
      const result = inferCulture('Nigeria');

      expect(result.cultureRegion).toBe('sub_saharan_africa');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Kenya 应返回 sub_saharan_africa + christianity', () => {
      const result = inferCulture('Kenya');

      expect(result.cultureRegion).toBe('sub_saharan_africa');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Senegal 应返回 sub_saharan_africa + islam', () => {
      const result = inferCulture('Senegal');

      expect(result.cultureRegion).toBe('sub_saharan_africa');
      expect(result.dominantReligion).toBe('islam');
    });
  });

  describe('拉丁美洲文化区域', () => {
    it('Brazil 应返回 latin_america + christianity', () => {
      const result = inferCulture('Brazil');

      expect(result.cultureRegion).toBe('latin_america');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Mexico 应返回 latin_america + christianity', () => {
      const result = inferCulture('Mexico');

      expect(result.cultureRegion).toBe('latin_america');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Argentina 应返回 latin_america + christianity', () => {
      const result = inferCulture('Argentina');

      expect(result.cultureRegion).toBe('latin_america');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('北美文化区域', () => {
    it('United States 应返回 north_america + christianity', () => {
      const result = inferCulture('United States');

      expect(result.cultureRegion).toBe('north_america');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('Canada 应返回 north_america + christianity', () => {
      const result = inferCulture('Canada');

      expect(result.cultureRegion).toBe('north_america');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('中亚文化区域', () => {
    it('Kazakhstan 应返回 central_asia + islam', () => {
      const result = inferCulture('Kazakhstan');

      expect(result.cultureRegion).toBe('central_asia');
      expect(result.dominantReligion).toBe('islam');
    });

    it('Mongolia 应返回 central_asia + buddhism', () => {
      const result = inferCulture('Mongolia');

      expect(result.cultureRegion).toBe('central_asia');
      expect(result.dominantReligion).toBe('buddhism');
    });
  });

  describe('大洋洲文化区域', () => {
    it('Australia 应返回 oceania + christianity', () => {
      const result = inferCulture('Australia');

      expect(result.cultureRegion).toBe('oceania');
      expect(result.dominantReligion).toBe('christianity');
    });

    it('New Zealand 应返回 oceania + christianity', () => {
      const result = inferCulture('New Zealand');

      expect(result.cultureRegion).toBe('oceania');
      expect(result.dominantReligion).toBe('christianity');
    });
  });

  describe('未知国家兜底', () => {
    it('未知国家应返回 unknown + none', () => {
      const result = inferCulture('Unknown Country');

      expect(result.cultureRegion).toBe('unknown');
      expect(result.dominantReligion).toBe('none');
    });

    it('空字符串应返回 unknown + none', () => {
      const result = inferCulture('');

      expect(result.cultureRegion).toBe('unknown');
      expect(result.dominantReligion).toBe('none');
    });
  });
});
