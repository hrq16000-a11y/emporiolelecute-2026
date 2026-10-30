import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Persisted per-user preference stored in the `user_preferences` table,
 * mirrored to localStorage for instant first paint.
 * Survives logout and device changes because the source of truth is the DB.
 */
export function useUserPreference<T extends string>(key: string, fallback: T) {
  const localStorageKey = `pref:${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(localStorageKey);
      return (raw as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('value')
          .eq('key', key)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled && !error && data?.value != null) {
          const dbValue = data.value as T;
          setValue(dbValue);
          try { localStorage.setItem(localStorageKey, dbValue); } catch { /* ignore */ }
        }
      } catch {
        // offline or auth failure: keep the localStorage value
      }
    })();

    return () => { cancelled = true; };
  }, [key, localStorageKey]);

  const update = useCallback((next: T) => {
    setValue(next);
    try { localStorage.setItem(localStorageKey, next); } catch { /* ignore */ }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('user_preferences')
          .upsert(
            { user_id: user.id, key, value: next },
            { onConflict: 'user_id,key' },
          );
      } catch {
        // offline: DB write will be retried on next change
      }
    })();
  }, [key, localStorageKey]);

  return [value, update] as const;
}
