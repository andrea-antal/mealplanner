import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';

interface TimerInstance {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

interface CookingTimerProps {
  timers: TimerInstance[];
  onUpdateTimers: (timers: TimerInstance[]) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    // Beep pattern: 3 short beeps
    setTimeout(() => { gain.gain.value = 0; }, 200);
    setTimeout(() => { gain.gain.value = 0.3; }, 400);
    setTimeout(() => { gain.gain.value = 0; }, 600);
    setTimeout(() => { gain.gain.value = 0.3; }, 800);
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 1000);
  } catch (e) {
    // Web Audio API not available
  }
}

function SingleTimer({
  timer,
  onToggle,
  onReset,
  onRemove,
}: {
  timer: TimerInstance;
  onToggle: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const progress = timer.totalSeconds > 0
    ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
    : 0;
  const isDone = timer.remainingSeconds <= 0;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${isDone ? 'border-primary bg-primary/5 animate-pulse' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground truncate mr-2">{timer.label}</span>
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="text-center">
        <span className={`font-mono text-3xl font-bold ${isDone ? 'text-primary' : ''}`}>
          {isDone ? 'Done!' : formatTime(timer.remainingSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onToggle}
          variant={timer.isRunning ? 'outline' : 'default'}
          size="sm"
          className="flex-1"
          disabled={isDone}
        >
          {timer.isRunning ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Start</>}
        </Button>
        <Button onClick={onReset} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CookingTimer({ timers, onUpdateTimers }: CookingTimerProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef(timers);
  timersRef.current = timers;

  const tick = useCallback(() => {
    const updated = timersRef.current.map((t) => {
      if (!t.isRunning || t.remainingSeconds <= 0) return t;
      const next = { ...t, remainingSeconds: t.remainingSeconds - 1 };
      if (next.remainingSeconds <= 0) {
        next.isRunning = false;
        playBeep();
      }
      return next;
    });
    onUpdateTimers(updated);
  }, [onUpdateTimers]);

  useEffect(() => {
    const hasRunning = timers.some((t) => t.isRunning && t.remainingSeconds > 0);
    if (hasRunning) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timers, tick]);

  const toggleTimer = (id: string) => {
    onUpdateTimers(
      timers.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const resetTimer = (id: string) => {
    onUpdateTimers(
      timers.map((t) =>
        t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false } : t
      )
    );
  };

  const removeTimer = (id: string) => {
    onUpdateTimers(timers.filter((t) => t.id !== id));
  };

  if (timers.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-sm flex items-center gap-2 text-muted-foreground">
        <Timer className="h-4 w-4" />
        Active Timers
      </h3>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {timers.map((timer) => (
          <SingleTimer
            key={timer.id}
            timer={timer}
            onToggle={() => toggleTimer(timer.id)}
            onReset={() => resetTimer(timer.id)}
            onRemove={() => removeTimer(timer.id)}
          />
        ))}
      </div>
    </div>
  );
}

export type { TimerInstance };
