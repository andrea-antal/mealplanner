import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Voice input states
 */
export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

/**
 * Voice input hook return type
 */
export interface UseVoiceInputReturn {
  /** Current state of voice input */
  state: VoiceInputState;
  /** Transcribed text (empty until transcription completes) */
  transcription: string;
  /** Error message if state is 'error' */
  error: string | null;
  /** Start listening for voice input */
  startListening: () => void;
  /** Stop listening and finalize transcription */
  stopListening: () => void;
  /** Reset state to idle */
  reset: () => void;
  /** Whether browser supports Web Speech API */
  isSupported: boolean;
}

/**
 * Custom hook for voice input using Web Speech API
 *
 * Browser Support:
 * - Chrome/Edge: Full support (desktop + mobile)
 * - Safari: Full support (desktop + mobile)
 * - Firefox: Limited support
 *
 * @returns Voice input controls and state
 *
 * @example
 * ```tsx
 * const { state, transcription, startListening, stopListening, isSupported } = useVoiceInput();
 *
 * if (!isSupported) {
 *   return <div>Voice input not supported in this browser</div>;
 * }
 *
 * return (
 *   <button onClick={state === 'listening' ? stopListening : startListening}>
 *     {state === 'listening' ? 'Stop' : 'Start'} Recording
 *   </button>
 * );
 * ```
 */
export function useVoiceInput(): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceInputState>('idle');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if browser supports Web Speech API
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input is not supported in this browser. Please use Chrome or Safari.');
      setState('error');
      return;
    }

    // Clear previous transcription and errors
    setTranscription('');
    setError(null);

    // Create recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;  // Keep listening until manually stopped
    recognition.interimResults = true;  // Show results in real-time as user speaks
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build transcription from both final and interim results
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Combine final and interim for live display
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      setTranscription(fullTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);

      let errorMessage = 'Voice input failed. Please try again.';
      if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again and speak clearly.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (event.error === 'network') {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      setError(errorMessage);
      setState('error');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Only set to idle if not already in error state
      setState(prev => prev === 'error' ? 'error' : 'idle');
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to start voice input. Please try again.');
      setState('error');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setState('processing');
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('idle');
    setTranscription('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    state,
    transcription,
    error,
    startListening,
    stopListening,
    reset,
    isSupported,
  };
}

// Type declarations for Web Speech API (for TypeScript)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
