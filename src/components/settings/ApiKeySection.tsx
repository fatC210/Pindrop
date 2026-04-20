'use client';

// API Key 管理区域组件
// 处理 API key 输入、失焦保存、显示/隐藏和远程验证
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 3.6
import React, { useCallback, useState } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import type { ApiKeyErrorCode, VerificationResult } from './types';
import { validateApiKeyFormat, normalizeApiKey } from './apiKeyUtils';
import { clearApiKey, storeApiKey } from './preferencesStore';
import { LoadingSpinner } from './LoadingSpinner';
import './ApiKeySection.css';

export interface ApiKeySectionProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  onVerify: (apiKey: string) => Promise<void>;
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  error: ApiKeyErrorCode | null;
  compact?: boolean;
}

interface PendingApiKeyCommit {
  previousApiKey: string;
  nextApiKey: string;
}

/** API Key 管理区域：输入、显示/隐藏和远程验证 */
export function ApiKeySection({
  apiKey,
  onApiKeyChange,
  onVerify,
  isVerifying,
  verificationResult,
  error,
  compact = false,
}: ApiKeySectionProps): React.JSX.Element {
  const { messages } = useI18n();
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [pendingCommit, setPendingCommit] = useState<PendingApiKeyCommit | null>(null);
  const [validationError, setValidationError] = useState<ApiKeyErrorCode | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState<boolean>(false);

  const hasLocalChanges = draftValue !== null;
  const pendingInputValue =
    pendingCommit != null && apiKey === pendingCommit.previousApiKey
      ? pendingCommit.nextApiKey
      : null;
  const inputValue = draftValue ?? pendingInputValue ?? apiKey;
  const hasInputValue = normalizeApiKey(inputValue).length > 0;

  const isApiKeyVisibleInInput = hasInputValue && isApiKeyVisible;

  // 处理输入变化，只更新草稿值并隐藏旧的错误/验证结果
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setDraftValue(event.target.value);
      setPendingCommit(null);
      setValidationError(null);
    },
    [],
  );

  const handleVisibilityToggle = useCallback((): void => {
    setIsApiKeyVisible((current) => !current);
  }, []);

  const commitInputValue = useCallback(
    (rawValue: string): void => {
      const normalizedValue = normalizeApiKey(rawValue);

      if (!normalizedValue) {
        clearApiKey();
        onApiKeyChange('');
        setDraftValue(null);
        setPendingCommit({
          previousApiKey: apiKey,
          nextApiKey: '',
        });
        setValidationError(null);
        return;
      }

      const validationResult = validateApiKeyFormat(normalizedValue);
      if (!validationResult.isValid) {
        setValidationError(validationResult.error ?? 'INVALID_FORMAT');
        return;
      }

      if (normalizedValue === apiKey) {
        setDraftValue(null);
        setPendingCommit(null);
        setValidationError(null);
        return;
      }

      storeApiKey(normalizedValue);
      onApiKeyChange(normalizedValue);
      setDraftValue(null);
      setPendingCommit({
        previousApiKey: apiKey,
        nextApiKey: normalizedValue,
      });
      setValidationError(null);
      void onVerify(normalizedValue);
    },
    [apiKey, onApiKeyChange, onVerify],
  );

  // 失焦时自动保存并触发远程验证
  const handleInputBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>): void => {
      commitInputValue(event.currentTarget.value);
    },
    [commitInputValue],
  );

  const displayError = validationError ?? (hasLocalChanges ? null : error);
  const displayErrorMessage = displayError ? messages.apiKeyErrors[displayError] : null;
  const showVerifyingState = isVerifying && !hasLocalChanges;
  const visibleVerificationResult = !displayError && !hasLocalChanges ? verificationResult : null;

  return (
    <section
      className={`api-key-section${compact ? ' api-key-section--compact' : ''}`}
      aria-labelledby="api-key-section-header"
    >
      <h3 id="api-key-section-header" className="api-key-section__header">
        {messages.settings.sections.apiKey.header}
      </h3>

      <div className="api-key-section__input-wrapper">
        <input
          type={isApiKeyVisibleInInput ? 'text' : 'password'}
          className={`api-key-section__input${validationError ? ' api-key-section__input--invalid' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="sk-..."
          aria-label={messages.settings.sections.apiKey.inputAria}
          aria-invalid={!!displayErrorMessage}
          aria-describedby={displayErrorMessage ? 'api-key-error' : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {hasInputValue && (
          <button
            type="button"
            className="api-key-section__visibility-button"
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={handleVisibilityToggle}
              aria-pressed={isApiKeyVisibleInInput}
              aria-label={
                isApiKeyVisibleInInput
                  ? messages.settings.sections.apiKey.hide
                  : messages.settings.sections.apiKey.show
              }
              title={
                isApiKeyVisibleInInput
                  ? messages.settings.sections.apiKey.hide
                  : messages.settings.sections.apiKey.show
              }
            >
            {isApiKeyVisibleInInput ? (
              <svg
                className="api-key-section__visibility-icon"
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
                className="api-key-section__visibility-icon"
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
        )}
      </div>

      {showVerifyingState && (
        <div className="api-key-section__status" role="status" aria-live="polite">
          <LoadingSpinner size="small" />
          <span>{messages.settings.sections.apiKey.verifying}</span>
        </div>
      )}

      {/* 格式验证错误 */}
      {displayErrorMessage && (
        <div
          id="api-key-error"
          className="api-key-section__error"
          role="alert"
        >
          <span className="api-key-section__error-icon" aria-hidden="true">⚠️</span>
          <span>{displayErrorMessage}</span>
        </div>
      )}

      {/* 远程验证结果 */}
      {visibleVerificationResult && (
        <div
          className={`api-key-section__verification-result ${
            visibleVerificationResult.isValid
              ? 'api-key-section__verification-result--success'
              : 'api-key-section__verification-result--failure'
          }`}
          role="status"
          aria-live="polite"
        >
          {visibleVerificationResult.isValid
            ? `✅ ${messages.settings.sections.apiKey.valid}`
            : `❌ ${messages.apiKeyErrors[visibleVerificationResult.error ?? 'INVALID_OR_EXPIRED']}`}
        </div>
      )}
    </section>
  );
}
