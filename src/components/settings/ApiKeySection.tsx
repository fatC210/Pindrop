'use client';

// API Key 管理区域组件
// 处理 API key 输入、格式验证、掩码显示和远程验证
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 3.6
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import type { VerificationResult } from './types';
import { validateApiKeyFormat, maskApiKey } from './apiKeyUtils';
import { storeApiKey } from './preferencesStore';
import { LoadingSpinner } from './LoadingSpinner';
import './ApiKeySection.css';

export interface ApiKeySectionProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  onVerify: () => Promise<void>;
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  error: string | null;
}

/** API Key 管理区域：输入、验证、掩码显示和远程验证 */
export function ApiKeySection({
  apiKey,
  onApiKeyChange,
  onVerify,
  isVerifying,
  verificationResult,
  error,
}: ApiKeySectionProps): React.JSX.Element {
  const [isEditingOverride, setIsEditingOverride] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = isEditingOverride ?? !apiKey;

  // 清理防抖定时器
  useEffect(() => {
    return (): void => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 处理输入变化，带 500ms 防抖验证
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setInputValue(value);

      // 清除之前的防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 空值时清除错误
      if (!value) {
        setValidationError(null);
        return;
      }

      // 500ms 防抖验证
      debounceTimerRef.current = setTimeout(() => {
        const result = validateApiKeyFormat(value);
        if (result.isValid) {
          setValidationError(null);
          // 格式有效时保存到 localStorage
          storeApiKey(value);
          onApiKeyChange(value);
        } else {
          setValidationError(result.error ?? 'Invalid API Key format');
        }
      }, 500);
    },
    [onApiKeyChange],
  );

  // 切换编辑模式
  const handleEditClick = useCallback((): void => {
    if (isEditing) {
      // 退出编辑模式
      setIsEditingOverride(null);
      setInputValue('');
      setValidationError(null);
    } else {
      // 进入编辑模式
      setIsEditingOverride(true);
      setInputValue(apiKey);
      // 聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, apiKey]);

  // 处理验证按钮点击
  const handleVerifyClick = useCallback((): void => {
    void onVerify();
  }, [onVerify]);

  // 判断当前输入格式是否有效（用于禁用验证按钮）
  const isFormatValid = apiKey ? validateApiKeyFormat(apiKey).isValid : false;
  const displayError = validationError ?? error;
  const hasInput = isEditing ? inputValue.length > 0 : apiKey.length > 0;

  // 缓存掩码结果，避免每次渲染重新计算
  const maskedApiKey = useMemo(() => maskApiKey(apiKey), [apiKey]);

  return (
    <section className="api-key-section" aria-labelledby="api-key-section-header">
      <h3 id="api-key-section-header" className="api-key-section__header">
        API Key
      </h3>

      <div className="api-key-section__input-row">
        {isEditing ? (
          <div className="api-key-section__input-wrapper">
            <input
              ref={inputRef}
              type="password"
              className={`api-key-section__input${validationError ? ' api-key-section__input--invalid' : ''}`}
              value={inputValue}
              onChange={handleInputChange}
              placeholder="xi-..."
              aria-label="ElevenLabs API Key"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'api-key-error' : undefined}
              autoComplete="off"
            />
          </div>
        ) : (
          <div className="api-key-section__masked" aria-label="Masked API Key">
            {apiKey ? maskedApiKey : 'No API key set'}
          </div>
        )}

        <button
          type="button"
          className="api-key-section__edit-button"
          onClick={handleEditClick}
          aria-label={isEditing ? 'Cancel editing' : 'Edit API key'}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* 验证按钮和状态 */}
      {hasInput && (
        <div className="api-key-section__actions">
          <button
            type="button"
            className="api-key-section__verify-button"
            onClick={handleVerifyClick}
            disabled={!isFormatValid || isVerifying}
            aria-label="Verify API key"
          >
            {isVerifying ? (
              <>
                <LoadingSpinner size="small" />
                Verifying...
              </>
            ) : (
              'Verify Key'
            )}
          </button>
        </div>
      )}

      {/* 格式验证错误 */}
      {displayError && (
        <div
          id="api-key-error"
          className="api-key-section__error"
          role="alert"
        >
          <span className="api-key-section__error-icon" aria-hidden="true">⚠️</span>
          <span>{displayError}</span>
        </div>
      )}

      {/* 远程验证结果 */}
      {verificationResult && !displayError && (
        <div
          className={`api-key-section__verification-result ${
            verificationResult.isValid
              ? 'api-key-section__verification-result--success'
              : 'api-key-section__verification-result--failure'
          }`}
          role="status"
          aria-live="polite"
        >
          {verificationResult.isValid
            ? '✅ Key valid'
            : `❌ ${verificationResult.error ?? 'Key invalid or expired'}`}
        </div>
      )}
    </section>
  );
}
