import type { AudioLayerState, LayerType, MixerState } from './types';
import {
  ALL_LAYER_TYPES,
  DEFAULT_LAYER_VOLUMES,
  MAX_CONCURRENT_SOURCE_NODES,
  PANNED_LAYERS,
} from './types';

const LOG_PREFIX = '[PinDrop Audio]';

export class FiveLayerMixer {
  private mixerState: MixerState | null = null;

  private pendingLayerVolumes: Record<LayerType, number> = { ...DEFAULT_LAYER_VOLUMES };

  private activeSourceNodes: Set<AudioBufferSourceNode> = new Set();

  private context: AudioContext | null = null;

  initialize(context: AudioContext, masterGainNode: GainNode): void {
    this.context = context;
    this.activeSourceNodes.clear();

    const layers = {} as Record<LayerType, AudioLayerState>;

    for (const layerType of ALL_LAYER_TYPES) {
      const gainNode = context.createGain();
      const initialVolume = this.pendingLayerVolumes[layerType];
      gainNode.gain.value = initialVolume;

      let panNode: StereoPannerNode | null = null;
      if ((PANNED_LAYERS as readonly string[]).includes(layerType)) {
        panNode = context.createStereoPanner();
        panNode.connect(gainNode);
      }

      gainNode.connect(masterGainNode);

      layers[layerType] = {
        sourceNode: null,
        gainNode,
        panNode,
        buffer: null,
        isPlaying: false,
        volume: initialVolume,
        failed: false,
      };
    }

    this.mixerState = {
      layers,
      masterGainNode,
    };

    console.log(`${LOG_PREFIX} FiveLayerMixer initialized with 5 audio layer chains.`);
  }

  playLayer(layerType: LayerType, buffer: AudioBuffer, loop: boolean): void {
    if (!this.mixerState || !this.context) {
      console.warn(`${LOG_PREFIX} FiveLayerMixer is not initialized.`);
      return;
    }

    if (this.activeSourceNodes.size >= MAX_CONCURRENT_SOURCE_NODES) {
      console.warn(
        `${LOG_PREFIX} Skipping ${layerType}: SourceNode limit reached (${MAX_CONCURRENT_SOURCE_NODES}).`
      );
      return;
    }

    const layerState = this.mixerState.layers[layerType];

    if (layerState.sourceNode && layerState.isPlaying) {
      this.stopLayer(layerType);
    }

    const sourceNode = this.context.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = loop;

    if (layerState.panNode) {
      sourceNode.connect(layerState.panNode);
    } else {
      sourceNode.connect(layerState.gainNode);
    }

    sourceNode.onended = () => {
      this.activeSourceNodes.delete(sourceNode);
      try {
        sourceNode.disconnect();
      } catch {
        // Ignore disconnect errors during cleanup.
      }

      if (layerState.sourceNode === sourceNode) {
        layerState.sourceNode = null;
        layerState.isPlaying = false;
      }
    };

    sourceNode.start();

    layerState.sourceNode = sourceNode;
    layerState.buffer = buffer;
    layerState.isPlaying = true;
    this.activeSourceNodes.add(sourceNode);
  }

  stopLayer(layerType: LayerType): void {
    if (!this.mixerState) {
      return;
    }

    const layerState = this.mixerState.layers[layerType];
    if (!layerState.sourceNode) {
      return;
    }

    const sourceNode = layerState.sourceNode;
    sourceNode.onended = null;

    try {
      sourceNode.stop();
    } catch {
      // Ignore stop errors for nodes that already ended.
    }

    try {
      sourceNode.disconnect();
    } catch {
      // Ignore disconnect errors during cleanup.
    }

    this.activeSourceNodes.delete(sourceNode);
    layerState.sourceNode = null;
    layerState.isPlaying = false;
  }

  stopAll(): void {
    if (!this.mixerState) {
      return;
    }

    for (const layerType of ALL_LAYER_TYPES) {
      this.stopLayer(layerType);
    }
  }

  setLayerVolume(layerType: LayerType, volume: number): void {
    const clampedVolume = Number.isNaN(volume) ? 0 : Math.max(0, Math.min(1, volume));
    this.pendingLayerVolumes[layerType] = clampedVolume;

    if (!this.mixerState) {
      return;
    }

    const layerState = this.mixerState.layers[layerType];
    layerState.volume = clampedVolume;
    layerState.gainNode.gain.value = clampedVolume;
  }

  getLayerState(layerType: LayerType): AudioLayerState {
    if (!this.mixerState) {
      throw new Error(`${LOG_PREFIX} FiveLayerMixer is not initialized.`);
    }

    return this.mixerState.layers[layerType];
  }

  getMixerState(): MixerState {
    if (!this.mixerState) {
      throw new Error(`${LOG_PREFIX} FiveLayerMixer is not initialized.`);
    }

    return this.mixerState;
  }

  getActiveSourceCount(): number {
    return this.activeSourceNodes.size;
  }

  dispose(): void {
    this.stopAll();

    if (this.mixerState) {
      for (const layerType of ALL_LAYER_TYPES) {
        const layerState = this.mixerState.layers[layerType];

        try {
          layerState.gainNode.disconnect();
        } catch {
          // Ignore disconnect errors during cleanup.
        }

        if (layerState.panNode) {
          try {
            layerState.panNode.disconnect();
          } catch {
            // Ignore disconnect errors during cleanup.
          }
        }

        layerState.buffer = null;
      }
    }

    this.mixerState = null;
    this.context = null;
    this.activeSourceNodes.clear();

    console.log(`${LOG_PREFIX} FiveLayerMixer disposed.`);
  }
}
