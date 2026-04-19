# Implementation Plan: Settings UI

## Overview

This implementation plan breaks down the Settings UI module into discrete, actionable coding tasks. The module provides a comprehensive configuration panel for managing ElevenLabs API credentials, customizing map appearance, configuring playback preferences, and managing local cache storage. All implementation will use TypeScript with React components in a Next.js 16 application.

The implementation follows a layered approach: core utilities and data models first, then storage management, followed by UI components, and finally integration and testing. Each task builds incrementally to ensure early validation of core functionality.

## Tasks

- [x] 1. Set up core data models and type definitions
  - Create TypeScript interfaces for all data structures
  - Define UserPreferences interface with all preference fields
  - Define CacheStatistics interface for cache data
  - Define SettingsState interface for component state
  - Define error types enum (SettingsErrorType)
  - Create validation result types
  - _Requirements: 11.2, 11.5_

- [x] 2. Implement API key validation and masking utilities
  - [x] 2.1 Create API key format validation function
    - Write `validateApiKeyFormat(apiKey: string)` function
    - Implement regex validation for `xi-[a-zA-Z0-9]{32}` pattern
    - Return ValidationResult with isValid and error message
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 2.2 Write property test for API key format validation
    - **Property 2: API Key Format Validation Correctness**
    - **Validates: Requirements 1.3**
    - Test that validation correctly identifies valid/invalid API keys across all string inputs
  
  - [x] 2.3 Create API key masking function
    - Write `maskApiKey(apiKey: string)` function
    - Return masked format `sk-••••••••••••••••••••` (3 chars + 22 dots)
    - Handle empty/short strings gracefully
    - _Requirements: 1.2, 1.6, 3.6_
  
  - [ ]* 2.4 Write property test for API key masking
    - **Property 1: API Key Masking Format Consistency**
    - **Validates: Requirements 1.2, 1.6, 3.6**
    - Test format consistency and idempotence (masking twice produces same result)
  
  - [x] 2.5 Create API key verification function
    - Write `verifyApiKey(apiKey: string)` async function
    - Call ElevenLabs user subscription endpoint
    - Return VerificationResult with isValid and error
    - Handle network errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 2.6 Write property test for API key exclusion from errors
    - **Property 3: API Key Exclusion from Error Messages**
    - **Validates: Requirements 3.2**
    - Test that error messages never contain actual API key value

- [x] 3. Implement preferences store and localStorage management
  - [x] 3.1 Create default preferences constant
    - Define DEFAULT_PREFERENCES object with all default values
    - Set mapStyle: 'light', autoPlay: true, fadeInDuration: 1.5
    - Set dynamicEvents: true, masterVolume: 0.8
    - Define default layer volumes
    - _Requirements: 11.6_
  
  - [x] 3.2 Create preferences validation function
    - Write `validatePreferences(preferences: unknown)` function
    - Validate all fields exist and have correct types
    - Validate value ranges (volumes 0-1, fadeInDuration in valid set)
    - Return validated UserPreferences object with defaults for invalid fields
    - _Requirements: 11.5, 11.6_
  
  - [ ]* 3.3 Write property test for preferences validation
    - **Property 6: Preferences Validation Type Safety**
    - **Validates: Requirements 11.5**
    - Test that validation always returns valid structure with correct types and ranges
  
  - [ ]* 3.4 Write property test for invalid preference fallback
    - **Property 7: Invalid Preference Fallback Consistency**
    - **Validates: Requirements 11.6**
    - Test that invalid values are replaced with defaults
  
  - [x] 3.5 Create PreferencesStore class
    - Implement `loadPreferences()` method reading from localStorage
    - Implement `savePreferences(preferences)` method writing to localStorage
    - Implement `isLocalStorageAvailable()` check
    - Handle localStorage unavailable gracefully
    - Use PREFERENCES_KEY constant 'pindrop_preferences'
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 3.6 Create API key storage functions
    - Write `storeApiKey(apiKey: string)` function
    - Write `retrieveApiKey()` function
    - Write `clearApiKey()` function
    - Use API_KEY_KEY constant 'pindrop_api_key'
    - Never log API key to console
    - _Requirements: 1.5, 3.1, 3.3_

