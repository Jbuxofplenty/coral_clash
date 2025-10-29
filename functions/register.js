// Register ts-node to handle TypeScript imports with ES modules
import { dirname } from 'path';
import { register } from 'ts-node';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

register({
    project: __dirname + '/tsconfig.json',
    transpileOnly: true,
    compilerOptions: {
        module: 'esnext',
    },
    esm: true,
});
