# Requirements Document: Settings UI

## Introduction

The Settings UI provides a comprehensive panel for users to manage their ElevenLabs API Key, customize map appearance, configure playback preferences, and manage local cache storage. This feature implements a zero-backend architecture where all settings are stored client-side in localStorage and IndexedDB.

## Glossary

- **Settings_Panel**: The UI component that displays all configuration options
- **API_Key_Manager**: The component responsible for API key input, validation, and storage
- **API_Key**: ElevenLabs API key in format `xi-[a-zA-Z0-9]{32}`
- **Preferences_Store**: localStorage object containing user preferences
- **Cache_Manager**: The component that displays and manages IndexedDB cache
- **Map_Theme**: Visual style of map tiles (light or dark)
- **Playback_Preferences**: User settings for audio playback behavior
- **Storage_Statistics**: Information about IndexedDB usage (count and size)
- **Validation_Service**: Service that verifies API key format and validity
- **Balance_Service**: Service that retrieves remaining API balance from ElevenLabs

## Requirements

### Requirement 1: API Key Input and Storage

**User Story:** As a user, I want to input and save my ElevenLabs API Key, so that I can use the soundscape generation features.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display an input field for the API Key
2. WHEN the user enters an API Key, THE API_Key_Manager SHALL mask the display to show only the first 3 characters followed by dots
3. WHEN the user submits an API Key, THE Validation_Service SHALL validate the format matches the pattern `xi-[a-zA-Z0-9]{32}`
4. IF the API Key format is invalid, THEN THE API_Key_Manager SHALL display an error message "Invalid API Key format"
5. WHEN the API Key format is valid, THE API_Key_Manager SHALL store the key in localStorage under the key `pindrop_api_key`
6. THE API_Key_Manager SHALL display the masked API Key as `xi-••••••••••••••••••••` in the UI
7. WHEN the user clicks an edit button, THE API_Key_Manager SHALL allow modification of the stored API Key

### Requirement 2: API Key Validation

**User Story:** As a user, I want to verify my API Key is valid, so that I know it will work for generating soundscapes.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a "Verify Key" button adjacent to the API Key input
2. WHEN the user clicks "Verify Key", THE Validation_Service SHALL send a request to the ElevenLabs API user subscription endpoint
3. IF the API returns a successful response, THEN THE Settings_Panel SHALL display a success indicator with text "✅ Key valid"
4. IF the API returns an error response, THEN THE Settings_Panel SHALL display an error message "❌ Key invalid or expired"
5. WHEN the API Key is valid, THE Balance_Service SHALL retrieve and display the remaining balance in format "$X.XX"
6. IF the balance retrieval fails, THEN THE Settings_Panel SHALL display "Balance unavailable"

### Requirement 3: API Key Security

**User Story:** As a user, I want my API Key to be handled securely, so that it is not exposed or logged.

#### Acceptance Criteria

1. THE API_Key_Manager SHALL NOT log the API Key to the browser console
2. THE API_Key_Manager SHALL NOT include the API Key in any error messages
3. THE API_Key_Manager SHALL clear the API Key from memory after storing it in localStorage
4. THE API_Key_Manager SHALL send the API Key only in the `x-elevenlabs-api-key` header
5. THE API_Key_Manager SHALL NOT send the API Key to any endpoint other than `/api/elevenlabs/*`
6. WHEN displaying the API Key, THE Settings_Panel SHALL show only the masked version `xi-••••••••••••••••••••`

### Requirement 4: Map Theme Switching

**User Story:** As a user, I want to switch between light and dark map themes, so that I can customize the visual appearance.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a theme selector with options "Light" and "Dark"
2. WHEN the user selects a theme, THE Preferences_Store SHALL save the selection to localStorage under `pindrop_preferences.mapStyle`
3. WHEN the theme changes, THE Settings_Panel SHALL apply the new theme to the map tiles immediately
4. THE Settings_Panel SHALL apply the theme to the UI components using CSS variables
5. WHEN the application loads, THE Settings_Panel SHALL read the saved theme from localStorage and apply it
6. IF no theme is saved, THEN THE Settings_Panel SHALL default to "Light" theme

