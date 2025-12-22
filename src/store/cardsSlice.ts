import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Card, NewCard } from '../types/card';

interface CardsState {
  cards: Card[];
  loading: boolean;
  error: string | null;
  filterDeckId: number | null;
}

const initialState: CardsState = {
  cards: [],
  loading: false,
  error: null,
  filterDeckId: null,
};

// Async thunks
export const fetchCardsByDeck = createAsyncThunk(
  'cards/fetchByDeck',
  async (deckId: number) => {
    const cards = await window.electronAPI.cards.getByDeck(deckId);
    return { cards, deckId };
  }
);

export const fetchAllCards = createAsyncThunk('cards/fetchAll', async () => {
  const cards = await window.electronAPI.cards.getAll();
  return cards;
});

export const createCard = createAsyncThunk(
  'cards/create',
  async (card: NewCard) => {
    const newCard = await window.electronAPI.cards.create(card);
    return newCard;
  }
);

export const updateCard = createAsyncThunk(
  'cards/update',
  async ({ id, card }: { id: number; card: Partial<NewCard> }) => {
    const updated = await window.electronAPI.cards.update(id, card);
    return updated;
  }
);

export const deleteCard = createAsyncThunk(
  'cards/delete',
  async (id: number) => {
    await window.electronAPI.cards.delete(id);
    return id;
  }
);

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    setFilterDeck: (state, action: PayloadAction<number | null>) => {
      state.filterDeckId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch by deck
      .addCase(fetchCardsByDeck.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCardsByDeck.fulfilled, (state, action) => {
        state.loading = false;
        state.cards = action.payload.cards;
        state.filterDeckId = action.payload.deckId;
      })
      .addCase(fetchCardsByDeck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cards';
      })
      // Fetch all
      .addCase(fetchAllCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCards.fulfilled, (state, action) => {
        state.loading = false;
        state.cards = action.payload;
        state.filterDeckId = null;
      })
      .addCase(fetchAllCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch cards';
      })
      // Create card
      .addCase(createCard.fulfilled, (state, action) => {
        state.cards.push(action.payload);
      })
      .addCase(createCard.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create card';
      })
      // Update card
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.cards.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
      })
      .addCase(updateCard.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update card';
      })
      // Delete card
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.cards = state.cards.filter((c) => c.id !== action.payload);
      })
      .addCase(deleteCard.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete card';
      });
  },
});

export const { setFilterDeck, clearError } = cardsSlice.actions;
export default cardsSlice.reducer;
