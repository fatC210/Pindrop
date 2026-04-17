'use client';

// Main Leaflet map component for PinDrop
import { useEffect, useRef, useState } from 'react';
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

export function MapView({
  onCoordinateSelect,
  theme = 'light',
  isLoading = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const loadingMarkerRef = useRef<L.Marker | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Create map instance
    const map = L.map(mapContainer.current, {
      center: [20, 0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false, // We'll add custom controls
    });

    mapInstance.current = map;

    // Add tile layer based on theme
    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      theme === 'dark'
        ? '© OpenStreetMap contributors, © CARTO'
        : '© OpenStreetMap contributors';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18,
      minZoom: 2,
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Add click event listener
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // Validate coordinates
      const validation = validateCoordinates(lat, lng);
      if (!validation.isValid) {
        console.error('[PinDrop Error] Invalid coordinates:', validation.error);
        return;
      }
      
      // Set selected coordinates for loading indicator
      setSelectedCoordinates([lat, lng]);
      
      onCoordinateSelect(lat, lng);
    });

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Handle theme changes
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;

    // Remove old tile layer
    mapInstance.current.removeLayer(tileLayerRef.current);

    // Add new tile layer
    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      theme === 'dark'
        ? '© OpenStreetMap contributors, © CARTO'
        : '© OpenStreetMap contributors';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 18,
      minZoom: 2,
    });

    tileLayer.addTo(mapInstance.current);
    tileLayerRef.current = tileLayer;
  }, [theme]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      role="application"
      aria-label="Interactive world map for soundscape exploration"
    >
      <LoadingIndicator
        map={mapInstance.current}
        coordinates={selectedCoordinates}
        isVisible={isLoading}
      />
      <MapControls map={mapInstance.current} />
    </div>
  );
}
