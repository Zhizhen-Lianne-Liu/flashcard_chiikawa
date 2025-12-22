import { Deck, NewDeck } from './deck';
import { Card, NewCard, Tag, NewTag } from './card';
import { Review, ReviewResult } from './review';
import {
  DailyStatistic,
  OverallStatistics,
  DeckSummary,
  ReviewHistoryEntry,
} from './statistics';

export interface ElectronAPI {
  ping: () => Promise<string>;

  decks: {
    getAll: () => Promise<Deck[]>;
    create: (deck: NewDeck) => Promise<Deck>;
    update: (id: number, deck: Partial<NewDeck>) => Promise<Deck>;
    delete: (id: number) => Promise<void>;
  };

  cards: {
    getByDeck: (deckId: number) => Promise<Card[]>;
    getAll: () => Promise<Card[]>;
    create: (card: NewCard) => Promise<Card>;
    update: (id: number, card: Partial<NewCard>) => Promise<Card>;
    delete: (id: number) => Promise<void>;
  };

  reviews: {
    getDue: () => Promise<Card[]>;
    submit: (
      cardId: number,
      quality: number,
      timeSpent: number
    ) => Promise<ReviewResult>;
    getHistory: (cardId: number) => Promise<Review[]>;
  };

  stats: {
    getDaily: (startDate: number, endDate: number) => Promise<DailyStatistic[]>;
    getOverall: () => Promise<OverallStatistics>;
    getDeckSummary: (deckId: number) => Promise<DeckSummary>;
    getReviewHistory: (days: number) => Promise<ReviewHistoryEntry[]>;
  };

  importExport: {
    importCSV: (filePath: string, deckId: number) => Promise<{ count: number }>;
    exportCSV: (deckId: number, filePath: string) => Promise<void>;
  };

  tags: {
    getAll: () => Promise<Tag[]>;
    getForCard: (cardId: number) => Promise<Tag[]>;
    create: (tag: NewTag) => Promise<Tag>;
    delete: (id: number) => Promise<void>;
    addToCard: (cardId: number, tagId: number) => Promise<void>;
    removeFromCard: (cardId: number, tagId: number) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
