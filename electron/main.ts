import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDatabase, closeDatabase, getDatabase } from './database/db.js';
import { calculateSM2 } from './algorithms/sm2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Use .icns for macOS, .png for other platforms
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../build/icon.icns')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
    },
    show: false, // Don't show until ready-to-show
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle events
app.whenReady().then(() => {
  // Initialize database
  try {
    initDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  // Set up IPC handlers
  setupIPCHandlers();

  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

// IPC Handlers
function setupIPCHandlers() {
  const db = getDatabase();

  // Test handler
  ipcMain.handle('ping', () => 'pong');

  // Deck handlers
  ipcMain.handle('decks:getAll', () => {
    const decks = db.prepare('SELECT * FROM decks WHERE archived = 0').all() as any[];
    const now = Date.now();

    // Add card statistics to each deck
    const decksWithStats = decks.map((deck) => {
      const totalCards = db
        .prepare('SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND archived = 0')
        .get(deck.id) as { count: number };

      const dueCards = db
        .prepare(
          `SELECT COUNT(*) as count FROM cards c
           JOIN card_states cs ON c.id = cs.card_id
           WHERE c.deck_id = ? AND c.archived = 0 AND cs.next_review_date <= ?`
        )
        .get(deck.id, now) as { count: number };

      const newCards = db
        .prepare(
          `SELECT COUNT(*) as count FROM cards c
           JOIN card_states cs ON c.id = cs.card_id
           WHERE c.deck_id = ? AND c.archived = 0 AND cs.total_reviews = 0`
        )
        .get(deck.id) as { count: number };

      return {
        ...deck,
        cardCount: totalCards.count,
        dueCount: dueCards.count,
        newCount: newCards.count,
      };
    });

    return decksWithStats;
  });

  ipcMain.handle('decks:create', (_, deck) => {
    const now = Date.now();
    const result = db
      .prepare(
        `INSERT INTO decks (name, description, color, icon, created_at, updated_at, archived)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      )
      .run(deck.name, deck.description || null, deck.color || null, deck.icon || null, now, now);

    const newDeck = db
      .prepare('SELECT * FROM decks WHERE id = ?')
      .get(result.lastInsertRowid);
    return newDeck;
  });

  ipcMain.handle('decks:update', (_, id, deck) => {
    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    if (deck.name !== undefined) {
      updates.push('name = ?');
      values.push(deck.name);
    }
    if (deck.description !== undefined) {
      updates.push('description = ?');
      values.push(deck.description);
    }
    if (deck.color !== undefined) {
      updates.push('color = ?');
      values.push(deck.color);
    }
    if (deck.icon !== undefined) {
      updates.push('icon = ?');
      values.push(deck.icon);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE decks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
    return updated;
  });

  ipcMain.handle('decks:delete', (_, id) => {
    db.prepare('DELETE FROM decks WHERE id = ?').run(id);
  });

  // Card handlers
  ipcMain.handle('cards:getByDeck', (_, deckId) => {
    const cards = db
      .prepare('SELECT * FROM cards WHERE deck_id = ? AND archived = 0')
      .all(deckId);
    return cards;
  });

  ipcMain.handle('cards:getAll', () => {
    const cards = db.prepare('SELECT * FROM cards WHERE archived = 0').all();
    return cards;
  });

  ipcMain.handle('cards:create', (_, card) => {
    const now = Date.now();
    const result = db
      .prepare(
        `INSERT INTO cards (deck_id, front, back, context, notes, audio_path, image_path, created_at, updated_at, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        card.deck_id,
        card.front,
        card.back,
        card.context || null,
        card.notes || null,
        card.audio_path || null,
        card.image_path || null,
        now,
        now
      );

    const cardId = result.lastInsertRowid;

    // Create initial card state
    db.prepare(
      `INSERT INTO card_states (card_id, easiness_factor, interval, repetitions, next_review_date, created_at)
       VALUES (?, 2.5, 0, 0, ?, ?)`
    ).run(cardId, now, now);

    const newCard = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    return newCard;
  });

  ipcMain.handle('cards:update', (_, id, card) => {
    const now = Date.now();
    const updates: string[] = [];
    const values: any[] = [];

    if (card.front !== undefined) {
      updates.push('front = ?');
      values.push(card.front);
    }
    if (card.back !== undefined) {
      updates.push('back = ?');
      values.push(card.back);
    }
    if (card.context !== undefined) {
      updates.push('context = ?');
      values.push(card.context);
    }
    if (card.notes !== undefined) {
      updates.push('notes = ?');
      values.push(card.notes);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    return updated;
  });

  ipcMain.handle('cards:delete', (_, id) => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  });

  // Review handlers
  ipcMain.handle('reviews:getDue', () => {
    const now = Date.now();
    const dueCards = db
      .prepare(
        `SELECT c.* FROM cards c
         JOIN card_states cs ON c.id = cs.card_id
         WHERE c.archived = 0 AND cs.next_review_date <= ?
         ORDER BY cs.next_review_date ASC
         LIMIT 50`
      )
      .all(now);
    return dueCards;
  });

  ipcMain.handle('reviews:submit', (_, cardId, quality, timeSpent) => {
    const now = Date.now();

    // Get current card state
    const state = db
      .prepare('SELECT * FROM card_states WHERE card_id = ?')
      .get(cardId) as any;

    if (!state) {
      throw new Error(`No card state found for card ${cardId}`);
    }

    // Calculate new state using SM-2 algorithm
    const newState = calculateSM2(
      {
        easinessFactor: state.easiness_factor,
        interval: state.interval,
        repetitions: state.repetitions,
        lastReviewedAt: state.last_reviewed_at,
      },
      quality
    );

    const wasCorrect = quality >= 3;

    // Update card state in database
    db.prepare(
      `UPDATE card_states
       SET easiness_factor = ?,
           interval = ?,
           repetitions = ?,
           last_reviewed_at = ?,
           next_review_date = ?,
           total_reviews = total_reviews + 1,
           total_time_spent = total_time_spent + ?
       WHERE card_id = ?`
    ).run(
      newState.easinessFactor,
      newState.interval,
      newState.repetitions,
      newState.lastReviewedAt,
      newState.nextReviewDate,
      timeSpent,
      cardId
    );

    // Record this review in history
    db.prepare(
      `INSERT INTO reviews (card_id, reviewed_at, quality, easiness_factor, interval, repetitions, next_review_date, time_spent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      cardId,
      now,
      quality,
      newState.easinessFactor,
      newState.interval,
      newState.repetitions,
      newState.nextReviewDate,
      timeSpent
    );

    // Update daily statistics
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dateKey = today.getTime();

    // Get the deck_id for this card
    const card = db.prepare('SELECT deck_id FROM cards WHERE id = ?').get(cardId) as any;

    // Check if we have a stats record for today
    const existingStats = db
      .prepare('SELECT * FROM daily_statistics WHERE date = ?')
      .get(dateKey) as any;

    if (existingStats) {
      // Update existing record
      const deckBreakdown = JSON.parse(existingStats.deck_breakdown || '{}');
      deckBreakdown[card.deck_id] = (deckBreakdown[card.deck_id] || 0) + 1;

      db.prepare(
        `UPDATE daily_statistics
         SET cards_reviewed = cards_reviewed + 1,
             time_spent = time_spent + ?,
             new_cards = new_cards + ?,
             deck_breakdown = ?
         WHERE date = ?`
      ).run(
        timeSpent,
        state.total_reviews === 0 ? 1 : 0,
        JSON.stringify(deckBreakdown),
        dateKey
      );
    } else {
      // Create new record for today
      const deckBreakdown = { [card.deck_id]: 1 };

      db.prepare(
        `INSERT INTO daily_statistics (date, cards_reviewed, time_spent, new_cards, average_quality, deck_breakdown)
         VALUES (?, 1, ?, ?, ?, ?)`
      ).run(dateKey, timeSpent, state.total_reviews === 0 ? 1 : 0, quality, JSON.stringify(deckBreakdown));
    }

    return {
      card_id: cardId,
      quality,
      time_spent: timeSpent,
      was_correct: wasCorrect,
      next_review_date: newState.nextReviewDate,
      interval: newState.interval,
    };
  });

  ipcMain.handle('reviews:getHistory', (_, cardId) => {
    const history = db
      .prepare('SELECT * FROM reviews WHERE card_id = ? ORDER BY reviewed_at DESC')
      .all(cardId);
    return history;
  });

  // Stats handlers
  ipcMain.handle('stats:getDaily', (_, startDate, endDate) => {
    const stats = db
      .prepare(
        `SELECT * FROM daily_statistics
         WHERE date >= ? AND date <= ?
         ORDER BY date ASC`
      )
      .all(startDate, endDate);
    return stats;
  });

  ipcMain.handle('stats:getOverall', () => {
    const now = Date.now();

    // Total cards
    const totalCards = db
      .prepare('SELECT COUNT(*) as count FROM cards WHERE archived = 0')
      .get() as { count: number };

    // Total reviews
    const totalReviews = db
      .prepare('SELECT COUNT(*) as count FROM reviews')
      .get() as { count: number };

    // Total time spent (in milliseconds)
    const totalTime = db
      .prepare('SELECT SUM(time_spent) as total FROM reviews')
      .get() as { total: number | null };

    // Cards due today
    const dueToday = db
      .prepare(
        `SELECT COUNT(*) as count FROM cards c
         JOIN card_states cs ON c.id = cs.card_id
         WHERE c.archived = 0 AND cs.next_review_date <= ?`
      )
      .get(now) as { count: number };

    // Cards reviewed today
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayKey = today.getTime();
    const reviewedToday = db
      .prepare('SELECT cards_reviewed FROM daily_statistics WHERE date = ?')
      .get(todayKey) as { cards_reviewed: number } | undefined;

    // Calculate streak
    let currentStreak = 0;
    const allStats = db
      .prepare('SELECT date, cards_reviewed FROM daily_statistics ORDER BY date DESC')
      .all() as { date: number; cards_reviewed: number }[];

    for (const stat of allStats) {
      const daysDiff = Math.floor((todayKey - stat.date) / (24 * 60 * 60 * 1000));

      if (daysDiff === currentStreak && stat.cards_reviewed > 0) {
        currentStreak++;
      } else if (daysDiff > currentStreak) {
        break;
      }
    }

    return {
      totalCards: totalCards.count,
      totalReviews: totalReviews.count,
      totalTimeSpent: totalTime.total || 0,
      dueToday: dueToday.count,
      reviewedToday: reviewedToday?.cards_reviewed || 0,
      currentStreak,
    };
  });

  ipcMain.handle('stats:getDeckSummary', (_, deckId) => {
    // Total cards in deck
    const totalCards = db
      .prepare('SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND archived = 0')
      .get(deckId) as { count: number };

    // Reviews for this deck
    const reviews = db
      .prepare(
        `SELECT COUNT(*) as count, SUM(r.time_spent) as total_time
         FROM reviews r
         JOIN cards c ON r.card_id = c.id
         WHERE c.deck_id = ?`
      )
      .get(deckId) as { count: number; total_time: number | null };

    // Average quality
    const avgQuality = db
      .prepare(
        `SELECT AVG(r.quality) as avg
         FROM reviews r
         JOIN cards c ON r.card_id = c.id
         WHERE c.deck_id = ?`
      )
      .get(deckId) as { avg: number | null };

    // Mastered cards (repetitions >= 3 and easiness_factor >= 2.5)
    const masteredCards = db
      .prepare(
        `SELECT COUNT(*) as count FROM cards c
         JOIN card_states cs ON c.id = cs.card_id
         WHERE c.deck_id = ? AND c.archived = 0
         AND cs.repetitions >= 3 AND cs.easiness_factor >= 2.5`
      )
      .get(deckId) as { count: number };

    return {
      totalCards: totalCards.count,
      totalReviews: reviews.count,
      totalTimeSpent: reviews.total_time || 0,
      averageQuality: avgQuality.avg || 0,
      masteredCards: masteredCards.count,
    };
  });

  ipcMain.handle('stats:getReviewHistory', (_, days) => {
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;

    const history = db
      .prepare(
        `SELECT
           DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as date,
           COUNT(*) as count,
           SUM(CASE WHEN quality >= 3 THEN 1 ELSE 0 END) as correct,
           AVG(quality) as avg_quality,
           SUM(time_spent) as total_time
         FROM reviews
         WHERE reviewed_at >= ?
         GROUP BY date
         ORDER BY date ASC`
      )
      .all(startDate);

    return history;
  });

  // Tags handlers (placeholder)
  ipcMain.handle('tags:getAll', () => {
    const tags = db.prepare('SELECT * FROM tags').all();
    return tags;
  });

  ipcMain.handle('tags:create', (_, tag) => {
    const now = Date.now();
    const result = db
      .prepare('INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)')
      .run(tag.name, tag.color || null, now);
    const newTag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    return newTag;
  });

  ipcMain.handle('tags:delete', (_, id) => {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  });

  ipcMain.handle('tags:addToCard', (_, cardId, tagId) => {
    db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(
      cardId,
      tagId
    );
  });

  ipcMain.handle('tags:removeFromCard', (_, cardId, tagId) => {
    db.prepare('DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?').run(cardId, tagId);
  });

  ipcMain.handle('tags:getForCard', (_, cardId) => {
    const tags = db
      .prepare(
        `SELECT t.* FROM tags t
         JOIN card_tags ct ON t.id = ct.tag_id
         WHERE ct.card_id = ?`
      )
      .all(cardId);
    return tags;
  });

  // Export/Import handlers
  ipcMain.handle('export:csv', async (_, deckId) => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    try {
      // Get deck info
      const deck = db
        .prepare('SELECT * FROM decks WHERE id = ?')
        .get(deckId) as any;

      if (!deck) {
        return { success: false, error: 'Deck not found' };
      }

      // Get all cards from the deck
      const cards = db
        .prepare(
          `SELECT c.*, GROUP_CONCAT(t.name, ';') as tags
           FROM cards c
           LEFT JOIN card_tags ct ON c.id = ct.card_id
           LEFT JOIN tags t ON ct.tag_id = t.id
           WHERE c.deck_id = ? AND c.archived = 0
           GROUP BY c.id`
        )
        .all(deckId) as any[];

      if (cards.length === 0) {
        return { success: false, error: 'No cards to export' };
      }

      // Show save dialog
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Cards to CSV',
        defaultPath: `${deck.name.replace(/[^a-z0-9]/gi, '_')}_cards.csv`,
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (!filePath) {
        return { success: false, cancelled: true };
      }

      // Create CSV content
      const headers = ['front', 'back', 'context', 'notes', 'tags'];
      const rows = cards.map((card) => [
        escapeCsv(card.front),
        escapeCsv(card.back),
        escapeCsv(card.context || ''),
        escapeCsv(card.notes || ''),
        escapeCsv(card.tags || ''),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      // Write to file
      fs.writeFileSync(filePath, csv, 'utf-8');

      return { success: true, filePath, cardsExported: cards.length };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('import:csv', async (_, deckId) => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    try {
      // Show open dialog
      const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Cards from CSV',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile'],
      });

      if (!filePaths || filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const filePath = filePaths[0];
      const csvContent = fs.readFileSync(filePath, 'utf-8');

      // Parse CSV (simple parser)
      const lines = csvContent.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        return { success: false, error: 'CSV file is empty or invalid' };
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const frontIdx = headers.indexOf('front');
      const backIdx = headers.indexOf('back');
      const contextIdx = headers.indexOf('context');
      const notesIdx = headers.indexOf('notes');
      const tagsIdx = headers.indexOf('tags');

      if (frontIdx === -1 || backIdx === -1) {
        return { success: false, error: 'CSV must have "front" and "back" columns' };
      }

      let imported = 0;
      const tagCache = new Map<string, number>();

      // Get all existing tags
      const existingTags = db.prepare('SELECT id, name FROM tags').all() as any[];
      existingTags.forEach((tag) => tagCache.set(tag.name.toLowerCase(), tag.id));

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length < 2) continue;

        const front = values[frontIdx]?.trim();
        const back = values[backIdx]?.trim();
        if (!front || !back) continue;

        const context = contextIdx >= 0 ? values[contextIdx]?.trim() : null;
        const notes = notesIdx >= 0 ? values[notesIdx]?.trim() : null;
        const tagNames = tagsIdx >= 0 ? values[tagsIdx]?.trim() : null;

        // Insert card
        const result = db
          .prepare(
            `INSERT INTO cards (deck_id, front, back, context, notes, created_at, updated_at, archived)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
          )
          .run(deckId, front, back, context, notes, Date.now(), Date.now());

        const cardId = Number(result.lastInsertRowid);

        // Create initial card state
        const now = Date.now();
        db.prepare(
          `INSERT INTO card_states (card_id, easiness_factor, interval, repetitions, next_review_date, last_reviewed_at, total_reviews, total_time_spent, created_at)
           VALUES (?, 2.5, 0, 0, ?, NULL, 0, 0, ?)`
        ).run(cardId, now, now);

        // Handle tags
        if (tagNames) {
          const tags = tagNames.split(';').map((t) => t.trim()).filter(Boolean);
          for (const tagName of tags) {
            const lowerName = tagName.toLowerCase();
            let tagId = tagCache.get(lowerName);

            if (!tagId) {
              // Create new tag
              const tagResult = db
                .prepare('INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)')
                .run(tagName, '#1890ff', Date.now());
              tagId = Number(tagResult.lastInsertRowid);
              tagCache.set(lowerName, tagId);
            }

            // Link tag to card
            db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)').run(
              cardId,
              tagId
            );
          }
        }

        imported++;
      }

      // Update deck timestamp
      db.prepare('UPDATE decks SET updated_at = ? WHERE id = ?').run(Date.now(), deckId);

      return { success: true, cardsImported: imported };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: String(error) };
    }
  });
}

// Helper functions for CSV handling
function escapeCsv(value: string): string {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map((v) => v.trim());
}
