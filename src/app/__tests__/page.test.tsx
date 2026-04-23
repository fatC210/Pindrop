import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import Home from '@/app/page';
import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from '@/components/settings/preferencesStore';
import type { UseSoundscapeSessionResult } from '@/hooks/useSoundscapeSession';
import { I18nProvider } from '@/i18n/I18nProvider';

const { mockUseSoundscapeSession } = vi.hoisted(() => ({
  mockUseSoundscapeSession: vi.fn(),
}));
const { mockUseLocalizedLocationLabels } = vi.hoisted(() => ({
  mockUseLocalizedLocationLabels: vi.fn(),
}));

vi.mock('@/hooks/useSoundscapeSession', () => ({
  useSoundscapeSession: mockUseSoundscapeSession,
}));

vi.mock('@/app/useLocalizedLocationLabels', () => ({
  useLocalizedLocationLabels: mockUseLocalizedLocationLabels,
}));

vi.mock('@/components/settings', () => ({
  SettingsPanel: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLElement | null>;
  }): React.JSX.Element =>
    isOpen ? (
      <div data-testid="settings-panel">
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : (
      <div data-testid="settings-panel-closed" />
    ),
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
  }: {
    alt?: string;
    src: string;
  }): React.JSX.Element => <img alt={alt ?? ''} src={src} />,
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockMapView({
      markers = [],
      focusedCoordinates = null,
      onCoordinateSelect,
      onMarkerSelect,
    }: {
      markers?: Array<{ id: string; cacheKey?: string | null }>;
      focusedCoordinates?: [number, number] | null;
      onCoordinateSelect?: (lat: number, lng: number) => void;
      onMarkerSelect?: (cacheKey: string) => void;
    }): React.JSX.Element {
      return (
        <div>
          <div
            data-testid="map-view"
            data-marker-count={String(markers.length)}
            data-marker-ids={markers.map((marker) => marker.id).join(',')}
            data-focused-coordinates={
              focusedCoordinates ? focusedCoordinates.join(',') : ''
            }
          />
          <button
            type="button"
            data-testid="map-select-coordinate"
            onClick={() => onCoordinateSelect?.(39.9042, 116.4074)}
          >
            select-coordinate
          </button>
          {markers
            .filter((marker) => typeof marker.cacheKey === 'string')
            .map((marker) => (
              <button
                key={marker.id}
                type="button"
                data-testid={`map-marker-${marker.id}`}
                onClick={() => onMarkerSelect?.(marker.cacheKey as string)}
              >
                marker-{marker.id}
              </button>
            ))}
        </div>
      );
    },
}));

function createSessionResult(
  overrides: Partial<UseSoundscapeSessionResult> = {}
): UseSoundscapeSessionResult {
  return {
    status: 'idle',
    locationEntries: [],
    mapPins: [],
    cachedMarkers: [],
    hasConfiguredApiKey: true,
    hasActiveGeneration: false,
    preferences: { ...DEFAULT_PREFERENCES, layerVolumes: { ...DEFAULT_PREFERENCES.layerVolumes } },
    playbackState: {
      state: 'idle',
      soundscapeId: null,
      loadedLayers: [],
      failedLayers: [],
      errorMessage: null,
      playbackPositionSeconds: 0,
      playbackDurationSeconds: 0,
      playbackProgress: 0,
    },
    activePlaybackLocationId: null,
    isAudioSupported: true,
    handleCoordinateSelect: vi.fn().mockResolvedValue(undefined),
    handleMarkerSelect: vi.fn().mockResolvedValue(undefined),
    handleLocationSelect: vi.fn().mockResolvedValue(undefined),
    deleteLocationEntry: vi.fn().mockResolvedValue(undefined),
    playLocation: vi.fn().mockResolvedValue(undefined),
    pausePlayback: vi.fn(),
    resumePlayback: vi.fn(),
    stopPlayback: vi.fn(),
    setMasterVolume: vi.fn(),
    setLayerVolume: vi.fn(),
    ...overrides,
  };
}

function renderHome(): void {
  render(
    <I18nProvider>
      <Home />
    </I18nProvider>
  );
}

