/**
 * Web Audio API Mock 实现
 *
 * 为音频播放器测试提供完整的 Web Audio API 模拟对象。
 * 所有 mock 类跟踪方法调用，便于测试断言。
 *
 * Requirements: 22.1, 22.2
 */

// === MockAudioParam — 模拟 AudioParam（gain.value / pan.value） ===

/** AudioParam 方法调用记录 */
export interface AudioParamCall {
  method: string;
  args: unknown[];
}

/**
 * 模拟 AudioParam 对象
 *
 * 用于 GainNode.gain 和 StereoPannerNode.pan，
 * 跟踪 setValueAtTime、linearRampToValueAtTime、cancelScheduledValues 调用。
 */
export class MockAudioParam {
  /** 当前值 */
  value: number;
  /** 方法调用记录 */
  calls: AudioParamCall[] = [];

  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }

  /** 在指定时间设置值 */
  setValueAtTime(value: number, startTime: number): MockAudioParam {
    this.calls.push({ method: 'setValueAtTime', args: [value, startTime] });
    this.value = value;
    return this;
  }

  /** 线性渐变到目标值 */
  linearRampToValueAtTime(value: number, endTime: number): MockAudioParam {
    this.calls.push({ method: 'linearRampToValueAtTime', args: [value, endTime] });
    this.value = value;
    return this;
  }

  /** 取消所有已调度的值变化 */
  cancelScheduledValues(startTime: number): MockAudioParam {
    this.calls.push({ method: 'cancelScheduledValues', args: [startTime] });
    return this;
  }
}

// === MockAudioBuffer — 模拟 AudioBuffer ===

/**
 * 模拟 AudioBuffer
 *
 * 存储解码后的音频数据元信息（通道数、长度、时长、采样率）。
 */
export class MockAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly duration: number;
  readonly sampleRate: number;

  constructor(options?: {
    numberOfChannels?: number;
    length?: number;
    duration?: number;
    sampleRate?: number;
  }) {
    this.numberOfChannels = options?.numberOfChannels ?? 2;
    this.length = options?.length ?? 44100;
    this.duration = options?.duration ?? 1.0;
    this.sampleRate = options?.sampleRate ?? 44100;
  }
}

// === MockGainNode — 模拟 GainNode ===

/** GainNode 方法调用记录 */
export interface GainNodeCall {
  method: string;
  args: unknown[];
}

/**
 * 模拟 GainNode
 *
 * 提供 gain AudioParam 和 connect/disconnect 方法。
 * 跟踪所有方法调用。
 */
export class MockGainNode {
  /** 增益参数 */
  gain: MockAudioParam;
  /** 方法调用记录 */
  calls: GainNodeCall[] = [];
  /** 已连接的目标节点 */
  connectedTo: unknown[] = [];

  constructor(defaultGain: number = 1) {
    this.gain = new MockAudioParam(defaultGain);
  }

  /** 连接到目标节点 */
  connect(destination: unknown): unknown {
    this.calls.push({ method: 'connect', args: [destination] });
    this.connectedTo.push(destination);
    return destination;
  }

  /** 断开连接 */
  disconnect(destination?: unknown): void {
    this.calls.push({ method: 'disconnect', args: destination !== undefined ? [destination] : [] });
    if (destination !== undefined) {
      this.connectedTo = this.connectedTo.filter((d) => d !== destination);
    } else {
      this.connectedTo = [];
    }
  }
}

// === MockStereoPannerNode — 模拟 StereoPannerNode ===

/** StereoPannerNode 方法调用记录 */
export interface StereoPannerNodeCall {
  method: string;
  args: unknown[];
}

/**
 * 模拟 StereoPannerNode
 *
 * 提供 pan AudioParam 和 connect/disconnect 方法。
 * 跟踪所有方法调用。
 */
export class MockStereoPannerNode {
  /** 声像参数 */
  pan: MockAudioParam;
  /** 方法调用记录 */
  calls: StereoPannerNodeCall[] = [];
  /** 已连接的目标节点 */
  connectedTo: unknown[] = [];

  constructor(defaultPan: number = 0) {
    this.pan = new MockAudioParam(defaultPan);
  }

  /** 连接到目标节点 */
  connect(destination: unknown): unknown {
    this.calls.push({ method: 'connect', args: [destination] });
    this.connectedTo.push(destination);
    return destination;
  }

  /** 断开连接 */
  disconnect(destination?: unknown): void {
    this.calls.push({ method: 'disconnect', args: destination !== undefined ? [destination] : [] });
    if (destination !== undefined) {
      this.connectedTo = this.connectedTo.filter((d) => d !== destination);
    } else {
      this.connectedTo = [];
    }
  }
}

// === MockAudioBufferSourceNode — 模拟 AudioBufferSourceNode ===

/** AudioBufferSourceNode 方法调用记录 */
export interface AudioBufferSourceNodeCall {
  method: string;
  args: unknown[];
}

