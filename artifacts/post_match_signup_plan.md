# Implementation Plan: Post-Match Signup Prompt for Anonymous Users

In this task, we will implement a new feature that encourages signed-out users to create an account after finishing a game against the computer. This will involve updating the localization files and modifying the main game board component to detect the end of a computer match and show the alert.

## Proposed Changes

### 1. Localization (`src/locales/en.json`)
*   Add a new entry for the post-match signup prompt:
    ```json
    "game": {
        "postMatchSignup": {
            "title": "Great game!",
            "message": "Want to save your stats and play against real people?",
            "button": "Sign Up Now"
        }
    }
    ```

### 2. Game Board Logic (`src/components/BaseCoralClashBoard.js`)
*   Add a `useEffect` to monitor when `isGameOver` becomes true.
*   Check if the user is NOT signed in (`!user`) and the `opponentType` is `'computer'`.
*   Trigger an alert using `showAlert` with:
    *   **Title**: `t('game.postMatchSignup.title')`
    *   **Message**: `t('game.postMatchSignup.message')`
    *   **Button**: `t('game.postMatchSignup.button')` -> `navigation.navigate('Log In')`.

## Verification Plan

### Manual Verification
1. Start a game against the computer as a signed-out user.
2. Complete the game (win, lose, or draw).
3. Verify that the "Great game!" alert appears.
4. Click "Sign Up Now" and ensure it navigates to the login/signup screen.
