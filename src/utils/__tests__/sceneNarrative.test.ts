import { describe, expect, it } from 'vitest';

import type { LocationContext } from '@/types/locationContext';
import type { SoundscapeNarrativeAnchors } from '@/types/soundscapeRecipe';
import {
  getSelectedSoundCues,
  getSignatureCue,
  getSoundSummary,
} from '../soundscape/sceneNarrative';

const SHITAN_CONTEXT: LocationContext = {
  cityName: 'Shitan',
  regionName: 'Xiangtan County',
  countryName: 'China',
  regionType: 'town',
  coordinates: [27.83, 112.95],
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
  sceneType: 'commercial_district',
  sceneConfidence: 0.76,
  sceneTags: ['market', 'town-center'],
};

const BAOAN_CONTEXT: LocationContext = {
  cityName: 'Baoan District',
  regionName: 'Shenzhen',
  countryName: 'China',
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
  sceneType: 'residential_block',
  sceneConfidence: 0.8,
  sceneTags: ['residential'],
};

const BEIJING_CONTEXT: LocationContext = {
  cityName: 'Beijing',
  regionName: 'Xicheng District',
  countryName: 'China',
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
  sceneType: 'historic_quarter',
  sceneConfidence: 0.79,
  sceneTags: ['historic'],
};

const GUILIN_CONTEXT: LocationContext = {
  cityName: 'Guilin',
  regionName: 'Guangxi',
  countryName: 'China',
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
  sceneType: 'riverfront',
  sceneConfidence: 0.82,
  sceneTags: ['river'],
};

describe('sceneNarrative', () => {
  it('returns differentiated fallback cues for everyday places instead of reusing one generic lead', () => {
    const townCues = getSelectedSoundCues(SHITAN_CONTEXT);
    const suburbCues = getSelectedSoundCues(BAOAN_CONTEXT);

    expect(townCues).toHaveLength(3);
    expect(suburbCues).toHaveLength(3);
    expect(townCues.map((cue) => cue.label.en)).not.toEqual(
      suburbCues.map((cue) => cue.label.en)
    );
    expect(townCues[0]?.label.en).toBe('storefront footsteps and retail murmur');
    expect(townCues[1]?.label.en).toBe('shopping bags, cups, and door chimes');
    expect(suburbCues[0]?.label.en).toBe('quiet block air and leaves');
    expect(suburbCues[1]?.label.en).toBe('gates, doors, and scooters');
  });

  it('writes summaries with the specific location name and a differentiated opening', () => {
    const townSummary = getSoundSummary(SHITAN_CONTEXT, 'en');
    const suburbSummary = getSoundSummary(BAOAN_CONTEXT, 'en');

    expect(townSummary).toContain('Shitan');
    expect(suburbSummary).toContain('Baoan District');
    expect(townSummary).toContain('commercial street');
    expect(suburbSummary).toContain('residential block');
    expect(townSummary).not.toBe(suburbSummary);
  });

  it('uses Beijing-specific anchor cues before generic East Asia defaults', () => {
    const beijingCues = getSelectedSoundCues(BEIJING_CONTEXT);
    const beijingSummary = getSoundSummary(BEIJING_CONTEXT, 'en');

    expect(beijingCues[0]?.label.en).toBe('an elder hawking candied hawthorn by bicycle');
    expect(beijingCues[1]?.label.en).toBe('park-side xiangqi laughter');
    expect(beijingSummary).toContain('candied hawthorn');
    expect(beijingSummary).toContain('park-side xiangqi laughter');
  });

  it('uses Guilin river anchors before generic city cues', () => {
    const guilinCues = getSelectedSoundCues(GUILIN_CONTEXT);
    const guilinSummary = getSoundSummary(GUILIN_CONTEXT, 'en');

    expect(guilinCues[0]?.label.en).toBe('wooden oars on the Li River');
    expect(guilinCues[1]?.label.en).toBe('a riverside waterwheel flow');
    expect(guilinSummary).toContain('wooden oars on the Li River');
    expect(guilinSummary).toContain('a riverside waterwheel flow');
  });

  it('prioritizes LLM-provided cues in the summary when no place-specific anchor overrides them', () => {
    const llmAnchors: SoundscapeNarrativeAnchors = {
      source: 'llm',
      confidence: 0.9,
      cues: [
        {
          prompt: 'bookstalls opening along the riverside and paper sleeves rustling',
          label: { en: 'riverside bookstalls', 'zh-CN': 'riverside bookstalls' },
        },
        {
          prompt: 'metal shutters lifting from a small morning market arcade',
          label: { en: 'market arcade shutters', 'zh-CN': 'market arcade shutters' },
        },
      ],
    };

    const summary = getSoundSummary(
      {
        ...BAOAN_CONTEXT,
        cityName: 'Kutaisi',
        regionName: 'Imereti',
        countryName: 'Georgia',
        cultureRegion: 'eastern_europe',
        nearWater: 'river',
      },
      'en',
      llmAnchors
    );

    expect(summary).toContain('riverside bookstalls');
    expect(summary).toContain('market arcade shutters');
  });

  it('uses one concrete routine as the summary focus when there is no built-in place anchor', () => {
    const summary = getSoundSummary(BAOAN_CONTEXT, 'en');
    const featuredCue = getSignatureCue(BAOAN_CONTEXT);

    expect(summary).toContain(featuredCue.label.en);
    expect(summary).not.toContain('generic');
  });

  it('keeps riverfront nighttime cues coherent and non-duplicated', () => {
    const cues = getSelectedSoundCues({
      ...BAOAN_CONTEXT,
      cityName: 'Wuhan',
      regionName: 'Hanyang',
      countryName: 'China',
      currentLocalHour: 22,
      timeSlot: 'night',
      sceneType: 'riverfront',
      sceneTags: ['river'],
    });

    expect(cues).toHaveLength(3);
    expect(new Set(cues.map((cue) => cue.prompt)).size).toBe(3);
    expect(cues[0]?.label.en).toBe('continuous river movement');
    expect(cues[1]?.label.en).toBe('night wind and late riverside footsteps');
  });

  it('lets transit-hub scenes stay internally related at daytime', () => {
    const cues = getSelectedSoundCues({
      ...BAOAN_CONTEXT,
      cityName: 'Shanghai',
      regionName: 'Hongqiao',
      sceneType: 'transit_hub',
      sceneConfidence: 0.9,
      sceneTags: ['transit'],
      timeSlot: 'day',
    });

    expect(cues[0]?.label.en).toBe('station footsteps and rolling cases');
    expect(cues[1]?.label.en).toBe('waves of platform movement');
    expect(cues[2]?.label.en).toBe('a blurred overhead announcement');
  });
});