- [x] 4. Implement cache statistics and management utilities
  - [x] 4.1 Create cache size calculation function
    - Write `calculateTotalSizeMB(blobSizes: number[])` function
    - Sum all blob sizes in bytes
    - Convert to MB with formula: bytes / (1024 * 1024)
    - Round to 2 decimal places
    - Return non-negative number
    - _Requirements: 8.2_
  
  - [ ]* 4.2 Write property test for cache size calculation
    - **Property 4: Cache Size Calculation Accuracy**
    - **Validates: Requirements 8.2**
    - Test accuracy and non-negative result
  
  - [x] 4.3 Create cache statistics formatting function
    - Write `formatCacheStats(stats: CacheStatistics)` function
    - Return string in format "{count} soundscapes · {size} MB"
    - Handle null/undefined stats gracefully
    - _Requirements: 8.3_
  
  - [ ]* 4.4 Write property test for statistics formatting
    - **Property 5: Cache Statistics Format String Consistency**
    - **Validates: Requirements 8.3**
    - Test format consistency for all valid inputs
  
  - [x] 4.5 Create cache statistics calculator
    - Write `calculateCacheStatistics()` async function
    - Query IndexedDB soundscape_cache store
    - Count total soundscapes
    - Sum all blob sizes using calculateTotalSizeMB
    - Count geocode_cache and location_history entries
    - Return CacheStatistics object
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 4.6 Create cache clearing function
    - Write `clearAllCaches()` async function
    - Clear soundscape_cache object store
    - Clear geocode_cache object store
    - Clear location_history object store
    - Handle IndexedDB errors gracefully
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 5. Checkpoint - Ensure all utility tests pass
  - Run unit tests for validation, masking, and cache utilities
  - Run property-based tests (minimum 100 iterations each)
  - Verify all core functions work correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Implement base UI components
  - [x] 6.1 Create Toggle component
    - Build reusable toggle switch component
    - Implement checked/unchecked states
    - Add keyboard support (Space/Enter to toggle)
    - Apply toggle styles from design system
    - Add ARIA attributes (role="switch", aria-checked)
    - _Requirements: 5.1, 5.3, 7.1, 7.3_
  
  - [x] 6.2 Create ConfirmationDialog component
    - Build modal dialog with overlay
    - Accept title, message, onConfirm, onCancel props
    - Implement focus trap within dialog
    - Add Escape key to cancel
    - Apply dialog styles from design system
    - Add ARIA attributes (role="dialog", aria-modal)
    - _Requirements: 9.2_
  
  - [x] 6.3 Create LoadingSpinner component
    - Build spinning loader animation
    - Use CSS animation from design system
    - Accept size prop (small, medium, large)
    - _Requirements: 2.2_
  
  - [ ]* 6.4 Write unit tests for base components
    - Test Toggle checked/unchecked states
    - Test Toggle keyboard interaction
    - Test ConfirmationDialog show/hide
    - Test ConfirmationDialog callbacks

- [x] 7. Implement ApiKeySection component
  - [x] 7.1 Create ApiKeyInput sub-component
    - Build input field with password type
    - Implement controlled input with value/onChange
    - Add edit button to toggle between masked display and input
    - Show masked API key when not editing
    - Apply input styles from design system
    - _Requirements: 1.1, 1.7_
  
  - [x] 7.2 Implement API key validation UI
    - Add debounced validation on input change (500ms delay)
    - Display inline error message for invalid format
    - Show error icon and red border on invalid input
    - Clear error when input becomes valid
    - Disable "Verify Key" button when format invalid
    - _Requirements: 1.4, 14.1, 14.2, 14.4_
  
  - [x] 7.3 Implement API key verification UI
    - Add "Verify Key" button next to input
    - Show loading spinner during verification
    - Display success indicator "✅ Key valid" on success
    - Display error message "❌ Key invalid or expired" on failure
    - Handle network errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 7.4 Wire ApiKeySection to storage
    - Load stored API key on mount
    - Save API key to localStorage on change
    - Display masked version when not editing
    - Clear API key from memory after storage
    - _Requirements: 1.5, 3.1, 3.3_
  
  - [ ]* 7.5 Write unit tests for ApiKeySection
    - Test input/masked display toggle
    - Test validation error display
    - Test verification success/failure
    - Test localStorage integration

