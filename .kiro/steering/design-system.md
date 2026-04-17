---
inclusion: always
---

# Design System

## Color Tokens

**Light Theme:**
- `--bg-primary`: #FFFFFF
- `--bg-secondary`: #F5F5F5
- `--text-primary`: #1A1A1A
- `--text-secondary`: #666666
- `--accent`: #3B82F6
- `--border`: #E5E5E5

**Dark Theme:**
- `--bg-primary`: #1A1A1A
- `--bg-secondary`: #2A2A2A
- `--text-primary`: #FFFFFF
- `--text-secondary`: #A0A0A0
- `--accent`: #60A5FA
- `--border`: #404040

**Time Slot Colors:**
- Dawn: #FFA500 (orange)
- Day: #22C55E (green)
- Dusk: #FBBF24 (yellow)
- Night: #3B82F6 (blue)

## Spacing Scale

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

## Component Structure

```
src/
  components/
    map/
      MapView.tsx          # Main map component
      MapMarker.tsx        # Pulsing marker for cached locations
      HoverPreview.tsx     # Hover preview overlay
    soundscape/
      SoundscapePanel.tsx  # Right sidebar info panel
      VolumeControls.tsx   # 5-layer + master volume sliders
      LocationInfo.tsx     # City name, time, description
    player/
      AudioPlayer.tsx      # Web Audio API wrapper
    settings/
      SettingsPanel.tsx    # Settings overlay
      ApiKeyInput.tsx      # API key input with validation
    favorites/
      FavoritesBar.tsx     # Bottom favorites bar
```

## Map Marker Styles

**Pulsing Circle Animation:**
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 0.4; }
}
```

- Marker size: 24px base, pulses to 31px
- Animation duration: 2s infinite
- Color: Time slot color (dawn/day/dusk/night)
- Z-index: 1000 (above map tiles)

**Loading Indicator:**
- Ripple animation at click point
- 3 concentric circles expanding
- Duration: 1.5s loop until audio ready

## Typography

- Headings: Inter, 600 weight
- Body: Inter, 400 weight
- Monospace (API key): JetBrains Mono, 400 weight
- Base size: 16px
- Line height: 1.5

## Volume Slider Style

- Track: 4px height, rounded
- Thumb: 16px circle, accent color
- Active thumb: 20px with shadow
- Range: 0-100, step 1
- Labels: Layer name + percentage
