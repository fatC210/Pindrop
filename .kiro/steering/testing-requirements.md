---
inclusion: always
---

# Testing Requirements

## Must-Test Modules

1. **LocationContext Inference Engine**
   - Country → language mapping
   - Coordinate → region type inference
   - Timezone calculation
   - Ocean/polar detection

2. **Time Interpolation**
   - 4 keyframe definitions
   - Hour → time slot mapping
   - Parameter interpolation between slots
   - Edge cases: midnight rollover

3. **Soundscape Recipe Generator**
   - Recipe JSON structure validation
   - Layer parameter ranges
   - Region type → template mapping

4. **Cache Key Generation**
   - Coordinate rounding (0.01° precision)
   - Time slot inclusion
   - ID format consistency

5. **IndexedDB Operations**
   - Write soundscape cache
   - Read soundscape cache
   - LRU eviction
   - Storage quota handling

6. **API Proxy Route**
   - Header conversion (x-elevenlabs-api-key → xi-api-key)
   - Path validation (allowed endpoints only)
   - Streaming response forwarding
   - Error handling

7. **Web Audio Mixer**
   - 5-layer gain nodes
   - Pan node positioning
   - Master volume control
   - Fade in/out timing

## Testing Stack

**Unit Tests:**
- Framework: Vitest
- Coverage: > 80% for utils/hooks
- Run: `npm run test`

**Integration Tests:**
- Framework: Playwright
- Scenarios: Map click → soundscape generation → playback
- Run: `npm run test:e2e`

**Type Checking:**
- Tool: TypeScript compiler
- Run: `npm run type-check`
- Zero errors required

## Coverage Targets

| Module | Target | Priority |
|--------|--------|----------|
| Time interpolation | 100% | Critical |
| Cache key generation | 100% | Critical |
| LocationContext inference | 90% | High |
| Recipe generator | 85% | High |
| API proxy | 80% | High |
| UI components | 60% | Medium |

## Test Data

**Mock Coordinates:**
- Paris: [48.8566, 2.3522]
- Tokyo: [35.6762, 139.6503]
- Ocean: [0, -30] (Atlantic)
- Polar: [85, 0] (Arctic)

**Mock API Responses:**
- Store in `__mocks__/elevenlabs.ts`
- Include success and error cases
- Use actual response structure

**Mock Nominatim:**
- Store in `__mocks__/nominatim.ts`
- Include city, town, village, ocean cases

## Manual Testing Checklist

- [ ] Click 10+ random locations, verify soundscapes play
- [ ] Test all 4 time slots (dawn/day/dusk/night)
- [ ] Test ocean click (no Nominatim result)
- [ ] Test polar click (extreme coordinates)
- [ ] Test cache hit (click same location twice)
- [ ] Test regenerate (bypass cache)
- [ ] Test volume controls (all 6 sliders)
- [ ] Test favorites (add/remove/click)
- [ ] Test API key validation (invalid key)
- [ ] Test offline mode (cached soundscapes only)
- [ ] Test storage full (LRU eviction)
- [ ] Test theme switch (light/dark)

## Performance Testing

**Metrics to Measure:**
- Time to first audio layer: < 3s
- Time to all layers ready: < 5s
- Cached playback latency: < 0.5s
- Map interaction responsiveness: < 100ms

**Tools:**
- Chrome DevTools Performance tab
- Lighthouse (Performance score > 90)
- Network tab (verify parallel API calls)

## NO Automatic Test Running

- Tests run manually via `npm run test`
- NO test hooks on file save
- NO CI/CD in MVP (Railway auto-deploys on push)
- Developer runs tests before committing
