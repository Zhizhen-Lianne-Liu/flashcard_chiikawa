# Future Enhancement: Multi-Subject Workspace System

> **Status**: Planned but not implemented
>
> **Last Updated**: December 23, 2024
>
> **Purpose**: This document outlines a comprehensive plan to transform the German-specific flashcard app into a multi-subject learning platform.

## Overview

Transform the German-specific flashcard app into a multi-subject learning platform using **workspace-based organization**. Each workspace (e.g., "German Learning", "Deep Learning Notes") has subject-specific features while sharing the core spaced repetition engine.

## Motivation

Currently the app is hardcoded for German language learning. To support other subjects like:
- Deep learning / machine learning concepts
- Mathematics and science
- Programming languages
- Medical school notes
- Any other flashcard-based learning

We need a flexible workspace system that adapts features to the subject being studied.

## Workspace Concept

**How it works:**
- Workspace selector in sidebar (dropdown above main menu)
- Each workspace has its own decks, tags, and subject-specific features
- Switch between workspaces without reloading app (filter-based)
- All data in single database, organized by workspace_id

**Subject Types:**
1. **Language** - Character helpers (ä, ö, ü, ß for German, etc.), CEFR tags
2. **Math/Science** - LaTeX rendering, code syntax highlighting, image support
3. **General** - Plain text only

## Database Schema Changes

### New Table: `workspaces`
```sql
CREATE TABLE workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- "German Learning", "Deep Learning Notes"
  subject_type TEXT NOT NULL,            -- 'language' | 'math_science' | 'general'
  icon TEXT,                             -- Emoji icon
  color TEXT,                            -- Hex color
  settings TEXT,                         -- JSON for subject-specific config
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER DEFAULT 0
)
```

### Schema Updates to Existing Tables

**`decks` table:**
- Add `workspace_id INTEGER` foreign key
- Create index on workspace_id

**`tags` table:**
- Add `workspace_id INTEGER` foreign key
- Create index on workspace_id

### Migration v3: Add Workspaces

```javascript
{
  version: 3,
  up: (db) => {
    // 1. Create workspaces table
    db.prepare(`CREATE TABLE workspaces (...)`).run();

    // 2. Create default "German Learning" workspace
    db.prepare(
      `INSERT INTO workspaces (name, subject_type, icon, color, settings, is_default, created_at, updated_at)
       VALUES ('German Learning', 'language', '🇩🇪', '#1890ff', ?, 1, ?, ?)`
    ).run(JSON.stringify({
      language: {
        targetLanguage: 'german',
        showCharacterHelper: true,
        characterSet: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
        enableCEFRTags: true
      }
    }), Date.now(), Date.now());

    // 3. Add workspace_id to decks and tags
    db.prepare('ALTER TABLE decks ADD COLUMN workspace_id INTEGER DEFAULT 1').run();
    db.prepare('ALTER TABLE tags ADD COLUMN workspace_id INTEGER').run();
    db.prepare('UPDATE tags SET workspace_id = 1').run();

    // 4. Create indexes
    db.prepare('CREATE INDEX idx_decks_workspace ON decks(workspace_id)').run();
    db.prepare('CREATE INDEX idx_tags_workspace ON tags(workspace_id)').run();
  }
}
```

## Workspace Settings JSON Schema

```typescript
{
  language: {
    targetLanguage: string;           // 'german', 'spanish', 'french'
    showCharacterHelper: boolean;
    characterSet: string[];           // ['ä', 'ö', 'ü', 'ß']
    enableCEFRTags: boolean;
  },
  math_science: {
    enableLatex: boolean;
    enableCodeHighlighting: boolean;
    defaultCodeLanguage: string;      // 'python', 'javascript'
    enableImageSupport: boolean;
  },
  general: {
    plainTextOnly: boolean;
  }
}
```

## UI/UX Flow

### Sidebar Layout
```
┌─────────────────────┐
│ Flashcard Chiikawa  │
├─────────────────────┤
│ 🇩🇪 German Learning ▼│ <- WorkspaceSelector (dropdown)
├─────────────────────┤
│ 🏠 Home             │
│ 📚 Decks            │
│ 📖 Review           │
│ ✏️  Card Editor     │
│ 📊 Statistics       │
├─────────────────────┤
│ ⚙️  Manage Workspaces│ <- Opens WorkspaceManager modal
└─────────────────────┘
```

### Workspace Manager Modal
- List all workspaces (with edit/delete)
- "Create New Workspace" button
- Form fields:
  - Name (text)
  - Subject Type (dropdown)
  - Icon (emoji picker)
  - Color (color picker)
  - Subject-specific settings (conditional)

