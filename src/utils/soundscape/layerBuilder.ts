import type { ClimateType, LocationContext, WaterType } from '@/types/locationContext';
import type {
  AmbientLayer,
  AtmosphereLayer,
  DialogueLayer,
  SignatureLayer,
  SoundscapeTemplate,
  TimeInterpolation,
} from '@/types/soundscapeRecipe';
import type { TimeSlot } from '@/utils/timeSlot';
import {
  getCulturalAtmosphereTone,
  getPromptPlaceDescriptor,
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
  context: LocationContext
): AmbientLayer {
  const weatherDesc = getWeatherDescription(context.climate);
  const basePrompt = template.ambientPrompt.replace('{weather}', weatherDesc);
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const cueDescriptions = getSelectedSoundCues(context).map((cue) => cue.prompt).join(', ');
  const environmentDetails = [terrainSound];

  if (context.nearWater !== null) {
    environmentDetails.push(getWaterSoundDescription(context.nearWater));
  }

  const prompt = [
    `Authentic documentary field recording of ${placeDescriptor} during the ${context.timeSlot}.`,
    `Build a continuous ambient bed from everyday local life: ${cueDescriptions}.`,
    `Regional foundation: ${basePrompt}.`,
    `Natural environment: ${environmentDetails.join(', ')}.`,
    'Keep perspective realistic and layered. Avoid cinematic stingers, random novelty effects, exaggerated animals that do not belong here, and synthetic textures.',
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
  context: LocationContext
): SignatureLayer {
  const { activity } = interpolation.appliedParams;
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const signatureCue = getSignatureCue(context);
  const fallbackSignature = template.signaturePool[0]?.trim();
  const detailPrompt =
    signatureCue.prompt || fallbackSignature || 'one brief local daily-life sound detail';
  const prompt = [
    `A brief recognisable everyday sound from ${placeDescriptor}: ${detailPrompt}.`,
    'It should feel locally grounded, naturally recorded, and never theatrical or comedic.',
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
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext
): DialogueLayer {
  const { humanVoice } = interpolation.appliedParams;

  if (template.dialogueTopics.length === 0) {
    return {
      type: 'tts',
      model: 'eleven_v3',
      voiceId: 'default_voice',
      language: context.languageVariant,
      text: '',
      emotionTags: getEmotionTagsForTime(interpolation.sourceSlot),
      volume: 0,
      pan: -0.3,
      repeatIntervalSeconds: clamp(120 - (90 * humanVoice), 30, 120),
    };
  }

  const topic = template.dialogueTopics[0];
  const text = `A local conversation about ${topic}`;
  const repeatIntervalSeconds = clamp(120 - (90 * humanVoice), 30, 120);
  const volume = clamp(0.7 * humanVoice, 0, 1);
  const emotionTags = getEmotionTagsForTime(interpolation.sourceSlot);

  return {
    type: 'tts',
    model: 'eleven_v3',
    voiceId: 'default_voice',
    language: context.languageVariant,
    text,
    emotionTags,
    volume,
    pan: -0.3,
    repeatIntervalSeconds,
  };
}

export function buildSecondaryDialogueLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext,
  primaryDialogue: DialogueLayer
): DialogueLayer {
  const language =
    context.secondaryLanguages.length > 0
      ? context.secondaryLanguages[0]
      : context.languageVariant;

  if (template.dialogueTopics.length === 0) {
    return {
      type: 'tts',
      model: 'eleven_flash_v2_5',
      voiceId: 'default_secondary_voice',
      language,
      text: '',
      emotionTags: primaryDialogue.emotionTags,
      volume: 0,
      pan: clamp(-primaryDialogue.pan, -1, 1),
      repeatIntervalSeconds: clamp(primaryDialogue.repeatIntervalSeconds + 15, 30, 120),
    };
  }

  const topicIndex = template.dialogueTopics.length > 1 ? 1 : 0;
  const topic = template.dialogueTopics[topicIndex];
  const text = `Background conversation about ${topic}`;
  const volume = clamp(primaryDialogue.volume * 0.6, 0, 1);
  const pan = clamp(-primaryDialogue.pan, -1, 1);
  const repeatIntervalSeconds = clamp(primaryDialogue.repeatIntervalSeconds + 15, 30, 120);

  return {
    type: 'tts',
    model: 'eleven_flash_v2_5',
    voiceId: 'default_secondary_voice',
    language,
    text,
    emotionTags: primaryDialogue.emotionTags,
    volume,
    pan,
    repeatIntervalSeconds,
  };
}

export function buildAtmosphereLayer(
  template: SoundscapeTemplate,
  interpolation: TimeInterpolation,
  context: LocationContext
): AtmosphereLayer {
  const culturalTone = getCulturalAtmosphereTone(context);
  const placeDescriptor = getPromptPlaceDescriptor(context);
  const timeMood = getTimeMoodDescription(interpolation.sourceSlot);
  const prompt = `Subtle ${template.atmosphereStyle.replace(
    '{culture}',
    culturalTone
  )} for ${placeDescriptor}, ${timeMood}, organic and restrained, almost hidden under the ambience, with no dominant melody.`;
  const volume = clamp(0.5 * interpolation.appliedParams.music, 0, 1);

  return {
    type: 'music',
    prompt,
    volume,
    loop: true,
  };
}
