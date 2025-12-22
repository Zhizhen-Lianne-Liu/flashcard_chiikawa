export interface DailyStatistic {
  date: number;
  cards_reviewed: number;
  time_spent: number;
  new_cards: number;
  average_quality: number;
  deck_breakdown: string; // JSON string of deck_id to count mapping
}

export interface OverallStatistics {
  totalCards: number;
  totalReviews: number;
  totalTimeSpent: number;
  dueToday: number;
  reviewedToday: number;
  currentStreak: number;
}

export interface DeckSummary {
  totalCards: number;
  totalReviews: number;
  totalTimeSpent: number;
  averageQuality: number;
  masteredCards: number;
}

export interface ReviewHistoryEntry {
  date: string;
  count: number;
  correct: number;
  avg_quality: number;
  total_time: number;
}
