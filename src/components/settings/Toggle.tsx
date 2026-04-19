'use client';

// 可复用的开关切换组件
// Requirements: 5.1, 5.3, 7.1, 7.3
import React, { useCallback } from 'react';
import './Toggle.css';

export interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** 无障碍开关组件，支持键盘操作和 ARIA 属性 */
export function Toggle({ id, checked, onChange, disabled = false }: ToggleProps): React.JSX.Element {
  const handleClick = useCallback((): void => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (disabled) return;

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        onChange(!checked);
      }
    },
    [checked, disabled, onChange],
  );

  return (
    <button
      id={id}
      type="button"
      className={`toggle${checked ? ' toggle--checked' : ''}${disabled ? ' toggle--disabled' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
    </button>
  );
}
