# Requirements Document: Audio Player

## Introduction

Audio Player 是 PinDrop 声景播放系统的核心模块，负责将上游 Soundscape Engine 生成的 5 层音频数据（ambient、signature、dialogue、secondaryDialogue、atmosphere）通过 Web Audio API 进行混音、空间定位、音量控制和动态事件调度，最终输出到用户的音频设备。该模块是连接"声景配方"与"用户听觉体验"的桥梁——上游接收 ElevenLabs API 返回的音频 Blob 数据和 SoundscapeRecipe 配方，下游输出实时混音的声景音频流。

系统由以下核心组件构成：

- **Audio_Context_Manager**：Web Audio API 的 AudioContext 生命周期管理器，负责初始化、恢复和清理音频上下文
- **Five_Layer_Mixer**：5 层音频混音器，为每层创建独立的 AudioBufferSourceNode 和 GainNode，支持独立音量控制
- **Spatial_Audio_Controller**：空间音频控制器，为对话层（dialogue 和 secondaryDialogue）提供 PanNode 实现左右声道定位
- **Fade_Controller**：淡入淡出控制器，实现声景切换时的平滑过渡（淡入 1.5s，淡出 0.8s）
- **Loop_Manager**：循环播放管理器，处理 ambient 和 atmosphere 层的无缝循环
- **Interval_Trigger_Manager**：间隔触发管理器，按配方中的 intervalSeconds 和 repeatIntervalSeconds 定时触发 signature 和 dialogue 层
- **Dynamic_Event_Scheduler**：动态事件调度器，每 30-90 秒随机从区域事件池中选择并播放动态音效
- **Master_Volume_Controller**：总音量控制器，提供全局音量调节（0-1 范围）
- **Audio_Loader**：音频加载器，将 Blob 数据解码为 AudioBuffer 供 Web Audio API 使用
- **Playback_State_Manager**：播放状态管理器，跟踪当前播放状态（idle/loading/playing/paused/error）

### 设计目标

1. **渐进式加载**：ambient 层优先播放（< 3s），其他层陆续加入（全部 < 5s）
2. **平滑过渡**：声景切换时旧声景淡出 0.8s，新声景淡入 1.5s，无突兀感
3. **独立控制**：5 层音频各自独立音量控制 + 1 个总音量控制
4. **空间定位**：对话层支持 -1（左）到 1（右）的声像定位
5. **动态性**：通过随机事件系统（30-90s 间隔）增加声景的真实感和不可预测性
6. **容错性**：部分层加载失败时其他层继续播放，不阻塞整体体验
7. **性能优化**：使用 Web Audio API 的原生节点，避免 JavaScript 音频处理的性能开销

## Glossary

- **Audio_Context_Manager**: Web Audio API 的 AudioContext 生命周期管理组件，负责创建、恢复（resume）和清理音频上下文
- **AudioContext**: Web Audio API 的核心接口，表示音频处理图的容器，所有音频节点都连接到此上下文
- **Five_Layer_Mixer**: 5 层音频混音组件，为 ambient、signature、dialogue、secondaryDialogue、atmosphere 各创建独立的音频处理链
- **AudioBufferSourceNode**: Web Audio API 节点，用于播放内存中的音频数据（AudioBuffer）
- **GainNode**: Web Audio API 节点，用于控制音频信号的音量（增益），范围 0-1
- **PanNode**: Web Audio API 的 StereoPannerNode，用于控制音频的左右声道定位，范围 -1（左）到 1（右）
- **Spatial_Audio_Controller**: 空间音频控制组件，为对话层提供 PanNode 实现声像定位
- **Fade_Controller**: 淡入淡出控制组件，通过 GainNode.gain.linearRampToValueAtTime 实现音量渐变
- **Loop_Manager**: 循环播放管理组件，处理 ambient 和 atmosphere 层的无缝循环播放
- **Interval_Trigger_Manager**: 间隔触发管理组件，使用 setTimeout 按配方中的 intervalSeconds 定时触发 signature 和 dialogue 层
- **Dynamic_Event_Scheduler**: 动态事件调度组件，每 30-90 秒随机选择并播放区域事件池中的音效
- **Master_Volume_Controller**: 总音量控制组件，提供全局 GainNode 连接到 AudioContext.destination
- **Audio_Loader**: 音频加载组件，将 Blob 数据通过 AudioContext.decodeAudioData 解码为 AudioBuffer
- **Playback_State_Manager**: 播放状态管理组件，维护当前播放状态（idle/loading/playing/paused/error）
- **AudioBuffer**: Web Audio API 的音频数据容器，存储解码后的 PCM 音频样本
- **AudioDestination**: Web Audio API 的最终输出节点，连接到用户的音频设备（扬声器/耳机）
- **SoundscapeRecipe**: 声景配方对象，包含 5 层声音参数、时间插值信息和位置语境（已在 Soundscape Engine 中定义）
- **LayerType**: 音频层类型枚举，取值为 "ambient" | "signature" | "dialogue" | "secondaryDialogue" | "atmosphere"
- **PlaybackState**: 播放状态枚举，取值为 "idle" | "loading" | "playing" | "paused" | "error"
- **FadeType**: 淡入淡出类型枚举，取值为 "fadeIn" | "fadeOut"
- **DynamicEvent**: 动态事件对象，包含 prompt、音量范围、声像移动方向、持续时间和触发间隔（已在 Soundscape Engine 中定义）
- **AudioLayerState**: 单层音频状态对象，包含 sourceNode、gainNode、panNode（可选）、buffer、isPlaying、volume
- **MixerState**: 混音器状态对象，包含 5 个 AudioLayerState 和 masterGainNode

