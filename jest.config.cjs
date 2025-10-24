module.exports = {
    roots: ['build'],
    moduleDirectories: [
        'node_modules', 'dist'
    ],
    moduleNameMapper: {
        '^parse5$': '<rootDir>/node_modules/parse5/dist/cjs/index.js',
        '^parse5/(.*)$': '<rootDir>/node_modules/parse5/dist/cjs/$1',
    },
    transform: {
        '\\.wasm$': './tests/jestFileTransformer.cjs',
    },
    testEnvironment: 'node',
    testTimeout: 5000,
    testSequencer: './tests/testSequencer.cjs',
}
