'use client';

// 确认对话框组件
// Requirements: 9.2
import React, { useCallback, useEffect, useRef } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import './ConfirmationDialog.css';

export interface ConfirmationDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 模态确认对话框，包含焦点陷阱和键盘支持 */
export function ConfirmationDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): React.JSX.Element {
  const { messages } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 打开时聚焦取消按钮（更安全的默认选项）
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  // Escape 键关闭对话框 + 焦点陷阱
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      // 焦点陷阱：Tab 键在对话框内循环
      if (event.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab：从第一个元素跳到最后一个
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab：从最后一个元素跳到第一个
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      // 仅在点击遮罩层时关闭，不在点击对话框内容时关闭
      if (event.target === event.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <div
      className="confirmation-dialog-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
      >
        <h3 id="confirmation-dialog-title" className="confirmation-dialog__title">
          {title}
        </h3>
        <p id="confirmation-dialog-message" className="confirmation-dialog__message">
          {message}
        </p>
        <div className="confirmation-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="confirmation-dialog__button confirmation-dialog__button--cancel"
            onClick={onCancel}
          >
            {messages.common.cancel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="confirmation-dialog__button confirmation-dialog__button--confirm"
            onClick={onConfirm}
          >
            {messages.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
