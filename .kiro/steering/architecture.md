---
inclusion: always
---

# Architecture Principles

## Zero Backend Architecture

- No database, no user system, no server-side state
- All user data stored in browser: localStorage + IndexedDB
- Next.js API routes are PROXY ONLY - no storage, no logging, no caching
- User owns their ElevenLabs API Key

## API Proxy Pattern

```
Client → /api/elevenlabs/[...path] → ElevenLabs API
         ↑ Adds xi-api-key header
         ↑ Streams response
         ↑ NO storage/logging
```

- Proxy route: `app/api/elevenlabs/[...path]/route.ts`
- Client sends `x-elevenlabs-api-key` header
- Proxy converts to `xi-api-key` and forwards
- Stream audio responses with `Transfer-Encoding: chunked`
- NEVER store API keys, requests, or responses server-side

## Client-Side Data Flow

```
User Click → Coordinates
    ↓
Nominatim Reverse Geocode (3s timeout)
    ↓
LocationContext Inference Engine
    ↓
Soundscape Recipe Generator (5 layers)
    ↓
Parallel ElevenLabs API Calls (via proxy)
    ↓
Web Audio API 5-Layer Mixer
    ↓
IndexedDB Cache (audio + recipe)
```

## Storage Architecture

**localStorage:**
- `pindrop_api_key`: ElevenLabs API key
- `pindrop_favorites`: Array of soundscape IDs
- `pindrop_preferences`: User settings object

**IndexedDB (database: pindrop):**
- `soundscape_cache`: Cached audio blobs + recipes
- `geocode_cache`: Nominatim results (0.01° precision)
- `location_history`: User visit history

## Cache Strategy

- Cache key: `{lat},{lng}-{timeSlot}` (e.g., "48.86,2.36-dawn")
- Coordinate precision: 0.01° (±1.1km)
- Time slots: dawn/day/dusk/night
- LRU eviction when storage full
- Manual regenerate bypasses cache

## Performance Requirements

- First audio layer: < 3s from click
- All 5 layers ready: < 5s
- Cached playback: < 0.5s
- Parallel API calls, never sequential
- Progressive loading: ambient first, dialogue later
