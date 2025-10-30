export default {
  testEnvironment: 'jsdom',
  modulePathIgnorePatterns: [
    '<rootDir>/example/node_modules',
    '<rootDir>/lib/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest-setup.js'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react'
      ],
      plugins: [
        [
          'module-resolver',
          {
            alias: {
              fs: false,
              crypto: 'crypto-browserify',
              buffer: 'buffer',
              stream: 'readable-stream',
            },
          },
        ],
      ],
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@solana|@coral-xyz|@noble|@scure|@metaplex-foundation|@fogo|react-native|@react-native|react-native-.*|uuid|jayson)/)'
  ],
  moduleNameMapper: {
    '^@fogo/(.*)$': '<rootDir>/node_modules/@fogo/$1',
    '^react-native$': 'react-native-web'
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.tsx'
  ],
  testMatch: [
    '**/__tests__/**/*.test.{js,ts,tsx}'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ]
};