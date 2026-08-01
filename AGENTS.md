# Fogo Sessions - Agent Guidelines

## Project Overview

Fogo Sessions is a monorepo containing web applications and core tooling for the Fogo blockchain ecosystem. The project uses:

- **pnpm** for package management for web apps and libraries(to see the version go to /package.json -> "packageManager")
- **cargo** for package management in Rust
- **Turborepo** for task orchestration of Node related apps
- **Next.js** for web applications (version 15+)
- **TypeScript** throughout all Node related apps and packages
- **Anchor** for Solana program development
- **Rust** for Solana programs and different services, eg. Paymaster
- **Tilt** for orchestrating solana programs with other services and web apps

### Project Structure

**Apps** (`apps/`):

- `paymaster-admin` - Web App for managing paymaster configuration, it changes a centralized pgsql database
- `portfolio` - Web App where users can connect their web3 solana wallet and manage their assets
- `sessions-demo` - Web App for testing and demoing the sessions

**Packages** (`packages/`):

- `component-library` - The UI component library that is used by the `paymaster-admin`, `portfolio` and `sessions-sdk-react` projects
- `sessions-idls` - Solana IDLs - JSON files that describe the interface of a program, TypeScript package exporting Solana program IDLs and associated types
- `sessions-sdk-react` - This is the sessions widget, uses `@fogo/sessions-idls`, `@fogo/sessions-sdk`, `@fogo/sessions-sdk-web` as dependencies
- `sessions-sdk-rs` - Rust SDK for interacting with sessions on chain
- `sessions-sdk-ts` - Core TypeScript SDK for sessions logic
- `sessions-sdk-web` - Framework-agnostic web utilities for sessions
- `solana-intents` - Rust utilities for Solana intents

**Programs** (`programs/`):
Anchor/Solana Rust programs:

- `programs/chain-id`: minimal program storing the global chain identifier of an SVM blockchain
- `programs/domain-registry`: registry mapping a domain string to a whitelist of programs that a session for the domain is allowed to interact with
- `programs/example`: demo of a sessions powered token transfer
- `programs/intent-transfer`: intent-based intra and interchain transfers
- `programs/session-manager`: core session manager
- `programs/tollbooth:` allows paymasters to charge a toll in exchange for gas sponsoring

## Development of Typescript based apps

### Common commands

```bash
# dev server
pnpm turbo --filter <package name, eg: @fogo/sessions-demo> start:dev

# prod server
pnpm turbo --filter <package name, eg: @fogo/sessions-demo> start:prod
```

### Testing & Quality

```bash
pnpm turbo test

# Run specific test types
pnpm turbo test:format    # Check code formatting
pnpm turbo test:lint      # Run linting checks
pnpm turbo test:types     # TypeScript type checking
pnpm turbo test:unit      # Unit tests
pnpm turbo test:integration  # Integration tests
```

### Code Fixing

```bash
# Auto-fix all fixable issues (format + lint)
pnpm turbo fix --filter <package name, eg: @fogo/sessions-demo>

# Fix formatting only
pnpm turbo fix:format --filter <package name, eg: @fogo/sessions-demo>

# Fix linting only
pnpm turbo fix:lint --filter <package name, eg: @fogo/sessions-demo>
```

You don't have to specify the --filter param, but it's recommended you do specify it after you changed some code in the specific package, as it will only check the changes related to that package only.

### Building

```bash
# Build all packages and apps
pnpm turbo build

# Build specific package/app
pnpm turbo build --filter @fogo/portfolio
pnpm turbo build --filter @fogo/sessions-demo
```

### Package Management

```bash
# Install dependencies (auto-installed by turbo, but can run manually)
pnpm install

# Add a dependency to a specific package
pnpm --filter @fogo/portfolio add <package>

# Add a dev dependency
pnpm --filter @fogo/portfolio add -D <package>
```

### Working with Specific Packages

```bash
# Run a command in a specific package
pnpm --filter @fogo/portfolio <command>
pnpm --filter @fogo/sessions-demo <command>

# Example: Run dev server for sessions-demo app only
pnpm --filter @fogo/sessions-demo start:dev
```

### Working Agreements

- Always run `pnpm turbo  --filter <the project you're working in> test` after modifying code files
- Always run `pnpm turbo  --filter <the project you're working in> fix` after modifying code files
- Fix any test or type errors until the whole suite is green, so the commands above are fully passing
- Prefer `pnpm` when installing dependencies (never use npm/yarn)
- Ask for confirmation before adding new dependencies, or any major braking changes
- Use `pnpm turbo` commands instead of running scripts directly in packages
- Environment variables are managed via Vercel and pulled automatically via `pull:env` task
- The project uses a catalog system in `pnpm-workspace.yaml` for dependency version management
- All apps use TypeScript with strict type checking
- Minimize the use of `'use client'`, `useEffect`, and `setState`; favor React Server Components (RSC) and Next.js SSR features
- Implement validation using Zod for schema validation, also for making sure the runtime types are correct
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency
- Use JSDoc comments for functions and components to improve IDE intellisense
- Turbo automatically installs node_modules when needed - no manual `pnpm install` required

