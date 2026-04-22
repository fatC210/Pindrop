import type { ClimateType, LocationContext, WaterType } from '@/types/locationContext';
import type {
  AmbientLayer,
  AtmosphereLayer,
  DialogueLayer,
  SignatureLayer,
  SoundscapeTemplate,
  TimeInterpolation,
  SoundscapeNarrativeAnchors,
} from '@/types/soundscapeRecipe';
import type { TimeSlot } from '@/utils/timeSlot';
import {
  getCulturalAtmosphereTone,
  getPromptPlaceDescriptor,
  getPromptSpecificityInstruction,
  getSelectedSoundCues,
  getSignatureCue,
} from './sceneNarrative';

export const SILENT_AMBIENT: AmbientLayer = {
  type: 'sfx',
  prompt: '',
  volume: 0,
  loop: true,
};

export const SILENT_SIGNATURE: SignatureLayer = {
  type: 'sfx',
  prompt: '',
  volume: 0,
  loop: false,
  intervalSeconds: 60,
};

export const SILENT_DIALOGUE: DialogueLayer = {
  type: 'tts',
  model: 'eleven_v3',
  voiceId: '',
  language: 'en-US',
  text: '',
  emotionTags: [],
  volume: 0,
  pan: 0,
  repeatIntervalSeconds: 60,
};

export const SILENT_ATMOSPHERE: AtmosphereLayer = {
  type: 'music',
  prompt: '',
  volume: 0,
  loop: true,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getWeatherDescription(climate: ClimateType): string {
  const descriptions: Record<ClimateType, string> = {
    tropical: 'warm humid air, occasional tropical rain',
    temperate: 'mild breeze, partly cloudy',
    subarctic: 'cold biting wind, frost',
    arid: 'dry hot air, dust',
    mediterranean: 'warm dry breeze, clear sky',
  };

  return descriptions[climate] ?? descriptions.temperate;
}

export function getWaterSoundDescription(waterType: WaterType): string {
  const descriptions: Record<WaterType, string> = {
    sea: 'ocean waves in the background, salt spray',
    river: 'flowing river nearby, water over rocks',
    lake: 'gentle lake lapping, still water',
    canal: 'canal water flowing gently, boat wake',
  };

  return descriptions[waterType] ?? descriptions.river;
}

export function getTimeMoodDescription(timeSlot: TimeSlot): string {
  const descriptions: Record<TimeSlot, string> = {
    dawn: 'morning feeling, gentle awakening',
    day: 'bright daytime energy, active',
    dusk: 'evening settling, golden hour warmth',
    night: 'night mood, quiet contemplation',
  };

  return descriptions[timeSlot] ?? descriptions.day;
}

export function buildAmbientLayer(
  template: SoundscapeTemplate,
  terrainSound: string,
  interpolation: TimeInterpolation,
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): AmbientLayer {
  const weatherDesc = getWeatherDescription(context.climate);
  const basePrompt = template.ambientPrompt.replace('{weather}', weatherDesc);
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const specificityInstruction = getPromptSpecificityInstruction(context, narrativeAnchors);
  const featuredCue = getSignatureCue(context, narrativeAnchors);
  const supportingCueDescriptions = getSelectedSoundCues(context, narrativeAnchors)
    .filter((cue) => cue.prompt !== featuredCue.prompt)
    .map((cue) => cue.prompt)
    .slice(0, 2)
    .join(', ');
  const ambientBedCueDescriptions = [
    featuredCue.prompt,
    ...(supportingCueDescriptions ? [supportingCueDescriptions] : []),
  ].join(', ');
  const environmentDetails = [terrainSound];

  if (context.nearWater !== null) {
    environmentDetails.push(getWaterSoundDescription(context.nearWater));
  }

  const prompt = [
    `Authentic documentary field recording of ${placeDescriptor} during the ${context.timeSlot}.`,
    `Center the scene on one recognisable local routine: ${featuredCue.prompt}.`,
    `Build a continuous ambient bed from everyday local life around it: ${ambientBedCueDescriptions}.`,
    `Regional foundation: ${basePrompt}.`,
    `Natural environment: ${environmentDetails.join(', ')}.`,
    specificityInstruction,
    'Keep perspective realistic and layered. No detached narrator, scene-setting monologue, news-style readout, spoken intro, recited description, voice-over, announcer, clean slogan, quoted line, clear dialogue, or sung lyrics.',
    'Human presence is allowed only as natural background texture such as vendor calls, crowd wash, passersby murmur, market chatter, or brief local exclamations that remain indistinct and non-semantic.',
    'Never let any foreground voice become clearly intelligible, isolated, text-like, or TTS-like. Do not produce discernible monologue, broadcast copy, spoken sentence, or obvious language mismatch for the place.',
    'Avoid cinematic stingers, random novelty effects, exaggerated animals that do not belong here, and synthetic textures.',
  ].join(' ');

  const volume = clamp(0.7 * interpolation.appliedParams.activity, 0, 1);

  return {
    type: 'sfx',
    prompt,
    volume,
    loop: true,
  };
}

export function buildSignatureLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): SignatureLayer {
  const { activity } = interpolation.appliedParams;
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const specificityInstruction = getPromptSpecificityInstruction(context, narrativeAnchors);
  const signatureCue = getSignatureCue(context, narrativeAnchors);
  const fallbackSignature = template.signaturePool[0]?.trim();
  const detailPrompt =
    signatureCue.prompt || fallbackSignature || 'one brief local daily-life sound detail';
  const prompt = [
    `Capture one brief recognisable everyday moment from ${placeDescriptor}: ${detailPrompt}.`,
    specificityInstruction,
    'Render only the diegetic moment itself with no narrator, clean spoken phrase, recited text, quoted line, sung lyric, spoken introduction, announcer voice, or theatrical sting.',
    'If people are present, keep them environmental and non-semantic, like a quick vendor cry or blurred nearby chatter, never a clearly isolated foreground speaker or intelligible sentence.',
    'Do not let any human vocal element read like text-to-speech, a language lesson, a voice note, or an obviously foreign spoken line for this location.',
    'It should feel locally grounded, naturally recorded, and never comedic.',
  ].join(' ');

  const intervalSeconds = clamp(90 - (60 * activity), 30, 90);
  const volume = clamp(0.6 * activity, 0, 1);

  return {
    type: 'sfx',
    prompt,
    volume,
    loop: false,
    intervalSeconds,
  };
}