### Workspace Switching Behavior
- **Filter, don't reload**: Switching updates Redux state and re-fetches data
- Active workspace ID stored in Redux + localStorage
- All IPC queries filtered by workspace_id
- Statistics filtered by active workspace (with "Show All" toggle option)

## Subject-Specific Features Implementation

### Language Workspaces

**Character Helper (existing, needs extraction):**
1. Extract from CardEditor to `src/components/CharacterHelper.tsx`
2. Make character set configurable via workspace settings
3. Conditionally render based on `workspace.subject_type === 'language' && settings.showCharacterHelper`

**Generic Labels:**
- Remove hardcoded "German" from CardEditor, DeckDetail, Home
- Keep "Front/Back" labels (simple and consistent)
- Remove language-specific placeholder text

### Math/Science Workspaces

**LaTeX Rendering:**
- **Library**: KaTeX (`npm install katex @types/katex`)
- **Component**: `src/components/LatexRenderer.tsx`
- **Syntax**: Detect `$...$` (inline) or `$$...$$` (block)
- **Render locations**: CardEditor (preview), DeckDetail, ReviewSession
- **Storage**: Store raw LaTeX in database, render on display

**Example Use Cases:**
- Mathematical formulas: `$E = mc^2$`
- Equations: `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$`
- Neural network formulas: `$\sigma(z) = \frac{1}{1 + e^{-z}}$`

**Code Syntax Highlighting:**
- **Library**: Prism.js (`npm install prismjs @types/prismjs`)
- **Component**: `src/components/CodeBlock.tsx`
- **Syntax**: Triple backticks ` ```python ... ``` `
- **Languages**: Python, JavaScript, TypeScript, etc.
- **Render locations**: CardEditor (preview), DeckDetail, ReviewSession

**Example Use Cases:**
```python
# PyTorch forward pass
def forward(self, x):
    return self.relu(self.fc1(x))
```

**Image Support:**
- **Storage**: File system (`userData/flashcard_chiikawa/images/`)
- **Upload**: Electron dialog.showOpenDialog
- **Display**: Use `file://` protocol in renderer
- **Database**: Store relative path in `cards.image_path`

**Example Use Cases:**
- Neural network architecture diagrams
- Mathematical graphs and plots
- Chemical structure diagrams
- Circuit diagrams

## File Structure

### New Files to Create
```
src/
├── components/
│   ├── WorkspaceSelector.tsx         # Dropdown in sidebar
│   ├── WorkspaceManager.tsx          # CRUD modal
│   ├── CharacterHelper.tsx           # Extracted from CardEditor
│   ├── LatexRenderer.tsx             # KaTeX wrapper
│   └── CodeBlock.tsx                 # Prism wrapper
├── store/
│   └── workspaceSlice.ts             # Workspace state
├── types/
│   └── workspace.ts                  # Interfaces
└── utils/
    ├── latex.ts                      # Parse LaTeX syntax
    └── codeHighlight.ts              # Parse code blocks

electron/
└── utils/
    └── imageStorage.ts               # Image file operations
```

### Files to Modify
```
electron/
├── database/db.ts                    # Add migration v3
├── main.ts                           # Add workspace IPC handlers
└── preload.ts                        # Expose workspace API

src/
├── App.tsx                           # Add WorkspaceSelector, init workspace
├── pages/
│   ├── CardEditor.tsx                # Conditional features, remove "German" text
│   ├── DeckList.tsx                  # Filter by workspace
│   ├── DeckDetail.tsx                # Render LaTeX/code
│   ├── ReviewSession.tsx             # Render LaTeX/code
│   ├── Home.tsx                      # Filter stats, remove "German" text
│   └── Statistics.tsx                # Filter by workspace
├── store/
│   ├── index.ts                      # Add workspaceReducer
│   ├── decksSlice.ts                 # Pass workspace_id in queries
│   └── cardsSlice.ts                 # (Inherits filtering via deck)
└── types/
    ├── deck.ts                       # Add workspace_id field
    └── window.d.ts                   # Add workspace API types
```

## Implementation Phases

### Phase 1: Database & Backend Foundation (2-3 days)
**Goal**: Add workspace table and IPC handlers

1. Create TypeScript interfaces in `src/types/workspace.ts`
2. Add migration v3 to `electron/database/db.ts`
3. Add workspace IPC handlers to `electron/main.ts`
4. Update deck/tag IPC handlers to filter by workspace_id
5. Expose workspace API in `electron/preload.ts`

**Deliverable**: Database supports workspaces, IPC ready

### Phase 2: Redux State Management (1-2 days)
**Goal**: Manage workspace state in frontend

