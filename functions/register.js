// Register ts-node to handle TypeScript imports
require('ts-node').register({
    project: __dirname + '/tsconfig.json',
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
    },
});
