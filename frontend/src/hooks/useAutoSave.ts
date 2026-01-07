import { useEffect, useRef, useState, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  data: T | null;
  originalData: T | null | undefined;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook for auto-saving data with debouncing.
 * Compares current data with original data and triggers save after debounce period.
 */
export function useAutoSave<T>({
  data,
  originalData,
  onSave,
  debounceMs = 500,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // Clear status after showing "saved" briefly
  useEffect(() => {
    if (status === 'saved') {
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Debounced save effect
  useEffect(() => {
    if (!enabled || !data || originalData === undefined) {
      return;
    }

    const currentJson = JSON.stringify(data);
    const originalJson = JSON.stringify(originalData);

    // No changes from original
    if (currentJson === originalJson) {
      return;
    }

    // Already saved this exact state
    if (currentJson === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave(data);
        lastSavedRef.current = currentJson;
        setStatus('saved');
      } catch (error) {
        setStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, originalData, onSave, debounceMs, enabled]);

  // Manual save function (for immediate saves)
  const saveNow = useCallback(async () => {
    if (!data) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('saving');
    try {
      await onSave(data);
      lastSavedRef.current = JSON.stringify(data);
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      console.error('Manual save failed:', error);
    }
  }, [data, onSave]);

  return { status, saveNow };
}
