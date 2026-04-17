# Implementation Plan: Map Interaction Module

## Overview

This implementation plan breaks down the Map Interaction Module into discrete, actionable coding tasks. The module provides an interactive world map interface using Leaflet.js and OpenStreetMap, captures geographic coordinates, manages cached location markers, and implements hover preview functionality. All implementation will use TypeScript with React components in a Next.js 16 application.

The implementation follows a layered approach: core utilities first, then data management, followed by UI components, and finally integration and testing. Each task builds incrementally to ensure early validation of core functionality.

## Tasks

- [x] 1. Set up project dependencies and TypeScript configuration
  - Install Leaflet.js (v1.9+) and TypeScript type definitions (@types/leaflet)
  - Install idb library for IndexedDB wrapper
  - Install fast-check for property-based testing
  - Install Vitest for unit testing
  - Configure TypeScript strict mode and path aliases
  - _Requirements: 1.1_

- [x] 2. Implement core coordinate utilities
  - [x] 2.1 Create coordinate validation functions
    - Write `validateCoordinates(lat, lng)` function with range checks
    - Implement latitude validation ([-90, 90])
    - Implement longitude validation ([-180, 180])
    - Return structured validation result with error messages
    - _Requirements: 2.2, 2.3_
  
  - [x]* 2.2 Write property test for coordinate validation
    - **Property 1: Coordinate Validation**
    - **Validates: Requirements 2.2, 2.3**
    - Test that validation correctly identifies valid/invalid coordinates across all numeric inputs
  
  - [x] 2.3 Create coordinate rounding functions
    - Write `roundCoordinates(lat, lng)` function with 0.01 degree precision
    - Implement rounding to 2 decimal places for both lat and lng
    - Return tuple of rounded coordinates
    - _Requirements: 8.1, 8.2_
  
  - [x]* 2.4 Write property test for coordinate rounding
    - **Property 2: Coordinate Rounding Precision**
    - **Validates: Requirements 8.1, 8.2**
    - Test idempotence (rounding twice produces same result)
    - Test precision (exactly 2 decimal places)

- [x] 3. Implement time slot and cache key utilities
  - [x] 3.1 Create time slot calculation functions
    - Write `getTimeSlot(hour)` function mapping hours to dawn/day/dusk/night
    - Implement hour range checks for each time slot
    - Handle midnight rollover (20:00-04:59 for night)
    - _Requirements: 3.6, 3.7, 3.8, 3.9_
  
  - [x] 3.2 Create cache key generation functions
    - Write `generateCacheKey(lat, lng, timeSlot)` function
    - Format as "{lat},{lng}-{timeSlot}" with 2 decimal places
    - Use rounded coordinates from coordinate utilities
    - _Requirements: 8.3, 8.4_
  
  - [x]* 3.3 Write property test for cache key format
    - **Property 3: Cache Key Format Consistency**
    - **Validates: Requirements 8.3, 8.4**
    - Test format consistency and idempotence
  
  - [x] 3.4 Create time slot color mapping
    - Write `getTimeSlotColor(timeSlot)` function
    - Map dawn → #FFA500, day → #22C55E, dusk → #FBBF24, night → #3B82F6
    - Return hex color codes
    - _Requirements: 3.6, 3.7, 3.8, 3.9_
  
  - [x]* 3.5 Write property test for time slot color mapping
    - **Property 4: Time Slot Color Mapping Completeness**
    - **Validates: Requirements 3.6, 3.7, 3.8, 3.9**
    - Test bijective mapping (each slot → unique color)

- [x] 4. Implement distance calculation and throttling utilities
  - [x] 4.1 Create Haversine distance calculation
    - Write `calculateDistance(coord1, coord2)` function
    - Implement Haversine formula for great-circle distance
    - Return distance in degrees (approximate)
    - _Requirements: 4.5, 12.3_
  
  - [x]* 4.2 Write property test for distance calculation
    - **Property 5: Hover Throttling Distance Calculation**
    - **Validates: Requirements 4.5, 12.3**
    - Test symmetry (distance A→B equals B→A)
    - Test 5-degree threshold detection
  
  - [x] 4.3 Create zoom level clamping function
    - Write `clampZoom(zoom)` function with range [2, 18]
    - Implement boundary enforcement
    - _Requirements: 6.5, 6.6_
  
  - [x]* 4.4 Write property test for zoom clamping
    - **Property 8: Zoom Level Boundary Enforcement**
    - **Validates: Requirements 6.5, 6.6**
    - Test idempotence and boundary enforcement

