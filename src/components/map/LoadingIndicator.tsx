'use client';

// Pulsing ripple loading indicator for map clicks
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import './LoadingIndicator.css';

export interface LoadingIndicatorProps {
  map: L.Map | null;
  coordinates: [number, number] | null;
  isVisible: boolean;
}

export function LoadingIndicator({
  map,
  coordinates,
  isVisible,
}: LoadingIndicatorProps) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map || !coordinates || !isVisible) {
      // Remove marker if it exists
      if (markerRef.current) {
        map?.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    // Create custom icon with ripple animation
    const icon = L.divIcon({
      className: 'loading-indicator',
      html: `
        <div class="loading-indicator-container">
          <div class="loading-circle"></div>
          <div class="loading-circle"></div>
          <div class="loading-circle"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Create marker
    const marker = L.marker(coordinates, { icon });
    marker.addTo(map);
    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, coordinates, isVisible]);

  return null; // This component doesn't render anything directly
}
