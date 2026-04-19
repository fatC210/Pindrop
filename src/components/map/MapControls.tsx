'use client';

// Map zoom controls component
import { useEffect, useState } from 'react';
import L from 'leaflet';

import { useI18n } from '@/i18n/I18nProvider';
import './MapControls.css';

export interface MapControlsProps {
  map: L.Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const { messages } = useI18n();
  const [zoom, setZoom] = useState(3);

  useEffect(() => {
    if (!map) return;

    // Update zoom state when map zoom changes
    const handleZoomEnd = () => {
      setZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const handleZoomIn = () => {
    if (map && zoom < 18) {
      map.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (map && zoom > 2) {
      map.zoomOut();
    }
  };

  return (
    <div className="map-controls" role="toolbar" aria-label={messages.map.toolbarLabel}>
      <button
        className="map-control-button"
        aria-label={messages.map.zoomIn}
        onClick={handleZoomIn}
        disabled={zoom >= 18}
      >
        <svg
          className="map-control-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M3 8h10M8 3v10"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </button>
      <span className="zoom-level" aria-live="polite" aria-atomic="true">
        {zoom}
      </span>
      <button
        className="map-control-button"
        aria-label={messages.map.zoomOut}
        onClick={handleZoomOut}
        disabled={zoom <= 2}
      >
        <svg
          className="map-control-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M3 8h10"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </button>
    </div>
  );
}
