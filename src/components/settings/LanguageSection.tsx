'use client';

import React, { useCallback } from 'react';

import { useI18n } from '@/i18n/I18nProvider';
import { APP_LOCALES, type AppLocale } from '@/i18n/types';
import './LanguageSection.css';

export interface LanguageSectionProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
}

export function LanguageSection({
  locale,
  onLanguageChange,
}: LanguageSectionProps): React.JSX.Element {
  const { messages } = useI18n();

  const handleSelect = useCallback(
    (nextLocale: AppLocale): void => {
      onLanguageChange(nextLocale);
    },
    [onLanguageChange]
  );

  return (
    <section className="language-section" aria-labelledby="language-section-header">
      <h3 id="language-section-header" className="language-section__header">
        {messages.settings.sections.language.header}
      </h3>

      <div className="language-section__setting-item">
        <span className="language-section__label" id="language-selector-label">
          {messages.settings.sections.language.label}
        </span>
        <div
          className="language-section__options"
          role="group"
          aria-labelledby="language-selector-label"
        >
          {APP_LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              className={`language-section__option${
                locale === option ? ' language-section__option--active' : ''
              }`}
              onClick={() => handleSelect(option)}
              aria-pressed={locale === option}
            >
              {messages.settings.sections.language.options[option]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