- [x] 8. Implement MapSection component
  - [x] 8.1 Create ThemeSelector sub-component
    - Build theme option buttons (Light/Dark)
    - Display theme icons (☀️/🌙) and labels
    - Highlight active theme with accent color
    - Apply theme selector styles from design system
    - Add ARIA attributes (aria-pressed for active state)
    - _Requirements: 4.1, 4.2_
  
  - [x] 8.2 Implement theme change handler
    - Update preferences state on theme selection
    - Save to localStorage immediately
    - Notify parent component via onThemeChange callback
    - _Requirements: 4.2, 4.3_
  
  - [x] 8.3 Load saved theme on mount
    - Read theme from preferences store
    - Apply saved theme to UI
    - Default to 'light' if no preference saved
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [ ]* 8.4 Write unit tests for MapSection
    - Test theme selection updates state
    - Test theme persistence to localStorage
    - Test parent callback invocation
    - Test default theme loading

- [x] 9. Implement PlaybackSection component
  - [x] 9.1 Create playback preference controls
    - Add AutoPlayToggle with label "Auto-play: Play immediately after click"
    - Add FadeInSelector dropdown with options [0.5s, 1.0s, 1.5s, 2.0s, 3.0s]
    - Add DynamicEventsToggle with label "Dynamic events: Random ambient sound effects"
    - Apply section styles from design system
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 7.1, 7.2_
  
  - [x] 9.2 Implement preference change handlers
    - Handle auto-play toggle change
    - Handle fade-in duration selection change
    - Handle dynamic events toggle change
    - Update preferences state immediately
    - Save to localStorage on each change
    - _Requirements: 5.2, 6.2, 7.2_
  
  - [x] 9.3 Load saved preferences on mount
    - Read all playback preferences from store
    - Apply to UI controls
    - Use defaults if no preferences saved
    - _Requirements: 5.4, 5.5, 6.4, 6.5, 7.4, 7.5_
  
  - [ ]* 9.4 Write unit tests for PlaybackSection
    - Test all toggle/selector interactions
    - Test preferences persistence
    - Test default value loading

- [x] 10. Implement CacheSection component
  - [x] 10.1 Create CacheStatistics display
    - Show loading state while calculating statistics
    - Display formatted statistics "{count} soundscapes · {size} MB"
    - Show "Cache unavailable" if IndexedDB unavailable
    - Refresh statistics when section becomes visible
    - Apply statistics display styles
    - _Requirements: 8.1, 8.3, 8.4, 8.6_
  
  - [x] 10.2 Create ClearCacheButton sub-component
    - Build "Clear All Cache" button with destructive styling
    - Disable button when cache is empty or unavailable
    - Show "Clearing..." text during operation
    - Apply clear cache button styles from design system
    - _Requirements: 9.1_
  
  - [x] 10.3 Implement cache clearing flow
    - Show confirmation dialog on button click
    - Display message "Clear all cached soundscapes? This cannot be undone."
    - Call clearAllCaches() on confirmation
    - Show success message "Cache cleared successfully" on completion
    - Show error message "Failed to clear cache" on failure
    - Refresh statistics after clearing
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [ ]* 10.4 Write unit tests for CacheSection
    - Test statistics loading and display
    - Test confirmation dialog flow
    - Test cache clearing success/failure
    - Test statistics refresh after clear

