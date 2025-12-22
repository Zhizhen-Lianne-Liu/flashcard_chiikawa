const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Connect to the database
const dbPath = path.join(
  os.homedir(),
  'Library/Application Support/flashcard-chiikawa/flashcard_chiikawa.db'
);

console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

// Create the B1 German Vocabulary deck
const now = Date.now();
const deckResult = db.prepare(`
  INSERT INTO decks (name, description, color, icon, created_at, updated_at, archived)
  VALUES (?, ?, ?, ?, ?, ?, 0)
`).run(
  'B1 German Vocabulary',
  'Essential vocabulary for German B1 level (CEFR)',
  '#1890ff',
  '🇩🇪',
  now,
  now
);

const deckId = deckResult.lastInsertRowid;
console.log('Created deck with ID:', deckId);

// B1 level vocabulary cards
const cards = [
  // Verbs
  {
    front: 'sich beschweren',
    back: 'to complain',
    context: 'Sie beschwert sich über den schlechten Service.',
    notes: 'Reflexive verb, requires accusative reflexive pronoun',
    tags: ['verb', 'B1']
  },
  {
    front: 'vereinbaren',
    back: 'to agree on, to arrange',
    context: 'Wir haben einen Termin für nächste Woche vereinbart.',
    notes: 'Regular verb, separable prefix ver-',
    tags: ['verb', 'B1']
  },
  {
    front: 'sich vorbereiten',
    back: 'to prepare (oneself)',
    context: 'Ich bereite mich auf die Prüfung vor.',
    notes: 'Reflexive, separable prefix: vor-',
    tags: ['verb', 'B1']
  },
  {
    front: 'beantragen',
    back: 'to apply for',
    context: 'Er hat einen neuen Reisepass beantragt.',
    notes: 'Inseparable prefix be-',
    tags: ['verb', 'B1']
  },
  {
    front: 'verzichten',
    back: 'to renounce, to do without',
    context: 'Sie verzichtet auf Zucker in ihrem Kaffee.',
    notes: 'Takes "auf" + accusative',
    tags: ['verb', 'B1']
  },

  // Nouns with gender
  {
    front: 'die Unterkunft, -künfte',
    back: 'accommodation',
    context: 'Wir suchen noch eine günstige Unterkunft für unseren Urlaub.',
    notes: 'die, plural: -künfte, feminine',
    tags: ['noun', 'feminine', 'B1', 'travel']
  },
  {
    front: 'der Umzug, -züge',
    back: 'move, relocation',
    context: 'Der Umzug in die neue Wohnung war sehr anstrengend.',
    notes: 'der, plural: -züge, masculine',
    tags: ['noun', 'masculine', 'B1']
  },
  {
    front: 'die Bewerbung, -en',
    back: 'application',
    context: 'Ich habe meine Bewerbung für die Stelle geschickt.',
    notes: 'die, plural: -en, feminine',
    tags: ['noun', 'feminine', 'B1', 'work']
  },
  {
    front: 'das Missverständnis, -se',
    back: 'misunderstanding',
    context: 'Das war ein großes Missverständnis zwischen uns.',
    notes: 'das, plural: -se, neuter',
    tags: ['noun', 'neuter', 'B1']
  },
  {
    front: 'die Erfahrung, -en',
    back: 'experience',
    context: 'Sie hat viel Erfahrung in diesem Bereich.',
    notes: 'die, plural: -en, feminine',
    tags: ['noun', 'feminine', 'B1', 'work']
  },
  {
    front: 'der Einfluss, -flüsse',
    back: 'influence',
    context: 'Das Wetter hat einen großen Einfluss auf meine Stimmung.',
    notes: 'der, plural: -flüsse, masculine',
    tags: ['noun', 'masculine', 'B1']
  },
  {
    front: 'die Gelegenheit, -en',
    back: 'opportunity',
    context: 'Das ist eine gute Gelegenheit, Deutsch zu üben.',
    notes: 'die, plural: -en, feminine',
    tags: ['noun', 'feminine', 'B1']
  },

  // Adjectives
  {
    front: 'selbstständig',
    back: 'independent, self-employed',
    context: 'Sie arbeitet selbstständig als Übersetzerin.',
    notes: 'Adjective, can also mean autonomous',
    tags: ['adjective', 'B1', 'work']
  },
  {
    front: 'zuverlässig',
    back: 'reliable',
    context: 'Er ist ein sehr zuverlässiger Mitarbeiter.',
    notes: 'Adjective',
    tags: ['adjective', 'B1']
  },
  {
    front: 'anstrengend',
    back: 'exhausting, strenuous',
    context: 'Der Marathon war sehr anstrengend.',
    notes: 'Present participle used as adjective',
    tags: ['adjective', 'B1']
  },
  {
    front: 'durchschnittlich',
    back: 'average',
    context: 'Das durchschnittliche Einkommen ist gestiegen.',
    notes: 'Adjective, from "Durchschnitt" (average)',
    tags: ['adjective', 'B1']
  },

  // Useful expressions
  {
    front: 'im Voraus',
    back: 'in advance',
    context: 'Sie müssen im Voraus bezahlen.',
    notes: 'Fixed expression, dative',
    tags: ['B1']
  },
  {
    front: 'es lohnt sich',
    back: 'it\'s worth it',
    context: 'Es lohnt sich, früh aufzustehen.',
    notes: 'Reflexive impersonal expression',
    tags: ['verb', 'B1']
  },
  {
    front: 'Rücksicht nehmen auf',
    back: 'to consider, to take into account',
    context: 'Man muss Rücksicht auf andere nehmen.',
    notes: 'Fixed expression with "auf" + accusative',
    tags: ['B1']
  },
  {
    front: 'sich kümmern um',
    back: 'to take care of, to look after',
    context: 'Ich kümmere mich um die Kinder.',
    notes: 'Reflexive verb with "um" + accusative',
    tags: ['verb', 'B1']
  },
  {
    front: 'abhängig sein von',
    back: 'to depend on',
    context: 'Das ist abhängig vom Wetter.',
    notes: 'Adjective + "von" + dative',
    tags: ['adjective', 'B1']
  },
  {
    front: 'auf jeden Fall',
    back: 'in any case, definitely',
    context: 'Ich komme auf jeden Fall zur Party.',
    notes: 'Fixed expression, adverbial',
    tags: ['B1']
  },
];

