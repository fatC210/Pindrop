'use client';

// 加载动画组件
// Requirements: 2.2
import React from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

/** 旋转加载指示器，支持三种尺寸 */
export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps): React.JSX.Element {
  const { messages } = useI18n();

  return (
    <div
      className={`loading-spinner loading-spinner--${size}`}
      role="status"
      aria-label={messages.common.loading}
    >
      <span className="sr-only">{messages.common.loading}</span>
    </div>
  );
}