## Development of Rust based packages and services

Rust development in this repository includes Solana programs (Anchor-based) and standalone services such as the Paymaster. Rust code lives under the `programs/` and relevant `packages/` directories.

### Common commands

#### Building

```bash
# Build all Rust crates
cargo build

# Build a specific program or crate
cargo build -p fogo-paymaster
cargo build -p tollbooth
```

#### Testing

```bash
# Run all tests (note you need to run "anchor build --no-idl" before running cargo test)
anchor build --no-idl && cargo test

# Run tests for a specific crate
cargo test -p fogo-paymaster
```

#### Linting and formatting

```bash
# Format code
cargo fmt

# Lint / static analysis
cargo +nightly-2025-06-12 clippy --tests -- -D warnings
```

#### Anchor & Solana-specific workflows

Programs in `programs/` use Anchor for building and deploying Solana programs.
To build or test Anchor programs:

```bash
anchor build --no-idl
cargo test
```

### Working Agreements for Rust

- small functions, clear ownership semantics, avoid unnecessary clones, avoid unsafe code/operations, anything that might panic
- Unless explicitly asked, do not modify any Solana program logic, instructions or paymaster Database or validation logic
- After modifying Rust code, always run cargo fmt and then cargo test (or cargo test -p <crate>)

## PR checklist

- use conventional commits style
- lint, type check, unit tests - all green before commit
- diff is small and focused. include a brief summary of what changed and why
- remove any excessive logs or comments before sending a PR
- please ask for confirmation before opening a PR
- PR should be in draft mode

## When stuck

- ask a clarifying question, propose a short plan, or open a draft PR with notes
- do not push large speculative changes without confirmation

## Working on NextJS projects

The conventions below apply to all Next.js apps in `apps/`. Feel free to adapt to follow the current existing code practices in the actual working project.

### General structure

The NextJS projects are in the `/apps` folder. Here's the structure and important patterns:

```text
├── src/
│   ├── app/                      # Next.js app router
│   │   ├── layout.tsx           # Re-exports Root component from components/Root
│   │   ├── page.tsx             # Main page component
│   │   ├── api/                 # API routes
│   │   │   └── [route-name]/
│   │   │       └── route.ts     # Route handlers (GET, POST, etc.)
│   │   ├── error.ts             # Error boundary (optional)
│   │   ├── not-found.tsx        # 404 page (optional)
│   │   ├── manifest.ts          # Web manifest (optional)
│   │   └── robots.ts            # Robots.txt (optional)
│   ├── components/              # React components
│   │   └── [ComponentName]/     # Component folder structure
│   │       ├── index.tsx        # Main component export
│   │       ├── index.module.scss # Component styles (SCSS modules)
│   ├── config/
│   │   └── server.ts            # Server-side env vars, uses "server-only" import, exports validated env vars with demand()/getEnvOrDefault()
│   ├── hooks/                   # Custom React hooks
├── package.json                 # Project deps, this are managed by pnpm in the workspace
├── next.config.js                # Next.js configuration
└── tsconfig.json                 # Ts config
```

### Important Patterns

**Component Structure:**

- Components live in `src/components/[ComponentName]/`
- Each component has `index.tsx` (main export) and `index.module.scss` (styles, if applicable)
- Use SCSS modules for component-scoped styles
- when working on the page components - so `index.tsx` or `layout.tsx`, don't write any business logic directly in those files, usually we:
  - import and re export as default a component from the components directory, so for example in `index.tsx` file we have `export { Root as default } from "../components/Root";` and we have the source code inside `components/Root/index.tsx`
  - same for the `layout.tsx` where we have the source code inside `components/Root/layout.tsx`

**Styling:**

- **SCSS Modules** (`.module.scss`) for component styles, not Tailwind
- Use `clsx` for conditional class names

**Server Configuration:**

- All server-side env vars in `src/config/server.ts`
- Must import `"server-only"` to prevent client usage
- Use `demand()` function for required env vars
- Use `getEnvOrDefault()` for optional vars with defaults

**API Routes:**

- API routes in `src/app/api/[route-name]/route.ts`
- Export named functions: `GET`, `POST`, `PUT`, `DELETE`, etc.
- Use `NextRequest` from `next/server` for request handling
- Return `Response.json()` for JSON responses

**SVG Handling:**

- SVGs are processed via `@svgr/webpack` (import as React components)

**Root Component:**

- Root layout exports `Root` component from `components/Root/index.tsx`
- Root component handles:
  - Font loading (Google Fonts via `next/font`)
  - HTML structure
  - Global CSS imports

### Writing code

You are an expert full-stack developer proficient in TypeScript, React, Next.js. Produce optimized and maintainable code, following best practices and adhering to the principles of clean code and robust architecture.

- Write concise, high quality Typescript code
- Favor iteration and modularization over code duplication
- Structure files with exported components, subcomponents, helpers, static content, and types.
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`).

## References

- [TurboRepo Docs](https://turbo.build/repo/docs)
- [PNPM Docs](https://pnpm.io/)
- [Next.js Docs](https://nextjs.org/docs)
