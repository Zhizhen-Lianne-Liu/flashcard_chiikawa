export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  context: string | null;
  notes: string | null;
  audio_path: string | null;
  image_path: string | null;
  created_at: number;
  updated_at: number;
  archived: boolean;
}

export interface NewCard {
  deck_id: number;
  front: string;
  back: string;
  context?: string;
  notes?: string;
  audio_path?: string;
  image_path?: string;
}

export interface CardWithState extends Card {
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: number;
  last_reviewed_at: number | null;
  total_reviews: number;
  total_time_spent: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
  created_at: number;
}

export interface NewTag {
  name: string;
  color?: string;
}
