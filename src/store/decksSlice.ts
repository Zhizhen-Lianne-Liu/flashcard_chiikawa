import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Deck, NewDeck } from '../types/deck';

interface DecksState {
  decks: Deck[];
  loading: boolean;
  error: string | null;
  selectedDeckId: number | null;
}

const initialState: DecksState = {
  decks: [],
  loading: false,
  error: null,
  selectedDeckId: null,
};

// Async thunks
export const fetchDecks = createAsyncThunk('decks/fetchAll', async () => {
  const decks = await window.electronAPI.decks.getAll();
  return decks;
});

export const createDeck = createAsyncThunk(
  'decks/create',
  async (deck: NewDeck) => {
    const newDeck = await window.electronAPI.decks.create(deck);
    return newDeck;
  }
);

export const updateDeck = createAsyncThunk(
  'decks/update',
  async ({ id, deck }: { id: number; deck: Partial<NewDeck> }) => {
    const updated = await window.electronAPI.decks.update(id, deck);
    return updated;
  }
);

export const deleteDeck = createAsyncThunk(
  'decks/delete',
  async (id: number) => {
    await window.electronAPI.decks.delete(id);
    return id;
  }
);

const decksSlice = createSlice({
  name: 'decks',
  initialState,
  reducers: {
    setSelectedDeck: (state, action: PayloadAction<number | null>) => {
      state.selectedDeckId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch decks
      .addCase(fetchDecks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDecks.fulfilled, (state, action) => {
        state.loading = false;
        state.decks = action.payload;
      })
      .addCase(fetchDecks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch decks';
      })
      // Create deck
      .addCase(createDeck.fulfilled, (state, action) => {
        state.decks.push(action.payload);
      })
      .addCase(createDeck.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create deck';
      })
      // Update deck
      .addCase(updateDeck.fulfilled, (state, action) => {
        const index = state.decks.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.decks[index] = action.payload;
        }
      })
      .addCase(updateDeck.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update deck';
      })
      // Delete deck
      .addCase(deleteDeck.fulfilled, (state, action) => {
        state.decks = state.decks.filter((d) => d.id !== action.payload);
        if (state.selectedDeckId === action.payload) {
          state.selectedDeckId = null;
        }
      })
      .addCase(deleteDeck.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete deck';
      });
  },
});

export const { setSelectedDeck, clearError } = decksSlice.actions;
export default decksSlice.reducer;
