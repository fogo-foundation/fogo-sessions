#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function log(message) {
  console.log(`[sessions-sdk-setup] ${message}`);
}

function error(message) {
  console.error(`[sessions-sdk-setup] ERROR: ${message}`);
}

function detectPackageManager() {
  // Check for lock files to determine package manager
  if (fs.existsSync('yarn.lock')) {
    return 'yarn';
  } else if (fs.existsSync('pnpm-lock.yaml')) {
    return 'pnpm';
  } else if (fs.existsSync('bun.lockb')) {
    return 'bun';
  }
  return 'npm';
}

function runCommand(command, packageManager) {
  try {
    log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (error_) {
    error(`Failed to execute: ${command}`);
    if (packageManager !== 'npm') {
      log(
        `If you're having issues, try running the command manually or switch to npm`
      );
    }
    throw error_;
  }
}

function addDependenciesToPackageJson(dependencies, isDev = false) {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      error('package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const depKey = isDev ? 'devDependencies' : 'dependencies';

    if (!packageJson[depKey]) {
      packageJson[depKey] = {};
    }

    let added = false;
    for (const dep of dependencies) {
      // Extract package name and version
      const [packageName, version] =
        dep.includes('@') && !dep.startsWith('@')
          ? dep.split('@')
          : (dep.startsWith('@')
            ? [dep.split('@').slice(0, 2).join('@'), dep.split('@')[2]]
            : [dep, null]);

      if (!packageJson[depKey][packageName]) {
        // Use provided version or fallback to latest
        const finalVersion = version || 'latest';
        packageJson[depKey][packageName] = finalVersion;
        added = true;
        log(`Added ${packageName}@${finalVersion} to ${depKey}`);
      }
    }

    if (added) {
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n'
      );
      log('Updated package.json with new dependencies');
    }
  } catch (error_) {
    error(`Failed to update package.json: ${error_.message}`);
    throw error_;
  }
}

function installDependencies() {
  const packageManager = detectPackageManager();
  log(`Detected package manager: ${packageManager}`);

  // Peer dependencies that need to be installed
  const peerDeps = [
    '@metaplex-foundation/umi@>=1.4.0',
    '@noble/ciphers@>=1.0.0',
    '@noble/curves@>=1.0.0',
    '@noble/hashes@>=1.0.0',
    '@scure/base@>=1.0.0',
    '@solana/webcrypto-ed25519-polyfill@>=3.0.0',
    'expo-camera@>=16.0.0',
    'expo-secure-store@>=14.2.3',
    'expo-standard-web-crypto@>=2.1.4',
    'react-native-qrcode-svg@>=6.3.11',
    'react-native-svg@>=15.1.0',
    'tweetnacl@>=1.0.3',
  ];

  // Additional dependencies required for polyfills
  let polyfillDeps = [
    'react-native-get-random-values@^1.9.0',
    'react-native-url-polyfill@^2.0.0',
    'buffer@^6.0.3',
    'process@^0.11.10',
  ];

  // Add Expo-specific dependencies if Expo is detected
  if (isExpoProject()) {
    const expoSpecificDeps = [
      'readable-stream@^4.7.0',
      'expo-crypto@^14.1.5',
      'browserify-zlib@^0.2.0',
      'path-browserify@^1.0.1',
    ];

    // Check which dependencies are missing and add them
    const allRequiredDeps = [...polyfillDeps, ...expoSpecificDeps];
    const missingDeps = checkMissingDependencies(allRequiredDeps);
    polyfillDeps = missingDeps;
  } else {
    // For non-Expo projects, still check for missing basic polyfill dependencies
    const missingDeps = checkMissingDependencies(polyfillDeps);
    polyfillDeps = missingDeps;
  }

  const allDeps = [...peerDeps, ...polyfillDeps];

  // Log what will be installed
  if (polyfillDeps.length > 0) {
    log(`Missing dependencies detected: ${polyfillDeps.join(', ')}`);
  } else {
    log('All required dependencies are already installed');
    return;
  }

  // Add dependencies to package.json first
  if (polyfillDeps.length > 0) {
    addDependenciesToPackageJson(polyfillDeps);
  }

  // For npm v7+, peer dependencies are auto-installed
  // For other package managers, we need to add them to package.json too
  if (packageManager === 'npm') {
    // Check npm version to determine if peer deps are auto-installed
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      const majorVersion = Number.parseInt(npmVersion.split('.')[0]);

      if (majorVersion >= 7) {
        // Only install polyfill dependencies for npm v7+ since peer deps are auto-installed
        if (polyfillDeps.length > 0) {
          const installCmd = `npm install`;
          runCommand(installCmd, packageManager);
        }
        log('Peer dependencies should be automatically installed by npm v7+');
      } else {
        // For npm v6 and below, add peer dependencies to package.json too
        const missingPeerDeps = checkMissingDependencies(peerDeps);
        if (missingPeerDeps.length > 0) {
          addDependenciesToPackageJson(missingPeerDeps);
        }
        const installCmd = `npm install`;
        runCommand(installCmd, packageManager);
      }
    } catch {
      // If we can't determine npm version, add all dependencies
      log('Could not determine npm version, adding all dependencies');
      const missingPeerDeps = checkMissingDependencies(peerDeps);
      if (missingPeerDeps.length > 0) {
        addDependenciesToPackageJson(missingPeerDeps);
      }
      const installCmd = `npm install`;
      runCommand(installCmd, packageManager);
    }
  } else {
    // For yarn, pnpm, bun - add peer dependencies to package.json too
    const missingPeerDeps = checkMissingDependencies(peerDeps);
    if (missingPeerDeps.length > 0) {
      addDependenciesToPackageJson(missingPeerDeps);
    }

    let installCmd;
    switch (packageManager) {
      case 'yarn': {
        installCmd = `yarn install`;
        break;
      }
      case 'pnpm': {
        installCmd = `pnpm install`;
        break;
      }
      case 'bun': {
        installCmd = `bun install`;
        break;
      }
    }

    runCommand(installCmd, packageManager);
  }
}

