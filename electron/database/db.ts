import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  // Create data directory if it doesn't exist
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'flashcard_chiikawa.db');

  console.log('Initializing database at:', dbPath);

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Open database
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  return db;
}

function runMigrations(database: Database.Database) {
  // Get current schema version
  const versionRow = database
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`
    )
    .get();

  let currentVersion = 0;
  if (versionRow) {
    const result = database
      .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
      .get() as { version: number } | undefined;
    currentVersion = result?.version || 0;
  } else {
    // Create schema_version table
    database
      .prepare(
        `CREATE TABLE schema_version (
          version INTEGER PRIMARY KEY,
          applied_at INTEGER NOT NULL
        )`
      )
      .run();
  }

  console.log('Current database schema version:', currentVersion);

  // Define migrations
  const migrations = [
    {
      version: 1,
      name: 'Initial schema',
      up: (db: Database.Database) => {
        // Decks table
        db.prepare(
          `CREATE TABLE decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT,
            icon TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            archived INTEGER DEFAULT 0
          )`
        ).run();

        // Cards table
        db.prepare(
          `CREATE TABLE cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER NOT NULL,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            context TEXT,
            notes TEXT,
            audio_path TEXT,
            image_path TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            archived INTEGER DEFAULT 0,
            FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
          )`
        ).run();

        // Tags table
        db.prepare(
          `CREATE TABLE tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT,
            created_at INTEGER NOT NULL
          )`
        ).run();

        // Card-Tag junction table
        db.prepare(
          `CREATE TABLE card_tags (
            card_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (card_id, tag_id),
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
          )`
        ).run();

        // Reviews history table
        db.prepare(
          `CREATE TABLE reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            reviewed_at INTEGER NOT NULL,
            quality INTEGER NOT NULL,
            easiness_factor REAL NOT NULL,
            interval INTEGER NOT NULL,
            repetitions INTEGER NOT NULL,
            next_review_date INTEGER NOT NULL,
            time_spent INTEGER,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
          )`
        ).run();

        // Card states table (current SM-2 state)
        db.prepare(
          `CREATE TABLE card_states (
            card_id INTEGER PRIMARY KEY,
            easiness_factor REAL NOT NULL DEFAULT 2.5,
            interval INTEGER NOT NULL DEFAULT 0,
            repetitions INTEGER NOT NULL DEFAULT 0,
            next_review_date INTEGER NOT NULL,
            last_reviewed_at INTEGER,
            total_reviews INTEGER DEFAULT 0,
            total_time_spent INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
          )`
        ).run();

        // Daily statistics table
        db.prepare(
          `CREATE TABLE daily_statistics (
            date INTEGER PRIMARY KEY,
            cards_reviewed INTEGER DEFAULT 0,
            time_spent INTEGER DEFAULT 0,
            new_cards INTEGER DEFAULT 0,
            average_quality REAL,
            deck_breakdown TEXT
          )`
        ).run();

        // Import history table
        db.prepare(
          `CREATE TABLE import_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            format TEXT NOT NULL,
            cards_imported INTEGER NOT NULL,
            imported_at INTEGER NOT NULL,
            deck_id INTEGER,
            FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL
          )`
        ).run();

        // Create indexes
        db.prepare('CREATE INDEX idx_cards_deck_id ON cards(deck_id)').run();
        db.prepare('CREATE INDEX idx_cards_archived ON cards(archived)').run();
        db.prepare(
          'CREATE INDEX idx_card_states_next_review ON card_states(next_review_date)'
        ).run();
        db.prepare('CREATE INDEX idx_reviews_card_id ON reviews(card_id)').run();
        db.prepare('CREATE INDEX idx_reviews_date ON reviews(reviewed_at)').run();
        db.prepare(
          'CREATE INDEX idx_card_tags_card ON card_tags(card_id)'
        ).run();
        db.prepare('CREATE INDEX idx_card_tags_tag ON card_tags(tag_id)').run();

        console.log('Created initial schema');
      },
    },
    {
      version: 2,
      name: 'Add default tags',
      up: (db: Database.Database) => {
        const now = Date.now();
        const defaultTags = [
          // Grammar tags
          { name: 'noun', color: '#3b82f6' },
          { name: 'verb', color: '#10b981' },
          { name: 'adjective', color: '#f59e0b' },
          { name: 'preposition', color: '#8b5cf6' },
          // Gender tags
          { name: 'masculine', color: '#0ea5e9' },
          { name: 'feminine', color: '#ec4899' },
          { name: 'neuter', color: '#14b8a6' },
          // Level tags
          { name: 'A1', color: '#22c55e' },
          { name: 'A2', color: '#84cc16' },
          { name: 'B1', color: '#eab308' },
          { name: 'B2', color: '#f97316' },
          { name: 'C1', color: '#ef4444' },
          { name: 'C2', color: '#dc2626' },
          // Topic tags
          { name: 'food', color: '#f472b6' },
          { name: 'travel', color: '#60a5fa' },
          { name: 'work', color: '#a78bfa' },
          { name: 'family', color: '#fb923c' },
        ];

        const insert = db.prepare(
          'INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)'
        );

        for (const tag of defaultTags) {
          insert.run(tag.name, tag.color, now);
        }

        console.log('Added default tags');
      },
    },
  ];

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      const transaction = database.transaction(() => {
        migration.up(database);
        database
          .prepare(
            'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)'
          )
          .run(migration.version, Date.now());
      });

      transaction();
      console.log(`Migration ${migration.version} completed`);
    }
  }

  console.log('All migrations completed');
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}
