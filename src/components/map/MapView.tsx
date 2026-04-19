'use client';

// Main Leaflet map component for PinDrop
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useI18n } from '@/i18n/I18nProvider';
import { validateCoordinates } from '@/utils/coordinates';
import type { CachedSoundscape } from '@/utils/soundscapeCache';
import { LoadingIndicator } from './LoadingIndicator';
import { MapControls } from './MapControls';
import { MarkerManager } from './MarkerManager';
import './MapView.css';

export interface MapViewProps {
  onCoordinateSelect: (lat: number, lng: number) => void;
  onMarkerSelect?: (cacheKey: string) => void;
  onHoverPreview?: (lat: number, lng: number) => void;
  onHoverEnd?: () => void;
  cachedLocations?: CachedSoundscape[];
  canPreview?: boolean;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
  className?: string;
}

type MapInteractionState = 'clickable' | 'pressed' | 'dragging';

const DRAG_DISTANCE_THRESHOLD_PX = 6;

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
  onMarkerSelect,
  onHoverPreview,
  onHoverEnd,
  cachedLocations = [],
  canPreview = false,
  theme = 'light',
  isLoading = false,
  className,
}: MapViewProps) {
  const { messages } = useI18n();
  const mapInstance = useRef<L.Map | null>(null);
  const containerElementRef = useRef<HTMLDivElement | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onCoordinateSelectRef = useRef(onCoordinateSelect);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const onHoverPreviewRef = useRef(onHoverPreview);
  const onHoverEndRef = useRef(onHoverEnd);
  const canPreviewRef = useRef(canPreview);
  const initialThemeRef = useRef<'light' | 'dark'>(theme);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const interactionStateRef = useRef<MapInteractionState>('clickable');
  const pointerDownPointRef = useRef<L.Point | null>(null);
  const suppressNextClickRef = useRef(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);
  const [interactionState, setInteractionState] = useState<MapInteractionState>('clickable');

  const updateInteractionState = useCallback((nextState: MapInteractionState): void => {
    if (interactionStateRef.current === nextState) {
      return;
    }

    interactionStateRef.current = nextState;
    setInteractionState(nextState);
  }, []);

  useEffect(() => {
    onCoordinateSelectRef.current = onCoordinateSelect;
  }, [onCoordinateSelect]);

  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    onHoverPreviewRef.current = onHoverPreview;
  }, [onHoverPreview]);

  useEffect(() => {
    onHoverEndRef.current = onHoverEnd;
  }, [onHoverEnd]);

  useEffect(() => {
    canPreviewRef.current = canPreview;
  }, [canPreview]);

  const mapContainerRef = useCallback(
    (node: HTMLDivElement | null): void => {
      containerElementRef.current = node;

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

      requestAnimationFrame(() => {
        createdMap.invalidateSize();
      });

      // Add click event listener
      createdMap.on('click', (event: L.LeafletMouseEvent) => {
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          pointerDownPointRef.current = null;
          updateInteractionState('clickable');
          return;
        }

        const wrappedLatLng = createdMap.wrapLatLng(event.latlng);
        const { lat, lng } = wrappedLatLng;
        pointerDownPointRef.current = null;
        updateInteractionState('clickable');

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
    [updateInteractionState],
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

  useEffect(() => {
    if (!map || !containerElementRef.current) {
      return;
    }

    const invalidateMapSize = (): void => {
      map.invalidateSize();
    };

    const observer = new ResizeObserver(() => {
      invalidateMapSize();
    });

    observer.observe(containerElementRef.current);
    window.addEventListener('resize', invalidateMapSize);
    requestAnimationFrame(() => {
      invalidateMapSize();
    });

    return (): void => {
      observer.disconnect();
      window.removeEventListener('resize', invalidateMapSize);
    };
  }, [map, updateInteractionState]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const cancelHoverPreview = (): void => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      onHoverEndRef.current?.();
    };

    const scheduleHoverPreview = (event: L.LeafletMouseEvent): void => {
      if (!canPreviewRef.current || isDraggingRef.current) {
        return;
      }

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      const wrappedLatLng = map.wrapLatLng(event.latlng);
      const { lat, lng } = wrappedLatLng;
      hoverTimeoutRef.current = setTimeout(() => {
        onHoverPreviewRef.current?.(lat, lng);
      }, 500);
    };

    const handleMouseDown = (event: L.LeafletMouseEvent): void => {
      const pointerEvent = event.originalEvent as MouseEvent | undefined;
      if (pointerEvent && pointerEvent.button !== 0) {
        return;
      }

      pointerDownPointRef.current = event.containerPoint;
      suppressNextClickRef.current = false;
      updateInteractionState('pressed');
    };

    const handleMouseMove = (event: L.LeafletMouseEvent): void => {
      if (
        pointerDownPointRef.current &&
        interactionStateRef.current !== 'dragging' &&
        event.containerPoint.distanceTo(pointerDownPointRef.current) >= DRAG_DISTANCE_THRESHOLD_PX
      ) {
        suppressNextClickRef.current = true;
        updateInteractionState('dragging');
      }

      scheduleHoverPreview(event);
    };

    const handleMouseUp = (): void => {
      pointerDownPointRef.current = null;

      if (!isDraggingRef.current) {
        updateInteractionState('clickable');
      }
    };

    const handleDragStart = (): void => {
      isDraggingRef.current = true;
      suppressNextClickRef.current = true;
      cancelHoverPreview();
      updateInteractionState('dragging');
    };

    const handleDragEnd = (): void => {
      isDraggingRef.current = false;
      pointerDownPointRef.current = null;
      updateInteractionState('clickable');
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('mouseout', cancelHoverPreview);
    map.on('movestart', cancelHoverPreview);
    map.on('zoomstart', cancelHoverPreview);
    map.on('dragstart', handleDragStart);
    map.on('dragend', handleDragEnd);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);

    return (): void => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('mouseout', cancelHoverPreview);
      map.off('movestart', cancelHoverPreview);
      map.off('zoomstart', cancelHoverPreview);
      map.off('dragstart', handleDragStart);
      map.off('dragend', handleDragEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
      cancelHoverPreview();
    };
  }, [map, updateInteractionState]);

  const combinedClassName = [
    'map-view',
    interactionState === 'pressed' ? 'map-view--pressed' : '',
    interactionState === 'dragging' ? 'map-view--dragging' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={combinedClassName}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      role="application"
      aria-label={messages.map.interactiveMapAria}
    >
      <div
        ref={mapContainerRef}
        className="map-view__canvas"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <LoadingIndicator map={map} coordinates={selectedCoordinates} isVisible={isLoading} />
      <MapControls map={map} />
      <MarkerManager
        map={map}
        cachedLocations={cachedLocations}
        onMarkerClick={(cacheKey) => onMarkerSelectRef.current?.(cacheKey)}
      />
    </div>
  );
}