## Requirements

### Requirement 1: AudioContext 生命周期管理

**User Story:** As a developer, I want a centralized AudioContext manager, so that the audio context is properly initialized, resumed on user interaction, and cleaned up when no longer needed.

#### Acceptance Criteria

1. THE Audio_Context_Manager SHALL create a single AudioContext instance when the audio player is initialized
2. WHEN the AudioContext state is "suspended" due to browser autoplay policy, THE Audio_Context_Manager SHALL provide a method to resume the context on user interaction
3. THE Audio_Context_Manager SHALL expose the AudioContext instance to other audio components for node creation
4. WHEN the audio player is destroyed, THE Audio_Context_Manager SHALL close the AudioContext and release all associated resources
5. THE Audio_Context_Manager SHALL handle AudioContext creation errors gracefully and return an error state if the browser does not support Web Audio API
6. THE Audio_Context_Manager SHALL log AudioContext state changes (suspended/running/closed) with format `[PinDrop Audio] AudioContext state: {state}`

### Requirement 2: 5 层音频混音架构

**User Story:** As a developer, I want a 5-layer audio mixing architecture, so that each layer (ambient, signature, dialogue, secondaryDialogue, atmosphere) can be controlled independently.

#### Acceptance Criteria

1. THE Five_Layer_Mixer SHALL create exactly 5 audio processing chains, one for each LayerType: ambient, signature, dialogue, secondaryDialogue, atmosphere
2. FOR ALL layers, THE Five_Layer_Mixer SHALL create an AudioBufferSourceNode connected to a GainNode
3. THE Five_Layer_Mixer SHALL connect all layer GainNodes to a Master_GainNode, which connects to AudioContext.destination
4. THE Five_Layer_Mixer SHALL maintain a MixerState object containing all 5 AudioLayerState objects and the masterGainNode reference
5. THE Five_Layer_Mixer SHALL provide a method to set the volume of any individual layer by updating its GainNode.gain.value
6. THE Five_Layer_Mixer SHALL ensure that setting a layer's volume does not affect other layers' volumes
7. THE Five_Layer_Mixer SHALL clamp all layer volume values to the range [0, 1] before applying them to GainNode.gain.value

### Requirement 3: 对话层空间定位

**User Story:** As a developer, I want dialogue layers to support spatial positioning, so that conversations feel spatially separated and realistic.

#### Acceptance Criteria

1. THE Spatial_Audio_Controller SHALL create a StereoPannerNode (PanNode) for the dialogue layer
2. THE Spatial_Audio_Controller SHALL create a StereoPannerNode (PanNode) for the secondaryDialogue layer
3. THE Spatial_Audio_Controller SHALL connect each dialogue layer's AudioBufferSourceNode to its PanNode, then to its GainNode
4. THE Spatial_Audio_Controller SHALL set the PanNode.pan.value based on the `pan` field from the SoundscapeRecipe's DialogueLayer
5. THE Spatial_Audio_Controller SHALL clamp all pan values to the range [-1, 1] before applying them to PanNode.pan.value
6. THE Spatial_Audio_Controller SHALL provide a method to update a dialogue layer's pan value in real-time
7. WHEN the pan value is -1, THE audio SHALL be fully positioned in the left channel; WHEN the pan value is 1, THE audio SHALL be fully positioned in the right channel; WHEN the pan value is 0, THE audio SHALL be centered

