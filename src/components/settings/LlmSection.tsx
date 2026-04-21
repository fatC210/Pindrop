'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type { LlmVerificationResult } from './types';
import { clearLlmApiKey, storeLlmApiKey } from './preferencesStore';
import { normalizeApiKey } from './apiKeyUtils';
import { LoadingSpinner } from './LoadingSpinner';
import './LlmSection.css';

const AUTO_SAVE_DELAY_MS = 600;

export interface LlmSectionProps {
  baseUrl: string;
  model: string;
  apiKey: string;
  onBaseUrlChange: (baseUrl: string) => void;
  onModelChange: (model: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  isVerifying?: boolean;
  verificationResult?: LlmVerificationResult | null;
  compact?: boolean;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function normalizeModel(value: string): string {
  return value.trim();
}

export function LlmSection({
  baseUrl,
  model,
  apiKey,
  onBaseUrlChange,
  onModelChange,
  onApiKeyChange,
  isVerifying = false,
  verificationResult = null,
  compact = false,
}: LlmSectionProps): React.JSX.Element {
  const { messages } = useI18n();
  const [draftBaseUrl, setDraftBaseUrl] = useState<string | null>(null);
  const [draftModel, setDraftModel] = useState<string | null>(null);
  const [draftApiKey, setDraftApiKey] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  const baseUrlRef = useRef(baseUrl);
  const modelRef = useRef(model);
  const apiKeyRef = useRef(apiKey);
  const draftBaseUrlRef = useRef<string | null>(draftBaseUrl);
  const draftModelRef = useRef<string | null>(draftModel);
  const draftApiKeyRef = useRef<string | null>(draftApiKey);

  useEffect(() => {
    baseUrlRef.current = baseUrl;
  }, [baseUrl]);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  useEffect(() => {
    draftBaseUrlRef.current = draftBaseUrl;
  }, [draftBaseUrl]);

  useEffect(() => {
    draftModelRef.current = draftModel;
  }, [draftModel]);

  useEffect(() => {
    draftApiKeyRef.current = draftApiKey;
  }, [draftApiKey]);

  const baseUrlInputValue = draftBaseUrl ?? baseUrl;
  const modelInputValue = draftModel ?? model;
  const apiKeyInputValue = draftApiKey ?? apiKey;
  const hasApiKeyValue = normalizeApiKey(apiKeyInputValue).length > 0;
  const hasPendingDraft = draftBaseUrl !== null || draftModel !== null || draftApiKey !== null;
  const isConfigComplete =
    normalizeBaseUrl(baseUrlInputValue).length > 0 &&
    normalizeModel(modelInputValue).length > 0 &&
    normalizeApiKey(apiKeyInputValue).length > 0;

  const commitBaseUrl = useCallback(
    (rawValue: string, options?: { updateLocalState?: boolean }): void => {
      const updateLocalState = options?.updateLocalState ?? true;
      const normalizedValue = normalizeBaseUrl(rawValue);
      if (normalizedValue === baseUrlRef.current) {
        if (updateLocalState) {
          setDraftBaseUrl(null);
        }
        return;
      }

      onBaseUrlChange(normalizedValue);
      if (updateLocalState) {
        setDraftBaseUrl(null);
      }
    },
    [onBaseUrlChange]
  );

  const commitModel = useCallback(
    (rawValue: string, options?: { updateLocalState?: boolean }): void => {
      const updateLocalState = options?.updateLocalState ?? true;
      const normalizedValue = normalizeModel(rawValue);
      if (normalizedValue === modelRef.current) {
        if (updateLocalState) {
          setDraftModel(null);
        }
        return;
      }

      onModelChange(normalizedValue);
      if (updateLocalState) {
        setDraftModel(null);
      }
    },
    [onModelChange]
  );

  const commitApiKey = useCallback(
    (rawValue: string, options?: { updateLocalState?: boolean }): void => {
      const updateLocalState = options?.updateLocalState ?? true;
      const normalizedValue = normalizeApiKey(rawValue);
      if (normalizedValue === apiKeyRef.current) {
        if (updateLocalState) {
          setDraftApiKey(null);
        }
        return;
      }

      if (!normalizedValue) {
        clearLlmApiKey();
        onApiKeyChange('');
        if (updateLocalState) {
          setDraftApiKey(null);
        }
        return;
      }

      storeLlmApiKey(normalizedValue);
      onApiKeyChange(normalizedValue);
      if (updateLocalState) {
        setDraftApiKey(null);
      }
    },
    [onApiKeyChange]
  );

  useEffect(() => {
    return (): void => {
      const pendingBaseUrl = draftBaseUrlRef.current;
      if (pendingBaseUrl !== null) {
        commitBaseUrl(pendingBaseUrl, { updateLocalState: false });
      }

      const pendingModel = draftModelRef.current;
      if (pendingModel !== null) {
        commitModel(pendingModel, { updateLocalState: false });
      }

      const pendingApiKey = draftApiKeyRef.current;
      if (pendingApiKey !== null) {
        commitApiKey(pendingApiKey, { updateLocalState: false });
      }
    };
  }, [commitApiKey, commitBaseUrl, commitModel]);

  useEffect(() => {
    if (draftBaseUrl === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      commitBaseUrl(draftBaseUrl);
    }, AUTO_SAVE_DELAY_MS);

    return (): void => {
      window.clearTimeout(timer);
    };
  }, [commitBaseUrl, draftBaseUrl]);

  useEffect(() => {
    if (draftModel === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      commitModel(draftModel);
    }, AUTO_SAVE_DELAY_MS);

    return (): void => {
      window.clearTimeout(timer);
    };
  }, [commitModel, draftModel]);

