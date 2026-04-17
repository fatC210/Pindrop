'use client';

// Map zoom controls component
import { useEffect, useState } from 'react';
import L from 'leaflet';
import './MapControls.css';

export interface MapControlsProps {
  map: L.Map | null;
}

export function MapControls({ map }: MapControlsProps) {
  const [zoom, setZoom] = useState(3);

  useEffect(() => {
    if (!map) return;

    // Update zoom state when map zoom changes
    const handleZoomEnd = () => {
      setZoom(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);

    // Set initial zoom
    setZoom(map.getZoom());

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
    <div className="map-controls" role="toolbar" aria-label="Map controls">
      <button
        className="map-control-button"
        aria-label="Zoom in"
        onClick={handleZoomIn}
        disabled={zoom >= 18}
      >
        +
      </button>
      <span className="zoom-level" aria-live="polite" aria-atomic="true">
        {zoom}
      </span>
      <button
        className="map-control-button"
        aria-label="Zoom out"
        onClick={handleZoomOut}
        disabled={zoom <= 2}
      >
        −
      </button>
    </div>
  );
}
