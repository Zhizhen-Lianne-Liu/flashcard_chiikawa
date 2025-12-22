import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Card } from '../types/card';
import { ReviewResult } from '../types/review';

interface ReviewState {
  dueCards: Card[];
  currentCardIndex: number;
  sessionStartTime: number | null;
  cardStartTime: number | null;
  results: ReviewResult[];
  loading: boolean;
  error: string | null;
  isSessionActive: boolean;
  showAnswer: boolean;
}

const initialState: ReviewState = {
  dueCards: [],
  currentCardIndex: 0,
  sessionStartTime: null,
  cardStartTime: null,
  results: [],
  loading: false,
  error: null,
  isSessionActive: false,
  showAnswer: false,
};

// Async thunks
export const fetchDueCards = createAsyncThunk('review/fetchDue', async () => {
  const cards = await window.electronAPI.reviews.getDue();
  return cards;
});

export const submitReview = createAsyncThunk(
  'review/submit',
  async ({
    cardId,
    quality,
    timeSpent,
  }: {
    cardId: number;
    quality: number;
    timeSpent: number;
  }) => {
    const result = await window.electronAPI.reviews.submit(
      cardId,
      quality,
      timeSpent
    );
    return result;
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    startSession: (state) => {
      state.isSessionActive = true;
      state.sessionStartTime = Date.now();
      state.cardStartTime = Date.now();
      state.currentCardIndex = 0;
      state.results = [];
      state.showAnswer = false;
    },
    endSession: (state) => {
      state.isSessionActive = false;
      state.sessionStartTime = null;
      state.cardStartTime = null;
      state.showAnswer = false;
    },
    toggleAnswer: (state) => {
      state.showAnswer = !state.showAnswer;
      if (!state.showAnswer && state.cardStartTime === null) {
        // Showing answer for first time
        state.cardStartTime = Date.now();
      }
    },
    nextCard: (state) => {
      if (state.currentCardIndex < state.dueCards.length - 1) {
        state.currentCardIndex += 1;
        state.showAnswer = false;
        state.cardStartTime = Date.now();
      }
    },
    resetCardTimer: (state) => {
      state.cardStartTime = Date.now();
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch due cards
      .addCase(fetchDueCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDueCards.fulfilled, (state, action) => {
        state.loading = false;
        state.dueCards = action.payload;
        state.currentCardIndex = 0;
      })
      .addCase(fetchDueCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch due cards';
      })
      // Submit review
      .addCase(submitReview.fulfilled, (state, action) => {
        state.results.push(action.payload);
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to submit review';
      });
  },
});

export const {
  startSession,
  endSession,
  toggleAnswer,
  nextCard,
  resetCardTimer,
  clearError,
} = reviewSlice.actions;

export default reviewSlice.reducer;
