'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
} from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type {
  SettingsPanelProps,
  UserPreferences,
  VerificationResult,
  ApiKeyErrorCode,
  LlmVerificationResult,
} from './types';
import {
  preferencesStore,
  retrieveApiKey,
  retrieveLlmApiKey,
} from './preferencesStore';
import { normalizeApiKey, verifyApiKey } from './apiKeyUtils';
import { verifyLlmConfiguration } from './llmConfigUtils';
import { ApiKeySection } from './ApiKeySection';
import { LlmSection } from './LlmSection';
import { PlaybackSection } from './PlaybackSection';
import './SettingsPanel.css';

const PREFERENCES_SAVE_THROTTLE_MS = 1000;
const LLM_VERIFICATION_DEBOUNCE_MS = 800;

/**
 * 轻量设置浮层。
 * 仅保留 API Key 与动态事件开关，复用原有偏好持久化与校验逻辑。
 */
export function SettingsPanel({
  isOpen,
  onClose,
  anchorRef,
}: SettingsPanelProps): JSX.Element | null {
  const { messages } = useI18n();
  const titleId = useId();
  const storageUnavailable =
    typeof window !== 'undefined' && !preferencesStore.isLocalStorageAvailable();

  const [apiKey, setApiKey] = useState<string>(() => retrieveApiKey() ?? '');
  const [llmApiKey, setLlmApiKey] = useState<string>(() => retrieveLlmApiKey() ?? '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [apiKeyError, setApiKeyError] = useState<ApiKeyErrorCode | null>(null);
  const [isLlmVerifying, setIsLlmVerifying] = useState(false);
  const [llmVerificationResult, setLlmVerificationResult] =
    useState<LlmVerificationResult | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') {
      return preferencesStore.getDefaultPreferences();
    }

    return preferencesStore.loadPreferences();
  });
  const [announcement, setAnnouncement] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(isOpen);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const pendingPreferencesRef = useRef<UserPreferences | null>(null);
  const preferencesRef = useRef<UserPreferences>(preferences);
  const llmVerificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmVerificationRequestRef = useRef(0);
  const lastVerifiedLlmSignatureRef = useRef<string | null>(null);

  function announce(message: string): void {
    setAnnouncement('');
    window.setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  function savePreferences(
    update: UserPreferences | ((current: UserPreferences) => UserPreferences),
  ): void {
    const updated =
      typeof update === 'function'
        ? (update as (current: UserPreferences) => UserPreferences)(preferencesRef.current)
        : update;

    preferencesRef.current = updated;
    setPreferences(updated);
    if (storageUnavailable) {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastSaveTimeRef.current;
    if (elapsed >= PREFERENCES_SAVE_THROTTLE_MS) {
      preferencesStore.savePreferences(updated);
      lastSaveTimeRef.current = now;
      pendingPreferencesRef.current = null;

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      return;
    }

    pendingPreferencesRef.current = updated;

    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        if (pendingPreferencesRef.current) {
          preferencesStore.savePreferences(pendingPreferencesRef.current);
          lastSaveTimeRef.current = Date.now();
          pendingPreferencesRef.current = null;
        }
        throttleTimerRef.current = null;
      }, PREFERENCES_SAVE_THROTTLE_MS - elapsed);
    }
  }

  function handleApiKeyChange(newKey: string): void {
    setApiKey(newKey);
    setVerificationResult(null);
    setApiKeyError(null);
  }

  async function handleVerifyApiKey(candidateApiKey: string): Promise<void> {
    const normalizedApiKey = normalizeApiKey(candidateApiKey);
    setIsVerifying(true);
    setVerificationResult(null);
    setApiKeyError(null);

    try {
      const result = await verifyApiKey(normalizedApiKey);
      setVerificationResult(result);
      setApiKey(normalizedApiKey);
      if (!result.isValid && result.error) {
        setApiKeyError(result.error);
      }
    } catch {
      console.error('[PinDrop Error] API_KEY_VERIFICATION_FAILED: Verification request failed');
      setApiKeyError('CONNECTION_FAILED');
    } finally {
      setIsVerifying(false);
    }
  }

  function handleDynamicEventsChange(enabled: boolean): void {
    savePreferences((current) => ({ ...current, dynamicEvents: enabled }));
  }

  function handleLlmBaseUrlChange(baseUrl: string): void {
    savePreferences((current) => ({
      ...current,
      llmEnhancement: {
        ...current.llmEnhancement,
        baseUrl,
      },
    }));
  }

  function handleLlmModelChange(model: string): void {
    savePreferences((current) => ({
      ...current,
      llmEnhancement: {
        ...current.llmEnhancement,
        model,
      },
    }));
  }

  function handleLlmApiKeyChange(nextApiKey: string): void {
    setLlmApiKey(nextApiKey);
  }

  useEffect(() => {
    return (): void => {
      if (pendingPreferencesRef.current && !storageUnavailable) {
        preferencesStore.savePreferences(pendingPreferencesRef.current);
        pendingPreferencesRef.current = null;
      }

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }

      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }

      if (llmVerificationTimerRef.current) {
        clearTimeout(llmVerificationTimerRef.current);
        llmVerificationTimerRef.current = null;
      }
    };
  }, [storageUnavailable]);

  useEffect(() => {
    if (llmVerificationTimerRef.current) {
      clearTimeout(llmVerificationTimerRef.current);
      llmVerificationTimerRef.current = null;
    }

    if (!isOpen) {
      llmVerificationRequestRef.current += 1;
      return;
    }

    const normalizedBaseUrl = preferences.llmEnhancement.baseUrl.trim();
    const normalizedModel = preferences.llmEnhancement.model.trim();
    const normalizedLlmApiKey = normalizeApiKey(llmApiKey);

    if (!normalizedBaseUrl || !normalizedModel || !normalizedLlmApiKey) {
      llmVerificationRequestRef.current += 1;
      return;
    }

    const signature = JSON.stringify({
      baseUrl: normalizedBaseUrl,
      model: normalizedModel,
      apiKey: normalizedLlmApiKey,
    });

    if (signature === lastVerifiedLlmSignatureRef.current && llmVerificationResult) {
      return;
    }

    setIsLlmVerifying(true);
    setLlmVerificationResult(null);
    const requestId = llmVerificationRequestRef.current + 1;
    llmVerificationRequestRef.current = requestId;

    llmVerificationTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await verifyLlmConfiguration({
          baseUrl: normalizedBaseUrl,
          model: normalizedModel,
          apiKey: normalizedLlmApiKey,
        });

        if (llmVerificationRequestRef.current !== requestId) {
          return;
        }

        lastVerifiedLlmSignatureRef.current = signature;
        setIsLlmVerifying(false);
        setLlmVerificationResult(result);
      })();
    }, LLM_VERIFICATION_DEBOUNCE_MS);

    return (): void => {
      if (llmVerificationTimerRef.current) {
        clearTimeout(llmVerificationTimerRef.current);
        llmVerificationTimerRef.current = null;
      }
    };
  }, [
    isOpen,
    llmApiKey,
    llmVerificationResult,
    preferences.llmEnhancement.baseUrl,
    preferences.llmEnhancement.model,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const syncPreferencesTimer = window.setTimeout(() => {
      setPreferences(preferencesStore.loadPreferences());
      setApiKey(retrieveApiKey() ?? '');
      setLlmApiKey(retrieveLlmApiKey() ?? '');
      setVerificationResult(null);
      setApiKeyError(null);
    }, 0);

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 0);

    const announcementTimer = window.setTimeout(() => {
      announce(messages.settings.openedAnnouncement);
    }, 0);

    return (): void => {
      window.clearTimeout(syncPreferencesTimer);
      window.clearTimeout(focusTimer);
      window.clearTimeout(announcementTimer);
    };
  }, [isOpen, messages.settings.openedAnnouncement]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      anchorRef?.current?.focus();
      previousFocusRef.current?.focus();
      announce(messages.settings.closedAnnouncement);
    }

    wasOpenRef.current = isOpen;
  }, [anchorRef, isOpen, messages.settings.closedAnnouncement]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div
        ref={panelRef}
        className="settings-popover"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
      >
        <div className="settings-popover__header">
          <h2 id={titleId} className="settings-popover__title">
            {messages.settings.panelTitle}
          </h2>
          <button
            type="button"
            className="settings-popover__close-button"
            onClick={onClose}
            aria-label={messages.settings.closeAria}
          >
            <svg
              className="settings-popover__close-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>

        {storageUnavailable ? (
          <div className="settings-popover__warning" role="alert">
            <span className="settings-popover__warning-icon" aria-hidden="true">
              !
            </span>
            <span>{messages.settings.storageUnavailable}</span>
          </div>
        ) : null}

        <div className="settings-popover__body">
          <ApiKeySection
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            onVerify={handleVerifyApiKey}
            isVerifying={isVerifying}
            verificationResult={verificationResult}
            error={apiKeyError}
            compact
          />

          <LlmSection
            baseUrl={preferences.llmEnhancement.baseUrl}
            model={preferences.llmEnhancement.model}
            apiKey={llmApiKey}
            onBaseUrlChange={handleLlmBaseUrlChange}
            onModelChange={handleLlmModelChange}
            onApiKeyChange={handleLlmApiKeyChange}
            isVerifying={isLlmVerifying}
            verificationResult={llmVerificationResult}
            compact
          />

          <PlaybackSection
            dynamicEvents={preferences.dynamicEvents}
            onDynamicEventsChange={handleDynamicEventsChange}
            compact
          />
        </div>
      </div>
    </>
  );
}
