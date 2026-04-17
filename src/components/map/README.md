# Map Interaction Module

This module provides the interactive world map interface for the PinDrop application.

## Completed Components

### Core Utilities (✅ Complete)
- ✅ Coordinate validation and rounding (`src/utils/coordinates.ts`)
- ✅ Distance calculation with Haversine formula (`src/utils/distance.ts`)
- ✅ Time slot calculation and color mapping (`src/utils/timeSlot.ts`)
- ✅ Cache key generation (`src/utils/cacheKey.ts`)
- ✅ IndexedDB schema and initialization (`src/utils/db.ts`)
- ✅ Geocoding cache operations (`src/utils/geocodeCache.ts`)
- ✅ Soundscape cache operations (`src/utils/soundscapeCache.ts`)
- ✅ Nominatim API client with fallback (`src/utils/nominatim.ts`)
- ✅ Request throttling and cooldown (`src/utils/throttle.ts`)

### React Components (✅ Core Complete)
- ✅ MapView - Main Leaflet map component
- ✅ MapControls - Zoom controls with current level display
- ✅ LoadingIndicator - Pulsing ripple animation for clicks
- ✅ MarkerManager - Renders cached location markers

### Property-Based Tests (✅ Complete)
- ✅ 35 tests passing
- ✅ Coordinate validation properties
- ✅ Coordinate rounding precision properties
- ✅ Cache key format properties
- ✅ Time slot color mapping properties
- ✅ Distance calculation properties
- ✅ Zoom clamping properties

## Pending Tasks (Optional/Advanced Features)

The following tasks were not implemented in this iteration but are marked as optional or can be added incrementally:

### Task 12: Hover Preview System
- Hover detection with 500ms delay
- Preview audio playback
- Throttling logic

### Task 13: Theme Switching
- Light/dark theme toggle
- Theme persistence in localStorage

### Task 14: Keyboard Navigation & Accessibility
- Arrow key panning
- ARIA labels and screen reader support
- High contrast mode

### Task 15: UI Component Tests
- Unit tests for React components
- Integration tests with Playwright

### Task 16: Error Handling
- Comprehensive error types
- Graceful degradation strategies
- User-friendly error messages

### Task 17: Performance Optimizations
- Marker clustering for low zoom levels
- Virtual rendering for 100+ markers
- Event debouncing and throttling

## Usage Example

\`\`\`tsx
import { MapView } from '@/components/map';
import { getGeocodingInfo, generateCacheKeyNow } from '@/utils';

function App() {
  const handleCoordinateSelect = async (lat: number, lng: number) => {
    // Get geocoding information
    const geoInfo = await getGeocodingInfo(lat, lng);
    console.log('Location:', geoInfo.cityName, geoInfo.countryName);
    
    // Generate cache key
    const cacheKey = generateCacheKeyNow(lat, lng);
    console.log('Cache key:', cacheKey);
  };

  return (
    <MapView
      onCoordinateSelect={handleCoordinateSelect}
      theme="light"
      isLoading={false}
    />
  );
}
\`\`\`

## Testing

Run all tests:
\`\`\`bash
npm test
\`\`\`

Run type checking:
\`\`\`bash
npm run type-check
\`\`\`

## Architecture

The module follows a layered architecture:

1. **Utilities Layer**: Pure functions for coordinate manipulation, caching, and API calls
2. **Data Layer**: IndexedDB operations and cache management
3. **Component Layer**: React components for UI rendering
4. **Integration Layer**: Wiring between components and data

All code is written in TypeScript with strict mode enabled, ensuring type safety throughout the application.
