export interface Deck {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: number;
  updated_at: number;
  archived: boolean;
  cardCount?: number;
  dueCount?: number;
  newCount?: number;
}

export interface NewDeck {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface DeckWithCardCount extends Deck {
  cardCount: number;
  dueCount: number;
  newCount: number;
}
