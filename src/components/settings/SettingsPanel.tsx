'use client';

import {
  useEffect,
  useEffectEvent,
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
} from './types';
import { preferencesStore, retrieveApiKey } from './preferencesStore';
import { normalizeApiKey, verifyApiKey } from './apiKeyUtils';
import { ApiKeySection } from './ApiKeySection';
import { PlaybackSection } from './PlaybackSection';
import './SettingsPanel.css';

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
  const storageUnavailable =
    typeof window !== 'undefined' && !preferencesStore.isLocalStorageAvailable();

  const [apiKey, setApiKey] = useState<string>(() => retrieveApiKey() ?? '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [apiKeyError, setApiKeyError] = useState<ApiKeyErrorCode | null>(null);
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

  function announce(message: string): void {
    setAnnouncement('');
    window.setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }

  function savePreferences(updated: UserPreferences): void {
    setPreferences(updated);
    if (storageUnavailable) {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastSaveTimeRef.current;
    const THROTTLE_MS = 1000;

    if (elapsed >= THROTTLE_MS) {
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
      }, THROTTLE_MS - elapsed);
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
    const updated = { ...preferences, dynamicEvents: enabled };
    savePreferences(updated);
  }

  const announceFromEffect = useEffectEvent((message: string) => {
    announce(message);
  });

  const closeFromEffect = useEffectEvent(() => {
    onClose();
  });

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
    };
  }, [storageUnavailable]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const syncPreferencesTimer = window.setTimeout(() => {
      setPreferences(preferencesStore.loadPreferences());
      setApiKey(retrieveApiKey() ?? '');
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
      announceFromEffect(messages.settings.openedAnnouncement);
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
        closeFromEffect();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
        aria-label={messages.settings.panelTitle}
        data-anchor-active={anchorRef?.current ? 'true' : 'false'}
      >
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
