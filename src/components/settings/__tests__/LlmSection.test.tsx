import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { I18nProvider } from '@/i18n/I18nProvider';
import { LlmSection } from '../LlmSection';
import { DEFAULT_PREFERENCES, LLM_API_KEY_KEY, PREFERENCES_KEY } from '../preferencesStore';

describe('LlmSection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('auto-saves normalized base URL and model after typing stops', () => {
    const onBaseUrlChange = vi.fn();
    const onModelChange = vi.fn();

    render(
      <I18nProvider>
        <LlmSection
          baseUrl=""
          model=""
          apiKey=""
          onBaseUrlChange={onBaseUrlChange}
          onModelChange={onModelChange}
          onApiKeyChange={vi.fn()}
        />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText('Request address'), {
      target: { value: '  https://api.openai.com/v1/  ' },
    });
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: '  gpt-4.1-mini  ' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onBaseUrlChange).toHaveBeenCalledWith('https://api.openai.com/v1');
    expect(onModelChange).toHaveBeenCalledWith('gpt-4.1-mini');
  });

  test('auto-saves the LLM API key after typing stops', () => {
    const onApiKeyChange = vi.fn();

    render(
      <I18nProvider>
        <LlmSection
          baseUrl=""
          model=""
          apiKey=""
          onBaseUrlChange={vi.fn()}
          onModelChange={vi.fn()}
          onApiKeyChange={onApiKeyChange}
        />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByLabelText('LLM API Key'), {
      target: { value: '  sk-llm-test-key  ' },
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(localStorage.getItem(LLM_API_KEY_KEY)).toBe('sk-llm-test-key');
    expect(onApiKeyChange).toHaveBeenCalledWith('sk-llm-test-key');
  });

  test('does not render the description when the message is empty', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        ...DEFAULT_PREFERENCES,
        interfaceLanguage: 'zh-CN',
      })
    );

    render(
      <I18nProvider>
        <LlmSection
          baseUrl=""
          model=""
          apiKey=""
          onBaseUrlChange={vi.fn()}
          onModelChange={vi.fn()}
          onApiKeyChange={vi.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.queryByText(
        '填写兼容 OpenAI 的请求地址、模型名和 API Key。PinDrop 会先让 LLM 为该地点生成一件具体的、本地化的事件，再据此生成音频。',
      ),
    ).not.toBeInTheDocument();
  });
});
