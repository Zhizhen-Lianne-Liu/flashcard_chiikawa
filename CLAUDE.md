# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flashcard Chiikawa is an Electron-based desktop flashcard application for German learning with spaced repetition (SM-2 algorithm). Built with React + TypeScript + SQLite.

## Development Commands

### Running the App
```bash
npm run dev              # Run both Vite dev server and Electron
npm run dev:vite         # Run Vite dev server only (port 5173)
npm run dev:electron     # Compile Electron TS and run app
```

### Building
```bash
npm run build            # Build both renderer and main process
npm run build:vite       # Build React app with Vite
npm run build:electron   # Compile Electron TypeScript
```

### Packaging
```bash
npm run package          # Build and package for current platform
npm run package:mac      # Package for macOS (dmg, zip)
npm run package:win      # Package for Windows (nsis, zip)
npm run package:linux    # Package for Linux (AppImage, deb)
```

### Testing
```bash
npm test                 # Run Vitest tests
```

### Native Module Rebuild
If you encounter `better-sqlite3` native module errors after updating Electron:
```bash
npx @electron/rebuild
```

## Architecture Overview

### Electron Multi-Process Architecture

**Main Process** (`electron/main.ts`):
- Window management and app lifecycle
- SQLite database operations (synchronous via better-sqlite3)
- IPC handlers for all data operations
- Database initialization and migrations

**Preload Script** (`electron/preload.ts`):
- Exposes IPC methods via `contextBridge` as `window.electronAPI`
- No `nodeIntegration` - security best practice
- Type-safe channel definitions

**Renderer Process** (`src/`):
- React app with Redux Toolkit state management
- Communicates with main process via IPC
- No direct database access

### Database Architecture

**Location**: `~/Library/Application Support/flashcard-chiikawa/flashcard_chiikawa.db` (macOS)

**Migration System**: `electron/database/db.ts` contains versioned migrations. Schema version tracked in `schema_version` table.

**Key Tables**:
- `decks` - Flashcard decks with metadata
- `cards` - Individual flashcards with front/back/context/notes
- `card_states` - Current SM-2 state (easiness_factor, interval, repetitions, next_review_date)
- `reviews` - Historical review records
- `tags` & `card_tags` - Tag system for organizing cards
- `daily_statistics` - Aggregated stats per day

**Important**: When a card is created, a corresponding `card_states` row MUST be created with default SM-2 values (easiness_factor: 2.5, interval: 0, repetitions: 0).

### IPC Communication Pattern

All database operations follow this pattern:

1. Renderer calls `window.electronAPI.{namespace}.{method}()`
2. IPC invocation defined in `electron/preload.ts`
3. Handler in `electron/main.ts` executes database query
4. Result returned to renderer

Example:
```typescript
// Renderer
const cards = await window.electronAPI.cards.getByDeck(deckId);

// Preload
cards: {
  getByDeck: (deckId: number) => ipcRenderer.invoke('cards:getByDeck', deckId)
}

// Main
ipcMain.handle('cards:getByDeck', (_, deckId) => {
  return db.prepare('SELECT * FROM cards WHERE deck_id = ?').all(deckId);
});
```

### State Management

Redux Toolkit slices in `src/store/`:
- `decksSlice` - Deck CRUD operations
- `cardsSlice` - Card CRUD operations
- `reviewSlice` - Review session state (current card, results, timing)

All async operations use `createAsyncThunk` which calls IPC methods.

### Spaced Repetition (SM-2 Algorithm)

**Status**: ✅ Fully implemented in `electron/algorithms/sm2.ts` (main process) and `src/algorithms/sm2.ts` (renderer).

**Implementation**: The `reviews:submit` IPC handler in `electron/main.ts` uses `calculateSM2()` to compute new card states based on user grading (quality 0-5).

**Formula**:
```
EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
EF_min = 1.3

If quality < 3:
  interval = 1, repetitions = 0
Else:
  repetitions++
  If repetitions == 1: interval = 1
  If repetitions == 2: interval = 6
  Else: interval = previous_interval * EF
```

