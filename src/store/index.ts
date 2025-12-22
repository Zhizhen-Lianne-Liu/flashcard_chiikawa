import { configureStore } from '@reduxjs/toolkit';
import decksReducer from './decksSlice';
import cardsReducer from './cardsSlice';
import reviewReducer from './reviewSlice';

export const store = configureStore({
  reducer: {
    decks: decksReducer,
    cards: cardsReducer,
    review: reviewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