### Requirement 4: 淡入效果实现

**User Story:** As a developer, I want soundscapes to fade in smoothly over 1.5 seconds, so that the audio experience starts gently without jarring the user.

#### Acceptance Criteria

1. WHEN a new soundscape starts playing, THE Fade_Controller SHALL set all layer GainNode.gain.value to 0 initially
2. THE Fade_Controller SHALL use GainNode.gain.linearRampToValueAtTime to ramp each layer's volume from 0 to its target volume over 1.5 seconds
3. THE Fade_Controller SHALL apply the fade-in effect to all 5 layers simultaneously when the soundscape starts
4. THE Fade_Controller SHALL use the layer's configured volume (from SoundscapeRecipe) as the target volume for the fade-in ramp
5. THE Fade_Controller SHALL ensure the fade-in duration is exactly 1.5 seconds (1500 milliseconds)
6. THE Fade_Controller SHALL handle the case where a layer is added after the initial fade-in has started, applying a fade-in from the current time

### Requirement 5: 淡出效果实现

**User Story:** As a developer, I want soundscapes to fade out smoothly over 0.8 seconds when switching to a new soundscape, so that transitions are seamless.

#### Acceptance Criteria

1. WHEN a soundscape is stopped or replaced, THE Fade_Controller SHALL use GainNode.gain.linearRampToValueAtTime to ramp each layer's volume from its current value to 0 over 0.8 seconds
2. THE Fade_Controller SHALL apply the fade-out effect to all 5 layers simultaneously
3. THE Fade_Controller SHALL ensure the fade-out duration is exactly 0.8 seconds (800 milliseconds)
4. WHEN the fade-out completes, THE Fade_Controller SHALL stop all AudioBufferSourceNodes and disconnect them from the audio graph
5. THE Fade_Controller SHALL release all AudioBuffer references after fade-out to free memory
6. THE Fade_Controller SHALL handle the case where a new soundscape is requested before the previous fade-out completes, by immediately stopping the old fade-out and starting the new soundscape's fade-in

### Requirement 6: Ambient 和 Atmosphere 层循环播放

**User Story:** As a developer, I want ambient and atmosphere layers to loop seamlessly, so that the background soundscape continues indefinitely without gaps.

#### Acceptance Criteria

1. THE Loop_Manager SHALL set AudioBufferSourceNode.loop to true for the ambient layer
2. THE Loop_Manager SHALL set AudioBufferSourceNode.loop to true for the atmosphere layer
3. THE Loop_Manager SHALL ensure that looping layers restart immediately when they reach the end of the buffer, with no audible gap
4. THE Loop_Manager SHALL NOT set loop to true for signature, dialogue, or secondaryDialogue layers
5. WHEN a looping layer is stopped, THE Loop_Manager SHALL set AudioBufferSourceNode.loop to false before calling stop()

### Requirement 7: Signature 层间隔触发

**User Story:** As a developer, I want the signature layer to trigger at regular intervals, so that iconic sounds appear periodically throughout the soundscape.

#### Acceptance Criteria

1. THE Interval_Trigger_Manager SHALL read the `intervalSeconds` field from the SoundscapeRecipe's SignatureLayer
2. THE Interval_Trigger_Manager SHALL use setTimeout to schedule the next signature sound playback after `intervalSeconds` seconds
3. WHEN the signature sound finishes playing, THE Interval_Trigger_Manager SHALL schedule the next playback after `intervalSeconds` seconds
4. THE Interval_Trigger_Manager SHALL create a new AudioBufferSourceNode for each signature sound trigger
5. THE Interval_Trigger_Manager SHALL apply the signature layer's volume and fade-in settings to each triggered sound
6. THE Interval_Trigger_Manager SHALL clear all pending timeouts when the soundscape is stopped
7. THE Interval_Trigger_Manager SHALL ensure the intervalSeconds value is clamped to the range [30, 90] as defined in the SoundscapeRecipe specification

