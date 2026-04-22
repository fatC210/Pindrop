import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DynamicEvent } from '@/types/soundscapeRecipe';
import type { ScheduledEvent } from '@/utils/soundscape/dynamicEventScheduler';
import { DynamicEventPlayer } from '../audio/dynamicEventPlayer';
import type { SpatialAudioController } from '../audio/spatialAudioController';
import { MockAudioContext, MockGainNode } from './webAudioMock';

function createScheduledEvent(): ScheduledEvent {
  const event: DynamicEvent = {
    id: 'bicycle_pass',
    prompt: 'Bicycle passing on a quiet town road, chain clicking',
    volumeRange: [0.15, 0.35],
    panFromTo: [-0.8, 0.8],
    durationMs: 3000,
    minIntervalMs: 30000,
    maxIntervalMs: 30000,
  };

  return {
    event,
    volume: 0.25,
    nextIntervalMs: 30000,
  };
}

function createAudioBlob(): Blob {
  const data = new TextEncoder().encode('dynamic-event-audio');
  const blob = {
    size: data.byteLength,
    type: 'audio/mpeg',
    arrayBuffer: async () => data.buffer as ArrayBuffer,
    slice: () => blob,
    text: async () => 'dynamic-event-audio',
    stream: () => new ReadableStream(),
  } as unknown as Blob;

  return blob;
}

describe('DynamicEventPlayer', () => {
  let player: DynamicEventPlayer;
  let context: MockAudioContext;
  let masterGainNode: MockGainNode;
  let spatialController: SpatialAudioController;

  beforeEach(() => {
    player = new DynamicEventPlayer();
    context = new MockAudioContext();
    masterGainNode = new MockGainNode();
    spatialController = {
      animatePan: vi.fn(),
    } as unknown as SpatialAudioController;

    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('plays generated audio and applies pan automation', async () => {
    await (player as any).playEvent(
      createScheduledEvent(),
      context as unknown as AudioContext,
      masterGainNode as unknown as GainNode,
      spatialController,
      vi.fn().mockResolvedValue(createAudioBlob())
    );

    expect(context.createdBufferSources).toHaveLength(1);
    expect(context.createdStereoPanners).toHaveLength(1);
    expect(context.createdGainNodes).toHaveLength(1);
    expect(context.createdBufferSources[0].started).toBe(true);
    expect(spatialController.animatePan).toHaveBeenCalledWith(
      context.createdStereoPanners[0],
      -0.8,
      0.8,
      3000,
      0
    );
  });

  it('stops the dynamic event loop on terminal ElevenLabs quota or auth failures', async () => {
    (player as any).isRunning = true;

    await (player as any).playEvent(
      createScheduledEvent(),
      context as unknown as AudioContext,
      masterGainNode as unknown as GainNode,
      spatialController,
      vi.fn().mockRejectedValue(
        new Error(
          'ElevenLabs request failed (401): This request exceeds your quota of 131000. You have 82 credits remaining, while 132 credits are required for this request.'
        )
      )
    );

    expect(player.getIsRunning()).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      '[PinDrop Audio] DynamicEvent: 因 ElevenLabs 计费或访问限制暂停动态事件调度:',
      expect.stringContaining('exceeds your quota')
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it('keeps the scheduler running for transient generation failures', async () => {
    (player as any).isRunning = true;

    await (player as any).playEvent(
      createScheduledEvent(),
      context as unknown as AudioContext,
      masterGainNode as unknown as GainNode,
      spatialController,
      vi.fn().mockRejectedValue(new Error('ElevenLabs request failed (502): upstream timeout'))
    );

    expect(player.getIsRunning()).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      '[PinDrop Audio] DynamicEvent: 播放事件 "bicycle_pass" 失败，将继续调度:',
      'ElevenLabs request failed (502): upstream timeout'
    );
    expect(console.error).not.toHaveBeenCalled();
  });
});
