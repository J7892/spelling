export type SoundEffect = 'keystroke' | 'success' | 'hint' | 'towerComplete';

let audioCtx: AudioContext | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;
let isMutedState = false;
let activeSpeechToken = 0;
let pendingPauseTimer: ReturnType<typeof setTimeout> | null = null;

function pickPreferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const priorities = ['en-CA', 'en_CA', 'en-GB', 'en_GB', 'en-US', 'en_US'];
  for (const tag of priorities) {
    const exact = voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
  }

  const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  return anyEnglish ?? voices[0];
}

function ensureVoicesLoaded(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (voicesInitialized) return;

  const synth = window.speechSynthesis;
  const load = () => {
    const voices = synth.getVoices();
    if (voices.length > 0) {
      cachedVoice = pickPreferredVoice(voices);
    }
  };

  load();
  if ('onvoiceschanged' in synth) {
    synth.onvoiceschanged = load;
  }
  voicesInitialized = true;
}

export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isMuted(): boolean {
  return isMutedState;
}

export function setMuted(muted: boolean): void {
  isMutedState = muted;
  if (muted) {
    cancelSpeech();
  }
}

export function cancelSpeech(): void {
  activeSpeechToken += 1;
  if (pendingPauseTimer !== null) {
    clearTimeout(pendingPauseTimer);
    pendingPauseTimer = null;
  }
  if (isTtsAvailable()) {
    window.speechSynthesis.cancel();
  }
}

function createUtterance(text: string): SpeechSynthesisUtterance {
  ensureVoicesLoaded();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = cachedVoice?.lang ?? 'en-CA';
  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  return utterance;
}

/**
 * Speaks a single word at 0.9x rate using an en-CA (or fallback) voice.
 * Returns true if speech was triggered, false if muted or unavailable.
 */
export function speakWord(word: string): boolean {
  if (isMutedState || !isTtsAvailable() || !word.trim()) {
    return false;
  }

  cancelSpeech();
  const utterance = createUtterance(word.trim());
  window.speechSynthesis.speak(utterance);
  return true;
}

/**
 * Speaks a sentence at 0.9x rate, adding a subtle pause around targetWord
 * when provided so Grade 3 learners can hear it clearly in context.
 */
export function speakSentence(sentence: string, targetWord?: string): boolean {
  if (isMutedState || !isTtsAvailable() || !sentence.trim()) {
    return false;
  }

  cancelSpeech();
  const token = activeSpeechToken;

  if (!targetWord || !targetWord.trim()) {
    window.speechSynthesis.speak(createUtterance(sentence.trim()));
    return true;
  }

  const escaped = targetWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\b${escaped}\\b)`, 'i');
  const parts = sentence.split(regex).filter((p) => p.length > 0);

  if (parts.length <= 1) {
    window.speechSynthesis.speak(createUtterance(sentence.trim()));
    return true;
  }

  const speakPartAt = (index: number) => {
    if (token !== activeSpeechToken || isMutedState || index >= parts.length) {
      return;
    }

    const part = parts[index].trim();
    if (!part) {
      speakPartAt(index + 1);
      return;
    }

    const utterance = createUtterance(part);
    const isTarget = part.toLowerCase() === targetWord.trim().toLowerCase();
    const nextIsTarget =
      index + 1 < parts.length &&
      parts[index + 1].trim().toLowerCase() === targetWord.trim().toLowerCase();

    utterance.onend = () => {
      if (token !== activeSpeechToken || isMutedState) return;
      const pauseMs = isTarget || nextIsTarget ? 220 : 40;
      pendingPauseTimer = setTimeout(() => {
        pendingPauseTimer = null;
        speakPartAt(index + 1);
      }, pauseMs);
    };

    window.speechSynthesis.speak(utterance);
  };

  speakPartAt(0);
  return true;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  peakGain: number
): void {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/**
 * Plays synthesized mechanical ticks and warm chimes via Web Audio API.
 * Lazily initializes AudioContext on first user interaction.
 */
export function playSound(effect: SoundEffect): void {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (effect) {
    case 'keystroke': {
      // Subtle mechanical brass/typewriter tick
      playTone(ctx, 920, 0, 0.028, 'triangle', 0.045);
      playTone(ctx, 260, 0, 0.02, 'sine', 0.03);
      break;
    }
    case 'success': {
      // Warm ascending relay chime
      playTone(ctx, 523.25, 0, 0.16, 'sine', 0.12); // C5
      playTone(ctx, 659.25, 0.09, 0.2, 'sine', 0.12); // E5
      playTone(ctx, 783.99, 0.18, 0.28, 'triangle', 0.1); // G5
      break;
    }
    case 'hint': {
      // Gentle workshop nudge
      playTone(ctx, 440, 0, 0.15, 'sine', 0.09); // A4
      playTone(ctx, 392, 0.11, 0.22, 'sine', 0.08); // G4
      break;
    }
    case 'towerComplete': {
      // Celebratory 4-note tower beacon arpeggio
      playTone(ctx, 523.25, 0, 0.18, 'triangle', 0.12); // C5
      playTone(ctx, 659.25, 0.11, 0.18, 'triangle', 0.12); // E5
      playTone(ctx, 783.99, 0.22, 0.2, 'triangle', 0.12); // G5
      playTone(ctx, 1046.5, 0.34, 0.42, 'sine', 0.14); // C6
      break;
    }
  }
}
