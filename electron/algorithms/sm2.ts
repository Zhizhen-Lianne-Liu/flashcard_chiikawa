/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm
 * Main process version
 */

export interface CardState {
  easinessFactor: number;
  interval: number;
  repetitions: number;
  lastReviewedAt?: number;
}

export interface SM2Result extends CardState {
  nextReviewDate: number;
}

export function calculateSM2(
  currentState: CardState,
  quality: number
): SM2Result {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  const now = Date.now();
  let { easinessFactor, interval, repetitions } = currentState;

  // Calculate new easiness factor
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Enforce minimum easiness factor of 1.3
  if (easinessFactor < 1.3) {
    easinessFactor = 1.3;
  }

  // Determine new interval and repetitions
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
  }

  const nextReviewDate = now + (interval * 24 * 60 * 60 * 1000);

  return {
    easinessFactor,
    interval,
    repetitions,
    lastReviewedAt: now,
    nextReviewDate,
  };
}