### Requirement 8: Dialogue 层间隔触发

**User Story:** As a developer, I want dialogue layers to repeat at regular intervals, so that conversations occur periodically throughout the soundscape.

#### Acceptance Criteria

1. THE Interval_Trigger_Manager SHALL read the `repeatIntervalSeconds` field from the SoundscapeRecipe's DialogueLayer for both dialogue and secondaryDialogue layers
2. THE Interval_Trigger_Manager SHALL use setTimeout to schedule the next dialogue playback after `repeatIntervalSeconds` seconds
3. WHEN a dialogue sound finishes playing, THE Interval_Trigger_Manager SHALL schedule the next playback after `repeatIntervalSeconds` seconds
4. THE Interval_Trigger_Manager SHALL create a new AudioBufferSourceNode for each dialogue trigger
5. THE Interval_Trigger_Manager SHALL apply the dialogue layer's volume, pan, and fade-in settings to each triggered sound
6. THE Interval_Trigger_Manager SHALL clear all pending dialogue timeouts when the soundscape is stopped
7. THE Interval_Trigger_Manager SHALL ensure the repeatIntervalSeconds value is clamped to the range [30, 120] as defined in the SoundscapeRecipe specification

### Requirement 9: 动态事件随机调度

**User Story:** As a developer, I want dynamic events to trigger at random intervals between 30-90 seconds, so that the soundscape feels alive and unpredictable.

#### Acceptance Criteria

1. THE Dynamic_Event_Scheduler SHALL read the `dynamicEventPool` from the SoundscapeRecipe's region template
2. THE Dynamic_Event_Scheduler SHALL randomly select one event from the dynamicEventPool for each trigger cycle
3. THE Dynamic_Event_Scheduler SHALL randomly select a trigger interval between 30000ms (30 seconds) and 90000ms (90 seconds) for each cycle
4. THE Dynamic_Event_Scheduler SHALL use setTimeout to schedule the next dynamic event trigger
5. WHEN a dynamic event is triggered, THE Dynamic_Event_Scheduler SHALL generate the event's audio using the ElevenLabs sound-generation API with the event's prompt
6. THE Dynamic_Event_Scheduler SHALL apply a random volume within the event's `volumeRange` to the generated audio
7. THE Dynamic_Event_Scheduler SHALL apply the event's `panFromTo` values to create a spatial movement effect (e.g., sound moving from left to right)
8. THE Dynamic_Event_Scheduler SHALL clear all pending dynamic event timeouts when the soundscape is stopped
9. THE Dynamic_Event_Scheduler SHALL handle the case where dynamic event generation fails by logging the error and scheduling the next event without blocking playback

### Requirement 10: 总音量控制

**User Story:** As a user, I want a master volume control, so that I can adjust the overall soundscape volume without changing individual layer balances.

#### Acceptance Criteria

1. THE Master_Volume_Controller SHALL create a single Master_GainNode connected between all layer GainNodes and AudioContext.destination
2. THE Master_Volume_Controller SHALL provide a method to set the master volume by updating Master_GainNode.gain.value
3. THE Master_Volume_Controller SHALL clamp the master volume value to the range [0, 1]
4. WHEN the master volume is changed, THE Master_Volume_Controller SHALL apply the change immediately without affecting individual layer volume settings
5. THE Master_Volume_Controller SHALL preserve the relative volume balance between layers when the master volume is adjusted
6. THE Master_Volume_Controller SHALL persist the master volume setting to localStorage under the key `pindrop_preferences.masterVolume`

### Requirement 11: 音频 Blob 加载与解码

**User Story:** As a developer, I want to load audio Blob data and decode it into AudioBuffer, so that the Web Audio API can play the audio.

#### Acceptance Criteria

1. WHEN an audio Blob is provided, THE Audio_Loader SHALL use AudioContext.decodeAudioData to decode the Blob's ArrayBuffer into an AudioBuffer
2. THE Audio_Loader SHALL handle decoding errors gracefully and return an error state if decoding fails
3. THE Audio_Loader SHALL support decoding audio in common formats: MP3, AAC, WAV, OGG
4. THE Audio_Loader SHALL provide a method to decode multiple Blobs in parallel using Promise.allSettled
5. WHEN decoding multiple Blobs, THE Audio_Loader SHALL return a result object indicating which layers succeeded and which failed
6. THE Audio_Loader SHALL log decoding errors with format `[PinDrop Audio] Failed to decode {layerType} audio: {error}`
7. THE Audio_Loader SHALL measure and log the decoding time for performance monitoring with format `[PinDrop Audio] Decoded {layerType} in {ms}ms`

