import { preferencesStore } from '@/components/settings/preferencesStore';
import type { SoundscapeRecipe, DynamicEvent } from '@/types/soundscapeRecipe';
import { getEventPool } from '@/utils/soundscape/dynamicEventScheduler';
import { AudioContextManager } from './audioContextManager';
import { AudioLoader } from './audioLoader';
import { DynamicEventPlayer } from './dynamicEventPlayer';
import type { AudioGeneratorFn } from './dynamicEventPlayer';
import { FadeController } from './fadeController';
import { FiveLayerMixer } from './fiveLayerMixer';
import { IntervalTriggerManager } from './intervalTriggerManager';
import { LoopManager } from './loopManager';
import { MasterVolumeController } from './masterVolumeController';
import { PlaybackStateManager } from './playbackStateManager';
import { SpatialAudioController } from './spatialAudioController';
import type {
  AudioBlobMap,
  LayerType,
  PlaybackStateInfo,
  StateChangeListener,
} from './types';
import {
  ALL_LAYER_TYPES,
  FADE_OUT_DURATION_S,
  LOOPING_LAYERS,
} from './types';

const LOG_PREFIX = '[PinDrop Audio]';
const CROSSFADE_CLEANUP_DELAY_MS = FADE_OUT_DURATION_S * 1000;
const MAX_TOLERABLE_FAILURES = 2;
const PROGRESS_TICK_MS = 200;
const PROGRESS_DURATION_EPSILON = 0.01;

export class AudioPlayer {
  private contextManager: AudioContextManager;

  private mixer: FiveLayerMixer;

  private spatialController: SpatialAudioController;

  private fadeController: FadeController;

  private loopManager: LoopManager;

  private intervalTriggerManager: IntervalTriggerManager;

  private dynamicEventPlayer: DynamicEventPlayer;

  private masterVolumeController: MasterVolumeController;

  private audioLoader: AudioLoader;

  private stateManager: PlaybackStateManager;

  private context: AudioContext | null = null;

  private currentLoadId = 0;

  private cleanupTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  private decodedBuffers: Map<LayerType, AudioBuffer> = new Map();

  private currentRecipe: SoundscapeRecipe | null = null;

  private destroyed = false;

  private audioGeneratorFn: AudioGeneratorFn;

  private dynamicEventsEnabled = true;

  private progressInterval: ReturnType<typeof setInterval> | null = null;

  private progressStartTimeSeconds = 0;

  private progressOffsetSeconds = 0;

  private progressDurationSeconds = 0;

  constructor(audioGeneratorFn?: AudioGeneratorFn) {
    this.contextManager = new AudioContextManager();
    this.mixer = new FiveLayerMixer();
    this.spatialController = new SpatialAudioController();
    this.fadeController = new FadeController();
    this.loopManager = new LoopManager();
    this.intervalTriggerManager = new IntervalTriggerManager();
    this.dynamicEventPlayer = new DynamicEventPlayer();
    this.masterVolumeController = new MasterVolumeController();
    this.audioLoader = new AudioLoader();
    this.stateManager = new PlaybackStateManager();
    this.audioGeneratorFn = audioGeneratorFn ?? (async () => new Blob());

    this.loadPlaybackPreferences();
  }