describe('Home page history visibility', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseSoundscapeSession.mockReset();
    mockUseLocalizedLocationLabels.mockReset();
    mockUseLocalizedLocationLabels.mockReturnValue({});
  });

  test('hides the generated places count when there are no visible locations', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [],
        mapPins: [],
      })
    );

    renderHome();

    const locationsHeader = screen.getByText('Generated places').parentElement;
    expect(locationsHeader).not.toBeNull();
    expect(within(locationsHeader as HTMLElement).queryByText('0')).toBeNull();
  });

  test('shows an empty-state placeholder when there are no visible locations', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [],
        mapPins: [],
      })
    );

    renderHome();

    expect(
      screen.getByText(
        'Places you generate from the map appear here with progress and playback controls.'
      )
    ).not.toBeNull();
    expect(screen.queryByText('No places yet')).toBeNull();
  });

  test('hides ready history entries and cached markers when the API key is missing', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: false,
        hasActiveGeneration: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            administrativeRegionName: 'Ile-de-France',
            cityName: 'Paris',
            regionName: 'Montmartre',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            narrativeSource: 'llm',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            playbackDurationSeconds: 22,
          },
          {
            id: 'loading-job',
            cacheKey: null,
            coordinates: [35.6762, 139.6503],
            cityName: 'Tokyo',
            countryName: 'Japan',
            timeSlot: null,
            createdAt: 2,
            progress: 48,
            status: 'loading',
            statusLabel: 'Generating',
            errorMessage: null,
            isPlayable: false,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
          {
            id: 'loading-job',
            cacheKey: null,
            coordinates: [35.6762, 139.6503],
            isGenerating: true,
            isSelectable: false,
          },
        ],
      })
    );

    renderHome();

    expect(screen.getByText('Generation setup required')).not.toBeNull();
    expect(screen.queryByText('Paris, France')).toBeNull();
    expect(screen.getByText('Tokyo, Japan')).not.toBeNull();

    const locationsHeader = screen.getByText('Generated places').parentElement;
    expect(locationsHeader).not.toBeNull();
    expect(within(locationsHeader as HTMLElement).getByText('1')).not.toBeNull();

    const mapView = screen.getByTestId('map-view');
    expect(mapView.getAttribute('data-marker-count')).toBe('1');
    expect(mapView.getAttribute('data-marker-ids')).toBe('loading-job');
  });

  test('replaces loading text with an animated indicator for loading entries', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'loading-job',
            cacheKey: 'loading-job',
            coordinates: [35.6762, 139.6503],
            cityName: 'Tokyo',
            countryName: 'Japan',
            timeSlot: null,
            createdAt: 2,
            progress: 48,
            status: 'loading',
            statusLabel: 'Generating',
            errorMessage: null,
            isPlayable: false,
          },
        ],
        mapPins: [
          {
            id: 'loading-job',
            cacheKey: 'loading-job',
            coordinates: [35.6762, 139.6503],
            isGenerating: true,
            isSelectable: false,
          },
        ],
      })
    );

    renderHome();

    const loadingCard = screen.getByText('Tokyo, Japan').closest('article');
    expect(loadingCard).not.toBeNull();
    expect(within(loadingCard as HTMLElement).queryByText('Generating')).toBeNull();
    expect(
      within(loadingCard as HTMLElement).getByRole('status', { name: 'Generating' })
    ).not.toBeNull();
    expect(within(loadingCard as HTMLElement).queryByRole('button', { name: 'Generating' })).toBeNull();
  });

  test('shows the failed status only once for error entries', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'error-job',
            cacheKey: null,
            coordinates: [25.0418, 102.7183],
            administrativeRegionName: 'Yunnan',
            cityName: 'Yuanmou',
            regionName: '',
            countryName: 'China',
            timeSlot: null,
            createdAt: 2,
            progress: 42,
            status: 'error',
            statusLabel: 'Failed',
            errorMessage: 'Generation failed',
            isPlayable: false,
          },
        ],
        mapPins: [
          {
            id: 'error-job',
            cacheKey: null,
            coordinates: [25.0418, 102.7183],
            isGenerating: false,
            isSelectable: false,
          },
        ],
      })
    );

    renderHome();

    const errorCard = screen.getByText('Yuanmou, Yunnan, China').closest('article');
    expect(errorCard).not.toBeNull();
    expect(within(errorCard as HTMLElement).getAllByText('Failed')).toHaveLength(1);
    expect(within(errorCard as HTMLElement).queryByRole('button', { name: 'Failed' })).toBeNull();
  });

  test('shows ready history entries and cached markers when the API key is configured', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            administrativeRegionName: 'Ile-de-France',
            cityName: 'Paris',
            regionName: 'Montmartre',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            narrativeSource: 'llm',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            sceneDescription:
              'A riverside bookseller is setting out paperbacks while footsteps and market shutters move around the quay.',
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    expect(screen.queryByText('ElevenLabs API key required')).toBeNull();
    expect(screen.getByText('Montmartre, Paris, Ile-de-France, France')).not.toBeNull();
    expect(
      screen.getByText(
        'A riverside bookseller is setting out paperbacks while footsteps and market shutters move around the quay.'
      )
    ).not.toBeNull();

    const locationsHeader = screen.getByText('Generated places').parentElement;
    expect(locationsHeader).not.toBeNull();
    expect(within(locationsHeader as HTMLElement).getByText('1')).not.toBeNull();

    const mapView = screen.getByTestId('map-view');
    expect(mapView.getAttribute('data-marker-count')).toBe('1');
    expect(mapView.getAttribute('data-marker-ids')).toBe('ready-cache');
  });

  test('shows an LLM fallback notice on ready cards when generation used rule-based fallback', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [64.1466, -21.9426],
            cityName: 'Reykjavik',
            countryName: 'Iceland',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            narrativeSource: 'rules',
            llmFallbackReason: 'llm_request_failed',
            fallbackNotice:
              'Using fallback scene because the LLM request failed: upstream timeout',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            sceneDescription: 'Wind and harbor water move under distant traffic.',
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [64.1466, -21.9426],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    expect(
      screen.getByText('Using fallback scene because the LLM request failed: upstream timeout')
    ).not.toBeNull();
  });

  test('hides progress text for ready entries and keeps a single-line waveform play row', () => {
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            playbackDurationSeconds: 22,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    const readyCard = screen.getByText('Paris, France').closest('article');
    expect(readyCard).not.toBeNull();
    expect(within(readyCard as HTMLElement).queryByText('100%')).toBeNull();
    expect(within(readyCard as HTMLElement).queryByText('0:00 / 0:22')).toBeNull();
    expect(within(readyCard as HTMLElement).getByTestId('playback-progress-ready-cache')).toHaveAttribute(
      'data-state',
      'idle'
    );
    expect(within(readyCard as HTMLElement).getByRole('button', { name: 'Play' })).not.toBeNull();
  });

  test('starts playback from the ready-state icon button', () => {
    const handleLocationSelect = vi.fn().mockResolvedValue(undefined);

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        handleLocationSelect,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(handleLocationSelect).toHaveBeenCalledWith('ready-cache');
  });

  test('deletes a location entry from its card action', () => {
    const deleteLocationEntry = vi.fn().mockResolvedValue(undefined);

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        deleteLocationEntry,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            playbackDurationSeconds: 22,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteLocationEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ready-cache',
        cacheKey: 'ready-cache',
        status: 'ready',
      })
    );
  });

  test('shows an animated waveform row and a pause button while a location is playing', () => {
    const pausePlayback = vi.fn();

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        activePlaybackLocationId: 'ready-cache',
        pausePlayback,
        playbackState: {
          state: 'playing',
          soundscapeId: 'ready-cache',
          loadedLayers: [],
          failedLayers: [],
          errorMessage: null,
          playbackPositionSeconds: 27,
          playbackDurationSeconds: 90,
          playbackProgress: 0.3,
        },
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Playing',
            errorMessage: null,
            isPlayable: true,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    expect(screen.getByTestId('playback-progress-ready-cache')).not.toBeNull();
    expect(screen.getByTestId('playback-progress-ready-cache')).toHaveAttribute(
      'data-state',
      'playing'
    );
    expect(screen.queryByText('0:27 / 1:30')).toBeNull();
    expect(screen.getByTestId('playback-progress-fill-ready-cache')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(pausePlayback).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
  });

  test('clicking a map marker scrolls the matching location card into view and starts playback', () => {
    const handleMarkerSelect = vi.fn().mockResolvedValue(undefined);
    const handleLocationSelect = vi.fn().mockResolvedValue(undefined);
    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        handleMarkerSelect,
        handleLocationSelect,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            playbackDurationSeconds: 22,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    try {
      renderHome();

      const readyCard = screen.getByText('Paris, France').closest('article');
      expect(readyCard).not.toBeNull();

      fireEvent.click(screen.getByTestId('map-marker-ready-cache'));

      expect(handleLocationSelect).toHaveBeenCalledWith('ready-cache');
      expect(handleMarkerSelect).not.toHaveBeenCalled();
      expect(screen.getByTestId('map-view').getAttribute('data-focused-coordinates')).toBe(
        '48.8566,2.3522'
      );
      expect(readyCard).toHaveFocus();
      expect(readyCard).toHaveAttribute('data-map-focused', 'true');
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  test('focuses the map on a location when its card is clicked', () => {
    const handleLocationSelect = vi.fn().mockResolvedValue(undefined);

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        handleLocationSelect,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            cityName: 'Paris',
            countryName: 'France',
            timeSlot: 'day',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [48.8566, 2.3522],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    fireEvent.click(screen.getByText('Paris, France'));

    const mapView = screen.getByTestId('map-view');
    expect(mapView.getAttribute('data-focused-coordinates')).toBe('48.8566,2.3522');
    expect(handleLocationSelect).not.toHaveBeenCalled();
  });

  test('focuses the map on the newly selected coordinates after a map click', () => {
    const handleCoordinateSelect = vi.fn().mockResolvedValue(undefined);

    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        handleCoordinateSelect,
      })
    );

    renderHome();

    fireEvent.click(screen.getByTestId('map-select-coordinate'));

    expect(handleCoordinateSelect).toHaveBeenCalledWith(39.9042, 116.4074);
    expect(screen.getByTestId('map-view').getAttribute('data-focused-coordinates')).toBe(
      '39.9042,116.4074'
    );
  });

  test('closes the settings menu when clicking outside', () => {
    mockUseSoundscapeSession.mockReturnValue(createSessionResult());

    renderHome();

    fireEvent.click(screen.getByLabelText('Open settings'));
    expect(screen.getByTestId('settings-panel')).not.toBeNull();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('settings-panel')).toBeNull();
  });

  test('renders localized location titles with the active interface language', async () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        ...DEFAULT_PREFERENCES,
        interfaceLanguage: 'zh-CN',
      })
    );

    mockUseLocalizedLocationLabels.mockReturnValue({
      'ready-cache': {
        administrativeRegionName: '广东',
        cityName: '肇庆',
        regionName: '端州区',
        countryName: '中国',
      },
    });
    mockUseLocalizedLocationLabels.mockReturnValue({
      'ready-cache': {
        administrativeRegionName: '\u5e7f\u4e1c',
        cityName: '\u8087\u5e86',
        regionName: '\u7aef\u5dde\u533a',
        countryName: '\u4e2d\u56fd',
      },
    });
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [23.0515, 112.4651],
            administrativeRegionName: 'Guangdong',
            cityName: 'Zhaoqing',
            regionName: 'Duanzhou District',
            countryName: 'China',
            timeSlot: 'dusk',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: '已就绪',
            errorMessage: null,
            isPlayable: true,
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [23.0515, 112.4651],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    const expectedLocalizedTitle = '\u4e2d\u56fd\uFF0C\u5e7f\u4e1c\uFF0C\u8087\u5e86\uFF0C\u7aef\u5dde\u533a';
    renderHome();
    expect(screen.getByText(expectedLocalizedTitle)).not.toBeNull();
  });

  test('renders a card title using the card display locale instead of the current interface locale', () => {
    mockUseLocalizedLocationLabels.mockReturnValue({
      'ready-cache': {
        administrativeRegionName: '\u9655\u897f\u7701',
        cityName: '\u78d0\u575d\u9547',
        regionName: '',
        countryName: '\u4e2d\u56fd',
      },
    });
    mockUseSoundscapeSession.mockReturnValue(
      createSessionResult({
        hasConfiguredApiKey: true,
        locationEntries: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [33.0, 107.0],
            displayLocale: 'zh-CN',
            administrativeRegionName: 'Shaanxi',
            cityName: 'Badu',
            regionName: '',
            countryName: 'China',
            timeSlot: 'dusk',
            createdAt: 1,
            progress: 100,
            status: 'ready',
            statusLabel: 'Ready',
            errorMessage: null,
            isPlayable: true,
            sceneDescription: '\u6eaa\u6c34\u58f0\u5728\u8fd1\u5904\u9690\u7ea6\u53ef\u95fb\u3002',
          },
        ],
        mapPins: [
          {
            id: 'ready-cache',
            cacheKey: 'ready-cache',
            coordinates: [33.0, 107.0],
            isGenerating: false,
            isSelectable: true,
          },
        ],
      })
    );

    renderHome();

    expect(screen.getByText('\u4e2d\u56fd\uff0c\u9655\u897f\u7701\uff0c\u78d0\u575d\u9547')).not.toBeNull();
    expect(screen.queryByText('Badu, Shaanxi, China')).toBeNull();
  });
});