### Requirement 12: 渐进式加载策略

**User Story:** As a user, I want the ambient layer to start playing within 3 seconds, so that I get immediate feedback while other layers load.

#### Acceptance Criteria

1. WHEN a soundscape is requested, THE Audio_Loader SHALL prioritize loading and decoding the ambient layer first
2. THE Audio_Loader SHALL start playing the ambient layer as soon as its AudioBuffer is ready, without waiting for other layers
3. THE Audio_Loader SHALL load and decode the remaining layers (signature, dialogue, secondaryDialogue, atmosphere) in parallel after the ambient layer starts
4. THE Audio_Loader SHALL add each additional layer to the mix as soon as its AudioBuffer is ready
5. THE Audio_Loader SHALL ensure the ambient layer starts playing within 3 seconds of the soundscape request
6. THE Audio_Loader SHALL ensure all 5 layers are playing within 5 seconds of the soundscape request, assuming network conditions are normal
7. THE Audio_Loader SHALL apply a fade-in effect to each layer as it is added to the mix, even if added after the initial fade-in

### Requirement 13: 部分层加载失败处理

**User Story:** As a user, I want the soundscape to continue playing even if some layers fail to load, so that I still get a partial experience rather than complete silence.

#### Acceptance Criteria

1. WHEN one or more layers fail to load or decode, THE Audio_Loader SHALL continue playing the successfully loaded layers
2. THE Audio_Loader SHALL log each layer failure with format `[PinDrop Audio] Layer {layerType} failed: {error}`
3. THE Audio_Loader SHALL set the failed layer's volume to 0 in the MixerState
4. THE Audio_Loader SHALL update the Playback_State_Manager to indicate partial success with a list of failed layers
5. WHEN 3 or more layers fail, THE Audio_Loader SHALL set the playback state to "error" and display an error message to the user
6. WHEN 1-2 layers fail, THE Audio_Loader SHALL set the playback state to "playing" with a warning indicator
7. THE Audio_Loader SHALL provide a method to retry loading failed layers without restarting the entire soundscape

### Requirement 14: 播放状态管理

**User Story:** As a developer, I want to track the current playback state, so that the UI can display appropriate controls and feedback.

#### Acceptance Criteria

1. THE Playback_State_Manager SHALL maintain a PlaybackState value: "idle" | "loading" | "playing" | "paused" | "error"
2. THE Playback_State_Manager SHALL transition to "loading" when a soundscape load is initiated
3. THE Playback_State_Manager SHALL transition to "playing" when at least one layer successfully starts playing
4. THE Playback_State_Manager SHALL transition to "paused" when the user pauses playback
5. THE Playback_State_Manager SHALL transition to "error" when 3 or more layers fail to load
6. THE Playback_State_Manager SHALL transition to "idle" when playback is stopped or the soundscape is cleared
7. THE Playback_State_Manager SHALL provide a method to subscribe to state changes for UI updates
8. THE Playback_State_Manager SHALL include metadata in the state object: current soundscape ID, loaded layers, failed layers, playback progress

### Requirement 15: 声景切换平滑过渡

**User Story:** As a user, I want smooth transitions when switching between soundscapes, so that the experience is not jarring.

#### Acceptance Criteria

1. WHEN a new soundscape is requested while another is playing, THE Audio_Player SHALL initiate a fade-out of the current soundscape over 0.8 seconds
2. THE Audio_Player SHALL start loading the new soundscape immediately, without waiting for the fade-out to complete
3. WHEN the new soundscape's ambient layer is ready, THE Audio_Player SHALL start its fade-in over 1.5 seconds
4. THE Audio_Player SHALL overlap the old soundscape's fade-out with the new soundscape's fade-in for a crossfade effect
5. THE Audio_Player SHALL stop and disconnect the old soundscape's audio nodes after the fade-out completes
6. THE Audio_Player SHALL release the old soundscape's AudioBuffer references to free memory
7. THE Audio_Player SHALL handle rapid soundscape switching (multiple requests within 2 seconds) by canceling pending loads and immediately switching to the latest request