- [x] 11. Implement AboutSection component
  - [x] 11.1 Create about information display
    - Display application name "PinDrop"
    - Display version number from package.json
    - Display attribution text "ElevenLabs · Leaflet · Next.js"
    - Use smaller font size and secondary text color
    - Apply about section styles from design system
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Implement main SettingsPanel component
  - [x] 12.1 Create panel layout structure
    - Build overlay with click-to-close functionality
    - Build panel container with fixed width (480px desktop, 100vw mobile)
    - Add panel header with close button
    - Organize sections: API Key, Map, Playback, Cache, About
    - Apply consistent spacing (16px between items, 24px between sections)
    - Make panel scrollable when content exceeds viewport
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x] 12.2 Implement panel state management
    - Create state for isOpen, apiKey, preferences, cacheStats
    - Create state for loading/error states
    - Implement open/close handlers
    - Implement overlay click to close
    - Implement close button handler
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [x] 12.3 Implement preferences loading and saving
    - Load all preferences from PreferencesStore on mount
    - Save preferences immediately on any change
    - Handle localStorage unavailable gracefully
    - Show warning "Settings cannot be saved" if storage unavailable
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 12.4 Implement error handling and feedback
    - Show error messages for localStorage unavailable
    - Show error messages for IndexedDB unavailable
    - Show error messages for API key verification failures
    - Show success messages for cache clearing
    - Auto-dismiss success messages after 3 seconds
    - _Requirements: 11.4, 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 12.5 Write unit tests for SettingsPanel
    - Test panel open/close
    - Test overlay click to close
    - Test preferences loading
    - Test error handling
    - Test localStorage unavailable scenario

- [x] 13. Implement responsive layout and styling
  - [x] 13.1 Create responsive CSS for settings panel
    - Desktop (≥768px): 480px centered panel with border radius
    - Mobile (<768px): full-screen panel without border radius
    - Apply max-height 90vh with scrolling
    - Apply box shadow on desktop
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 13.2 Ensure touch-friendly controls on mobile
    - Minimum 44px touch target size for all interactive elements
    - Adequate spacing between controls
    - Readable text size on all screen sizes
    - _Requirements: 15.4_
  
  - [x] 13.3 Implement panel animations
    - Add slide-in animation on open (0.2s ease-out)
    - Add slide-out animation on close (0.2s ease-in)
    - Add fade-in animation for overlay
    - Apply animations from design system
    - _Requirements: 10.1, 10.6_
  
  - [ ]* 13.4 Test responsive layout manually
    - Test on desktop viewport (1920x1080)
    - Test on tablet viewport (768x1024)
    - Test on mobile viewport (375x667)
    - Verify all controls accessible and readable

- [x] 14. Implement accessibility features
  - [x] 14.1 Add ARIA labels and roles
    - Add role="dialog" and aria-modal="true" to panel
    - Add aria-labelledby to all sections
    - Add aria-describedby to inputs with descriptions
    - Add aria-invalid to inputs with errors
    - Add role="alert" to error messages
    - Add aria-live regions for dynamic content
    - _Requirements: 10.6, 14.1, 14.2, 14.3, 14.4_
  
  - [x] 14.2 Implement keyboard navigation
    - Tab/Shift+Tab to navigate between controls
    - Enter/Space to activate buttons and toggles
    - Escape to close settings panel
    - Arrow keys for theme selector navigation
    - _Requirements: 10.4, 10.5_
  
  - [x] 14.3 Implement focus management
    - Focus first focusable element on panel open
    - Trap focus within panel (Tab wraps around)
    - Restore focus to trigger button on close
    - Ensure all interactive elements are keyboard accessible
    - _Requirements: 10.4, 10.5_
  
  - [x] 14.4 Add screen reader announcements
    - Announce panel open/close
    - Announce validation errors
    - Announce verification success/failure
    - Announce cache clearing completion
    - Use aria-live="polite" for non-critical updates
    - Use role="alert" for errors
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 14.5 Test accessibility manually
    - Test with keyboard only (no mouse)
    - Test with screen reader (NVDA/JAWS/VoiceOver)
    - Test focus trap behavior
    - Test all ARIA announcements

- [x] 15. Checkpoint - Ensure all UI component tests pass
  - Run unit tests for all React components
  - Verify all interactions work correctly
  - Test error handling scenarios
  - Ensure all tests pass, ask the user if questions arise

