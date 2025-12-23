#!/usr/bin/env node
/**
 * Inject version from package.json into game/index.ts before build
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const indexTsPath = path.join(__dirname, '..', 'game', 'index.ts');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read index.ts
let indexTs = fs.readFileSync(indexTsPath, 'utf8');

// Replace version using regex
const versionRegex = /export const GAME_VERSION = '[^']*';/;
const newVersionLine = `export const GAME_VERSION = '${version}';`;

if (!versionRegex.test(indexTs)) {
    console.error('❌ Could not find GAME_VERSION export in game/index.ts');
    process.exit(1);
}

indexTs = indexTs.replace(versionRegex, newVersionLine);

// Write back
fs.writeFileSync(indexTsPath, indexTs, 'utf8');

console.log(`✅ Injected version ${version} into game/index.ts`);

