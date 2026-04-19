'use client';

// 加载动画组件
// Requirements: 2.2
import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

/** 旋转加载指示器，支持三种尺寸 */
export function LoadingSpinner({ size = 'medium' }: LoadingSpinnerProps): React.JSX.Element {
  return (
    <div
      className={`loading-spinner loading-spinner--${size}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