function isExpoProject() {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return !!(
        packageJson.dependencies?.expo || packageJson.devDependencies?.expo
      );
    }
  } catch {
    log(
      'Could not determine if project uses Expo, assuming standard React Native'
    );
  }
  return false;
}

function checkMissingDependencies(requiredDeps) {
  const missingDeps = [];

  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return requiredDeps; // Return all as missing if no package.json
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };

    for (const dep of requiredDeps) {
      // Extract package name from version specification (e.g., "buffer@^1.0.0" -> "buffer")
      const packageName =
        dep.includes('@') && !dep.startsWith('@')
          ? dep.split('@')[0]
          : (dep.startsWith('@')
            ? dep.split('@').slice(0, 2).join('@') // Handle scoped packages like @noble/hashes
            : dep);

      if (!allDeps[packageName]) {
        missingDeps.push(dep);
      }
    }
  } catch (error_) {
    log(`Error checking dependencies: ${error_.message}`);
    return requiredDeps; // Return all as missing if error occurs
  }

  return missingDeps;
}

function setupPolyfill() {
  const polyfillPath = path.resolve(process.cwd(), 'polyfills.js');

  if (fs.existsSync(polyfillPath)) {
    log('polyfills.js already exists, skipping polyfill setup');
  } else {
    log('Creating polyfills.js file with comprehensive polyfills');

    const polyfillContent = `// polyfills.js - Comprehensive polyfills for @fogo/sessions-sdk-react-native
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import { sha256, sha512 } from '@noble/hashes/sha2.js'

// Set up window object - React Native doesn't have window
if (typeof global.window === 'undefined') {
  global.window = global;
}

global.Buffer = Buffer

Buffer.prototype.subarray = function subarray(begin, end) {
  const result = Uint8Array.prototype.subarray.apply(this, [begin, end]);
  Object.setPrototypeOf(result, Buffer.prototype); // Explicitly add the \`Buffer\` prototype (adds \`readUIntLE\`!)
  return result;
};

// Set up process globally
if (typeof global.process === 'undefined') {
  global.process = require('process/browser');
}

// Set up TextEncoder/TextDecoder if needed
if (typeof global.TextEncoder === 'undefined') {
  try {
    const util = require('util');
    global.TextEncoder = util.TextEncoder;
    global.TextDecoder = util.TextDecoder;
  } catch (e) {
    // Fallback: React Native should have these natively
  }
}

// Set up URL and URLSearchParams if not available
if (typeof global.URL === 'undefined') {
  if (typeof URL !== 'undefined') {
    global.URL = URL;
    global.URLSearchParams = URLSearchParams;
  } else {
    try {
      const { URL, URLSearchParams } = require('url');
      global.URL = URL;
      global.URLSearchParams = URLSearchParams;
    } catch (e) {
      console.warn('URL polyfill not available');
    }
  }
}

// Set up Blob if not available
if (typeof global.Blob === 'undefined') {
  if (typeof Blob !== 'undefined') {
    global.Blob = Blob;
  }
}

// Set up File if not available
if (typeof global.File === 'undefined') {
  if (typeof File !== 'undefined') {
    global.File = File;
  }
}

// Add FormData polyfill
if (typeof global.FormData === 'undefined') {
  if (typeof FormData !== 'undefined') {
    global.FormData = FormData;
  } else {
    // Create a basic FormData polyfill
    global.FormData = class FormData {
      constructor() {
        this._fields = [];
      }

      append(name, value, filename) {
        this._fields.push([name, value, filename]);
      }

      get(name) {
        const field = this._fields.find(([fieldName]) => fieldName === name);
        return field ? field[1] : null;
      }

      getAll(name) {
        return this._fields
          .filter(([fieldName]) => fieldName === name)
          .map(([, value]) => value);
      }

      has(name) {
        return this._fields.some(([fieldName]) => fieldName === name);
      }

      delete(name) {
        this._fields = this._fields.filter(([fieldName]) => fieldName !== name);
      }

      entries() {
        return this._fields
          .map(([name, value]) => [name, value])
        [Symbol.iterator]();
      }

      keys() {
        return this._fields.map(([name]) => name)[Symbol.iterator]();
      }

      values() {
        return this._fields.map(([, value]) => value)[Symbol.iterator]();
      }

      forEach(callback, thisArg) {
        this._fields.forEach(([name, value]) => {
          callback.call(thisArg, value, name, this);
        });
      }
    };
  }
}

if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Apply crypto polyfills
require('@solana/webcrypto-ed25519-polyfill').install();

// Polyfill for crypto.subtle.digest
const subtleDigestPolyfill = async (algorithm, data) => {
  // Convert data to a Uint8Array if it's an ArrayBuffer
  const dataArray = new Uint8Array(data);

  // Perform the digest operation based on the algorithm
  let hash;
  switch (algorithm.toUpperCase()) {
    case 'SHA-256':
      hash = sha256(dataArray);
      break;
    case 'SHA-512':
      hash = sha512(dataArray);
      break;
    default:
      throw new Error(\`Unsupported algorithm: \${algorithm}\`);
  }

  // Return the hash as an ArrayBuffer
  return hash.buffer;
};

globalThis.crypto.subtle.digest = subtleDigestPolyfill

// Helper function to create an iterator with array methods (used by both Map and Array polyfills)
const createIteratorWithArrayMethods = (array) => {
  const arraySnapshot = [...array];
  return {
    [Symbol.iterator]() {
      let index = 0;
      return {
        next() {
          if (index < arraySnapshot.length) {
            return { value: arraySnapshot[index++], done: false };
          }
          return { done: true };
        }
      };
    },
    filter(predicate) {
      const result = arraySnapshot.filter(predicate);
      return createIteratorWithArrayMethods(result);
    },
    map(callback) {
      const result = arraySnapshot.map(callback);
      return createIteratorWithArrayMethods(result);
    },
    forEach(callback) {
      return arraySnapshot.forEach(callback);
    },
    find(predicate) {
      return arraySnapshot.find(predicate);
    },
    some(predicate) {
      return arraySnapshot.some(predicate);
    },
    every(predicate) {
      return arraySnapshot.every(predicate);
    },
    reduce(callback, initialValue) {
      return arraySnapshot.reduce(callback, initialValue);
    },
    toArray() {
      return [...arraySnapshot];
    }
  };
};

// Polyfill for Hermes: Add array methods to Map iterators
// The @fogo/sessions-sdk uses Map.prototype.entries().filter() and .map() which are not supported in Hermes
if (typeof Map !== 'undefined') {
  // Polyfill Map.prototype.entries
  const originalEntries = Map.prototype.entries;
  Map.prototype.entries = function() {
    const iterator = originalEntries.call(this);
    const entriesArray = Array.from(iterator);
    return createIteratorWithArrayMethods(entriesArray);
  };

  // Polyfill Map.prototype.values
  const originalValues = Map.prototype.values;
  Map.prototype.values = function() {
    const iterator = originalValues.call(this);
    const valuesArray = Array.from(iterator);
    return createIteratorWithArrayMethods(valuesArray);
  };

  // Polyfill Map.prototype.keys
  const originalKeys = Map.prototype.keys;
  Map.prototype.keys = function() {
    const iterator = originalKeys.call(this);
    const keysArray = Array.from(iterator);
    return createIteratorWithArrayMethods(keysArray);
  };
}

// Polyfill for Array.prototype.values() and ensure Array methods work properly in Hermes
if (typeof Array !== 'undefined' && Array.prototype) {
  // Check if Array.prototype.values needs polyfilling or enhancement
  const originalArrayValues = Array.prototype.values;
  let needsValuesPolyfill = false;

  if (!originalArrayValues) {
    needsValuesPolyfill = true;
  } else {
    // Test if existing values() method supports .map()
    try {
      const testResult = originalArrayValues.call([1, 2]);
      if (typeof testResult.map !== 'function') {
        needsValuesPolyfill = true;
      }
    } catch (e) {
      needsValuesPolyfill = true;
    }
  }

  if (needsValuesPolyfill) {
    Array.prototype.values = function() {
      if (!this || typeof this.length !== 'number') {
        throw new TypeError('Array.prototype.values called on non-array');
      }
      const valuesArray = Array.from(this);
      return createIteratorWithArrayMethods(valuesArray);
    };
  }

  // Safely check and add Array.prototype.keys() with array methods
  try {
    const originalArrayKeys = Array.prototype.keys;
    if (!originalArrayKeys) {
      Array.prototype.keys = function() {
        if (!this || typeof this.length !== 'number') {
          throw new TypeError('Array.prototype.keys called on non-array');
        }
        const keysArray = Array.from(Array(this.length).keys());
        return createIteratorWithArrayMethods(keysArray);
      };
    } else {
      // Test if the original keys() method supports .map()
      try {
        const testResult = originalArrayKeys.call([1, 2]);
        if (typeof testResult.map !== 'function') {
          Array.prototype.keys = function() {
            if (!this || typeof this.length !== 'number') {
              throw new TypeError('Array.prototype.keys called on non-array');
            }
            const keysArray = Array.from(Array(this.length).keys());
            return createIteratorWithArrayMethods(keysArray);
          };
        }
      } catch (e) {
        // If testing fails, use our polyfill
        Array.prototype.keys = function() {
          if (!this || typeof this.length !== 'number') {
            throw new TypeError('Array.prototype.keys called on non-array');
          }
          const keysArray = Array.from(Array(this.length).keys());
          return createIteratorWithArrayMethods(keysArray);
        };
      }
    }
  } catch (e) {
    console.warn('Failed to polyfill Array.prototype.keys:', e);
  }

  // Safely check and add Array.prototype.entries() with array methods
  try {
    const originalArrayEntries = Array.prototype.entries;
    if (!originalArrayEntries) {
      Array.prototype.entries = function() {
        if (!this || typeof this.length !== 'number') {
          throw new TypeError('Array.prototype.entries called on non-array');
        }
        const entriesArray = this.map((value, index) => [index, value]);
        return createIteratorWithArrayMethods(entriesArray);
      };
    } else {
      // Test if the original entries() method supports .map()
      try {
        const testResult = originalArrayEntries.call([1, 2]);
        if (typeof testResult.map !== 'function') {
          Array.prototype.entries = function() {
            if (!this || typeof this.length !== 'number') {
              throw new TypeError('Array.prototype.entries called on non-array');
            }
            const entriesArray = Array.from(originalArrayEntries.call(this));
            return createIteratorWithArrayMethods(entriesArray);
          };
        }
      } catch (e) {
        // If testing fails, use our polyfill
        Array.prototype.entries = function() {
          if (!this || typeof this.length !== 'number') {
            throw new TypeError('Array.prototype.entries called on non-array');
          }
          const entriesArray = this.map((value, index) => [index, value]);
          return createIteratorWithArrayMethods(entriesArray);
        };
      }
    }
  } catch (e) {
    console.warn('Failed to polyfill Array.prototype.entries:', e);
  }
}

console.log('Sessions SDK polyfills loaded successfully');
`;

    try {
      fs.writeFileSync(polyfillPath, polyfillContent);
      log(
        'Created polyfills.js - make sure to import this at the top of your app entry point'
      );
      log(
        'Example: import "./polyfills.js"; // Add this as the first import in App.js or index.js'
      );
    } catch (error_) {
      error(`Failed to create polyfills.js: ${error_.message}`);
      throw error_;
    }
  }

  // Setup Expo-specific files if needed
  if (isExpoProject()) {
    setupExpoConfig();
  }
}

