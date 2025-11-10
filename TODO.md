# TODO: Fix Remaining Whale Check Tests

## Context

Protection rule has been implemented: "A whale can only be captured by opposing whale if BOTH squares are unprotected by friendly pieces (non-whale)."

## Remaining Failing Tests (3)

### 1. whale-check-9: Coral blocking whale attacks

- **Issue**: Black whale at d8,e8 should be able to attack white at d6,e6 through coral, but parallel slide logic stops at coral before reaching capture
- **Root cause**: In `_generateWhaleMoves`, the parallel slide breaks on coral (line 2096-2098) even when the next step would be a capture
- **Fix needed**: Look ahead one step before breaking on coral - don't break if next position would be a capture

### 2. whale-check-10: Check detection with adjacent whales

- **Issue**: `inCheck()` returns false when it should return true
- **Positions**: White at e4,f4, Black at e5,f5 (adjacent)
- **Root cause**: Protection rule logic in `_canWhaleLegallyAttack` is being applied to current position check, not just move validation
- **Fix needed**: Protection rule should ONLY apply when validating moves to new positions, NOT when checking if current position is under attack

### 3. whale-check-11: Check detection with one square protected

- **Issue**: `inCheck()` returns false when it should return true
- **Positions**: White at c4,c3, Black at d6,d5
- **Root cause**: Same as whale-check-10 - protection rule incorrectly blocking check detection on current position
- **Fix needed**: Same as whale-check-10

## Implementation Notes

The protection rule is correctly working for move generation (tests 2, 4, 8, 13 all pass), but needs refinement for:

1. Coral interaction with parallel slides (test 9)
2. Current position check detection vs. move validation (tests 10, 11)
