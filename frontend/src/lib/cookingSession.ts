/**
 * Cooking session state management with localStorage persistence.
 * Tracks current step, checked ingredients, and timer states
 * to survive page reloads during cooking.
 */

import type { TimerInstance } from '@/components/cooking/CookingTimer';

const STORAGE_KEY_PREFIX = 'cook_session_';
const STEPS_CACHE_PREFIX = 'cook_steps_';

export interface CookingSession {
  recipeId: string;
  currentStep: number;
  checkedIngredients: string[];
  timers: TimerInstance[];
  phase: 'prep' | 'cooking' | 'done';
  startedAt: string;
}

function getKey(recipeId: string): string {
  return STORAGE_KEY_PREFIX + recipeId;
}

export function loadSession(recipeId: string): CookingSession | null {
  try {
    const raw = localStorage.getItem(getKey(recipeId));
    if (!raw) return null;
    const session = JSON.parse(raw) as CookingSession;
    // Pause all timers on reload (they can't tick while page was closed)
    session.timers = session.timers.map((t) => ({ ...t, isRunning: false }));
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: CookingSession): void {
  try {
    localStorage.setItem(getKey(session.recipeId), JSON.stringify(session));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearSession(recipeId: string): void {
  try {
    localStorage.removeItem(getKey(recipeId));
  } catch {
    // ignore
  }
}

export function createSession(recipeId: string): CookingSession {
  return {
    recipeId,
    currentStep: 0,
    checkedIngredients: [],
    timers: [],
    phase: 'prep',
    startedAt: new Date().toISOString(),
  };
}

// ── Cooking Steps Cache ─────────────────────────────────────────────

function getStepsKey(recipeId: string): string {
  return STEPS_CACHE_PREFIX + recipeId;
}

export function loadCachedSteps(recipeId: string): { equipment: string[]; steps: unknown[] } | null {
  try {
    const raw = localStorage.getItem(getStepsKey(recipeId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCachedSteps(recipeId: string, steps: { equipment: string[]; steps: unknown[] }): void {
  try {
    localStorage.setItem(getStepsKey(recipeId), JSON.stringify(steps));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearCachedSteps(recipeId: string): void {
  try {
    localStorage.removeItem(getStepsKey(recipeId));
  } catch {
    // ignore
  }
}

// ── Multi-Cook Session ──────────────────────────────────────────────

const MULTI_SESSION_KEY = 'cook_multi_session';

export interface MultiCookSession {
  recipeIds: string[];
  currentStepIndex: number;
  checkedIngredients: string[];
  timers: TimerInstance[];
  phase: 'prep' | 'cooking' | 'done';
  startedAt: string;
  targetServeTime: string | null;
}

export function loadMultiSession(): MultiCookSession | null {
  try {
    const raw = localStorage.getItem(MULTI_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MultiCookSession;
    session.timers = session.timers.map((t) => ({ ...t, isRunning: false }));
    return session;
  } catch {
    return null;
  }
}

export function saveMultiSession(session: MultiCookSession): void {
  try {
    localStorage.setItem(MULTI_SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearMultiSession(): void {
  try {
    localStorage.removeItem(MULTI_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function createMultiSession(recipeIds: string[], targetServeTime: string | null): MultiCookSession {
  return {
    recipeIds,
    currentStepIndex: 0,
    checkedIngredients: [],
    timers: [],
    phase: 'prep',
    startedAt: new Date().toISOString(),
    targetServeTime,
  };
}

// ── Active Session Detection ────────────────────────────────────────

export function getActiveSessions(): { recipeId: string; startedAt: string }[] {
  const sessions: { recipeId: string; startedAt: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const session = JSON.parse(raw) as CookingSession;
          if (session.phase !== 'done') {
            sessions.push({ recipeId: session.recipeId, startedAt: session.startedAt });
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return sessions;
}
