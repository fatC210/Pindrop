import { useState, type ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { I18nProvider } from '@/i18n/I18nProvider';
import { ApiKeySection } from '../ApiKeySection';
import { API_KEY_KEY } from '../preferencesStore';

function renderApiKeySection(
  overrides: Partial<ComponentProps<typeof ApiKeySection>> = {},
): {
  onApiKeyChange: ReturnType<typeof vi.fn>;
  onVerify: ReturnType<typeof vi.fn>;
  unmount: ReturnType<typeof render>['unmount'];
} {
  const onApiKeyChange = vi.fn();
  const onVerify = vi.fn().mockResolvedValue(undefined);

  const renderResult = render(
    <I18nProvider>
      <ApiKeySection
        apiKey=""
        onApiKeyChange={onApiKeyChange}
        onVerify={onVerify}
        isVerifying={false}
        verificationResult={null}
        error={null}
        {...overrides}
      />
    </I18nProvider>,
  );

  return { onApiKeyChange, onVerify, unmount: renderResult.unmount };
}

function renderStatefulApiKeySection(
  initialApiKey = '',
): {
  onApiKeyChange: ReturnType<typeof vi.fn>;
  onVerify: ReturnType<typeof vi.fn>;
} {
  const onApiKeyChange = vi.fn();
  const onVerify = vi.fn().mockResolvedValue(undefined);

  function Wrapper(): React.JSX.Element {
    const [apiKey, setApiKey] = useState(initialApiKey);

    return (
      <I18nProvider>
        <ApiKeySection
          apiKey={apiKey}
          onApiKeyChange={(nextApiKey) => {
            onApiKeyChange(nextApiKey);
            setApiKey(nextApiKey);
          }}
          onVerify={onVerify}
          isVerifying={false}
          verificationResult={null}
          error={null}
        />
      </I18nProvider>
    );
  }

  render(<Wrapper />);

  return { onApiKeyChange, onVerify };
}

describe('ApiKeySection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('uses an sk- placeholder and renders no verify or edit button', () => {
    renderApiKeySection({ apiKey: 'sk-abcdefghijklmnopqrstuvwxyz012345' });

    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });
    const toggle = screen.getByRole('button', { name: 'Show key' });

    expect(input.getAttribute('placeholder')).toBe('sk-...');
    expect(screen.queryByRole('button', { name: 'Verify key' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(toggle.querySelector('svg')).not.toBeNull();
    expect(toggle).not.toBeNull();
  });

  test('hides the visibility button when the input is empty', () => {
    renderApiKeySection();

    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });

    expect(input.getAttribute('placeholder')).toBe('sk-...');
    expect(screen.queryByRole('button', { name: 'Show key' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hide key' })).toBeNull();
  });

  test('saves and verifies a valid API key when the input loses focus', () => {
    const { onApiKeyChange, onVerify } = renderApiKeySection();
    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });
    const apiKey = 'sk-abcdefghijklmnopqrstuvwxyz012345';

    fireEvent.change(input, { target: { value: `  ${apiKey}\n` } });
    fireEvent.blur(input);

    expect(localStorage.getItem(API_KEY_KEY)).toBe(apiKey);
    expect(onApiKeyChange).toHaveBeenCalledWith(apiKey);
    expect(onVerify).toHaveBeenCalledWith(apiKey);
  });

  test('saves and verifies when focus moves from the input to the visibility button', () => {
    const { onApiKeyChange, onVerify } = renderApiKeySection();
    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });
    const apiKey = 'sk-abcdefghijklmnopqrstuvwxyz012345';

    fireEvent.change(input, { target: { value: apiKey } });
    const toggle = screen.getByRole('button', { name: 'Show key' });
    fireEvent.blur(input, { relatedTarget: toggle });

    expect(localStorage.getItem(API_KEY_KEY)).toBe(apiKey);
    expect(onApiKeyChange).toHaveBeenCalledWith(apiKey);
    expect(onVerify).toHaveBeenCalledWith(apiKey);
  });

  test('saves and verifies a valid API key when the section unmounts before blur', () => {
    const { onApiKeyChange, onVerify, unmount } = renderApiKeySection();
    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });
    const apiKey = 'sk-abcdefghijklmnopqrstuvwxyz012345';

    fireEvent.change(input, { target: { value: apiKey } });
    unmount();

    expect(localStorage.getItem(API_KEY_KEY)).toBe(apiKey);
    expect(onApiKeyChange).toHaveBeenCalledWith(apiKey);
    expect(onVerify).toHaveBeenCalledWith(apiKey);
  });

  test('clears the stored API key without restoring the previous value when the input is emptied', () => {
    const existingApiKey = 'sk-abcdefghijklmnopqrstuvwxyz012345';
    localStorage.setItem(API_KEY_KEY, existingApiKey);

    const { onApiKeyChange, onVerify } = renderStatefulApiKeySection(existingApiKey);
    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(localStorage.getItem(API_KEY_KEY)).toBeNull();
    expect(onApiKeyChange).toHaveBeenCalledWith('');
    expect(onVerify).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  test('shows a format error and skips verification for invalid input on blur', () => {
    const { onApiKeyChange, onVerify } = renderApiKeySection();
    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });

    fireEvent.change(input, { target: { value: 'invalid-key' } });
    fireEvent.blur(input);

    expect(onApiKeyChange).not.toHaveBeenCalled();
    expect(onVerify).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Invalid ElevenLabs API key format');
  });

  test('toggles between hidden and visible API key states', () => {
    renderApiKeySection({ apiKey: 'sk-abcdefghijklmnopqrstuvwxyz012345' });

    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });
    const showButton = screen.getByRole('button', { name: 'Show key' });

    expect(input.getAttribute('type')).toBe('password');

    fireEvent.click(showButton);

    expect(input.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide key' })).not.toBeNull();
  });

  test('removes the visibility button again after the input is cleared', () => {
    renderStatefulApiKeySection('sk-abcdefghijklmnopqrstuvwxyz012345');

    const input = screen.getByLabelText('ElevenLabs API Key', { selector: 'input' });

    expect(screen.getByRole('button', { name: 'Show key' })).not.toBeNull();

    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByRole('button', { name: 'Show key' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hide key' })).toBeNull();
    expect(input.getAttribute('type')).toBe('password');
  });
});
