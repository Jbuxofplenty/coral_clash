const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    // Global ignores (replaces .eslintignore)
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.app/**',
            '**/*.apk',
            '**/*.tar.gz',
            'ios/Pods/**',
            'ios/build/**',
            'android/app/build/**',
            'android/build/**',
            'android/.gradle/**',
            '.expo/**',
            '.expo-shared/**',
            'coverage/**',
            '**/*.log',
            '.vscode/**',
            '.idea/**',
            'fastlane/**',
            'google-service-account.json',
        ],
    },

    // JavaScript/JSX rules
    {
        files: ['**/*.js', '**/*.jsx'],
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-native': reactNativePlugin,
        },
        languageOptions: {
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                __DEV__: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // Unused variables - only warn, not error
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_|^React$', // Ignore React imports
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],

            // React rules
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off', // Not needed in React Native
            'react/display-name': 'off',
            'react/jsx-uses-react': 'off', // React is not "used" in modern JSX
            'react/jsx-uses-vars': 'error', // Prevents false positives for JSX components

            // React Hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // React Native
            'react-native/no-unused-styles': 'warn',
            'react-native/no-inline-styles': 'off',
            'react-native/no-color-literals': 'off',
            'react-native/no-raw-text': 'off',
        },
    },

    // TypeScript/TSX rules
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-native': reactNativePlugin,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                __DEV__: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            // TypeScript handles unused vars better
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_|^React$',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],

            // React rules
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/display-name': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error',

            // React Hooks
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // React Native
            'react-native/no-unused-styles': 'warn',
            'react-native/no-inline-styles': 'off',
            'react-native/no-color-literals': 'off',
            'react-native/no-raw-text': 'off',
        },
    },
];