### Requirement 5: Auto-Play Preference

**User Story:** As a user, I want to configure whether soundscapes play immediately after clicking, so that I can control the playback behavior.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a toggle control labeled "Auto-play: Play immediately after click"
2. WHEN the user toggles auto-play, THE Preferences_Store SHALL save the state to localStorage under `pindrop_preferences.autoPlay`
3. THE Settings_Panel SHALL display the current auto-play state (enabled or disabled)
4. WHEN the application loads, THE Settings_Panel SHALL read the saved auto-play preference from localStorage
5. IF no preference is saved, THEN THE Settings_Panel SHALL default to enabled (true)

### Requirement 6: Fade-In Duration Configuration

**User Story:** As a user, I want to configure the fade-in duration for soundscapes, so that I can customize the audio transition.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a selector for fade-in duration with options: 0.5s, 1.0s, 1.5s, 2.0s, 3.0s
2. WHEN the user selects a duration, THE Preferences_Store SHALL save the value to localStorage under `pindrop_preferences.fadeInDuration`
3. THE Settings_Panel SHALL display the currently selected fade-in duration
4. WHEN the application loads, THE Settings_Panel SHALL read the saved fade-in duration from localStorage
5. IF no duration is saved, THEN THE Settings_Panel SHALL default to 1.5s

### Requirement 7: Dynamic Events Toggle

**User Story:** As a user, I want to enable or disable random ambient sound effects, so that I can control the soundscape complexity.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a toggle control labeled "Dynamic events: Random ambient sound effects"
2. WHEN the user toggles dynamic events, THE Preferences_Store SHALL save the state to localStorage under `pindrop_preferences.dynamicEvents`
3. THE Settings_Panel SHALL display the current dynamic events state (enabled or disabled)
4. WHEN the application loads, THE Settings_Panel SHALL read the saved dynamic events preference from localStorage
5. IF no preference is saved, THEN THE Settings_Panel SHALL default to enabled (true)

### Requirement 8: Cache Statistics Display

**User Story:** As a user, I want to see how much cache storage I am using, so that I can understand my storage consumption.

#### Acceptance Criteria

1. THE Cache_Manager SHALL query IndexedDB for the count of cached soundscapes
2. THE Cache_Manager SHALL calculate the total size in megabytes of all cached audio blobs
3. THE Settings_Panel SHALL display the cache statistics in format "X soundscapes · Y MB"
4. WHEN the Settings_Panel opens, THE Cache_Manager SHALL refresh the statistics
5. THE Cache_Manager SHALL query the `soundscape_cache` object store in the `pindrop` database
6. IF IndexedDB is unavailable, THEN THE Settings_Panel SHALL display "Cache unavailable"

### Requirement 9: Cache Clearing

**User Story:** As a user, I want to clear all cached data, so that I can free up storage space.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display a "Clear All Cache" button
2. WHEN the user clicks "Clear All Cache", THE Settings_Panel SHALL display a confirmation dialog with text "Clear all cached soundscapes? This cannot be undone."
3. IF the user confirms, THEN THE Cache_Manager SHALL delete all records from the `soundscape_cache` object store
4. WHEN clearing cache, THE Cache_Manager SHALL delete all records from the `geocode_cache` object store
5. WHEN clearing cache, THE Cache_Manager SHALL delete all records from the `location_history` object store
6. WHEN cache clearing completes, THE Settings_Panel SHALL display a success message "Cache cleared successfully"
7. WHEN cache clearing completes, THE Cache_Manager SHALL refresh the storage statistics to show 0 soundscapes and 0 MB
8. IF cache clearing fails, THEN THE Settings_Panel SHALL display an error message "Failed to clear cache"

