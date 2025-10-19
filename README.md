# Coral Clash

An online chess-like strategy board game built with React Native and Expo.

## About

Coral Clash is a mobile board game application featuring ocean-themed pieces and gameplay. Built using React Native with Expo for cross-platform support on iOS and Android.

## Prerequisites

- Node.js 22+ (LTS) or Node.js 23+
- Yarn or npm
- Expo CLI
- iOS Simulator (for macOS) or Android Emulator

## Quick Start

### 1. Install Dependencies

```bash
yarn install
# or
npm install
```

### 2. Start the Development Server

```bash
yarn start
# or
npm start
```

This will start the Expo development server and open the Expo DevTools in your browser.

### 3. Run on a Device

**iOS Simulator (macOS only):**

```bash
yarn ios
# or
npm run ios
```

**Android Emulator:**

```bash
yarn android
# or
npm run android
```

**Physical Device:**

1. Install the Expo Go app on your phone
2. Scan the QR code shown in the terminal or Expo DevTools

## Tech Stack

- **Expo SDK 54** - Development framework
- **React Native 0.76** - Mobile app framework
- **React Navigation v7** - Navigation
- **TypeScript** - Type safety
- **Galio Framework** - UI components

## Project Structure

```
coral_clash/
├── src/                    # Main source code
│   ├── components/        # React components
│   │   ├── CoralClashBoard.js
│   │   ├── EmptyBoard.js
│   │   ├── Moves.js
│   │   └── Pieces.js
│   ├── hooks/            # Custom React hooks
│   ├── screens/          # Screen components
│   └── images/           # Image assets
├── components/           # JavaScript components
├── navigation/           # App navigation
├── screens/             # Legacy screens
├── constants/           # Theme and constants
└── assets/              # Static assets
```

## Development

- **TypeScript**: Configured for strict type checking
- **Hot Reload**: Changes update instantly during development
- **Cross-platform**: Single codebase for iOS and Android

## Troubleshooting

**Clear cache and restart:**

```bash
expo start -c
```

**Reinstall dependencies:**

```bash
rm -rf node_modules
yarn install
```

**iOS build issues:**

```bash
cd ios
pod install
cd ..
```

## License

Licensed under MIT
