import type {
  PlaybackState,
  PlaybackStateInfo,
  StateChangeListener,
} from './types';

const LOG_PREFIX = '[PinDrop Audio]';

const VALID_TRANSITIONS: Record<PlaybackState, ReadonlySet<PlaybackState>> = {
  idle: new Set<PlaybackState>(['loading']),
  loading: new Set<PlaybackState>(['playing', 'error', 'idle']),
  playing: new Set<PlaybackState>(['paused', 'loading', 'idle', 'error']),
  paused: new Set<PlaybackState>(['playing', 'idle', 'loading']),
  error: new Set<PlaybackState>(['loading', 'idle']),
};

function createInitialState(): PlaybackStateInfo {
  return {
    state: 'idle',
    soundscapeId: null,
    loadedLayers: [],
    failedLayers: [],
    errorMessage: null,
    playbackPositionSeconds: 0,
    playbackDurationSeconds: 0,
    playbackProgress: 0,
  };
}

export class PlaybackStateManager {
  private currentState: PlaybackStateInfo;

  private listeners: Set<StateChangeListener>;

  constructor() {
    this.currentState = createInitialState();
    this.listeners = new Set();
  }

  getState(): PlaybackStateInfo {
    return {
      ...this.currentState,
      loadedLayers: [...this.currentState.loadedLayers],
      failedLayers: [...this.currentState.failedLayers],
    };
  }

  transition(newState: PlaybackState, metadata?: Partial<PlaybackStateInfo>): void {
    const oldState = this.currentState.state;
    const validTargets = VALID_TRANSITIONS[oldState];

    if (!validTargets?.has(newState)) {
      console.warn(
        `${LOG_PREFIX} Invalid state transition: ${oldState} -> ${newState}. Ignored.`
      );
      return;
    }

    console.log(`${LOG_PREFIX} State: ${oldState} -> ${newState}`);

    this.currentState = {
      ...this.currentState,
      ...metadata,
      state: newState,
    };

    this.notifyListeners();
  }

  update(metadata: Partial<Omit<PlaybackStateInfo, 'state'>>): void {
    this.currentState = {
      ...this.currentState,
      ...metadata,
    };

    this.notifyListeners();
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  unsubscribeAll(): void {
    this.listeners.clear();
  }

  reset(): void {
    this.currentState = createInitialState();
  }

  private notifyListeners(): void {
    const stateSnapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(stateSnapshot);
      } catch (error) {
        console.error(`${LOG_PREFIX} State listener failed:`, error);
      }
    }
  }
}
