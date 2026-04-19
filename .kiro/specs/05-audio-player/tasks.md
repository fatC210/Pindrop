# Implementation Plan: Audio Player（音频播放器）

## 概述

本实现计划将 Audio Player 设计文档中的 10+ 个组件转化为可执行的编码任务。Audio Player 是 PinDrop 声景播放系统的核心模块，负责通过 Web Audio API 实现 5 层音频混音、空间定位、淡入淡出、循环播放、间隔触发、动态事件调度和总音量控制。

### 实现策略

- **自底向上**：先实现类型定义和基础组件（AudioContextManager、AudioLoader），再实现混音器和控制器，最后组装顶层 API 门面
- **渐进式集成**：每个组件实现后立即编写测试，确保增量可验证
- **Web Audio API Mock**：所有测试使用自定义 mock 类模拟 AudioContext、GainNode、StereoPannerNode 等节点

### 技术栈

- 语言：TypeScript
- 测试框架：Vitest + fast-check
- 属性测试最少 100 次迭代（`{ numRuns: 100 }`）
- 运行命令：`npm run test`

## Tasks

- [x] 1. 类型定义与 Web Audio API Mock
  - [x] 1.1 创建音频播放器类型定义文件 `src/utils/audio/types.ts`
    - 定义 LayerType、PlaybackState、FadeType 类型
    - 定义 ALL_LAYER_TYPES、LOOPING_LAYERS、PANNED_LAYERS、INTERVAL_LAYERS 常量
    - 定义 AudioLayerState、MixerState、PlaybackStateInfo、LayerDecodeResult、DecodeAllResult 接口
    - 定义 AudioBlobMap、StateChangeListener 类型
    - 定义 FADE_IN_DURATION_S、FADE_OUT_DURATION_S、MAX_CONCURRENT_SOURCE_NODES 等常量
    - 定义 DEFAULT_MASTER_VOLUME、DEFAULT_LAYER_VOLUMES 默认值
    - _Requirements: 2.1, 2.4, 2.7, 3.5, 14.1_

  - [x] 1.2 创建 Web Audio API Mock 文件 `src/utils/__tests__/webAudioMock.ts`
    - 实现 MockAudioContext（state、currentTime、destination、createGain、createBufferSource、createStereoPanner、decodeAudioData、resume、close）
    - 实现 MockGainNode（gain.value、gain.setValueAtTime、gain.linearRampToValueAtTime、gain.cancelScheduledValues、connect、disconnect）
    - 实现 MockStereoPannerNode（pan.value、pan.setValueAtTime、pan.linearRampToValueAtTime、connect、disconnect）
    - 实现 MockAudioBufferSourceNode（buffer、loop、onended、connect、disconnect、start、stop）
    - 实现 MockAudioBuffer（numberOfChannels、length、duration、sampleRate）
    - _Requirements: 22.1, 22.2_