### Requirement 16: 音量控制持久化

**User Story:** As a user, I want my volume settings to persist across sessions, so that I don't have to readjust them every time I use the app.

#### Acceptance Criteria

1. THE Audio_Player SHALL read the master volume from localStorage key `pindrop_preferences.masterVolume` on initialization
2. THE Audio_Player SHALL read individual layer volumes from localStorage key `pindrop_preferences.layerVolumes` on initialization
3. WHEN the master volume is changed, THE Audio_Player SHALL save the new value to localStorage immediately
4. WHEN any layer volume is changed, THE Audio_Player SHALL save the new value to localStorage immediately
5. THE Audio_Player SHALL use default volumes if no saved preferences exist: masterVolume=0.7, all layer volumes=0.5
6. THE Audio_Player SHALL validate loaded volume values are in the range [0, 1] and clamp them if necessary
7. THE Audio_Player SHALL provide a method to reset all volumes to defaults

### Requirement 17: 播放器清理与资源释放

**User Story:** As a developer, I want proper cleanup when the audio player is destroyed, so that there are no memory leaks or lingering audio processes.

#### Acceptance Criteria

1. WHEN the audio player is destroyed, THE Audio_Player SHALL stop all playing audio immediately
2. THE Audio_Player SHALL disconnect all audio nodes from the audio graph
3. THE Audio_Player SHALL clear all pending timeouts (interval triggers, dynamic events)
4. THE Audio_Player SHALL release all AudioBuffer references
5. THE Audio_Player SHALL close the AudioContext
6. THE Audio_Player SHALL set the playback state to "idle"
7. THE Audio_Player SHALL unsubscribe all state change listeners

### Requirement 18: 错误处理与日志记录

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose issues in production.

#### Acceptance Criteria

1. THE Audio_Player SHALL log all errors with format `[PinDrop Audio] {component}: {error message}`
2. THE Audio_Player SHALL log performance metrics: layer load times, decode times, total time to first audio
3. THE Audio_Player SHALL handle AudioContext creation errors and provide a fallback message to the user
4. THE Audio_Player SHALL handle decoding errors for individual layers without crashing the entire player
5. THE Audio_Player SHALL handle network errors when loading dynamic event audio
6. THE Audio_Player SHALL log state transitions with format `[PinDrop Audio] State: {oldState} → {newState}`
7. THE Audio_Player SHALL NOT log sensitive information (API keys, user data) in any logs

### Requirement 19: 浏览器兼容性

**User Story:** As a user, I want the audio player to work on modern browsers, so that I can use PinDrop on my preferred browser.

#### Acceptance Criteria

1. THE Audio_Player SHALL support Chrome 120+, Firefox 120+, Safari 17+, and Edge 120+
2. THE Audio_Player SHALL detect if the browser supports Web Audio API and display an error message if not supported
3. THE Audio_Player SHALL handle browser autoplay policies by requiring user interaction to resume the AudioContext
4. THE Audio_Player SHALL use standardized Web Audio API features (AudioContext, GainNode, StereoPannerNode, AudioBufferSourceNode) without vendor prefixes
5. THE Audio_Player SHALL handle Safari's stricter autoplay policy by displaying a "Click to enable audio" prompt
6. THE Audio_Player SHALL test and verify functionality on all supported browsers before release

### Requirement 20: 性能优化

**User Story:** As a user, I want the audio player to be performant and not drain my device's resources, so that I can enjoy soundscapes without lag or battery drain.

#### Acceptance Criteria

1. THE Audio_Player SHALL use Web Audio API's native nodes for all audio processing, avoiding JavaScript-based audio manipulation
2. THE Audio_Player SHALL reuse AudioBuffer instances when the same layer is triggered multiple times (signature, dialogue)
3. THE Audio_Player SHALL limit the number of concurrent AudioBufferSourceNodes to 10 to prevent resource exhaustion
4. THE Audio_Player SHALL release AudioBuffer references for soundscapes that are no longer playing
5. THE Audio_Player SHALL use requestAnimationFrame for any visual updates related to audio playback (e.g., waveform visualization) rather than polling
6. THE Audio_Player SHALL measure and log the total memory usage of loaded AudioBuffers with format `[PinDrop Audio] Total audio memory: {MB}MB`
7. THE Audio_Player SHALL provide a method to preload the next soundscape's ambient layer in the background for instant switching

