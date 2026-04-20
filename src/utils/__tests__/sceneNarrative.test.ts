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

const XICHENG_CONTEXT: LocationContext = {
  cityName: '西城区',
  countryName: '中国',
  regionType: 'city_suburb',
  coordinates: [39.91, 116.37],
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

describe('sceneNarrative', () => {
  it('prioritizes region-specific cues before broad culture cues for everyday places', () => {
    const townCues = getSelectedSoundCues(HANPU_CONTEXT);
    const suburbCues = getSelectedSoundCues(XICHENG_CONTEXT);

    expect(townCues[0]?.label['zh-CN']).toBe('小镇广场低声人群');
    expect(suburbCues[0]?.label['zh-CN']).toBe('街区里的零散人声');
  });

  it('writes summaries with the specific location name and a differentiated opening', () => {
    const townSummary = getSoundSummary(HANPU_CONTEXT, 'zh-CN');
    const suburbSummary = getSoundSummary(XICHENG_CONTEXT, 'zh-CN');

    expect(townSummary).toContain('在含浦街道');
    expect(suburbSummary).toContain('在西城区');
    expect(townSummary).toContain('小镇街口');
    expect(suburbSummary).toContain('城市街区');
    expect(townSummary).not.toBe(suburbSummary);
  });
});
