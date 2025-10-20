# Game State Auto-Save in React Native

Game states are now automatically saved after every white move when running in development mode!

## How It Works

✅ **Auto-save is automatically enabled** when running in `__DEV__` mode  
✅ **Saves after every white move** to your device  
✅ **Keeps the last 20 saves** (automatically cleans up old files)  
✅ **No performance impact** - saves happen asynchronously in the background

## File Locations

### iOS Simulator/Device

Files are saved to the app's documents directory:

```
<App Documents>/debug/move-001-2025-10-20T12-34-56.json
```

### Accessing Saved Files

**From iOS Simulator:**

1. Check Metro console for the file path
2. Or use Xcode: Window → Devices and Simulators → Select your device → Download Container

**From iOS Device:**

1. Connect device to Mac
2. Open Xcode
3. Window → Devices and Simulators
4. Select your device
5. Select Coral Clash app
6. Click the gear icon → Download Container
7. Browse to `AppData/Documents/debug/`

**Alternative (iTunes File Sharing):**
If you enable File Sharing in Info.plist, you can access via Finder.

## File Naming

Auto-saved files are named with move number and timestamp:

- `move-001-2025-10-20T08-10-23.json` - After white's 1st move
- `move-002-2025-10-20T08-10-45.json` - After white's 2nd move
- `move-015-2025-10-20T08-15-30.json` - After white's 15th move

## When You Hit a Bug

1. **Note the move number** where the bug occurred
2. **Check the Metro console** - it logs each save
3. **The most recent file** contains the state right before the bug
4. **Download the file** from the device/simulator
5. **Copy to test fixtures**:
    ```bash
    cp /path/to/downloaded/move-015-*.json src/hooks/__fixtures__/bug-name.json
    ```
6. **Write regression test**:

    ```typescript
    import { loadGameStateFixture } from '../../test-utils/gameStateHelpers';

    test('REGRESSION: bug description', () => {
        const game = loadGameStateFixture('bug-name');

        // Game is now in the exact state before the bug
        // Replay the moves that caused it
        game.move({ from: 'e1', to: 'd2' });

        // Test the fix
        expect(
            game
                .board()
                .flat()
                .filter((c) => c?.type === 'h').length,
        ).toBe(2);
    });
    ```

## Console Output

When auto-save is enabled, you'll see:

```
🐛 Debug mode enabled
📁 Game states will be saved to: file:///Users/.../Documents/debug/
💡 Access files via iTunes File Sharing or Xcode device manager
✓ Auto-saved game state: move-001-2025-10-20T12-34-56.json
✓ Auto-saved game state: move-002-2025-10-20T12-35-12.json
```

## Disabling Auto-Save

To disable auto-save (e.g., for performance testing):

```typescript
import { disableAutoSave } from './src/utils/gameStateHelpers.native';

// In your code
disableAutoSave();
```

Or remove the debug mode import from `App.js`:

```javascript
// Comment out or remove this:
// if (__DEV__) {
//     require('./src/utils/enableDebugMode');
// }
```

## Manual Saving

You can also manually save a game state at any point:

```typescript
import { saveGameStateDebug } from '../utils/gameStateHelpers.native';

// Somewhere in your component
const handleBug = async () => {
    await saveGameStateDebug(game, 'bug-description', {
        bug: 'Whale disappeared',
        moveNumber: game.history().length,
        notes: 'After rotating whale',
    });

    alert('Game state saved!');
};
```

## File Format

Each saved file contains:

```json
{
  "version": 1,
  "timestamp": "2025-10-20T12:34:56.789Z",
  "metadata": {
    "autoSaved": true,
    "moveNumber": 15,
    "fen": "...",
    "lastMove": { ... }
  },
  "gameState": {
    "fen": "...",
    "turn": "w",
    "moveNumber": 15,
    "board": { ... },
    "coral": { ... },
    "history": [ ... ]
  }
}
```

## Troubleshooting

**Files not being saved?**

- Check Metro console for errors
- Ensure you're in DEV mode (`__DEV__` is true)
- Check that auto-save is enabled (look for the 🐛 Debug mode message)

**Can't find saved files?**

- Check Metro console for the full path
- Use Xcode device manager to download app container
- Files are in the app's Documents/debug/ folder

**Too many files?**

- Auto-cleanup keeps only the last 20 files
- Older files are automatically deleted

## Integration with Tests

The same game state format works in both React Native and Node.js tests:

**React Native** → Save with `expo-file-system`  
**Node.js Tests** → Load with Node.js `fs` module  
**Same Format** → Files are compatible between both!

Copy a file from your device to `src/hooks/__fixtures__/` and it's instantly usable in tests.