- [x] 16. Implement integration with parent application
  - [x] 16.1 Create settings button in navigation
    - Add settings button (⚙️ icon) to top navigation bar
    - Position in top-right corner
    - Apply button styles from design system
    - Add onClick handler to open settings panel
    - _Requirements: 10.1_
  
  - [x] 16.2 Wire theme changes to map component
    - Pass onThemeChange callback to SettingsPanel
    - Update map tile layer when theme changes
    - Apply theme within 500ms of selection
    - Persist theme preference to localStorage
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 16.3 Wire preferences to audio player
    - Read preferences from PreferencesStore in audio player
    - Apply autoPlay setting to playback behavior
    - Apply fadeInDuration to audio fade-in
    - Apply dynamicEvents to event system
    - Update audio player when preferences change
    - _Requirements: 5.2, 5.4, 6.2, 6.4, 7.2, 7.4_
  
  - [x] 16.4 Integrate API key with ElevenLabs calls
    - Read API key from localStorage in API proxy
    - Include x-elevenlabs-api-key header in all requests
    - Show "API Key required" error if key missing
    - Show "API Key invalid" error if verification fails
    - _Requirements: 1.5, 3.4, 3.5_
  
  - [ ]* 16.5 Write integration tests
    - Test complete settings flow (open → change → save → close)
    - Test theme change updates map
    - Test API key verification flow
    - Test cache clearing flow
    - Test preferences persistence across sessions

- [x] 17. Implement performance optimizations
  - [x] 17.1 Add debouncing for API key validation
    - Debounce validation by 500ms after user stops typing
    - Cancel pending validation on unmount
    - Use useMemo for debounced function
    - _Requirements: 14.2_
  
  - [x] 17.2 Add throttling for preferences save
    - Throttle localStorage writes to max 1 per second
    - Ensure final value is always saved
    - Use useMemo for throttled function
    - _Requirements: 11.1_
  
  - [x] 17.3 Add memoization for expensive calculations
    - Memoize maskApiKey result
    - Memoize formatCacheStats result
    - Memoize validation results
    - Use useMemo and useCallback appropriately
  
  - [x] 17.4 Implement lazy loading for cache statistics
    - Only load statistics when CacheSection becomes visible
    - Use intersection observer or visibility check
    - Cache results until panel closes
    - _Requirements: 8.4_
  
  - [ ]* 17.5 Test performance optimizations
    - Verify debouncing reduces validation calls
    - Verify throttling reduces localStorage writes
    - Verify memoization prevents unnecessary recalculations
    - Measure render performance with React DevTools

- [x] 18. Final integration and polish
  - [x] 18.1 Add loading states for all async operations
    - Show spinner during API key verification
    - Show spinner during cache statistics loading
    - Show spinner during cache clearing
    - Disable controls during async operations
    - _Requirements: 2.2, 8.4, 9.7_
  
  - [x] 18.2 Add success/error feedback animations
    - Animate success checkmark on verification success
    - Animate error shake on validation failure
    - Fade in/out toast notifications
    - Apply animations from design system
  
  - [x] 18.3 Implement graceful degradation
    - Handle localStorage unavailable scenario
    - Handle IndexedDB unavailable scenario
    - Continue functioning with reduced features
    - Show appropriate warnings to user
    - _Requirements: 11.4, 8.6_
  
  - [x] 18.4 Add comprehensive error logging
    - Log all errors to console with context
    - Include timestamp, error type, and relevant data
    - Never log sensitive data (API keys)
    - Use format: [PinDrop Error] {type}: {message}
  
  - [ ]* 18.5 Write end-to-end tests
    - Test complete user journey through all settings
    - Test error recovery scenarios
    - Test persistence across browser sessions
    - Test with different viewport sizes

- [x] 19. Final checkpoint - Comprehensive testing
  - Run all unit tests and property-based tests
  - Run integration tests with parent application
  - Test all error scenarios manually
  - Test accessibility with screen reader
  - Test responsive layout on multiple devices
  - Test performance with React DevTools
  - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document (7 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- All code will be written in TypeScript with strict mode enabled
- React components will use function components with hooks
- IndexedDB operations will use the existing db.ts wrapper
- Property-based tests will use fast-check with minimum 100 iterations
- The implementation follows Next.js 16 conventions and file structure
- Security: API key never logged, masked display only, no balance display per user feedback
- Zero-backend: All data stored client-side in localStorage and IndexedDB
- Responsive: 480px desktop panel, full-screen mobile
- Accessibility: Full keyboard navigation, ARIA labels, focus management, screen reader support
