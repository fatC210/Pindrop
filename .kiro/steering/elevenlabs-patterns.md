---
inclusion: always
---

# ElevenLabs API Patterns

## API Endpoint Mapping

| Layer | Endpoint | Model | Priority |
|-------|----------|-------|----------|
| ambient | `/v1/sound-generation` | - | High (play first) |
| signature | `/v1/sound-generation` | - | Medium |
| dialogue | `/v1/text-to-speech` | `eleven_v3` | High |
| secondaryDialogue | `/v1/text-to-speech` | `eleven_flash_v2_5` | Low (fastest) |
| atmosphere | `/v1/music-generation` | - | Low (slowest) |

## Parallel Call Pattern

```typescript
const [ambient, signature, dialogue, secondary, atmosphere] = 
  await Promise.allSettled([
    fetch('/api/elevenlabs/sound-generation', {
      method: 'POST',
      headers: { 'x-elevenlabs-api-key': apiKey },
      body: JSON.stringify({ text: ambientPrompt, duration_seconds: 30 }),
    }),
    fetch('/api/elevenlabs/sound-generation', {
      method: 'POST',
      headers: { 'x-elevenlabs-api-key': apiKey },
      body: JSON.stringify({ text: signaturePrompt, duration_seconds: 5 }),
    }),
    fetch('/api/elevenlabs/text-to-speech', {
      method: 'POST',
      headers: { 'x-elevenlabs-api-key': apiKey },
      body: JSON.stringify({
        text: dialogueText,
        model_id: 'eleven_v3',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }),
    fetch('/api/elevenlabs/text-to-speech', {
      method: 'POST',
      headers: { 'x-elevenlabs-api-key': apiKey },
      body: JSON.stringify({
        text: secondaryText,
        model_id: 'eleven_flash_v2_5',
      }),
    }),
    fetch('/api/elevenlabs/music-generation', {
      method: 'POST',
      headers: { 'x-elevenlabs-api-key': apiKey },
      body: JSON.stringify({ text: atmospherePrompt, duration_seconds: 60 }),
    }),
  ]);
```

## Voice Selection Logic

**By Language:**
```typescript
const VOICE_MAP: Record<string, string> = {
  'en-US': 'voice_id_american_neutral',
  'en-GB': 'voice_id_british_neutral',
  'fr-FR': 'voice_id_french_warm',
  'es-ES': 'voice_id_spanish_neutral',
  'ja-JP': 'voice_id_japanese_neutral',
  'ar-EG': 'voice_id_arabic_neutral',
  'zh-CN': 'voice_id_mandarin_neutral',
  // ... 70+ languages
};

function selectVoice(languageVariant: string): string {
  return VOICE_MAP[languageVariant] || VOICE_MAP['en-US'];
}
```

**By Context:**
- Urban young adult: Use 20s-30s voice IDs
- Rural elderly: Use 60s+ voice IDs
- Market vendor: Use energetic/loud voice settings
- Residential: Use calm/quiet voice settings

## Retry Strategy

**NO automatic retries** - each call costs money

**User-initiated retry:**
- "Regenerate" button bypasses cache
- Calls API again with same recipe
- Overwrites IndexedDB cache

**Partial failure handling:**
- If 1-2 layers fail: Play remaining layers
- If 3+ layers fail: Show error, suggest retry
- Never retry automatically

## Streaming Response Handling

```typescript
const response = await fetch('/api/elevenlabs/text-to-speech', {
  method: 'POST',
  headers: { 'x-elevenlabs-api-key': apiKey },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  throw new Error(`ElevenLabs API error: ${response.status}`);
}

// Stream to AudioContext
const reader = response.body.getReader();
const chunks: Uint8Array[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}

const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
return audioBlob;
```

## Prompt Engineering

**Ambient Layer:**
- Format: "{location_type} ambient, {weather}, {time_of_day}, {specific_sounds}"
- Example: "Urban Paris street ambient, light rain, early morning, distant scooter, sparse pedestrians"
- Length: 10-20 words
- Duration: 30 seconds (looped)

**Signature Layer:**
- Format: "{specific_sound}, {action}, {spatial_info}"
- Example: "French bakery door bell rings, paper bag rustles, espresso machine hisses"
- Length: 5-15 words
- Duration: 5 seconds (triggered every 30-90s)

**Dialogue Layer:**
- Format: Natural speech in target language
- Include emotion tags: [warm laughter], [muttering], [shouting]
- Length: 1-2 sentences
- Voice settings: stability 0.5, similarity_boost 0.75

**Atmosphere Layer:**
- Format: "{genre}, {mood}, {tempo}, {instrumentation}"
- Example: "Minimal melancholic accordion, very quiet, French morning feeling, slow tempo"
- Length: 10-15 words
- Duration: 60 seconds (looped)

## Cost Optimization

- Cache aggressively (same location + time slot)
- Use `eleven_flash_v2_5` for secondary dialogue (cheaper + faster)
- Limit dialogue text to 1-2 sentences
- Set reasonable audio durations (30s ambient, 5s signature, 60s atmosphere)
- Show user remaining API balance in settings
