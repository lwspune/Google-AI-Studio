
export type MasteryStatus = 'learning' | 'reviewing' | 'mastered';

export interface SRSData {
  status: MasteryStatus;
  interval: number; // in days
  easeFactor: number;
  nextReview: string; // ISO date string
  lastReview: string; // ISO date string
  repetition: number;
}

export interface UserProgress {
  [wordId: string]: SRSData;
}

/**
 * SuperMemo-2 Algorithm implementation
 * @param quality 0-5 (0: total blackout, 5: perfect response)
 * @param data current SRS data for the word
 * @returns updated SRS data
 */
export function calculateSRS(quality: number, data?: SRSData): SRSData {
  const now = new Date();
  
  // Default values for new words
  let {
    interval = 0,
    easeFactor = 2.5,
    repetition = 0,
    status = 'learning' as MasteryStatus
  } = data || {};

  if (quality >= 3) {
    // Correct response
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition++;
  } else {
    // Incorrect response
    repetition = 0;
    interval = 1;
  }

  // Update ease factor: EF = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Determine status
  if (repetition === 0) {
    status = 'learning';
  } else if (interval > 21) {
    status = 'mastered';
  } else {
    status = 'reviewing';
  }

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(now.getDate() + interval);

  return {
    status,
    interval,
    easeFactor,
    repetition,
    lastReview: now.toISOString(),
    nextReview: nextReviewDate.toISOString(),
  };
}

export function isDue(wordId: string, progress: UserProgress): boolean {
  const data = progress[wordId];
  if (!data) return true; // New words are always "due" if we want to introduce them
  return new Date(data.nextReview) <= new Date();
}