1. Create `src/store/workspaceSlice.ts` with full CRUD
2. Add workspace reducer to store
3. Update decksSlice to pass workspace_id
4. Persist active workspace to localStorage

**Deliverable**: Workspace state managed in Redux

### Phase 3: Workspace UI Components (2-3 days)
**Goal**: Build workspace selector and manager

1. Create WorkspaceSelector dropdown
2. Create WorkspaceManager modal with CRUD
3. Integrate into App.tsx sidebar
4. Test workspace switching

**Deliverable**: Users can create/switch workspaces

### Phase 4: Generalize Language Features (1-2 days)
**Goal**: Remove German-specific hardcoding

1. Extract CharacterHelper component
2. Update CardEditor for conditional rendering
3. Remove "German" from all UI text
4. Make tag system workspace-aware

**Deliverable**: Language workspaces are subject-agnostic

### Phase 5: LaTeX Support (2-3 days)
**Goal**: Enable LaTeX rendering for math/science workspaces

1. Install KaTeX and create LatexRenderer
2. Create parsing utilities for LaTeX syntax
3. Add LaTeX insert button in CardEditor
4. Update display components to render LaTeX

**Deliverable**: LaTeX formulas render correctly

### Phase 6: Code Syntax Highlighting (1-2 days)
**Goal**: Enable code highlighting for code snippets

1. Install Prism.js and create CodeBlock component
2. Create parsing utilities for code blocks
3. Add code insert button with language selector
4. Update display components to highlight code

**Deliverable**: Code snippets render with syntax highlighting

### Phase 7: Image Support (2 days)
**Goal**: Allow image uploads for diagrams/visualizations

1. Create image storage utilities
2. Add image IPC handlers
3. Add image upload to CardEditor
4. Display images in card components

**Deliverable**: Images work in math/science workspaces

### Phase 8: Workspace-Aware Statistics (1 day)
**Goal**: Filter statistics by active workspace

1. Update stat IPC handlers with JOIN queries
2. Add workspace filter to Statistics page
3. Add "Show all" toggle option

**Deliverable**: Statistics respect workspace boundaries

### Phase 9: Testing & Polish (2-3 days)
**Goal**: Ensure system works end-to-end

1. Data isolation testing
2. Feature testing (LaTeX, code, images)
3. Migration testing on existing database
4. UI/UX polish and error handling
5. Documentation updates

**Deliverable**: Production-ready multi-subject system

**Total Estimated Time: 14-21 days**

## Technical Implementation Details

### Redux Selectors for Workspace Settings

```typescript
// src/store/workspaceSlice.ts
export const selectActiveWorkspace = (state: RootState) =>
  state.workspace.workspaces.find(w => w.id === state.workspace.activeWorkspaceId);

export const selectWorkspaceSettings = (state: RootState) => {
  const workspace = selectActiveWorkspace(state);
  return workspace ? JSON.parse(workspace.settings) : null;
};

export const selectIsLanguageWorkspace = (state: RootState) =>
  selectActiveWorkspace(state)?.subject_type === 'language';

export const selectIsMathScienceWorkspace = (state: RootState) =>
  selectActiveWorkspace(state)?.subject_type === 'math_science';
```

### Conditional Rendering Pattern

```typescript
// Example: CardEditor.tsx
import { useSelector } from 'react-redux';
import { selectWorkspaceSettings, selectIsLanguageWorkspace } from '../store/workspaceSlice';

function CardEditor() {
  const isLanguage = useSelector(selectIsLanguageWorkspace);
  const settings = useSelector(selectWorkspaceSettings);

  return (
    <Form>
      {/* Always shown */}
      <Form.Item label="Front">
        <Input />
      </Form.Item>

      {/* Language workspace only */}
      {isLanguage && settings?.language?.showCharacterHelper && (
        <CharacterHelper
          characters={settings.language.characterSet}
          onInsert={(char) => insertCharacter(char)}
        />
      )}

      {/* Math/Science workspace only */}
      {settings?.math_science?.enableLatex && (
        <Button onClick={insertLatex}>Insert LaTeX</Button>
      )}
    </Form>
  );
}
```

### LaTeX Parsing Example

```typescript
// src/utils/latex.ts
export interface ContentChunk {
  type: 'text' | 'latex';
  content: string;
  displayMode?: boolean; // true for $$..$$, false for $...$
}

export function parseLatex(text: string): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  const latexRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = latexRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    chunks.push({
      type: 'latex',
      content: match[1] || match[2],
      displayMode: !!match[1]
    });

    lastIndex = latexRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    chunks.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return chunks;
}
```

### Code Block Parsing Example