- [x] 5. Checkpoint - Ensure all utility tests pass
  - Run unit tests and property tests for utilities
  - Verify all core functions work correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Implement IndexedDB cache management
  - [x] 6.1 Create IndexedDB schema and initialization
    - Define database schema with 3 object stores (soundscape_cache, geocode_cache, location_history)
    - Write database initialization function
    - Create indexes for lastPlayedAt and coordinates
    - _Requirements: 5.7, 5.8_
  
  - [x] 6.2 Implement geocoding cache operations
    - Write `getCachedGeocode(lat, lng)` function with 0.01° precision matching
    - Write `cacheGeocode(lat, lng, result)` function
    - Implement coordinate precision matching logic
    - _Requirements: 5.7, 5.8_
  
  - [ ]* 6.3 Write property test for geocoding cache precision
    - **Property 6: Geocoding Cache Precision Matching**
    - **Validates: Requirement 5.8**
    - Test cache lookup with 0.01° precision matching
  
  - [x] 6.4 Implement soundscape cache operations
    - Write `getCachedSoundscape(cacheKey)` function
    - Write `cacheSoundscape(cacheKey, data)` function
    - Implement cache existence check
    - _Requirements: 8.5_
  
  - [ ]* 6.5 Write property test for cache reuse logic
    - **Property 7: Cache Reuse Decision Logic**
    - **Validates: Requirements 8.5, 5.8**
    - Test cache reuse conditions (coordinates + time slot match)
  
  - [x] 6.6 Implement LRU eviction logic
    - Write `evictLRU()` function based on lastPlayedAt
    - Handle storage quota exceeded errors
    - _Requirements: 9.4_
  
  - [ ]* 6.7 Write unit tests for IndexedDB operations
    - Test database initialization
    - Test cache read/write operations
    - Test error handling for unavailable IndexedDB

- [x] 7. Implement Nominatim geocoding service
  - [x] 7.1 Create Nominatim API client
    - Write `reverseGeocode(lat, lng)` function with 3s timeout
    - Add required User-Agent header
    - Implement AbortController for timeout
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 7.2 Implement response parsing and extraction
    - Write `extractGeocodingInfo(response)` function
    - Extract city/town/village, country, administrative region
    - Handle missing fields gracefully
    - _Requirements: 5.4_
  
  - [ ]* 7.3 Write property test for Nominatim extraction
    - **Property 11: Nominatim Response Field Extraction**
    - **Validates: Requirement 5.4**
    - Test extraction never throws on well-formed responses
  
  - [x] 7.4 Implement coordinate inference fallback
    - Write `inferFromCoordinates(lat, lng)` function
    - Detect ocean coordinates (no land)
    - Detect polar coordinates (|lat| > 66.5)
    - Infer timezone from longitude
    - _Requirements: 5.5, 5.6, 9.2_
  
  - [x] 7.5 Integrate geocoding cache with API client
    - Check cache before API call
    - Cache successful results with 0.01° precision
    - Use inference on timeout/failure
    - _Requirements: 5.7, 5.8_
  
  - [ ]* 7.6 Write unit tests for geocoding service
    - Test successful API response handling
    - Test timeout fallback to inference
    - Test ocean/polar detection
    - Test cache integration

- [x] 8. Implement throttling and rate limiting
  - [x] 8.1 Create request throttle manager
    - Write throttle logic for Nominatim (1 req/sec)
    - Implement request queue for sequential processing
    - _Requirements: 12.1, 12.2_
  
  - [x] 8.2 Create cooldown enforcement
    - Write `shouldAllowRequest(coordinates, timestamp)` function
    - Implement 10-second cooldown per coordinate
    - _Requirements: 12.4_
  
  - [ ]* 8.3 Write property test for cooldown enforcement
    - **Property 12: Cooldown Period Enforcement**
    - **Validates: Requirement 12.4**
    - Test 10-second cooldown with coordinate precision matching

- [x] 9. Checkpoint - Ensure all data layer tests pass
  - Run unit tests for IndexedDB, geocoding, and throttling
  - Verify cache operations work correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 10. Implement Leaflet map component
  - [x] 10.1 Create MapView React component
    - Initialize Leaflet map instance with OpenStreetMap tiles
    - Set initial view to [20, 0] with zoom level 3
    - Configure zoom range [2, 18]
    - Add tile layer with attribution
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 10.2 Implement click event handling
    - Add click event listener to map
    - Extract coordinates from click event
    - Validate coordinates using utility functions
    - Emit coordinate event to parent component
    - _Requirements: 2.1, 2.7_
  
  - [ ]* 10.3 Write property test for coordinate event emission
    - **Property 10: Coordinate Event Emission Completeness**
    - **Validates: Requirement 2.7**
    - Test emitted coordinates match captured coordinates
  
  - [x] 10.3 Implement loading indicator
    - Create pulsing ripple animation component
    - Display 3 concentric circles at click position
    - Loop animation with 1.5s duration
    - Remove indicator when soundscape loads
    - _Requirements: 2.4, 2.5, 2.6_
  
  - [x] 10.4 Implement map controls
    - Add zoom in/out buttons
    - Display current zoom level
    - Implement zoom button click handlers
    - Enforce zoom boundaries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 10.5 Write unit tests for MapView component
    - Test map initialization
    - Test click event handling
    - Test zoom controls
    - Test loading indicator display

