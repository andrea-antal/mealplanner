/**
 * Cooking session state management with localStorage persistence.
 * Tracks current step, checked ingredients, and timer states
 * to survive page reloads during cooking.
 */

import type { TimerInstance } from '@/components/cooking/CookingTimer';

const STORAGE_KEY_PREFIX = 'cook_session_';

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
