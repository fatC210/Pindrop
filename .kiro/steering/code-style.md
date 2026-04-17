---
inclusion: always
---

# Code Style Rules

## TypeScript

- Strict mode enabled
- No `any` types - use `unknown` or proper types
- All functions have explicit return types
- Interfaces for data structures, types for unions/primitives
- Enums for fixed sets (RegionType, TimeSlot, etc.)

## React

- Function components only, no class components
- Hooks for state management
- Custom hooks prefix: `use*` (e.g., `useSoundscapePlayer`)
- Props interfaces suffix: `*Props` (e.g., `MapViewProps`)
- Event handlers prefix: `handle*` (e.g., `handleMapClick`)

## File Naming

- Components: PascalCase (e.g., `MapView.tsx`, `SoundscapePanel.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useSoundscapeCache.ts`)
- Utils: camelCase (e.g., `geocoding.ts`, `timeInterpolation.ts`)
- Types: PascalCase (e.g., `LocationContext.ts`, `SoundscapeRecipe.ts`)
- API routes: kebab-case folders (e.g., `app/api/elevenlabs/[...path]/route.ts`)

## Import Order

1. React/Next.js imports
2. Third-party libraries (Leaflet, idb, etc.)
3. Type imports
4. Local components
5. Local hooks
6. Local utils
7. Local types
8. CSS/styles

```typescript
import { useState, useEffect } from 'react';
import { Map } from 'leaflet';
import type { LatLng } from 'leaflet';
import { MapView } from '@/components/MapView';
import { useSoundscapePlayer } from '@/hooks/useSoundscapePlayer';
import { generateSoundscapeId } from '@/utils/caching';
import type { LocationContext } from '@/types/LocationContext';
import styles from './page.module.css';
```

## Async/Await

- Always use async/await, never raw Promises with `.then()`
- Use `Promise.allSettled()` for parallel calls that can partially fail
- Use `Promise.all()` only when all must succeed
- Wrap in try/catch with specific error handling

## Error Handling

- Never silent catch - always log or handle
- Use typed error objects
- Return error states, don't throw in React components
- API errors: return `{ success: false, error: string }`

## Comments

- JSDoc for public functions/hooks
- Inline comments for complex logic only
- No obvious comments ("increment counter" etc.)
- Explain WHY, not WHAT