function getEmotionTagsForTime(timeSlot: TimeSlot): string[] {
  const emotionMap: Record<TimeSlot, string[]> = {
    dawn: ['calm', 'gentle'],
    day: ['energetic', 'cheerful'],
    dusk: ['relaxed', 'warm'],
    night: ['quiet', 'intimate'],
  };

  return emotionMap[timeSlot] ?? ['calm', 'gentle'];
}

export function buildDialogueLayer(
  _template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext
): DialogueLayer {
  const { humanVoice } = interpolation.appliedParams;
  const repeatIntervalSeconds = clamp(120 - (90 * humanVoice), 30, 120);
  const emotionTags = getEmotionTagsForTime(interpolation.sourceSlot);

  return {
    type: 'tts',
    model: 'eleven_v3',
    voiceId: 'default_voice',
    language: context.languageVariant,
    // Placeholder conversation text gets spoken literally by TTS.
    // Keep this layer silent until we generate place-authentic speech instead.
    text: '',
    emotionTags,
    volume: 0,
    pan: -0.3,
    repeatIntervalSeconds,
  };
}

export function buildSecondaryDialogueLayer(
  _template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext,
  primaryDialogue: DialogueLayer
): DialogueLayer {
  const language =
    context.secondaryLanguages.length > 0
      ? context.secondaryLanguages[0]
      : context.languageVariant;
  const pan = clamp(-primaryDialogue.pan, -1, 1);
  const repeatIntervalSeconds = clamp(primaryDialogue.repeatIntervalSeconds + 15, 30, 120);

  return {
    type: 'tts',
    model: 'eleven_flash_v2_5',
    voiceId: 'default_secondary_voice',
    language,
    text: '',
    emotionTags: primaryDialogue.emotionTags,
    volume: 0,
    pan,
    repeatIntervalSeconds,
  };
}

export function buildAtmosphereLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext,
  narrativeAnchors?: SoundscapeNarrativeAnchors | null
): AtmosphereLayer {
  const culturalTone = getCulturalAtmosphereTone(context, narrativeAnchors);
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const timeMood = getTimeMoodDescription(interpolation.sourceSlot);
  const prompt = [
    `Subtle place-rooted music bed for ${placeDescriptor}.`,
    `Texture: ${template.atmosphereStyle.replace('{culture}', culturalTone)}.`,
    `Mood: ${timeMood}.`,
    'Organic and restrained, almost hidden under the ambience, with no dominant melody and no dramatic intro swell.',
    'Natural embedded human texture is allowed when it belongs to the place, such as distant crowd wash, street murmur, vendor activity, or non-verbal reactions, but no intelligible foreground speech, no recited words, no spoken solo, and never as a clean lead vocal.',
    'Do not open with a spoken monologue, narration, counting cue, announcer voice, sung topline, quoted speech, trailer-style intro, or any clean text-like vocal before the music bed settles in.',
    'Avoid any obvious TTS flavor or clearly recognizable out-of-place language in the human texture.',
  ].join(' ');
  const volume = clamp(0.5 * interpolation.appliedParams.music, 0, 1);

  return {
    type: 'music',
    prompt,
    volume,
    loop: true,
  };
}
