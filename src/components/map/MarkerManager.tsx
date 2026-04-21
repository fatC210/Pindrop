'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import './MapMarker.css';

export interface MarkerDescriptor {
  id: string;
  cacheKey: string | null;
  coordinates: [number, number];
  isGenerating: boolean;
  isSelectable: boolean;
}

export interface MarkerManagerProps {
  map: L.Map | null;
  markers: MarkerDescriptor[];
  onMarkerClick: (cacheKey: string) => void;
}

function attachMarkerClickHandler(
  marker: L.Marker,
  cacheKey: string,
  onMarkerClick: (cacheKey: string) => void
): void {
  marker.off('click');
  marker.on('click', (event: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(event.originalEvent);
    onMarkerClick(cacheKey);
  });
}

function createMarkerIcon(marker: MarkerDescriptor): L.DivIcon {
  const interactiveClassName = marker.isSelectable ? ' map-pin-marker--interactive' : '';
  const generatingClassName = marker.isGenerating ? ' map-pin-marker--generating' : '';

  return L.divIcon({
    className: `map-pin-marker${interactiveClassName}${generatingClassName}`,
    html: `
      <div class="map-pin-marker__inner">
        <span class="map-pin-marker__pulse" aria-hidden="true"></span>
        <span class="map-pin-marker__emoji" aria-hidden="true">📍</span>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 42],
  });
}

export function MarkerManager({
  map,
  markers,
  onMarkerClick,
}: MarkerManagerProps) {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!map) {
      return;
    }

    const renderedMarkers = markersRef.current;
    const nextIds = new Set(markers.map((marker) => marker.id));

    for (const [markerId, existingMarker] of renderedMarkers.entries()) {
      if (!nextIds.has(markerId)) {
        map.removeLayer(existingMarker);
        renderedMarkers.delete(markerId);
      }
    }

    for (const marker of markers) {
      const existingMarker = renderedMarkers.get(marker.id);
      const icon = createMarkerIcon(marker);

      if (existingMarker) {
        existingMarker.setLatLng(marker.coordinates);
        existingMarker.setIcon(icon);
        if (marker.isSelectable && marker.cacheKey) {
          attachMarkerClickHandler(existingMarker, marker.cacheKey, onMarkerClick);
        }
        continue;
      }

      const leafletMarker = L.marker(marker.coordinates, {
        icon,
        bubblingMouseEvents: false,
      });
      if (marker.isSelectable && marker.cacheKey) {
        attachMarkerClickHandler(leafletMarker, marker.cacheKey, onMarkerClick);
      }
      leafletMarker.addTo(map);
      renderedMarkers.set(marker.id, leafletMarker);
    }

    return (): void => {
      for (const marker of renderedMarkers.values()) {
        map.removeLayer(marker);
      }
      renderedMarkers.clear();
    };
  }, [map, markers, onMarkerClick]);

  return null;
}
