import { WordEntry } from '../types/curriculum';

export type ValidationCategory =
  | 'exact'
  | 'common-mistake'
  | 'us-spelling'
  | 'suffix-rule'
  | 'letter-diagnostic'
  | 'empty';

export interface LetterFeedback {
  char: string;
  status: 'match' | 'close' | 'mismatch';
}

export interface ValidationResult {
  isCorrect: boolean;
  normalizedAttempt: string;
  category: ValidationCategory;
  feedback: string;
  letterFeedback?: LetterFeedback[];
}

function isUsCanadianSlip(attempt: string, target: string): boolean {
  // -our -> -or (e.g. colour/color, favourite/favorite, neighbour/neighbor, colourful/colorful)
  if (target.includes('our') && attempt === target.replace(/our/g, 'or')) {
    return true;
  }

  // -re -> -er (e.g. centre/center, metre/meter, theatre/theater, centimetre/centimeter)
  if (target.endsWith('re') && attempt === `${target.slice(0, -2)}er`) {
    return true;
  }

  // Doubled l -> single l before suffix (e.g. travelling/traveling, cancelled/canceled)
  if (
    target.includes('ll') &&
    (target.endsWith('ing') || target.endsWith('ed')) &&
    attempt === target.replace('ll', 'l')
  ) {
    return true;
  }

  // Canadian noun -ce vs US -se (e.g. licence/license)
  if (target.endsWith('ce') && attempt === `${target.slice(0, -2)}se`) {
    return true;
  }

  return false;
}

function detectForgottenSuffixRule(
  attempt: string,
  target: string
): string | null {
  // 1. Missing doubled consonant (e.g. hoping vs hopping, planed vs planned, swimer vs swimmer)
  const doubleConsonantMatch = target.match(/([bcdfghjklmnpqrstvwxyz])\1(ing|ed|er)$/);
  if (doubleConsonantMatch) {
    const singleVersion = target.replace(
      /([bcdfghjklmnpqrstvwxyz])\1(ing|ed|er)$/,
      '$1$2'
    );
    if (attempt === singleVersion) {
      return `Watch the 1-1-1 doubling rule! Double the "${doubleConsonantMatch[1]}" before adding -${doubleConsonantMatch[2]} to keep the vowel short.`;
    }
  }

  // 2. Un-dropped silent e (e.g. hikeing vs hiking, makeing vs making, smileed vs smiled)
  if (target.endsWith('ing') && attempt === `${target.slice(0, -3)}eing`) {
    return 'Remember to drop the silent e on the base word before adding the vowel suffix -ing!';
  }
  if (target.endsWith('ed') && attempt === `${target.slice(0, -2)}eed`) {
    return 'Remember to drop the silent e on the base word before adding -ed!';
  }

  // 3. Un-changed y-to-i (e.g. happyer vs happier, cryed vs cried, studyed vs studied)
  if (
    (target.endsWith('ied') || target.endsWith('ier')) &&
    attempt === target.replace(/i(ed|er)$/, 'y$1')
  ) {
    const suffix = target.endsWith('ied') ? '-ed' : '-er';
    return `Remember the y-to-i rule: change the final y to i before adding ${suffix}!`;
  }

  return null;
}

function buildLetterFeedback(
  attempt: string,
  target: string
): { letterFeedback: LetterFeedback[]; exactMatches: number } {
  const targetChars = target.split('');
  const attemptChars = attempt.split('');
  const letterFeedback: LetterFeedback[] = [];
  let exactMatches = 0;

  // Track remaining unmatched target characters for 'close' (wrong position) hints
  const remainingCounts: Record<string, number> = {};
  for (let i = 0; i < targetChars.length; i++) {
    if (attemptChars[i] !== targetChars[i]) {
      const ch = targetChars[i];
      remainingCounts[ch] = (remainingCounts[ch] ?? 0) + 1;
    }
  }

  for (let i = 0; i < attemptChars.length; i++) {
    const ch = attemptChars[i];
    if (i < targetChars.length && ch === targetChars[i]) {
      letterFeedback.push({ char: ch, status: 'match' });
      exactMatches += 1;
    } else if ((remainingCounts[ch] ?? 0) > 0) {
      letterFeedback.push({ char: ch, status: 'close' });
      remainingCounts[ch] -= 1;
    } else {
      letterFeedback.push({ char: ch, status: 'mismatch' });
    }
  }

  return { letterFeedback, exactMatches };
}

/**
 * Validates a student's spelling attempt against a WordEntry.
 * Trims whitespace, normalizes case, and runs diagnostic checks in priority order.
 */
export function validateSpellingAttempt(
  rawInput: string,
  entry: WordEntry
): ValidationResult {
  const normalizedAttempt = rawInput.trim().toLowerCase();
  const target = entry.word.trim().toLowerCase();

  if (!normalizedAttempt) {
    return {
      isCorrect: false,
      normalizedAttempt: '',
      category: 'empty',
      feedback: 'Type your spelling before testing the signal.',
    };
  }

  if (normalizedAttempt === target) {
    return {
      isCorrect: true,
      normalizedAttempt,
      category: 'exact',
      feedback: `Signal locked! "${entry.word}" is calibrated.`,
    };
  }

  // a. Check entry.commonMistakes first for an exact pedagogical match
  const normalizedMistakes: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry.commonMistakes)) {
    normalizedMistakes[k.trim().toLowerCase()] = v;
  }
  if (normalizedMistakes[normalizedAttempt]) {
    return {
      isCorrect: false,
      normalizedAttempt,
      category: 'common-mistake',
      feedback: normalizedMistakes[normalizedAttempt],
    };
  }

  // b. Detect US-to-Canadian spelling slips
  if (isUsCanadianSlip(normalizedAttempt, target)) {
    return {
      isCorrect: false,
      normalizedAttempt,
      category: 'us-spelling',
      feedback: 'Close! That is the US spelling—give it the Canadian touch!',
    };
  }

  // c. Detect forgotten suffix rules
  const suffixRuleHint = detectForgottenSuffixRule(normalizedAttempt, target);
  if (suffixRuleHint) {
    return {
      isCorrect: false,
      normalizedAttempt,
      category: 'suffix-rule',
      feedback: suffixRuleHint,
    };
  }

  // d. Highlight which letters match and which need attention without giving away the answer
  const { letterFeedback, exactMatches } = buildLetterFeedback(
    normalizedAttempt,
    target
  );
  const lengthNote =
    normalizedAttempt.length !== target.length
      ? ` (target has ${target.length} letters, you typed ${normalizedAttempt.length})`
      : '';

  return {
    isCorrect: false,
    normalizedAttempt,
    category: 'letter-diagnostic',
    feedback: `You matched ${exactMatches} of ${target.length} letters in the right spots${lengthNote}. Check the highlighted letters and try again!`,
    letterFeedback,
  };
}
