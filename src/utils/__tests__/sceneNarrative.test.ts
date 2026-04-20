import { describe, expect, it } from 'vitest';
import type { LocationContext } from '@/types/locationContext';
import { getSelectedSoundCues, getSoundSummary } from '../soundscape/sceneNarrative';

const HANPU_CONTEXT: LocationContext = {
  cityName: '含浦街道',
  countryName: '中国',
  regionType: 'town',
  coordinates: [28.12, 112.91],
  primaryLanguage: 'zh',
  languageVariant: 'zh-CN',
  secondaryLanguages: [],
  timezone: 'Asia/Shanghai',
  currentLocalHour: 15,
  timeSlot: 'day',
  cultureRegion: 'east_asia',
  dominantReligion: 'none',
  urbanDensity: 0.45,
  terrain: 'plain',
  nearWater: null,
  climate: 'temperate',
  economicLevel: 0.7,
};

const BAOAN_CONTEXT: LocationContext = {
  cityName: '宝安区',
  regionName: '深圳市',
  countryName: '中国',
  regionType: 'city_suburb',
  coordinates: [22.555, 113.883],
  primaryLanguage: 'zh',
  languageVariant: 'zh-CN',
  secondaryLanguages: [],
  timezone: 'Asia/Shanghai',
  currentLocalHour: 15,
  timeSlot: 'day',
  cultureRegion: 'east_asia',
  dominantReligion: 'none',
  urbanDensity: 0.82,
  terrain: 'plain',
  nearWater: null,
  climate: 'temperate',
  economicLevel: 0.85,
};

const BEIJING_CONTEXT: LocationContext = {
  cityName: '北京市',
  regionName: '西城区',
  countryName: '中国',
  regionType: 'city_center',
  coordinates: [39.9042, 116.4074],
  primaryLanguage: 'zh',
  languageVariant: 'zh-CN',
  secondaryLanguages: [],
  timezone: 'Asia/Shanghai',
  currentLocalHour: 10,
  timeSlot: 'day',
  cultureRegion: 'east_asia',
  dominantReligion: 'none',
  urbanDensity: 0.95,
  terrain: 'plain',
  nearWater: null,
  climate: 'temperate',
  economicLevel: 0.9,
};

const GUILIN_CONTEXT: LocationContext = {
  cityName: '桂林市',
  regionName: '广西壮族自治区',
  countryName: '中国',
  regionType: 'city_center',
  coordinates: [25.2742, 110.2964],
  primaryLanguage: 'zh',
  languageVariant: 'zh-CN',
  secondaryLanguages: [],
  timezone: 'Asia/Shanghai',
  currentLocalHour: 16,
  timeSlot: 'day',
  cultureRegion: 'east_asia',
  dominantReligion: 'none',
  urbanDensity: 0.7,
  terrain: 'river',
  nearWater: 'river',
  climate: 'temperate',
  economicLevel: 0.73,
};

describe('sceneNarrative', () => {
  it('prioritizes region-specific cues before broad culture cues for everyday places', () => {
    const townCues = getSelectedSoundCues(HANPU_CONTEXT);
    const suburbCues = getSelectedSoundCues(BAOAN_CONTEXT);

    expect(townCues[0]?.label['zh-CN']).toBe('小镇广场低声人群');
    expect(suburbCues[0]?.label['zh-CN']).toBe('街区里的零散人声');
  });

  it('writes summaries with the specific location name and a differentiated opening', () => {
    const townSummary = getSoundSummary(HANPU_CONTEXT, 'zh-CN');
    const suburbSummary = getSoundSummary(BAOAN_CONTEXT, 'zh-CN');

    expect(townSummary).toContain('在含浦街道');
    expect(suburbSummary).toContain('在宝安区');
    expect(townSummary).toContain('小镇街口');
    expect(suburbSummary).toContain('城市街区');
    expect(townSummary).not.toBe(suburbSummary);
  });

  it('uses Beijing-specific anchor cues before generic East Asia defaults', () => {
    const beijingCues = getSelectedSoundCues(BEIJING_CONTEXT);
    const beijingSummary = getSoundSummary(BEIJING_CONTEXT, 'zh-CN');

    expect(beijingCues[0]?.label['zh-CN']).toBe('冰糖葫芦叫卖声');
    expect(beijingCues[1]?.label['zh-CN']).toBe('公园里下象棋的笑谈声');
    expect(beijingSummary).toContain('冰糖葫芦叫卖声');
    expect(beijingSummary).toContain('公园里下象棋的笑谈声');
  });

  it('uses Guilin river anchors before generic city cues', () => {
    const guilinCues = getSelectedSoundCues(GUILIN_CONTEXT);
    const guilinSummary = getSoundSummary(GUILIN_CONTEXT, 'zh-CN');

    expect(guilinCues[0]?.label['zh-CN']).toBe('木桨划过漓江水声');
    expect(guilinCues[1]?.label['zh-CN']).toBe('水风车转动与流水声');
    expect(guilinSummary).toContain('木桨划过漓江水声');
    expect(guilinSummary).toContain('水风车转动与流水声');
  });
});
