# Game State Fixtures

This directory contains exported game states for testing purposes.

## Exporting Game States

1. Play the game to a specific state you want to test
2. Tap the **Share** button (middle button in the control bar)
3. Save the JSON file to your Mac
4. Copy the file to this `__fixtures__` directory
5. Name it descriptively (e.g., `checkmate-whale-victory.json`)

## Using Fixtures in Tests

```typescript
import { CoralClash } from './coralClash';
import { applyFixture, validateFixtureVersion } from './__fixtures__/fixtureLoader';

// Import fixtures directly (Jest only - doesn't work in React Native)
const exampleState = require('./__fixtures__/example-state.json');

describe('My Test', () => {
    it('should handle a specific game state', () => {
        const fixture = exampleState;
        validateFixtureVersion(fixture); // Optional: check schema version

        const game = new CoralClash();
        applyFixture(game, fixture);

        // Now test with the loaded state
        expect(game.fen()).toBe(fixture.state.fen);
    });
});
```

**Note:** Import fixtures statically at the top of your file. Dynamic `require()` with template literals doesn't work with React Native's Metro bundler.

## Fixture Schema

### v1.1.0 (Current)

Adds whale position preservation to correctly restore whale orientation.

```json
{
  "schemaVersion": "1.1.0",
  "exportedAt": "2025-10-20T12:34:56.789Z",
  "state": {
    "fen": "...",
    "board": [...],
    "history": [...],
    "turn": "w",
    "whalePositions": {
      "w": ["d1", "e1"],
      "b": ["d8", "e8"]
    },
    "isGameOver": false,
    "inCheck": false,
    "isCheckmate": false,
    "isStalemate": false,
    "isDraw": false,
    "isCoralVictory": false
  }
}
```

**What's new in v1.1.0:**

- `whalePositions`: Stores the exact two squares each whale occupies
- Preserves whale orientation (horizontal vs vertical) across export/import
- FEN alone doesn't encode whale orientation, so this field is essential for testing specific whale configurations

### v1.0.0 (Legacy)

Original schema without whale position tracking. v1.0.0 fixtures will still load but whale orientation may be lost (defaults to horizontal placement).