**Quality Ratings**: User-facing buttons map to quality values:
- Again: 1 (complete failure, reset to 1 day)
- Hard: 3 (correct with difficulty)
- Good: 4 (correct with slight hesitation)
- Easy: 5 (perfect immediate recall)

**Review Queue**: Cards where `card_states.next_review_date <= Date.now()`, ordered by priority (overdue → new cards → due today).

## Code Patterns & Conventions

### TypeScript Configuration

- Main process uses `tsconfig.electron.json` (module: nodenext, outDir: dist-electron)
- Renderer uses `tsconfig.json` (ESNext modules, noEmit for Vite)
- Shared types in `src/types/`

### Adding New IPC Channels

1. Define handler in `electron/main.ts` setupIPCHandlers()
2. Add to contextBridge in `electron/preload.ts`
3. Add TypeScript types to `src/types/window.d.ts` ElectronAPI interface
4. Call from renderer via `window.electronAPI`

### Database Queries

Always use prepared statements:
```typescript
const stmt = db.prepare('SELECT * FROM cards WHERE deck_id = ?');
const results = stmt.all(deckId);
```

For inserts, use `result.lastInsertRowid` to get the new ID.

### German Character Support

Card Editor includes helper buttons for: ä, ö, ü, ß, Ä, Ö, Ü

Implementation: `insertGermanChar()` function appends character to form field.

## File Organization

```
electron/
├── algorithms/
│   └── sm2.ts             # SM-2 algorithm (main process)
├── database/
│   └── db.ts              # Database init, migrations, connection
├── main.ts                # Main process, IPC handlers
└── preload.ts             # Context bridge

src/
├── algorithms/
│   └── sm2.ts             # SM-2 algorithm (renderer process)
├── pages/                 # Main app pages
│   ├── Home.tsx           # Dashboard with stats
│   ├── DeckList.tsx       # Grid of decks with card counts
│   ├── DeckDetail.tsx     # Table view of cards in a deck
│   ├── CardEditor.tsx     # Create/edit cards with tags
│   ├── ReviewSession.tsx  # Spaced repetition review UI
│   └── Statistics.tsx     # Charts and analytics (placeholder)
├── store/                 # Redux slices
│   ├── cardsSlice.ts      # Card CRUD operations
│   ├── decksSlice.ts      # Deck CRUD operations
│   └── reviewSlice.ts     # Review session state
├── types/                 # TypeScript definitions
└── App.tsx                # Root with React Router and Ant Design Layout
```

## Review System Details

### Review Workflow

1. User navigates to Review Session page
2. App fetches due cards via `reviews:getDue` IPC call
3. If no cards due: shows "No cards due" message
4. If cards available: shows "Start Review Session" button
5. User starts session:
   - `startSession()` action sets session start time and card start time
   - First card is displayed (front side only)
6. User clicks "Show Answer":
   - Back, context, and notes are revealed
   - Grading buttons appear
7. User clicks a grading button (Again/Hard/Good/Easy):
   - Time spent on card is calculated
   - `submitReview()` thunk is called with cardId, quality, and timeSpent
   - IPC handler receives request and:
     - Fetches current card state from database
     - Runs SM-2 algorithm to calculate new state
     - Updates `card_states` table with new EF, interval, repetitions, next_review_date
     - Inserts review record into `reviews` table
     - Returns result to renderer
   - App moves to next card or shows session summary
8. Session complete:
   - Shows statistics: cards reviewed, accuracy, average time
   - User can return to review page to check for more cards

### Database Updates During Review

When a review is submitted, two tables are updated:

**card_states** (current state):
```sql
UPDATE card_states
SET easiness_factor = ?, interval = ?, repetitions = ?,
    last_reviewed_at = ?, next_review_date = ?,
    total_reviews = total_reviews + 1,
    total_time_spent = total_time_spent + ?
WHERE card_id = ?
```