### Requirement 10: Settings Panel Access

**User Story:** As a user, I want to open and close the settings panel, so that I can access configuration options when needed.

#### Acceptance Criteria

1. THE application SHALL display a settings button (⚙️ icon) in the top navigation bar
2. WHEN the user clicks the settings button, THE Settings_Panel SHALL open as an overlay
3. WHEN the Settings_Panel is open, THE application SHALL continue playing any active soundscape
4. WHEN the user clicks outside the Settings_Panel, THE Settings_Panel SHALL close
5. WHEN the user clicks a close button in the Settings_Panel, THE Settings_Panel SHALL close
6. THE Settings_Panel SHALL display above all other UI elements with appropriate z-index

### Requirement 11: Preferences Persistence

**User Story:** As a user, I want my settings to persist across browser sessions, so that I don't have to reconfigure them each time.

#### Acceptance Criteria

1. WHEN any preference changes, THE Preferences_Store SHALL immediately write to localStorage
2. THE Preferences_Store SHALL store all preferences in a single JSON object under key `pindrop_preferences`
3. WHEN the application loads, THE Preferences_Store SHALL read all preferences from localStorage
4. IF localStorage is unavailable, THEN THE application SHALL use default values and display a warning "Settings cannot be saved"
5. THE Preferences_Store SHALL validate all loaded preferences against expected types and ranges
6. IF a loaded preference is invalid, THEN THE Preferences_Store SHALL use the default value for that preference

### Requirement 12: Settings Panel Layout

**User Story:** As a user, I want a well-organized settings interface, so that I can easily find and modify options.

#### Acceptance Criteria

1. THE Settings_Panel SHALL organize settings into sections: "API Key", "Map", "Playback", "Cache", "About"
2. THE Settings_Panel SHALL display section headers with visual separation between sections
3. THE Settings_Panel SHALL use consistent spacing of 16px between settings items
4. THE Settings_Panel SHALL use consistent spacing of 24px between sections
5. THE Settings_Panel SHALL display labels aligned to the left and controls aligned to the right
6. THE Settings_Panel SHALL be scrollable when content exceeds viewport height
7. THE Settings_Panel SHALL have a maximum width of 480px and be centered on the screen

### Requirement 13: About Section

**User Story:** As a user, I want to see application version and attribution information, so that I know what version I am using.

#### Acceptance Criteria

1. THE Settings_Panel SHALL display an "About" section at the bottom
2. THE About section SHALL display the application name "PinDrop" and version number
3. THE About section SHALL display attribution text "ElevenLabs · Leaflet · Next.js"
4. THE About section SHALL use a smaller font size than other settings sections
5. THE About section SHALL use secondary text color for reduced visual prominence

### Requirement 14: Input Validation Feedback

**User Story:** As a user, I want immediate feedback when I enter invalid values, so that I can correct errors quickly.

#### Acceptance Criteria

1. WHEN the user enters an API Key with invalid format, THE API_Key_Manager SHALL display an error message below the input field
2. THE error message SHALL appear immediately after the user stops typing for 500ms
3. THE error message SHALL use red text color and include an error icon
4. WHEN the user corrects the input to valid format, THE error message SHALL disappear
5. THE API_Key_Manager SHALL disable the "Verify Key" button when the format is invalid
6. THE API_Key_Manager SHALL enable the "Verify Key" button when the format is valid

### Requirement 15: Responsive Settings Panel

**User Story:** As a user, I want the settings panel to work on different screen sizes, so that I can access settings on any device.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px, THE Settings_Panel SHALL occupy the full screen width
2. WHEN the viewport width is 768px or greater, THE Settings_Panel SHALL have a fixed width of 480px
3. THE Settings_Panel SHALL maintain readable text size on all screen sizes
4. THE Settings_Panel SHALL maintain touch-friendly control sizes (minimum 44px) on mobile devices
5. THE Settings_Panel SHALL scroll vertically when content exceeds viewport height