### Requirement 21: 音频播放器 API 接口

**User Story:** As a developer, I want a clean API for the audio player, so that other components can easily control playback.

#### Acceptance Criteria

1. THE Audio_Player SHALL provide a `play(soundscapeRecipe, audioBlobs)` method to start playing a soundscape
2. THE Audio_Player SHALL provide a `pause()` method to pause the current soundscape
3. THE Audio_Player SHALL provide a `resume()` method to resume a paused soundscape
4. THE Audio_Player SHALL provide a `stop()` method to stop the current soundscape and reset to idle state
5. THE Audio_Player SHALL provide a `setMasterVolume(volume)` method to adjust the master volume
6. THE Audio_Player SHALL provide a `setLayerVolume(layerType, volume)` method to adjust individual layer volumes
7. THE Audio_Player SHALL provide a `setLayerPan(layerType, pan)` method to adjust dialogue layer spatial positioning
8. THE Audio_Player SHALL provide a `getState()` method to retrieve the current PlaybackState
9. THE Audio_Player SHALL provide a `subscribe(callback)` method to listen for state changes
10. THE Audio_Player SHALL provide a `destroy()` method to clean up all resources

### Requirement 22: 音频播放器单元测试

**User Story:** As a developer, I want comprehensive unit tests for the audio player, so that I can confidently refactor and extend the code.

#### Acceptance Criteria

1. THE Audio_Player test suite SHALL include tests for AudioContext initialization and lifecycle
2. THE Audio_Player test suite SHALL include tests for 5-layer mixing with independent volume control
3. THE Audio_Player test suite SHALL include tests for fade-in and fade-out timing accuracy
4. THE Audio_Player test suite SHALL include tests for loop behavior on ambient and atmosphere layers
5. THE Audio_Player test suite SHALL include tests for interval triggering of signature and dialogue layers
6. THE Audio_Player test suite SHALL include tests for dynamic event scheduling with random intervals
7. THE Audio_Player test suite SHALL include tests for partial layer failure handling
8. THE Audio_Player test suite SHALL include tests for soundscape switching and crossfade behavior
9. THE Audio_Player test suite SHALL include tests for volume persistence to localStorage
10. THE Audio_Player test suite SHALL achieve > 80% code coverage for all audio player modules

### Requirement 23: 音频播放器集成测试

**User Story:** As a developer, I want integration tests that verify the audio player works with real audio data, so that I can catch issues that unit tests might miss.

#### Acceptance Criteria

1. THE Audio_Player integration test suite SHALL include a test that loads a complete 5-layer soundscape and verifies all layers play
2. THE Audio_Player integration test suite SHALL include a test that verifies the ambient layer starts within 3 seconds
3. THE Audio_Player integration test suite SHALL include a test that verifies all 5 layers are playing within 5 seconds
4. THE Audio_Player integration test suite SHALL include a test that verifies fade-in and fade-out transitions are smooth
5. THE Audio_Player integration test suite SHALL include a test that verifies volume controls affect the audio output
6. THE Audio_Player integration test suite SHALL include a test that verifies soundscape switching works correctly
7. THE Audio_Player integration test suite SHALL use mock audio Blobs for testing to avoid network dependencies

### Requirement 24: 音频播放器性能测试

**User Story:** As a developer, I want performance benchmarks for the audio player, so that I can identify and fix performance bottlenecks.

#### Acceptance Criteria

1. THE Audio_Player performance test suite SHALL measure the time from `play()` call to first audio output
2. THE Audio_Player performance test suite SHALL measure the time to decode all 5 layers
3. THE Audio_Player performance test suite SHALL measure the memory usage of loaded AudioBuffers
4. THE Audio_Player performance test suite SHALL measure the CPU usage during playback
5. THE Audio_Player performance test suite SHALL verify that the ambient layer starts within 3 seconds in 95% of test runs
6. THE Audio_Player performance test suite SHALL verify that all 5 layers are playing within 5 seconds in 95% of test runs
7. THE Audio_Player performance test suite SHALL run on CI/CD to catch performance regressions