- [x] 11. Implement marker rendering system
  - [x] 11.1 Create MapMarker component
    - Create pulsing marker component with CSS animation
    - Implement scale animation (1.0 → 1.3 → 1.0)
    - Implement opacity animation (0.8 → 0.4 → 0.8)
    - Set 2-second animation duration with infinite loop
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 11.2 Implement time slot color styling
    - Apply color based on time slot (dawn/day/dusk/night)
    - Add box shadow with matching color
    - Set marker size to 24px diameter
    - Set z-index to 1000
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_
  
  - [x] 11.3 Implement marker click handling
    - Add click event listener to markers
    - Load cached soundscape on marker click
    - _Requirements: 3.11_
  
  - [x] 11.4 Implement marker manager
    - Write logic to render markers for all cached locations
    - Update markers when cache changes
    - Remove markers for evicted cache entries
    - Optimize rendering for 100+ markers
    - _Requirements: 10.5_
  
  - [ ]* 11.5 Write unit tests for marker rendering
    - Test marker color mapping
    - Test animation properties
    - Test click handling
    - Test marker updates

- [ ] 12. Implement hover preview system
  - [ ] 12.1 Create hover detection logic
    - Add mousemove event listener with 500ms delay timer
    - Implement timer cancellation on mouse out
    - Track hover coordinates
    - _Requirements: 4.1_
  
  - [ ] 12.2 Implement hover throttling
    - Check distance from last preview using Haversine formula
    - Block preview if within 5 degrees
    - Block preview if soundscape is playing
    - _Requirements: 4.5, 4.7, 12.3_
  
  - [ ] 12.3 Create preview audio player
    - Play 2-second ambient layer preview
    - Set volume to 30% of configured ambient volume
    - Implement 300ms fade-out on mouse out
    - Stop preview on map click
    - _Requirements: 4.2, 4.3, 4.4, 4.6_
  
  - [ ]* 12.4 Write property test for preview volume
    - **Property 9: Preview Volume Calculation**
    - **Validates: Requirement 4.3**
    - Test volume is exactly 30% of configured volume
  
  - [ ]* 12.5 Write unit tests for hover preview
    - Test 500ms delay timer
    - Test throttling logic
    - Test preview audio playback
    - Test fade-out behavior

- [ ] 13. Implement theme switching
  - [ ] 13.1 Create theme configuration
    - Define light theme with OpenStreetMap tiles
    - Define dark theme with CartoDB dark tiles
    - Store theme preference in localStorage
    - _Requirements: 7.1, 7.2, 7.4_
  
  - [ ] 13.2 Implement theme switching logic
    - Write `setTheme(theme)` function
    - Remove existing tile layer
    - Add new tile layer based on theme
    - Apply theme within 500ms
    - _Requirements: 7.3_
  
  - [ ] 13.3 Load theme on initialization
    - Read theme preference from localStorage
    - Apply saved theme on component mount
    - Default to light theme if no preference
    - _Requirements: 7.5_
  
  - [ ]* 13.4 Write unit tests for theme switching
    - Test theme persistence
    - Test tile layer updates
    - Test theme loading on mount

- [ ] 14. Implement keyboard navigation and accessibility
  - [ ] 14.1 Add keyboard event handlers
    - Implement arrow key panning (50px per keypress)
    - Implement +/- keys for zoom in/out
    - Implement Enter key for coordinate selection
    - _Requirements: 6.7, 11.1_
  
  - [ ] 14.2 Add ARIA labels and roles
    - Add role="application" to map container
    - Add aria-label to all interactive controls
    - Add aria-live regions for status updates
    - _Requirements: 11.2, 11.3_
  
  - [ ] 14.3 Implement screen reader announcements
    - Announce location name and time slot on marker focus
    - Announce coordinate selection
    - Announce loading and error states
    - _Requirements: 11.3_
  
  - [ ] 14.4 Add high contrast mode support
    - Increase marker border width in high contrast mode
    - Enhance marker colors for visibility
    - Adjust loading indicator contrast
    - _Requirements: 11.4_
  
  - [ ] 14.5 Implement keyboard focus management
    - Make markers keyboard focusable
    - Support Enter key on focused markers
    - Manage focus order logically
    - _Requirements: 11.5_
  
  - [ ]* 14.6 Write unit tests for accessibility
    - Test keyboard navigation
    - Test ARIA attributes
    - Test focus management

