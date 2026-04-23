import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { MarkerManager, type MarkerDescriptor } from '@/components/map/MarkerManager';

const { markerFactoryMock, divIconMock } = vi.hoisted(() => ({
  markerFactoryMock: vi.fn(),
  divIconMock: vi.fn(),
}));

vi.mock('leaflet', () => ({
  default: {
    marker: markerFactoryMock,
    divIcon: divIconMock,
    DomEvent: {
      stopPropagation: vi.fn(),
    },
  },
}));

function createLeafletMarker() {
  return {
    setLatLng: vi.fn(),
    setIcon: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    addTo: vi.fn(),
  };
}

describe('MarkerManager', () => {
  test('keeps rendered markers mounted when only the click handler changes', () => {
    const renderedLeafletMarker = createLeafletMarker();
    const map = {
      removeLayer: vi.fn(),
    };
    const markers: MarkerDescriptor[] = [
      {
        id: 'ready-cache',
        cacheKey: 'ready-cache',
        coordinates: [48.8566, 2.3522],
        isGenerating: false,
        isSelectable: true,
      },
    ];

    divIconMock.mockReturnValue({ icon: 'pin' });
    markerFactoryMock.mockReturnValue(renderedLeafletMarker);

    const firstMarkerClickHandler = vi.fn();
    const secondMarkerClickHandler = vi.fn();

    const { rerender, unmount } = render(
      <MarkerManager
        map={map as never}
        markers={markers}
        onMarkerClick={firstMarkerClickHandler}
      />
    );

    expect(markerFactoryMock).toHaveBeenCalledTimes(1);
    expect(renderedLeafletMarker.addTo).toHaveBeenCalledWith(map);
    expect(map.removeLayer).not.toHaveBeenCalled();

    rerender(
      <MarkerManager
        map={map as never}
        markers={markers}
        onMarkerClick={secondMarkerClickHandler}
      />
    );

    expect(markerFactoryMock).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).not.toHaveBeenCalled();
    expect(renderedLeafletMarker.setLatLng).toHaveBeenCalledWith([48.8566, 2.3522]);
    expect(renderedLeafletMarker.setIcon).toHaveBeenCalledTimes(1);

    unmount();

    expect(map.removeLayer).toHaveBeenCalledTimes(1);
    expect(map.removeLayer).toHaveBeenCalledWith(renderedLeafletMarker);
  });
});
