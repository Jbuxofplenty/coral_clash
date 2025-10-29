# Game State Export for Debugging

The game includes an export feature to help debug issues by saving the exact game state as JSON.

## How It Works

✅ **Export button available in DEV mode only** (`__DEV__`)  
✅ **One-click export** via the share icon in the control bar  
✅ **Complete game state** exported as JSON  
✅ **Use for creating test fixtures** and reproducing bugs

## Using the Export Feature

### In the App

When running in development mode, you'll see a share icon (↗️) in the control bar between the reset and undo buttons.

**Control Bar Layout:**

- **Reset** (↻) - Reset game
- **Export** (↗️) - **Export game state (DEV only)**
- **Undo** (↶) - Undo move
- **Resign** (⚑) - Resign game

### Export Process

1. **Click the share icon** when you want to capture the current game state
2. **Choose how to share:**
   - Copy to clipboard
   - Save to Files app
   - AirDrop to Mac
   - Share via Messages/Email
3. **The exported JSON contains:**
   - Current board position (FEN)
   - All pieces and their roles (hunter/gatherer)
   - Whale positions and orientations
   - Coral placements and remaining counts
   - Move history
   - Game status (check, checkmate, draws, etc.)

## Exported JSON Format

```json
{
  "schemaVersion": "1.2.0",
  "exportedAt": "2025-10-20T19:58:05.887Z",
  "state": {
    "fen": "1tth1ttf/c1cddco1/2fo2c1/8/2o1OCD1/2D1O3/COC1H1OC/FTT2TTF w - - 2 11",
    "board": [
      /* 8x8 array of pieces */
    ],
    "history": [
      /* move history */
    ],
    "turn": "w",
    "whalePositions": {
      "w": ["e2", "e1"],
      "b": ["d8", "e8"]
    },
    "coral": [
      { "square": "d1", "color": "w" },
      { "square": "c1", "color": "w" }
    ],
    "coralRemaining": {
      "w": 12,
      "b": 8
    },
    "isGameOver": false,
    "inCheck": false,
    "isCheckmate": false,
    "isStalemate": false,
    "isDraw": false,
    "isCoralVictory": null
  }
}
```

## Creating Test Fixtures from Exports

When you hit a bug or want to test a specific game state:

### 1. Export the Game State

Click the share icon and save the JSON file.

### 2. Add to Test Fixtures

```bash
# Copy the exported file to fixtures directory
cp ~/Downloads/coral-clash-state-*.json src/hooks/__fixtures__/my-bug-name.json
```

### 3. Add to Fixture Loader (Optional)

To make it loadable in the UI, edit `src/components/FixtureLoaderModal.js`:

```javascript
import myBugName from '../hooks/__fixtures__/my-bug-name.json';

const FIXTURE_FILES = {
  // ... existing fixtures ...
  'my-bug-name': myBugName,
};

const FIXTURES = [
  // ... existing fixtures ...
  { name: 'my-bug-name', label: 'My Bug Description' },
];
```

### 4. Write a Test

```typescript
import { CoralClash } from './coralClash';
import { applyFixture } from './__fixtures__/fixtureLoader';
import myBugFixture from './__fixtures__/my-bug-name.json';

test('REGRESSION: description of bug', () => {
  const game = new CoralClash();
  applyFixture(game, myBugFixture);

  // Game is now in the exact state when the bug occurred
  // Test the behavior
  const moves = game.moves({ verbose: true });

  // Make assertions
  expect(moves.length).toBeGreaterThan(0);
  // etc...
});
```

## Common Use Cases

### Bug Reproduction

1. Play until you encounter a bug
2. Export the game state immediately
3. Load the fixture in a test
4. Reproduce and fix the bug
5. The test prevents regression

### Testing Edge Cases

1. Play to set up an interesting position
2. Export the state
3. Use as a fixture for testing:
   - Checkmate scenarios
   - Coral victory conditions
   - Complex whale movements
   - Coral blocking mechanics

### Sharing Bug Reports

When reporting a bug:

1. Export the game state
2. Include the JSON in your bug report
3. Developer can load it exactly and see the issue

## Example: Testing Crab Movement

```typescript
// 1. Play a game to get crabs in interesting positions
// 2. Export: "crab-movement.json"
// 3. Add to fixtures and loader
// 4. Write test:

test('crab should move to coral squares', () => {
  const game = new CoralClash();
  applyFixture(game, crabMovement);

  const moves = game.moves({ verbose: true, square: 'f4' });

  // White crab at f4 should be able to move to e4 (coral) and g4 (coral)
  expect(moves.find((m) => m.to === 'e4')).toBeDefined();
  expect(moves.find((m) => m.to === 'g4')).toBeDefined();
});
```

## Schema Versions

The export format uses semantic versioning:

- **1.0.0** - Initial format (basic game state)
- **1.1.0** - Added whale positions and orientations
- **1.2.0** - Added coral data (placements and remaining counts)

Older fixtures will automatically upgrade when loaded.

## Tips

- **Export early and often** when testing new features
- **Name fixtures descriptively** (e.g., `whale-coral-removal.json`, `crab-blocks-check.json`)
- **Add comments in tests** explaining what the fixture tests
- **Keep fixtures minimal** - only save positions that test specific behavior
- **Export works offline** - no network required

## Limitations

- Export button only appears in development mode
- Production builds don't have export functionality
- Each export is manual (no auto-save)
- Exports don't include animation state or UI preferences
