'use client';

// Main Leaflet map component for PinDrop
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { validateCoordinates } from '@/utils/coordinates';
import { LoadingIndicator } from './LoadingIndicator';
import { MapControls } from './MapControls';

export interface MapViewProps {
  onCoordinateSelect: (lat: number, lng: number) => void;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
}

function createTileLayer(theme: 'light' | 'dark'): L.TileLayer {
  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution =
    theme === 'dark'
      ? '© OpenStreetMap contributors, © CARTO'
      : '© OpenStreetMap contributors';

  return L.tileLayer(tileUrl, {
    attribution,
    maxZoom: 18,
    minZoom: 2,
  });
}

export function MapView({
  onCoordinateSelect,
  theme = 'light',
  isLoading = false,
}: MapViewProps) {
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const initialThemeRef = useRef<'light' | 'dark'>(theme);
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);

  useEffect(() => {
    onCoordinateSelectRef.current = onCoordinateSelect;
  }, [onCoordinateSelect]);

  const mapContainerRef = useCallback(
    (node: HTMLDivElement | null): void => {
      if (!node) {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
          tileLayerRef.current = null;
          setMap(null);
        }
        return;
      }

      if (mapInstance.current) {
        return;
      }

      // Create map instance
      const createdMap = L.map(node, {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false, // We'll add custom controls
      });

      mapInstance.current = createdMap;

      // Add initial tile layer
      const tileLayer = createTileLayer(initialThemeRef.current);
      tileLayer.addTo(createdMap);
      tileLayerRef.current = tileLayer;

      // Add click event listener
      createdMap.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;

        // Validate coordinates
        const validation = validateCoordinates(lat, lng);
        if (!validation.isValid) {
          console.error('[PinDrop Error] Invalid coordinates:', validation.error);
          return;
        }

        // Set selected coordinates for loading indicator
        setSelectedCoordinates([lat, lng]);
        onCoordinateSelectRef.current(lat, lng);
      });

      setMap(createdMap);
    },
    [],
  );

  // Handle theme changes
  useEffect(() => {
    if (!map || !tileLayerRef.current) return;

    // Remove old tile layer
    map.removeLayer(tileLayerRef.current);

    // Add new tile layer
    const tileLayer = createTileLayer(theme);
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [map, theme]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      role="application"
      aria-label="Interactive world map for soundscape exploration"
    >
      <LoadingIndicator map={map} coordinates={selectedCoordinates} isVisible={isLoading} />
      <MapControls map={map} />
    </div>
  );
}