/**
 * 模拟 AudioBufferSourceNode
 *
 * 提供 buffer、loop、onended 属性和 connect/disconnect/start/stop 方法。
 * 跟踪所有方法调用。
 */
export class MockAudioBufferSourceNode {
  /** 音频数据缓冲区 */
  buffer: MockAudioBuffer | null = null;
  /** 是否循环播放 */
  loop: boolean = false;
  /** 播放结束回调 */
  onended: (() => void) | null = null;
  /** 方法调用记录 */
  calls: AudioBufferSourceNodeCall[] = [];
  /** 已连接的目标节点 */
  connectedTo: unknown[] = [];
  /** 是否已启动 */
  started: boolean = false;
  /** 是否已停止 */
  stopped: boolean = false;

  /** 连接到目标节点 */
  connect(destination: unknown): unknown {
    this.calls.push({ method: 'connect', args: [destination] });
    this.connectedTo.push(destination);
    return destination;
  }

  /** 断开连接 */
  disconnect(destination?: unknown): void {
    this.calls.push({ method: 'disconnect', args: destination !== undefined ? [destination] : [] });
    if (destination !== undefined) {
      this.connectedTo = this.connectedTo.filter((d) => d !== destination);
    } else {
      this.connectedTo = [];
    }
  }

  /** 开始播放 */
  start(when?: number, offset?: number, duration?: number): void {
    const args: unknown[] = [];
    if (when !== undefined) args.push(when);
    if (offset !== undefined) args.push(offset);
    if (duration !== undefined) args.push(duration);
    this.calls.push({ method: 'start', args });
    this.started = true;
  }

  /** 停止播放 */
  stop(when?: number): void {
    const args: unknown[] = [];
    if (when !== undefined) args.push(when);
    this.calls.push({ method: 'stop', args });
    this.stopped = true;
  }
}

// === MockAudioContext — 模拟 AudioContext ===

/** AudioContext 方法调用记录 */
export interface AudioContextCall {
  method: string;
  args: unknown[];
}

/**
 * 模拟 AudioContext
 *
 * 提供 state、currentTime、destination 属性和
 * createGain、createBufferSource、createStereoPanner、
 * decodeAudioData、resume、close 方法。
 * 跟踪所有方法调用。
 */
export class MockAudioContext {
  /** AudioContext 状态 */
  state: AudioContextState = 'running';
  /** 当前时间（秒） */
  currentTime: number = 0;
  /** 音频输出目标节点 */
  destination: MockGainNode = new MockGainNode();
  /** 方法调用记录 */
  calls: AudioContextCall[] = [];
  /** 已创建的 GainNode 列表 */
  createdGainNodes: MockGainNode[] = [];
  /** 已创建的 AudioBufferSourceNode 列表 */
  createdBufferSources: MockAudioBufferSourceNode[] = [];
  /** 已创建的 StereoPannerNode 列表 */
  createdStereoPanners: MockStereoPannerNode[] = [];
  /** decodeAudioData 返回的 MockAudioBuffer（可自定义） */
  decodeAudioDataResult: MockAudioBuffer = new MockAudioBuffer();
  /** decodeAudioData 是否应该失败 */
  decodeAudioDataShouldFail: boolean = false;
  /** decodeAudioData 失败时的错误信息 */
  decodeAudioDataError: string = 'Decoding failed';

  /** 创建 GainNode */
  createGain(): MockGainNode {
    this.calls.push({ method: 'createGain', args: [] });
    const node = new MockGainNode();
    this.createdGainNodes.push(node);
    return node;
  }

  /** 创建 AudioBufferSourceNode */
  createBufferSource(): MockAudioBufferSourceNode {
    this.calls.push({ method: 'createBufferSource', args: [] });
    const node = new MockAudioBufferSourceNode();
    this.createdBufferSources.push(node);
    return node;
  }

  /** 创建 StereoPannerNode */
  createStereoPanner(): MockStereoPannerNode {
    this.calls.push({ method: 'createStereoPanner', args: [] });
    const node = new MockStereoPannerNode();
    this.createdStereoPanners.push(node);
    return node;
  }

  /** 解码音频数据，返回 Promise<MockAudioBuffer> */
  async decodeAudioData(audioData: ArrayBuffer): Promise<MockAudioBuffer> {
    this.calls.push({ method: 'decodeAudioData', args: [audioData] });
    if (this.decodeAudioDataShouldFail) {
      throw new Error(this.decodeAudioDataError);
    }
    return this.decodeAudioDataResult;
  }

  /** 恢复被挂起的 AudioContext */
  async resume(): Promise<void> {
    this.calls.push({ method: 'resume', args: [] });
    this.state = 'running';
  }

  /** 关闭 AudioContext */
  async close(): Promise<void> {
    this.calls.push({ method: 'close', args: [] });
    this.state = 'closed';
  }
}