  async play(recipe: SoundscapeRecipe, blobs: AudioBlobMap): Promise<void> {
    if (this.destroyed) {
      console.warn(`${LOG_PREFIX} AudioPlayer has been destroyed and cannot play.`);
      return;
    }

    const loadId = ++this.currentLoadId;
    const currentState = this.stateManager.getState().state;
    const isCurrentlyPlaying = currentState === 'playing' || currentState === 'paused';
    let oldMixer: FiveLayerMixer | null = null;

    try {
      if (isCurrentlyPlaying && this.context) {
        console.log(`${LOG_PREFIX} Switching soundscape with crossfade.`);
        oldMixer = this.mixer;

        try {
          const oldMixerState = oldMixer.getMixerState();
          this.fadeController.fadeOutAll(oldMixerState, this.context.currentTime);
        } catch {
          // Ignore uninitialized mixer instances during fast switches.
        }

        this.intervalTriggerManager.clearAll();
        this.dynamicEventPlayer.stop();
        this.mixer = new FiveLayerMixer();

        const cleanupTimeout = setTimeout(() => {
          this.cleanupTimeouts.delete(cleanupTimeout);
          if (oldMixer) {
            oldMixer.stopAll();
            oldMixer.dispose();
          }
        }, CROSSFADE_CLEANUP_DELAY_MS);
        this.cleanupTimeouts.add(cleanupTimeout);
      }

      this.resetProgressTracking();
      this.stateManager.transition('loading', {
        soundscapeId: recipe.id,
        loadedLayers: [],
        failedLayers: [],
        errorMessage: null,
        playbackPositionSeconds: 0,
        playbackDurationSeconds: 0,
        playbackProgress: 0,
      });

      this.context = this.contextManager.getContext();
      await this.contextManager.resume();

      const masterGainNode = this.masterVolumeController.initialize(this.context);
      this.mixer.initialize(this.context, masterGainNode);
      this.applyLayerVolumesFromPreferences();

      this.currentRecipe = recipe;
      this.decodedBuffers.clear();

      const loadedLayers: LayerType[] = [];
      const failedLayers: LayerType[] = [];
      let ambientReady = false;

      const decodeResult = await this.audioLoader.decodeAllProgressive(
        blobs,
        this.context,
        (layerType: LayerType, buffer: AudioBuffer) => {
          if (loadId !== this.currentLoadId) {
            console.log(
              `${LOG_PREFIX} Ignoring stale load callback (loadId=${loadId}, current=${this.currentLoadId}).`
            );
            return;
          }

          this.decodedBuffers.set(layerType, buffer);
          this.refreshProgressDuration();
          loadedLayers.push(layerType);

          const shouldLoop = (LOOPING_LAYERS as readonly string[]).includes(layerType);
          this.mixer.playLayer(layerType, buffer, shouldLoop);

          const layerState = this.mixer.getLayerState(layerType);
          if (layerState.sourceNode) {
            this.loopManager.configureLoop(layerState.sourceNode, layerType);
          }

          this.fadeController.fadeIn(
            layerState.gainNode,
            layerState.volume,
            this.context!.currentTime
          );

          if (layerType === 'dialogue' && layerState.panNode) {
            this.spatialController.setPan(layerState.panNode, recipe.layers.dialogue.pan);
          } else if (layerType === 'secondaryDialogue' && layerState.panNode) {
            this.spatialController.setPan(
              layerState.panNode,
              recipe.layers.secondaryDialogue.pan
            );
          }

          if (layerType === 'ambient' && !ambientReady) {
            ambientReady = true;
            this.stateManager.transition('playing', {
              soundscapeId: recipe.id,
              loadedLayers: [...loadedLayers],
              failedLayers: [...failedLayers],
              playbackPositionSeconds: 0,
              playbackDurationSeconds: this.progressDurationSeconds,
              playbackProgress: 0,
            });
            this.startProgressTracking();
          }
        }
      );

      if (loadId !== this.currentLoadId) {
        console.log(`${LOG_PREFIX} Load finished after it became stale. Ignoring.`);
        return;
      }

      for (const result of decodeResult.results) {
        if (!result.success) {
          failedLayers.push(result.layerType);
        }
      }

      if (decodeResult.failureCount > MAX_TOLERABLE_FAILURES) {
        this.resetProgressTracking();
        this.stateManager.transition('error', {
          soundscapeId: recipe.id,
          loadedLayers: [...loadedLayers],
          failedLayers: [...failedLayers],
          errorMessage: `${decodeResult.failureCount} layers failed to load.`,
          playbackPositionSeconds: 0,
          playbackDurationSeconds: 0,
          playbackProgress: 0,
        });
        return;
      }

      if (!ambientReady && decodeResult.successCount > 0) {
        this.stateManager.transition('playing', {
          soundscapeId: recipe.id,
          loadedLayers: [...loadedLayers],
          failedLayers: [...failedLayers],
          playbackPositionSeconds: 0,
          playbackDurationSeconds: this.progressDurationSeconds,
          playbackProgress: 0,
        });
        this.startProgressTracking();
      }

      if (failedLayers.length > 0) {
        for (const result of decodeResult.results) {
          if (!result.success) {
            console.error(`${LOG_PREFIX} Layer ${result.layerType} failed: ${result.error}`);
          }
        }
      }

      this.startIntervalTriggers(recipe);
      this.startDynamicEvents(recipe);
    } catch (error) {
      if (loadId !== this.currentLoadId) {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} play() failed: ${errorMessage}`);

      this.resetProgressTracking();
      this.stateManager.transition('error', {
        soundscapeId: recipe.id,
        errorMessage,
        playbackPositionSeconds: 0,
        playbackDurationSeconds: 0,
        playbackProgress: 0,
      });
    }
  }

  pause(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState !== 'playing') {
      console.warn(`${LOG_PREFIX} Cannot pause while state is ${currentState}.`);
      return;
    }

    this.syncPlaybackProgress();
    this.stopProgressTicker();

    if (this.context && this.context.state === 'running') {
      this.context.suspend().catch((error) => {
        console.error(`${LOG_PREFIX} AudioContext suspend failed:`, error);
      });
    }

    this.stateManager.transition('paused');
  }

  resume(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState !== 'paused') {
      console.warn(`${LOG_PREFIX} Cannot resume while state is ${currentState}.`);
      return;
    }

    if (this.context && this.context.state === 'suspended') {
      this.context.resume().catch((error) => {
        console.error(`${LOG_PREFIX} AudioContext resume failed:`, error);
      });
    }

    this.stateManager.transition('playing');
    this.startProgressTracking();
  }

  stop(): void {
    if (this.destroyed) {
      return;
    }

    const currentState = this.stateManager.getState().state;
    if (currentState === 'idle') {
      return;
    }

    this.syncPlaybackProgress();
    this.resetProgressTracking();

    if (this.context) {
      try {
        const mixerState = this.mixer.getMixerState();
        this.fadeController.fadeOutAll(mixerState, this.context.currentTime);
      } catch {
        // Ignore uninitialized mixer instances.
      }
    }

    this.intervalTriggerManager.clearAll();
    this.dynamicEventPlayer.stop();

    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();

    const stopTimeout = setTimeout(() => {
      this.cleanupTimeouts.delete(stopTimeout);
      this.performStop();
    }, CROSSFADE_CLEANUP_DELAY_MS);
    this.cleanupTimeouts.add(stopTimeout);

    this.stateManager.transition('idle', {
      soundscapeId: null,
      loadedLayers: [],
      failedLayers: [],
      errorMessage: null,
      playbackPositionSeconds: 0,
      playbackDurationSeconds: 0,
      playbackProgress: 0,
    });
  }

  setMasterVolume(volume: number): void {
    this.masterVolumeController.setVolume(volume);
  }

  setLayerVolume(layerType: LayerType, volume: number): void {
    this.mixer.setLayerVolume(layerType, volume);
    this.persistLayerVolume(layerType, volume);
  }

  setLayerPan(layerType: 'dialogue' | 'secondaryDialogue', pan: number): void {
    try {
      const layerState = this.mixer.getLayerState(layerType);
      if (layerState.panNode) {
        this.spatialController.setPan(layerState.panNode, pan);
      }
    } catch {
      console.warn(`${LOG_PREFIX} Cannot set pan for ${layerType}; mixer is not ready.`);
    }
  }

  setFadeInDuration(durationSeconds: number): void {
    this.fadeController.setDurations({ fadeInDuration: durationSeconds });
  }

  setDynamicEventsEnabled(enabled: boolean): void {
    this.dynamicEventsEnabled = enabled;
    if (!enabled) {
      this.dynamicEventPlayer.stop();
    }
  }

  getState(): PlaybackStateInfo {
    return this.stateManager.getState();
  }

  subscribe(callback: StateChangeListener): () => void {
    return this.stateManager.subscribe(callback);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.resetProgressTracking();
    this.intervalTriggerManager.clearAll();
    this.dynamicEventPlayer.stop();

    for (const timeout of this.cleanupTimeouts) {
      clearTimeout(timeout);
    }
    this.cleanupTimeouts.clear();

    this.mixer.stopAll();
    this.mixer.dispose();
    this.decodedBuffers.clear();
    this.currentRecipe = null;

    this.contextManager.close().catch((error) => {
      console.error(`${LOG_PREFIX} AudioContext close failed:`, error);
    });
    this.context = null;

    this.stateManager.unsubscribeAll();
    this.stateManager.reset();

    console.log(`${LOG_PREFIX} AudioPlayer destroyed.`);
  }

  private performStop(): void {
    this.resetProgressTracking();
    this.mixer.stopAll();
    this.mixer.dispose();
    this.decodedBuffers.clear();
    this.currentRecipe = null;
  }

  private startIntervalTriggers(recipe: SoundscapeRecipe): void {
    if (!this.context) {
      return;
    }

    const signatureBuffer = this.decodedBuffers.get('signature');
    if (signatureBuffer) {
      this.intervalTriggerManager.startSignatureTrigger(
        recipe.layers.signature.intervalSeconds,
        signatureBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }

    const dialogueBuffer = this.decodedBuffers.get('dialogue');
    if (dialogueBuffer) {
      this.intervalTriggerManager.startDialogueTrigger(
        'dialogue',
        recipe.layers.dialogue.repeatIntervalSeconds,
        dialogueBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }

    const secondaryDialogueBuffer = this.decodedBuffers.get('secondaryDialogue');
    if (secondaryDialogueBuffer) {
      this.intervalTriggerManager.startDialogueTrigger(
        'secondaryDialogue',
        recipe.layers.secondaryDialogue.repeatIntervalSeconds,
        secondaryDialogueBuffer,
        this.mixer,
        this.fadeController,
        this.context
      );
    }
  }

  private startDynamicEvents(recipe: SoundscapeRecipe): void {
    if (!this.context || !this.dynamicEventsEnabled) {
      return;
    }

    const dynamicEvents = this.getDynamicEventPool(recipe);
    if (dynamicEvents.length === 0) {
      return;
    }

    try {
      const masterGainNode = this.mixer.getMixerState().masterGainNode;
      this.dynamicEventPlayer.start(
        dynamicEvents,
        this.context,
        masterGainNode,
        this.spatialController,
        this.audioGeneratorFn
      );
    } catch {
      console.warn(`${LOG_PREFIX} Cannot start dynamic events; mixer is not ready.`);
    }
  }

  private getDynamicEventPool(recipe: SoundscapeRecipe): DynamicEvent[] {
    try {
      if (recipe.location && recipe.location.regionType) {
        return getEventPool(recipe.location.regionType) || [];
      }
    } catch {
      // Ignore scheduler lookup failures and fall back to no dynamic events.
    }

    return [];
  }

  private loadPlaybackPreferences(): void {
    try {
      const preferences = preferencesStore.loadPreferences();
      this.dynamicEventsEnabled = preferences.dynamicEvents;
      this.fadeController.setDurations({
        fadeInDuration: preferences.fadeInDuration,
      });
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to load playback preferences.`, error);
    }
  }

  private applyLayerVolumesFromPreferences(): void {
    try {
      const preferences = preferencesStore.loadPreferences();
      const layerVolumes = preferences.layerVolumes;

      for (const layerType of ALL_LAYER_TYPES) {
        const volume = layerVolumes[layerType as keyof typeof layerVolumes];
        if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
          this.mixer.setLayerVolume(layerType, volume);
        }
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to apply layer volume preferences.`, error);
    }
  }

  private persistLayerVolume(layerType: LayerType, volume: number): void {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const preferences = preferencesStore.loadPreferences();
      const key = layerType as keyof typeof preferences.layerVolumes;
      preferences.layerVolumes[key] = clampedVolume;
      preferencesStore.savePreferences(preferences);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to persist layer volume.`, error);
    }
  }

  private startProgressTracking(): void {
    this.stopProgressTicker();

    if (!this.context) {
      return;
    }

    const duration = this.selectProgressDuration();
    if (!(duration > 0)) {
      this.progressDurationSeconds = 0;
      this.stateManager.update({
        playbackPositionSeconds: 0,
        playbackDurationSeconds: 0,
        playbackProgress: 0,
      });
      return;
    }

    if (
      this.progressDurationSeconds <= 0 ||
      Math.abs(duration - this.progressDurationSeconds) > PROGRESS_DURATION_EPSILON
    ) {
      this.setProgressDuration(duration);
    }

    this.syncPlaybackProgress();
    this.progressInterval = setInterval(() => {
      this.syncPlaybackProgress();
    }, PROGRESS_TICK_MS);
  }

  private stopProgressTicker(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private resetProgressTracking(): void {
    this.stopProgressTicker();
    this.progressStartTimeSeconds = 0;
    this.progressOffsetSeconds = 0;
    this.progressDurationSeconds = 0;
  }

  private refreshProgressDuration(): void {
    if (!this.context) {
      return;
    }

    const duration = this.selectProgressDuration();
    if (!(duration > 0)) {
      return;
    }

    if (Math.abs(duration - this.progressDurationSeconds) <= PROGRESS_DURATION_EPSILON) {
      return;
    }

    this.setProgressDuration(duration);

    const state = this.stateManager.getState().state;
    if (state === 'playing' || state === 'paused') {
      this.syncPlaybackProgress();
    }
  }

  private selectProgressDuration(): number {
    const preferredLayers: LayerType[] = ['ambient', 'atmosphere'];

    for (const layerType of preferredLayers) {
      const duration = this.decodedBuffers.get(layerType)?.duration ?? 0;
      if (Number.isFinite(duration) && duration > 0) {
        return duration;
      }
    }

    let fallbackDuration = 0;
    for (const buffer of this.decodedBuffers.values()) {
      if (Number.isFinite(buffer.duration)) {
        fallbackDuration = Math.max(fallbackDuration, buffer.duration);
      }
    }

    return fallbackDuration;
  }

  private setProgressDuration(duration: number): void {
    if (!this.context || !(duration > 0)) {
      return;
    }

    const position = this.getPlaybackPositionSeconds();
    this.progressDurationSeconds = duration;
    this.progressOffsetSeconds = position % duration;
    this.progressStartTimeSeconds = this.context.currentTime;
  }

  private getPlaybackPositionSeconds(): number {
    if (!this.context || !(this.progressDurationSeconds > 0)) {
      return 0;
    }

    const elapsed =
      this.context.currentTime - this.progressStartTimeSeconds + this.progressOffsetSeconds;
    const normalizedElapsed = Math.max(0, elapsed);
    return normalizedElapsed % this.progressDurationSeconds;
  }

  private syncPlaybackProgress(): void {
    const currentState = this.stateManager.getState().state;
    if (currentState !== 'playing' && currentState !== 'paused') {
      return;
    }

    if (!(this.progressDurationSeconds > 0)) {
      this.stateManager.update({
        playbackPositionSeconds: 0,
        playbackDurationSeconds: 0,
        playbackProgress: 0,
      });
      return;
    }

    const position = this.getPlaybackPositionSeconds();
    const progress = Math.min(1, Math.max(0, position / this.progressDurationSeconds));

    this.stateManager.update({
      playbackPositionSeconds: position,
      playbackDurationSeconds: this.progressDurationSeconds,
      playbackProgress: progress,
    });
  }
}