**reviews** (history):
```sql
INSERT INTO reviews (card_id, reviewed_at, quality, easiness_factor,
                     interval, repetitions, next_review_date, time_spent)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
```

### SM-2 Algorithm Parameters

- **Easiness Factor (EF)**: Starts at 2.5, minimum 1.3
  - Higher EF = longer intervals (easier card)
  - Lower EF = shorter intervals (harder card)
- **Interval**: Days until next review
  - Quality < 3: Reset to 1 day
  - First repetition: 1 day
  - Second repetition: 6 days
  - Third+ repetition: previous_interval * EF
- **Repetitions**: Consecutive correct answers (quality >= 3)
  - Reset to 0 if quality < 3

## Current Implementation Status

✅ **Phase 1 (Foundation)**: Complete

✅ **Phase 2 (Deck & Card Management)**: Complete
- Full CRUD for decks and cards
- Tag system with create-on-the-fly
- Bulk operations (select multiple cards, delete)
- Search and filter
- Deck statistics (card count, due count, new count)

✅ **Phase 3 (Review System)**: Complete
- Full SM-2 algorithm implementation in `electron/algorithms/sm2.ts` and `src/algorithms/sm2.ts`
- Review queue fetches due cards based on `next_review_date`
- ReviewSession UI with:
  - Card display with front/back toggle
  - Context and notes display on answer reveal
  - 4 grading buttons: Again (1), Hard (3), Good (4), Easy (5)
  - Visual hints for interval lengths on buttons
  - Progress bar showing session progress
  - Session complete summary with statistics:
    - Total cards reviewed
    - Correct count and accuracy percentage
    - Average time per card
- Full IPC integration with database updates
- Review history tracking in `reviews` table
- Card state updates in `card_states` table with SM-2 calculated values
- Time tracking per card and per session
- Automatic progression to next card after grading

✅ **Phase 4 (Statistics Dashboard)**: Complete
- Comprehensive statistics page with real-time data
- Overview statistics cards:
  - Total cards, total reviews, time spent
  - Success rate with color coding
  - Current streak tracking (days)
  - Due today and reviewed today counts
- Charts using Recharts:
  - Line chart: Cards reviewed over time
  - Line chart: Accuracy percentage over time
  - Bar chart: Deck performance (reviews and mastered cards per deck)
- Time period selector (7, 30, 90, 365 days)
- Daily statistics tracking:
  - Automatic updates in `daily_statistics` table on each review
  - Tracks cards reviewed, time spent, new cards, deck breakdown
- IPC handlers:
  - `stats:getOverall` - overall statistics with streak calculation
  - `stats:getReviewHistory` - historical review data for charts
  - `stats:getDeckSummary` - per-deck analytics with mastered cards count
  - `stats:getDaily` - daily statistics for date ranges
- Per-deck analytics showing total reviews, time spent, average quality, and mastered cards

❌ **Phase 5-6**: Not implemented (Import/Export, Polish)

## Known Issues & Considerations

### better-sqlite3 Native Module
- Requires rebuild when Electron version changes
- Run `npx @electron/rebuild` if you get NODE_MODULE_VERSION errors

### Database Access
- ONLY access database from main process
- Never expose raw database connection to renderer
- All queries must go through IPC

### Tag Creation
- Tags can be created dynamically in Card Editor
- Type-ahead search with "Create tag" button when no match
- Default color: #1890ff
- 17 pre-seeded tags exist (grammar types, CEFR levels, genders, topics)

### Row Selection in Card List
- Implemented with Ant Design Table `rowSelection`
- Selected row keys tracked in component state
- Bulk delete available when selection exists

## Default Data

17 tags pre-created in migration:
- Grammar: noun, verb, adjective, preposition
- Gender: masculine, feminine, neuter
- CEFR Levels: A1, A2, B1, B2, C1, C2
- Topics: food, travel, work, family

Each tag has a color for UI display.
