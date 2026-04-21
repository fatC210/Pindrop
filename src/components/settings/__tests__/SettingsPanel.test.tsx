import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../llmConfigUtils', () => ({
  verifyLlmConfiguration: vi.fn(),
}));

import { I18nProvider } from '@/i18n/I18nProvider';
import { SettingsPanel } from '../SettingsPanel';
import { LLM_API_KEY_KEY, PREFERENCES_KEY } from '../preferencesStore';
import { verifyLlmConfiguration } from '../llmConfigUtils';

const verifyLlmConfigurationMock = vi.mocked(verifyLlmConfiguration);

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    verifyLlmConfigurationMock.mockReset();
    verifyLlmConfigurationMock.mockResolvedValue({ isValid: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('auto-saves and verifies the LLM configuration after typing completes', async () => {
    render(
      <I18nProvider>
        <SettingsPanel
          isOpen
          onClose={vi.fn()}
          anchorRef={createRef<HTMLButtonElement>()}
        />
      </I18nProvider>,
    );

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    fireEvent.change(screen.getByLabelText('Request address'), {
      target: { value: ' https://api.openai.com/v1/ ' },
    });
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: ' gpt-4.1-mini ' },
    });
    fireEvent.change(screen.getByLabelText('LLM API Key'), {
      target: { value: ' sk-llm-test-key ' },
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(verifyLlmConfigurationMock).toHaveBeenCalledTimes(1);
    expect(verifyLlmConfigurationMock).toHaveBeenCalledWith({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4.1-mini',
      apiKey: 'sk-llm-test-key',
    });

    expect(localStorage.getItem(LLM_API_KEY_KEY)).toBe('sk-llm-test-key');
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}')).toMatchObject({
      llmEnhancement: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4.1-mini',
      },
    });

    expect(screen.getByText('Connection verified.')).toBeInTheDocument();
  });
});
