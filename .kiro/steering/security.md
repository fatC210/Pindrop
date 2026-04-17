---
inclusion: always
---

# Security Rules

## API Key Storage

**NEVER:**
- Send API key in URL query parameters
- Log API key to console (except masked: `xi-••••••••`)
- Store API key in cookies
- Send API key to any domain except `/api/elevenlabs/*`
- Include API key in error messages
- Commit API key to git

**ALWAYS:**
- Store in localStorage: `pindrop_api_key`
- Send in header: `x-elevenlabs-api-key`
- Validate format before storage (starts with `xi-`)
- Mask in UI: Show only first 3 chars + dots
- Clear from memory after use in API calls

## API Proxy Security

**Proxy Route Constraints:**
```typescript
// app/api/elevenlabs/[...path]/route.ts

export async function POST(request: Request) {
  // 1. Validate API key presence
  const apiKey = request.headers.get('x-elevenlabs-api-key');
  if (!apiKey || !apiKey.startsWith('xi-')) {
    return Response.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // 2. Validate path (prevent SSRF)
  const path = params.path.join('/');
  const allowedPaths = [
    'text-to-speech',
    'sound-generation', 
    'music-generation',
    'user/subscription', // For balance check only
  ];
  if (!allowedPaths.some(p => path.startsWith(p))) {
    return Response.json({ error: 'Invalid endpoint' }, { status: 403 });
  }

  // 3. NO logging of request/response
  // 4. NO caching of audio data
  // 5. Stream response directly to client
}
```

**Forbidden in Proxy:**
- Logging request bodies
- Logging response bodies
- Caching responses server-side
- Storing API keys
- Rate limiting (let ElevenLabs handle it)
- Request modification (except header conversion)

## Client-Side Security

**Input Validation:**
- Coordinates: Validate lat ∈ [-90, 90], lng ∈ [-180, 180]
- API key: Validate format `xi-[a-zA-Z0-9]{32}`
- Volume: Validate range [0, 1]
- Cache IDs: Validate format `{lat},{lng}-{timeSlot}`

**XSS Prevention:**
- Never use `dangerouslySetInnerHTML`
- Sanitize all user inputs (though minimal user input in MVP)
- Use React's built-in escaping for text rendering

**CORS:**
- Proxy handles CORS for ElevenLabs API
- No CORS issues with Nominatim (public API)

## Data Privacy

**Zero Server-Side Storage:**
- No user accounts
- No server-side databases
- No server-side logs of user activity
- No analytics tracking (optional: client-side only)

**Local Storage Only:**
- API key: localStorage (user's browser)
- Soundscape cache: IndexedDB (user's browser)
- Favorites: localStorage (user's browser)
- Settings: localStorage (user's browser)

**Data Deletion:**
- User can clear all data via Settings → "Clear All Cache"
- Clearing browser data removes everything
- No server-side data to delete

## Third-Party API Security

**ElevenLabs:**
- Always use HTTPS
- Validate response status codes
- Handle rate limits gracefully
- Never expose raw API errors to user (sanitize messages)

**Nominatim:**
- Always use HTTPS
- Include User-Agent header (required by OSM policy)
- Respect 1 req/s rate limit (client-side throttle)
- Cache results to minimize requests

## Environment Variables

**NO sensitive data in env vars** (since user provides API key)

**Allowed env vars:**
- `NEXT_PUBLIC_APP_VERSION`: App version string
- `NEXT_PUBLIC_MAP_TILE_URL`: OSM tile URL (optional override)

**Forbidden env vars:**
- Any API keys
- Any secrets
- Any user data
