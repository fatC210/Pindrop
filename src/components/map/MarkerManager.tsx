'use client';

// Marker manager for rendering cached location markers
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CachedSoundscape } from '@/utils/soundscapeCache';
import './MapMarker.css';

export interface MarkerManagerProps {
  map: L.Map | null;
  cachedLocations: CachedSoundscape[];
  onMarkerClick: (cacheKey: string) => void;
}

export function MarkerManager({
  map,
  cachedLocations,
  onMarkerClick,
}: MarkerManagerProps) {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!map) return;

    const markers = markersRef.current;

    // Get current marker keys
    const currentKeys = new Set(cachedLocations.map((loc) => loc.id));
    const existingKeys = new Set(markers.keys());

    // Remove markers that no longer exist in cache
    for (const key of existingKeys) {
      if (!currentKeys.has(key)) {
        const marker = markers.get(key);
        if (marker) {
          map.removeLayer(marker);
          markers.delete(key);
        }
      }
    }

    // Add or update markers
    for (const location of cachedLocations) {
      const existingMarker = markers.get(location.id);

      if (!existingMarker) {
        // Create new marker
        const icon = L.divIcon({
          className: `cached-marker ${location.timeSlot}`,
          html: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(location.coordinates, { icon });
        
        // Add click handler
        marker.on('click', () => {
          onMarkerClick(location.id);
        });

        // Add to map
        marker.addTo(map);
        markers.set(location.id, marker);
      }
    }

    // Cleanup
    return () => {
      for (const marker of markers.values()) {
        map.removeLayer(marker);
      }
      markers.clear();
    };
  }, [map, cachedLocations, onMarkerClick]);

  return null; // This component doesn't render anything directly
}
