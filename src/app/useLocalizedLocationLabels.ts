'use client';

import { useEffect, useMemo, useState } from 'react';

import type { SessionLocationEntry } from '@/hooks/useSoundscapeSession';
import type { AppLocale } from '@/i18n/types';
import {
  getLocalizedPlaceName,
  type LocalizedPlaceName,
} from '@/utils/nominatim';

export function useLocalizedLocationLabels(
  entries: SessionLocationEntry[],
  locale: AppLocale
): Record<string, LocalizedPlaceName> {
  const [localizedLabels, setLocalizedLabels] = useState<Record<string, LocalizedPlaceName>>({});

  const lookupEntries = useMemo(
    () =>
      entries
        .filter((entry) => (entry.displayLocale ?? locale) !== 'en')
        .map(({ id, coordinates, displayLocale }) => ({
          id,
          coordinates,
          locale: displayLocale ?? locale,
        })),
    [entries, locale]
  );
  const lookupKey = useMemo(
    () =>
      lookupEntries
        .map(
          ({ id, coordinates, locale: entryLocale }) =>
            `${id}:${entryLocale}:${coordinates[0].toFixed(4)},${coordinates[1].toFixed(4)}`
        )
        .join('|'),
    [lookupEntries]
  );

  useEffect(() => {
    let cancelled = false;

    if (lookupEntries.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const resolvedLabels = await Promise.all(
        lookupEntries.map(async ({ id, coordinates, locale: entryLocale }) => {
          const localizedLabel = await getLocalizedPlaceName(
            coordinates[0],
            coordinates[1],
            entryLocale
          );

          return localizedLabel ? ([id, localizedLabel] as const) : null;
        })
      );

      if (cancelled) {
        return;
      }

      const nextLabels: Record<string, LocalizedPlaceName> = {};
      for (const resolvedLabel of resolvedLabels) {
        if (resolvedLabel) {
          nextLabels[resolvedLabel[0]] = resolvedLabel[1];
        }
      }

      setLocalizedLabels(nextLabels);
    })();

    return () => {
      cancelled = true;
    };
  }, [lookupEntries, lookupKey]);

  return useMemo(() => {
    if (lookupEntries.length === 0) {
      return {};
    }

    const activeEntryIds = new Set(lookupEntries.map(({ id }) => id));
    const activeLabels: Record<string, LocalizedPlaceName> = {};

    for (const [id, label] of Object.entries(localizedLabels)) {
      if (activeEntryIds.has(id)) {
        activeLabels[id] = label;
      }
    }

    return activeLabels;
  }, [localizedLabels, lookupEntries]);
}
