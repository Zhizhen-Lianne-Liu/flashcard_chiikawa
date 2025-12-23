import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Test IPC
  ping: () => ipcRenderer.invoke('ping'),

  // Deck operations
  decks: {
    getAll: () => ipcRenderer.invoke('decks:getAll'),
    create: (deck: any) => ipcRenderer.invoke('decks:create', deck),
    update: (id: number, deck: any) => ipcRenderer.invoke('decks:update', id, deck),
    delete: (id: number) => ipcRenderer.invoke('decks:delete', id),
  },

  // Card operations
  cards: {
    getByDeck: (deckId: number) => ipcRenderer.invoke('cards:getByDeck', deckId),
    getAll: () => ipcRenderer.invoke('cards:getAll'),
    create: (card: any) => ipcRenderer.invoke('cards:create', card),
    update: (id: number, card: any) => ipcRenderer.invoke('cards:update', id, card),
    delete: (id: number) => ipcRenderer.invoke('cards:delete', id),
  },

  // Review operations
  reviews: {
    getDue: () => ipcRenderer.invoke('reviews:getDue'),
    submit: (cardId: number, quality: number, timeSpent: number) =>
      ipcRenderer.invoke('reviews:submit', cardId, quality, timeSpent),
    getHistory: (cardId: number) => ipcRenderer.invoke('reviews:getHistory', cardId),
  },

  // Statistics operations
  stats: {
    getDaily: (startDate: number, endDate: number) =>
      ipcRenderer.invoke('stats:getDaily', startDate, endDate),
    getOverall: () => ipcRenderer.invoke('stats:getOverall'),
    getDeckSummary: (deckId: number) =>
      ipcRenderer.invoke('stats:getDeckSummary', deckId),
    getReviewHistory: (days: number) =>
      ipcRenderer.invoke('stats:getReviewHistory', days),
  },

  // Import/Export operations
  importExport: {
    importCSV: (deckId: number) => ipcRenderer.invoke('import:csv', deckId),
    exportCSV: (deckId: number) => ipcRenderer.invoke('export:csv', deckId),
  },

  // Tag operations
  tags: {
    getAll: () => ipcRenderer.invoke('tags:getAll'),
    getForCard: (cardId: number) => ipcRenderer.invoke('tags:getForCard', cardId),
    create: (tag: any) => ipcRenderer.invoke('tags:create', tag),
    delete: (id: number) => ipcRenderer.invoke('tags:delete', id),
    addToCard: (cardId: number, tagId: number) =>
      ipcRenderer.invoke('tags:addToCard', cardId, tagId),
    removeFromCard: (cardId: number, tagId: number) =>
      ipcRenderer.invoke('tags:removeFromCard', cardId, tagId),
  },
});