console.log(`Inserting ${cards.length} cards...`);

// Insert cards and their initial states
let insertedCount = 0;
for (const card of cards) {
  try {
    // Insert card
    const cardResult = db.prepare(`
      INSERT INTO cards (deck_id, front, back, context, notes, audio_path, image_path, created_at, updated_at, archived)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, 0)
    `).run(
      deckId,
      card.front,
      card.back,
      card.context,
      card.notes,
      now,
      now
    );

    const cardId = cardResult.lastInsertRowid;

    // Create initial card state (for SM-2 algorithm)
    db.prepare(`
      INSERT INTO card_states (card_id, easiness_factor, interval, repetitions, next_review_date, created_at)
      VALUES (?, 2.5, 0, 0, ?, ?)
    `).run(cardId, now, now);

    // Add tags to card
    for (const tagName of card.tags) {
      // Find or create tag
      let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);

      if (!tag) {
        // Create tag if it doesn't exist
        const tagResult = db.prepare(`
          INSERT INTO tags (name, color, created_at)
          VALUES (?, ?, ?)
        `).run(tagName, '#1890ff', now);
        tag = { id: tagResult.lastInsertRowid };
      }

      // Link tag to card
      db.prepare(`
        INSERT OR IGNORE INTO card_tags (card_id, tag_id)
        VALUES (?, ?)
      `).run(cardId, tag.id);
    }

    insertedCount++;
    if (insertedCount % 5 === 0) {
      console.log(`  Inserted ${insertedCount}/${cards.length} cards...`);
    }
  } catch (error) {
    console.error('Error inserting card:', card.front, error.message);
  }
}

console.log(`\n✅ Successfully created B1 German Vocabulary deck with ${insertedCount} cards!`);
console.log('\nDeck Details:');
console.log('- Name: B1 German Vocabulary');
console.log('- Description: Essential vocabulary for German B1 level (CEFR)');
console.log('- Icon: 🇩🇪');
console.log(`- Cards: ${insertedCount}`);
console.log('\nRestart your app or refresh to see the new deck!');

db.close();