function setupExpoConfig() {
  log('Expo project detected, setting up metro config and fs-mock');

  // Create fs-mock.js
  const fsMockPath = path.resolve(process.cwd(), 'fs-mock.js');
  if (fs.existsSync(fsMockPath)) {
    log('fs-mock.js already exists, skipping');
  } else {
    const fsMockContent = `// fs-mock.js - Mock implementation for React Native
module.exports = {
  readFileSync: () => {
    throw new Error('fs.readFileSync is not supported in React Native');
  },
  writeFileSync: () => {
    throw new Error('fs.writeFileSync is not supported in React Native');
  },
  existsSync: () => false,
  // Add other fs methods as needed
};
`;

    try {
      fs.writeFileSync(fsMockPath, fsMockContent);
      log('Created fs-mock.js');
    } catch (error_) {
      error(`Failed to create fs-mock.js: ${error_.message}`);
      throw error_;
    }
  }

  // Create or update metro.config.js
  const metroConfigPath = path.resolve(process.cwd(), 'metro.config.js');
  if (fs.existsSync(metroConfigPath)) {
    log(
      'metro.config.js already exists - please manually merge the resolver configuration'
    );
    log(
      'Refer to the library documentation for the required metro config changes'
    );
  } else {
    const metroConfigContent = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const ALIASES = {
    buffer: require.resolve("buffer"),
    stream: require.resolve("readable-stream"),
    crypto: require.resolve("expo-crypto"),
    process: require.resolve("process/browser"),
    zlib: require.resolve("browserify-zlib"),
    path: require.resolve("path-browserify"),
    url: require.resolve("react-native-url-polyfill"),
    fs: path.resolve(__dirname, "fs-mock.js"),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle missing-asset-registry-path error
    if (moduleName === "missing-asset-registry-path") {
        return {
            filePath: require.resolve("react-native/Libraries/Image/AssetRegistry"),
            type: "sourceFile",
        };
    }

    // Handle Metaplex UMI serializers specifically
    if (moduleName === "@metaplex-foundation/umi/serializers") {
        try {
            return {
                filePath: require.resolve(
                    "@metaplex-foundation/umi/dist/esm/serializers.mjs",
                    {
                        paths: [context.originModulePath],
                    },
                ),
                type: "sourceFile",
            };
        } catch (e) {
            try {
                return {
                    filePath: require.resolve("@metaplex-foundation/umi/serializers", {
                        paths: [context.originModulePath],
                    }),
                    type: "sourceFile",
                };
            } catch (e2) {
                // Fall back to default resolution
            }
        }
    }

    // Ensure you call the default resolver.
    return context.resolveRequest(
        context,
        // Use an alias if one exists.
        ALIASES[moduleName] ?? moduleName,
        platform,
    );
};

config.transformer = {
    ...config.transformer,
    getTransformOptions: async () => ({
        transform: {
            experimentalImportSupport: false,
            inlineRequires: true,
        },
    }),
};

config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs", "mjs"];

module.exports = config;
`;

    try {
      fs.writeFileSync(metroConfigPath, metroConfigContent);
      log('Created metro.config.js with necessary resolver configurations');
    } catch (error_) {
      error(`Failed to create metro.config.js: ${error_.message}`);
      throw error_;
    }
  }
}

function main() {
  try {
    log('Setting up @fogo/sessions-sdk-react-native dependencies...');

    installDependencies();
    setupPolyfill();

    log('Setup completed successfully!');
    log('');
    log('Next steps:');
    log(
      '1. Import the polyfills.js file at the top of your app entry point (App.js or index.js)'
    );
    log('   Example: import "./polyfills.js"; // Add this as the first import');
    if (isExpoProject()) {
      log(
        '2. Expo project detected - metro.config.js and fs-mock.js have been configured'
      );
      log('3. Restart your Metro bundler to apply the configuration changes');
      log('4. For more details, check the library documentation');
    } else {
      log(
        '2. Make sure your metro.config.js includes the necessary resolver configuration'
      );
      log('3. For more details, check the library documentation');
    }
  } catch {
    error('Setup failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