- [x] 2. AudioContext 生命周期管理
  - [x] 2.1 实现 `src/utils/audio/audioContextManager.ts`
    - 实现 AudioContextManager 类：getContext()、resume()、close()、checkSupport()、getState()
    - getContext() 创建单例 AudioContext，处理浏览器不支持的情况
    - resume() 恢复被 autoplay 策略挂起的 AudioContext
    - close() 关闭 AudioContext 并释放资源
    - 所有状态变更输出日志 `[PinDrop Audio] AudioContext state: {state}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 19.2, 19.3_

  - [ ]* 2.2 编写 AudioContextManager 单元测试 `src/utils/__tests__/audioContextManager.test.ts`
    - 测试 AudioContext 创建和单例行为
    - 测试 resume() 从 suspended 到 running 的状态转换
    - 测试 close() 关闭 AudioContext 并释放资源
    - 测试浏览器不支持 Web Audio API 时的错误处理
    - 测试日志输出格式
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 22.1_

- [x] 3. Checkpoint - 确保类型定义和 AudioContext 管理通过编译
  - 确保所有测试通过，ask the user if questions arise.

- [x] 4. 5 层混音器核心与空间音频
  - [x] 4.1 实现 `src/utils/audio/fiveLayerMixer.ts`
    - 实现 FiveLayerMixer 类：initialize()、playLayer()、stopLayer()、stopAll()、setLayerVolume()、getLayerState()、getMixerState()、getActiveSourceCount()、dispose()
    - initialize() 为 5 层各创建 GainNode，dialogue/secondaryDialogue 层额外创建 StereoPannerNode
    - 节点连接链：SourceNode → [PanNode] → GainNode → MasterGain → destination
    - setLayerVolume() 将音量值 clamp 到 [0, 1]，且不影响其他层
    - 维护 activeSourceNodes 集合，限制并发数 ≤ MAX_CONCURRENT_SOURCE_NODES (10)
    - SourceNode.onended 回调中自动从 activeSourceNodes 移除并 disconnect
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 20.2, 20.3_

  - [x] 4.2 实现 `src/utils/audio/spatialAudioController.ts`
    - 实现 SpatialAudioController 类：setPan()、getPan()、animatePan()
    - setPan() 将 pan 值 clamp 到 [-1, 1]
    - animatePan() 使用 pan.setValueAtTime + pan.linearRampToValueAtTime 实现声像移动动画
    - 仅支持 dialogue 和 secondaryDialogue 层
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 4.3 编写 FiveLayerMixer 单元测试 `src/utils/__tests__/fiveLayerMixer.test.ts`
    - 测试 5 层节点创建和连接拓扑
    - 测试 playLayer() 创建 SourceNode 并播放
    - 测试 stopLayer() 和 stopAll() 停止播放并断开连接
    - 测试并发 SourceNode 限制（超过 10 个时跳过）
    - 测试 dispose() 释放所有资源
    - _Requirements: 2.1, 2.2, 2.3, 20.3, 22.2_

  - [ ]* 4.4 编写音量 clamp 和层间隔离属性测试 `src/utils/__tests__/fiveLayerMixer.property.test.ts`
    - **Property 1: 音量值始终在有效范围内**
    - **Validates: Requirements 2.5, 2.7, 10.3**
    - 使用 fc.double({ min: -10, max: 10 }) 生成任意音量值，验证 GainNode.gain.value ∈ [0, 1]
    - **Property 2: 音量设置层间隔离**
    - **Validates: Requirements 2.6, 10.4**
    - 设置某层音量后验证其他 4 层 GainNode.gain.value 不变

  - [ ]* 4.5 编写声像值 clamp 属性测试（追加到 `src/utils/__tests__/fiveLayerMixer.property.test.ts`）
    - **Property 3: 声像值始终在有效范围内**
    - **Validates: Requirements 3.5**
    - 使用 fc.double({ min: -10, max: 10 }) 生成任意 pan 值，验证 StereoPannerNode.pan.value ∈ [-1, 1]

- [x] 5. 淡入淡出控制
  - [x] 5.1 实现 `src/utils/audio/fadeController.ts`
    - 实现 FadeController 类：fadeIn()、fadeOut()、fadeInAll()、fadeOutAll()、cancelFade()
    - fadeIn(): cancelScheduledValues → setValueAtTime(0) → linearRampToValueAtTime(targetVolume, currentTime + 1.5)
    - fadeOut(): cancelScheduledValues → setValueAtTime(currentValue) → linearRampToValueAtTime(0, currentTime + 0.8)
    - fadeInAll() / fadeOutAll() 对 MixerState 中所有层同时执行
    - cancelFade() 取消指定 GainNode 上的所有已调度音量变化
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.2 编写 FadeController 单元测试 `src/utils/__tests__/fadeController.test.ts`
    - 测试 fadeIn() 调用 setValueAtTime(0) 和 linearRampToValueAtTime(target, +1.5)
    - 测试 fadeOut() 调用 setValueAtTime(current) 和 linearRampToValueAtTime(0, +0.8)
    - 测试 fadeInAll() 和 fadeOutAll() 对所有层同时执行
    - 测试 cancelFade() 取消已调度的音量变化
    - _Requirements: 4.1, 4.2, 5.1, 5.3, 22.3_

  - [ ]* 5.3 编写淡入淡出属性测试 `src/utils/__tests__/fadeController.property.test.ts`
    - **Property 4: 淡入目标音量正确性**
    - **Validates: Requirements 4.2, 4.4, 4.5**
    - 对任意 targetVolume ∈ [0, 1]，验证 linearRampToValueAtTime 被调用参数为 (targetVolume, currentTime + 1.5)
    - **Property 5: 淡出终止音量为零**
    - **Validates: Requirements 5.1, 5.3**
    - 对任意当前音量值，验证 linearRampToValueAtTime 被调用参数为 (0, currentTime + 0.8)

- [x] 6. Checkpoint - 确保混音器、空间音频和淡入淡出通过测试
  - 确保所有测试通过，ask the user if questions arise.

- [x] 7. 循环播放与间隔触发管理
  - [x] 7.1 实现 `src/utils/audio/loopManager.ts`
    - 实现 LoopManager 类：configureLoop()、stopLoop()
    - configureLoop(): ambient 和 atmosphere 层设置 loop=true，其他层 loop=false
    - stopLoop(): 先设 loop=false 再调用 stop()
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 实现 `src/utils/audio/intervalTriggerManager.ts`
    - 实现 IntervalTriggerManager 类：startSignatureTrigger()、startDialogueTrigger()、clearAll()、clearLayer()
    - startSignatureTrigger(): 读取 intervalSeconds 并 clamp 到 [30, 90]，使用 setTimeout 调度
    - startDialogueTrigger(): 读取 repeatIntervalSeconds 并 clamp 到 [30, 120]，使用 setTimeout 调度
    - 每次触发创建新 AudioBufferSourceNode（复用 AudioBuffer）
    - 触发前检查并发限制，超限则跳过
    - clearAll() / clearLayer() 清除所有/指定层的 pending timeout
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 7.3 编写 IntervalTriggerManager 单元测试 `src/utils/__tests__/intervalTriggerManager.test.ts`
    - 测试 signature 层间隔触发调度（使用 vi.useFakeTimers）
    - 测试 dialogue 层间隔触发调度
    - 测试 clearAll() 清除所有 pending timeout
    - 测试 clearLayer() 清除指定层 timeout
    - 测试每次触发创建新 SourceNode
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 8.1, 8.2, 8.3, 8.6, 22.5_

  - [ ]* 7.4 编写间隔触发值 clamp 属性测试 `src/utils/__tests__/intervalTriggerManager.property.test.ts`
    - **Property 6: 间隔触发值始终在有效范围内**
    - **Validates: Requirements 7.7, 8.7**
    - 对任意 intervalSeconds 数值，验证实际使用的间隔 clamp 到 [30, 90]
    - 对任意 repeatIntervalSeconds 数值，验证实际使用的间隔 clamp 到 [30, 120]

- [x] 8. 动态事件播放
  - [x] 8.1 实现 `src/utils/audio/dynamicEventPlayer.ts`
    - 实现 DynamicEventPlayer 类：start()、stop()、private playEvent()
    - start(): 调用上游 scheduleNextEvent() 获取事件和间隔，使用 setTimeout 调度循环
    - playEvent(): 生成音频 → 解码 → 创建临时 SourceNode/GainNode/PanNode → 应用音量和 pan 动画 → 播放 → 完成后清理
    - stop(): 清除 pending timeout，设置 isRunning=false
    - 错误处理：生成/解码失败时记录日志并继续调度下一个事件
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 8.2 编写 DynamicEventPlayer 单元测试 `src/utils/__tests__/dynamicEventPlayer.test.ts`
    - 测试 start() 启动调度循环
    - 测试 stop() 清除 pending timeout
    - 测试 playEvent() 创建临时节点并播放
    - 测试 pan 动画（panFromTo 效果）
    - 测试生成失败时记录错误并继续调度
    - _Requirements: 9.1, 9.4, 9.8, 9.9, 22.6_

- [x] 9. 总音量控制
  - [x] 9.1 实现 `src/utils/audio/masterVolumeController.ts`
    - 实现 MasterVolumeController 类：initialize()、setVolume()、getVolume()、loadSavedVolume()、resetToDefault()
    - initialize(): 创建 Master GainNode 并连接到 AudioContext.destination
    - setVolume(): clamp 到 [0, 1]，立即更新 GainNode.gain.value，持久化到 localStorage
    - loadSavedVolume(): 从 preferencesStore 读取 masterVolume，无效值时返回默认值 0.7
    - resetToDefault(): 重置为 DEFAULT_MASTER_VOLUME (0.7)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 16.1, 16.3_

  - [ ]* 9.2 编写 MasterVolumeController 属性测试 `src/utils/__tests__/masterVolumeController.property.test.ts`
    - **Property 1: 音量值始终在有效范围内**（Master 部分）
    - **Validates: Requirements 10.3**
    - 对任意数值输入，验证 setVolume() 后 GainNode.gain.value ∈ [0, 1]
    - **Property 8: 音量持久化往返一致性**
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.6**
    - 对任意 masterVolume ∈ [0, 1] 和 5 层音量值，保存后加载回来值相等

- [x] 10. Checkpoint - 确保循环、间隔触发、动态事件和总音量通过测试
  - 确保所有测试通过，ask the user if questions arise.

- [x] 11. 音频加载与播放状态管理
  - [x] 11.1 实现 `src/utils/audio/audioLoader.ts`
    - 实现 AudioLoader 类：decodeBlob()、decodeAllProgressive()、decodeParallel()
    - decodeBlob(): 将 Blob 转为 ArrayBuffer 后调用 AudioContext.decodeAudioData，记录解码耗时
    - decodeAllProgressive(): 优先解码 ambient 层，就绪后立即通过 onLayerReady 回调播放，再并行解码剩余 4 层
    - decodeParallel(): 使用 Promise.allSettled 并行解码所有层
    - 错误处理：解码失败时记录日志 `[PinDrop Audio] Failed to decode {layerType} audio: {error}`
    - 性能日志：`[PinDrop Audio] Decoded {layerType} in {ms}ms`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 11.2 实现 `src/utils/audio/playbackStateManager.ts`
    - 实现 PlaybackStateManager 类：getState()、transition()、subscribe()、unsubscribeAll()、reset()
    - transition(): 验证状态转换合法性（按状态机规则），更新 currentState 并通知所有 listeners
    - subscribe(): 返回取消订阅函数
    - 状态转换日志：`[PinDrop Audio] State: {oldState} → {newState}`
    - 初始状态：{ state: 'idle', soundscapeId: null, loadedLayers: [], failedLayers: [], errorMessage: null }
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 18.6_

  - [ ]* 11.3 编写 AudioLoader 单元测试 `src/utils/__tests__/audioLoader.test.ts`
    - 测试 decodeBlob() 成功解码和失败处理
    - 测试 decodeAllProgressive() 优先解码 ambient 层
    - 测试 decodeAllProgressive() 并行解码剩余层
    - 测试 decodeParallel() 使用 Promise.allSettled
    - 测试部分层解码失败时的结果统计
    - 测试日志输出格式
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 12.1, 12.2, 12.3, 22.7_

  - [ ]* 11.4 编写 PlaybackStateManager 单元测试 `src/utils/__tests__/playbackStateManager.test.ts`
    - 测试初始状态为 idle
    - 测试合法状态转换路径（idle→loading→playing→paused→playing→idle）
    - 测试非法状态转换被拒绝
    - 测试 subscribe() 和取消订阅
    - 测试 unsubscribeAll()
    - 测试 reset() 恢复初始状态
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 22.7_

  - [ ]* 11.5 编写播放状态机属性测试 `src/utils/__tests__/playbackStateManager.property.test.ts`
    - **Property 7: 播放状态机转换有效性**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
    - 对任意合法操作序列，验证状态始终为有效 PlaybackState 值，且每次转换遵循合法路径
    - **Property 9: 部分层失败状态判定**
    - **Validates: Requirements 13.1, 13.3, 13.4, 13.5, 13.6**
    - 对任意 5 层成功/失败组合，验证：0 失败→playing，1-2 失败→playing+failedLayers，≥3 失败→error

- [x] 12. Checkpoint - 确保音频加载和状态管理通过测试
  - 确保所有测试通过，ask the user if questions arise.

- [x] 13. 顶层 API 门面与声景切换
  - [x] 13.1 实现 `src/utils/audio/audioPlayer.ts`
    - 实现 AudioPlayer 类：play()、pause()、resume()、stop()、setMasterVolume()、setLayerVolume()、setLayerPan()、getState()、subscribe()、destroy()
    - play(): 协调所有子组件 — 状态转 loading → 获取 AudioContext → 渐进式加载 → ambient 就绪后状态转 playing → 启动间隔触发和动态事件
    - 声景切换：检测到正在播放时，旧声景淡出 + 新声景并行加载 → 交叉淡入淡出
    - 快速切换防抖：使用 currentLoadId 递增机制，忽略过期的加载回调
    - pause(): 挂起 AudioContext（context.suspend()）
    - resume(): 恢复 AudioContext（context.resume()）
    - stop(): 淡出 → 清除所有 timeout → 停止所有层 → dispose → 状态转 idle
    - destroy(): stop() + 关闭 AudioContext + 取消所有订阅
    - 音量持久化：初始化时从 localStorage 加载，变更时立即保存
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10_

  - [x] 13.2 创建模块导出文件 `src/utils/audio/index.ts`
    - 导出 AudioPlayer 类
    - 导出所有类型定义（LayerType、PlaybackState、PlaybackStateInfo 等）
    - 导出常量（DEFAULT_MASTER_VOLUME、DEFAULT_LAYER_VOLUMES 等）
    - _Requirements: 21.1_

  - [ ]* 13.3 编写 AudioPlayer 单元测试 `src/utils/__tests__/audioPlayer.test.ts`
    - 测试 play() 完整流程：loading → ambient 就绪 → playing
    - 测试 pause() 和 resume() 状态转换
    - 测试 stop() 淡出、清理和状态重置
    - 测试声景切换交叉淡入淡出
    - 测试快速切换防抖（多次 play() 只处理最新请求）
    - 测试 destroy() 释放所有资源
    - 测试音量持久化（初始化加载 + 变更保存）
    - 测试部分层失败时的降级行为
    - _Requirements: 15.1, 15.4, 15.7, 16.1, 16.5, 17.1, 17.5, 21.1, 21.10, 22.8, 22.9_

- [x] 14. Checkpoint - 确保顶层 API 和声景切换通过测试
  - 确保所有测试通过，ask the user if questions arise.

- [x] 15. React Hook 集成与模块导出
  - [x] 15.1 实现 `src/hooks/useAudioPlayer.ts`
    - 创建 useAudioPlayer React hook
    - 内部创建 AudioPlayer 实例（useRef），组件卸载时调用 destroy()
    - 暴露 play()、pause()、resume()、stop()、setMasterVolume()、setLayerVolume()、setLayerPan() 方法
    - 使用 useState 跟踪 PlaybackStateInfo，通过 subscribe() 同步状态
    - 初始化时从 localStorage 加载音量偏好
    - 处理 AudioContext autoplay 策略：提供 enableAudio() 方法供用户交互时调用
    - _Requirements: 19.3, 19.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10_

  - [ ]* 15.2 编写 useAudioPlayer hook 单元测试
    - 测试 hook 初始化和 AudioPlayer 实例创建
    - 测试组件卸载时调用 destroy()
    - 测试状态同步（subscribe 回调更新 React state）
    - _Requirements: 21.1, 21.10_

- [x] 16. Final Checkpoint - 确保所有测试通过
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- 任务标记 `*` 的为可选测试子任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号（Requirements）以确保可追溯性
- 属性测试验证设计文档中的 9 个正确性属性（P1-P9）
- 单元测试覆盖具体场景和边界条件
- Web Audio API Mock 是所有测试的基础，需在第一步完成
- Checkpoints 确保增量验证，避免问题累积
- 动态事件播放器复用上游 `soundscape/dynamicEventScheduler.ts` 中的 `scheduleNextEvent` 纯函数
