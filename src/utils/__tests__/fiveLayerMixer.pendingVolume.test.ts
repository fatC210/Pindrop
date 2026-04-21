import { describe, expect, it } from 'vitest';

import { FiveLayerMixer } from '@/utils/audio/fiveLayerMixer';
import { MockAudioContext } from './webAudioMock';

describe('FiveLayerMixer pending layer volumes', () => {
  it('applies layer volumes set before initialize()', () => {
    const mixer = new FiveLayerMixer();
    const mockContext = new MockAudioContext();
    const masterGainNode = mockContext.createGain();

    mixer.setLayerVolume('ambient', 0.2);
    mixer.setLayerVolume('dialogue', 1.5);

    mixer.initialize(mockContext as unknown as AudioContext, masterGainNode as unknown as GainNode);

    expect(mixer.getLayerState('ambient').volume).toBe(0.2);
    expect(mixer.getLayerState('ambient').gainNode.gain.value).toBe(0.2);
    expect(mixer.getLayerState('dialogue').volume).toBe(1);
    expect(mixer.getLayerState('dialogue').gainNode.gain.value).toBe(1);
  });
});