```typescript
// src/utils/codeHighlight.ts
export interface CodeChunk {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export function parseCodeBlocks(text: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      chunks.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    chunks.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim()
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    chunks.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return chunks;
}
```

## Key Design Decisions

### 1. Single Database with Filtering (not separate DBs per workspace)
**Rationale**: Simpler architecture, easier to extend, better for future global features

**Trade-off**: Requires careful query filtering

### 2. JSON Settings Storage (not separate settings tables)
**Rationale**: Flexible schema per subject type, easier to extend without migrations

**Trade-off**: Can't query specific settings in SQL (acceptable for this use case)

### 3. Filter-Based Workspace Switching (not app reload)
**Rationale**: Faster UX, state preserved, smoother experience

**Trade-off**: Need to carefully manage Redux state updates

### 4. File System Image Storage (not base64 in DB)
**Rationale**: Smaller database, better performance, easier to manage separately

**Trade-off**: More complex export/import (need to bundle images)

### 5. Keep "Front/Back" Labels (not customizable per subject)
**Rationale**: Simple, consistent, familiar terminology

**Trade-off**: Less flexible for different study paradigms

## Success Criteria

- ✅ User can create workspaces for different subjects
- ✅ German character helper only shows in language workspaces
- ✅ LaTeX renders correctly in math/science workspaces
- ✅ Code highlights properly in math/science workspaces
- ✅ Images can be added to math/science cards
- ✅ Switching workspaces filters decks/stats correctly
- ✅ No "German" hardcoded text remains
- ✅ Existing data migrates to default workspace
- ✅ Statistics respect workspace boundaries
- ✅ Performance remains good with multiple workspaces

## Potential Challenges

### Challenge 1: LaTeX Performance with Many Cards
**Solution**: Use virtualized lists, render LaTeX only when visible, cache output

### Challenge 2: Image Storage Growing Large
**Solution**: Implement compression, cleanup utilities, show storage usage

### Challenge 3: Workspace Switching State Management
**Solution**: Clear stale data, use Redux extraReducers, re-fetch on switch

### Challenge 4: Statistics Accuracy with Filtering
**Solution**: Use proper JOIN queries, add indexes, consider denormalization

## Dependencies to Install

```bash
# LaTeX support
npm install katex @types/katex

# Code syntax highlighting
npm install prismjs @types/prismjs

# (No additional Electron deps needed - dialog/file APIs already available)
```

## Example Use Cases

### Use Case 1: Deep Learning Flashcards
```
Front: What is the sigmoid activation function?

Back:
$\sigma(z) = \frac{1}{1 + e^{-z}}$

Properties:
- Output range: (0, 1)
- Vanishing gradient problem for large |z|
- Used in binary classification

Code:
```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))
```

[Image: sigmoid_curve.png]
```

### Use Case 2: Spanish Language Learning
```
Front: el gato

Back: the cat

Context: El gato está en el tejado.

Notes: masculine noun, plural: los gatos

Tags: noun, masculine, A1, animals
```

### Use Case 3: Medical School
```
Front: Krebs Cycle Steps

Back: [Image: krebs_cycle_diagram.png]

1. Acetyl-CoA + Oxaloacetate → Citrate
2. Citrate → Isocitrate
3. Isocitrate → α-Ketoglutarate (produces NADH + CO₂)
...

Notes: Occurs in mitochondrial matrix, produces ATP/GTP, NADH, FADH₂
```

## Future Enhancements (Beyond This Plan)

- Workspace templates (pre-configured for common subjects)
- Shared workspace settings (export/import workspace config)
- Collaborative workspaces (if cloud sync added)
- Workspace-specific keyboard shortcuts
- Custom card types per workspace (e.g., cloze deletions for languages)
- Audio support (pronunciation for languages, lecture clips for other subjects)
- Spaced repetition algorithm tuning per workspace

---

## Notes for Implementation

When ready to implement this feature:

1. **Read this document thoroughly**
2. **Create a feature branch**: `git checkout -b feature/multi-subject-workspaces`
3. **Follow phases in order** - database changes must come first
4. **Test migration on copy of database** before running on production
5. **Implement one subject type at a time** (start with generalizing language, then add math/science)
6. **Write tests** for critical functionality (workspace switching, data filtering, LaTeX parsing)
7. **Update CLAUDE.md** with workspace feature documentation

## References

- KaTeX Documentation: https://katex.org/docs/api.html
- Prism.js Documentation: https://prismjs.com/
- SM-2 Algorithm: Already implemented, no changes needed
- Better-sqlite3: https://github.com/WiseLibs/better-sqlite3

---

**Document Status**: This is a planning document. Implementation has not started.
