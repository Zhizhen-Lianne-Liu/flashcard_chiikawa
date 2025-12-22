export interface Review {
  id: number;
  card_id: number;
  reviewed_at: number;
  quality: number; // 0-5 rating
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: number;
  time_spent: number | null; // milliseconds
}

export interface CardState {
  card_id: number;
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: number;
  last_reviewed_at: number | null;
  total_reviews: number;
  total_time_spent: number; // milliseconds
  created_at: number;
}

export interface SM2Result {
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: Date;
}

export interface ReviewSession {
  cards: number[];
  currentIndex: number;
  startTime: number;
  completedCards: number[];
  results: ReviewResult[];
}

export interface ReviewResult {
  card_id: number;
  quality: number;
  time_spent: number;
  was_correct: boolean;
}

export interface ReviewSummary {
  total_cards: number;
  correct_cards: number;
  average_quality: number;
  total_time: number; // milliseconds
  date: number;
}