- [ ] 15. Checkpoint - Ensure all UI component tests pass
  - Run unit tests for all React components
  - Verify map interactions work correctly
  - Test accessibility features manually
  - Ensure all tests pass, ask the user if questions arise

- [ ] 16. Implement error handling and fallback logic
  - [ ] 16.1 Create error type definitions
    - Define MapErrorType enum with all error types
    - Create MapError interface with type, message, coordinates
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 16.2 Implement tile load error handling
    - Display placeholder tile with error indicator
    - Retry tile loading on next pan/zoom
    - _Requirements: 9.1_
  
  - [ ] 16.3 Implement Nominatim error handling
    - Handle timeout gracefully (use inference)
    - Handle unavailable service (use inference)
    - Continue without blocking user
    - _Requirements: 9.2_
  
  - [ ] 16.4 Implement coordinate validation errors
    - Display error message for invalid coordinates
    - Show "Invalid location selected" message
    - _Requirements: 9.3_
  
  - [ ] 16.5 Implement IndexedDB error handling
    - Disable marker display if IndexedDB unavailable
    - Continue map interaction without caching
    - Log cache write failures
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 16.6 Write unit tests for error handling
    - Test all error types
    - Test graceful degradation
    - Test error message display
    - Test recovery strategies

- [ ] 17. Implement performance optimizations
  - [ ] 17.1 Add marker clustering for low zoom levels
    - Cluster markers when zoom < 5
    - Show cluster count
    - Expand clusters on zoom in
    - _Requirements: 10.5_
  
  - [ ] 17.2 Implement virtual marker rendering
    - Only render markers within viewport bounds
    - Add 20% buffer zone for smooth panning
    - Remove off-screen markers from DOM
    - _Requirements: 10.5_
  
  - [ ] 17.3 Add event debouncing and throttling
    - Debounce map move events (100ms)
    - Throttle hover events (50ms)
    - Throttle marker updates (200ms)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ] 17.4 Optimize CSS animations
    - Use transform and opacity for GPU acceleration
    - Add will-change property to pulsing markers
    - Avoid layout-triggering properties
    - _Requirements: 10.4_
  
  - [ ]* 17.5 Write performance tests
    - Test rendering with 100+ markers
    - Measure click response time (< 100ms)
    - Measure marker update time (< 200ms)

- [x] 18. Integration and wiring
  - [x] 18.1 Wire coordinate capture to geocoding service
    - Connect click handler to geocoding API
    - Pass coordinates through validation
    - Handle geocoding results and errors
    - _Requirements: 2.1, 2.7, 5.1_
  
  - [x] 18.2 Wire geocoding to cache manager
    - Check cache before API call
    - Store successful geocoding results
    - Use cached results when available
    - _Requirements: 5.7, 5.8_
  
  - [x] 18.3 Wire cache to marker renderer
    - Load cached locations on map initialization
    - Update markers when cache changes
    - Remove markers for evicted entries
    - _Requirements: 3.1, 10.5_
  
  - [x] 18.4 Wire hover preview to geocoding
    - Trigger quick geocoding on hover
    - Use cached results when available
    - Handle preview audio playback
    - _Requirements: 4.1, 4.2_
  
  - [x] 18.5 Connect all components to parent state
    - Emit coordinate events to parent
    - Receive cached locations from parent
    - Handle theme changes from parent
    - Handle loading state from parent
  
  - [ ]* 18.6 Write integration tests
    - Test complete click flow (click → geocode → cache → marker)
    - Test hover preview flow (hover → delay → preview → fade)
    - Test cache hit flow (click cached location → immediate load)
    - Test error recovery flow (timeout → inference → continue)

- [x] 19. Final checkpoint - Comprehensive testing
  - Run all unit tests and property-based tests
  - Run integration tests with Playwright
  - Test all error scenarios manually
  - Test accessibility with screen reader
  - Test performance with 100+ markers
  - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- All code will be written in TypeScript with strict mode enabled
- React components will use function components with hooks
- IndexedDB operations will use the idb library wrapper
- Property-based tests will use fast-check with minimum 100 iterations
- The implementation follows Next.js 16 conventions and file structure