  useEffect(() => {
    if (draftApiKey === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      commitApiKey(draftApiKey);
    }, AUTO_SAVE_DELAY_MS);

    return (): void => {
      window.clearTimeout(timer);
    };
  }, [commitApiKey, draftApiKey]);

  const shouldShowVerificationState = isConfigComplete && !hasPendingDraft && (isVerifying || verificationResult);
  let verificationMessage: string | null = null;
  let verificationClassName = 'llm-section__status';
  const description = messages.settings.sections.llm.description.trim();

  if (verificationResult && !verificationResult.isValid) {
    verificationMessage =
      verificationResult.error === 'CONNECTION_FAILED'
        ? messages.settings.sections.llm.connectionFailed
        : messages.settings.sections.llm.invalid;
    verificationClassName += ' llm-section__status--failure';
  } else if (verificationResult?.isValid) {
    verificationMessage = messages.settings.sections.llm.valid;
    verificationClassName += ' llm-section__status--success';
  }

  return (
    <section
      className={`llm-section${compact ? ' llm-section--compact' : ''}`}
      aria-labelledby="llm-section-header"
    >
      <h3 id="llm-section-header" className="llm-section__header">
        {messages.settings.sections.llm.header}
      </h3>
      {description ? <p className="llm-section__description">{description}</p> : null}

      <div className="llm-section__field">
        <label className="llm-section__label" htmlFor="llm-base-url-input">
          {messages.settings.sections.llm.baseUrlLabel}
        </label>
        <input
          id="llm-base-url-input"
          type="url"
          className="llm-section__input"
          value={baseUrlInputValue}
          onChange={(event) => {
            setDraftBaseUrl(event.target.value);
          }}
          onBlur={(event) => {
            commitBaseUrl(event.currentTarget.value);
          }}
          placeholder={messages.settings.sections.llm.baseUrlPlaceholder}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </div>

      <div className="llm-section__field">
        <label className="llm-section__label" htmlFor="llm-model-input">
          {messages.settings.sections.llm.modelLabel}
        </label>
        <input
          id="llm-model-input"
          type="text"
          className="llm-section__input"
          value={modelInputValue}
          onChange={(event) => {
            setDraftModel(event.target.value);
          }}
          onBlur={(event) => {
            commitModel(event.currentTarget.value);
          }}
          placeholder={messages.settings.sections.llm.modelPlaceholder}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </div>

      <div className="llm-section__field">
        <label className="llm-section__label" htmlFor="llm-api-key-input">
          {messages.settings.sections.llm.apiKeyLabel}
        </label>
        <div className="llm-section__input-wrapper">
          <input
            id="llm-api-key-input"
            type={hasApiKeyValue && isApiKeyVisible ? 'text' : 'password'}
            className="llm-section__input llm-section__input--with-toggle"
            value={apiKeyInputValue}
            onChange={(event) => {
              setDraftApiKey(event.target.value);
            }}
            onBlur={(event) => {
              commitApiKey(event.currentTarget.value);
            }}
            placeholder={messages.settings.sections.llm.apiKeyPlaceholder}
            autoComplete="off"
            spellCheck={false}
            required
          />

          {hasApiKeyValue ? (
            <button
              type="button"
              className="llm-section__visibility-button"
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                setIsApiKeyVisible((current) => !current);
              }}
              aria-pressed={isApiKeyVisible}
              aria-label={
                isApiKeyVisible
                  ? messages.settings.sections.llm.hide
                  : messages.settings.sections.llm.show
              }
              title={
                isApiKeyVisible
                  ? messages.settings.sections.llm.hide
                  : messages.settings.sections.llm.show
              }
            >
              {isApiKeyVisible ? (
                <svg
                  className="llm-section__visibility-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M10.73 5.08A11.2 11.2 0 0 1 12 5c5.23 0 8.94 3.06 10 6.39c.11.39.11.82 0 1.21a10.77 10.77 0 0 1-4.33 5.28"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M6.61 6.61A10.76 10.76 0 0 0 2 12.4c-.11.39-.11.82 0 1.21C3.06 16.94 6.77 20 12 20a11.2 11.2 0 0 0 5.39-1.3"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M9.88 9.88a3 3 0 1 0 4.24 4.24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M3 3l18 18"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                </svg>
              ) : (
                <svg
                  className="llm-section__visibility-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M2 12s3.64-7 10-7s10 7 10 7s-3.64 7-10 7S2 12 2 12Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      </div>

      {shouldShowVerificationState ? (
        <div className={verificationClassName} role="status" aria-live="polite">
          {isVerifying ? (
            <>
              <LoadingSpinner size="small" />
              <span>{messages.settings.sections.llm.verifying}</span>
            </>
          ) : (
            <span>{verificationMessage}</span>
          )}
        </div>
      ) : (
        <p className="llm-section__hint">
          {isConfigComplete
            ? messages.settings.sections.llm.activeHint
            : messages.settings.sections.llm.inactiveHint}
        </p>
      )}
    </section>
  );
}
