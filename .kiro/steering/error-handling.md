---
inclusion: always
---

# Error Handling Strategy

## 5-Level Degradation

1. **Full Success**: All 5 layers generated and playing
2. **Partial Success**: 3-4 layers playing, failed layers silent
3. **Minimal Success**: Ambient layer only, show warning
4. **Fallback**: Cached soundscape from nearby location
5. **Hard Fail**: Show error message, suggest checking API key

## Error Response Table

| Error Type | Response | User Message |
|------------|----------|--------------|
| No API Key | Block generation, open settings | "ElevenLabs API Key required. Open Settings to add your key." |
| Invalid API Key | Block generation, show error | "API Key invalid or expired. Check Settings." |
| API Quota Exceeded | Block generation, show balance | "API quota exceeded. Remaining: $0.00" |
| Nominatim Timeout (>3s) | Use coordinate inference | Silent fallback, generate from coordinates |
| Nominatim No Result | Use coordinate inference | Silent fallback (ocean/polar templates) |
| Single Layer Fails | Play other layers, mark failed | "Layer [name] failed to generate" (in panel) |
| All Layers Fail | Show error, suggest retry | "Generation failed. Check connection and API key." |
| IndexedDB Full | LRU evict, retry | "Storage full. Clearing old soundscapes..." |
| IndexedDB Unavailable | Disable caching, continue | "Caching disabled. Soundscapes won't be saved." |
| Network Offline | Play cached only | "Offline. Only cached soundscapes available." |
| Audio Context Suspended | Prompt user interaction | "Click to enable audio" (browser autoplay policy) |

## Retry Strategy

**ElevenLabs API:**
- No automatic retry (costs money)
- User can click "Regenerate" to retry
- Show specific error from API response

**Nominatim:**
- Single attempt with 3s timeout
- On timeout/fail: immediate coordinate inference
- Cache successful results to avoid re-requests

**IndexedDB:**
- Retry once on write failure
- If still fails, continue without caching
- Log error to console for debugging

## Error Logging

- Console.error for all errors with context
- Include: timestamp, error type, coordinates, API endpoint
- NO sensitive data (API keys, full responses)
- Format: `[PinDrop Error] {type}: {message} | Context: {context}`

## User Feedback

**Toast Notifications:**
- Error: Red background, 5s duration
- Warning: Yellow background, 3s duration
- Success: Green background, 2s duration
- Position: Top-right corner

**In-Panel Status:**
- Loading: Pulsing animation + "Generating soundscape..."
- Error: Red icon + error message + "Retry" button
- Partial: Yellow icon + "Some layers unavailable"
- Success: No status indicator (clean UI)

## Graceful Degradation Examples

**Ocean Click (No Nominatim Result):**
```typescript
if (!geocodeResult) {
  const isOcean = isCoordinateInOcean(lat, lng);
  if (isOcean) {
    return generateOceanSoundscape(lat, lng);
  }
}
```

**Partial Layer Failure:**
```typescript
const results = await Promise.allSettled([
  generateAmbient(),
  generateSignature(),
  generateDialogue(),
  generateSecondaryDialogue(),
  generateAtmosphere(),
]);

const successfulLayers = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value);

if (successfulLayers.length === 0) {
  throw new Error('All layers failed');
}

// Play successful layers, mark failed ones
playLayers(successfulLayers);
markFailedLayers(results.filter(r => r.status === 'rejected'));
```
