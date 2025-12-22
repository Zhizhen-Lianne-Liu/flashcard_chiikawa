/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm
 *
 * This algorithm calculates the optimal review intervals for flashcards
 * based on the user's performance (quality rating).
 *
 * Quality ratings:
 * - 0: Complete blackout (didn't remember at all)
 * - 1: Incorrect response, but upon seeing the answer it felt familiar
 * - 2: Incorrect response, but upon seeing the answer it seemed easy to remember
 * - 3: Correct response, but with difficulty
 * - 4: Correct response, after some hesitation
 * - 5: Perfect response, immediate recall
 *
 * User-facing buttons map to these as:
 * - Again: 0-1 (quality 1)
 * - Hard: 2-3 (quality 3)
 * - Good: 4 (quality 4)
 * - Easy: 5 (quality 5)
 */

export interface CardState {
  easinessFactor: number;  // EF, starts at 2.5, minimum 1.3
  interval: number;        // Days until next review
  repetitions: number;     // Consecutive correct answers
  lastReviewedAt?: number; // Timestamp of last review
}

export interface SM2Result extends CardState {
  nextReviewDate: number;  // Timestamp (milliseconds)
}

/**
 * Calculate the next review parameters using the SM-2 algorithm
 *
 * @param currentState - Current card state (EF, interval, repetitions)
 * @param quality - Quality rating from 0-5
 * @returns New card state with next review date
 */
export function calculateSM2(
  currentState: CardState,
  quality: number
): SM2Result {
  // Validate quality is in range 0-5
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  const now = Date.now();

  // Start with current values
  let { easinessFactor, interval, repetitions } = currentState;

  // Calculate new easiness factor using SM-2 formula
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Enforce minimum easiness factor of 1.3
  if (easinessFactor < 1.3) {
    easinessFactor = 1.3;
  }

  // Determine new interval and repetitions based on quality
  if (quality < 3) {
    // Incorrect response - reset repetitions and set interval to 1 day
    repetitions = 0;
    interval = 1;
  } else {
    // Correct response - increment repetitions and calculate new interval
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      // For repetitions >= 3, multiply previous interval by EF
      interval = Math.round(interval * easinessFactor);
    }
  }

  // Calculate next review date (interval is in days)
  const nextReviewDate = now + (interval * 24 * 60 * 60 * 1000);

  return {
    easinessFactor,
    interval,
    repetitions,
    lastReviewedAt: now,
    nextReviewDate,
  };
}

/**
 * Map user-facing button choices to quality ratings
 * This provides a simpler interface for the UI
 */
export enum GradeButton {
  Again = 1,  // Quality 1 - complete failure
  Hard = 3,   // Quality 3 - correct with difficulty
  Good = 4,   // Quality 4 - correct with some hesitation
  Easy = 5,   // Quality 5 - perfect recall
}

/**
 * Helper function to calculate SM-2 from a button press
 */
export function calculateFromGrade(
  currentState: CardState,
  grade: GradeButton
): SM2Result {
  return calculateSM2(currentState, grade);
}
