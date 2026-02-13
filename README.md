![Fogo Sessions](https://github.com/fogo-foundation/fogo-sessions/blob/main/.github/banner.png)

# Fogo Sessions

Next-gen on-chain experience on Fogo.

<p>
  <a href="https://github.com/fogo-foundation/fogo-sessions/blob/main/LICENSE">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/license-APACHE-blue.svg?color=green">
      <img src="https://img.shields.io/badge/license-APACHE-blue.svg?colorA=f6f8fa&colorB=f6f8fa&style=flat" alt="APACHE License">
    </picture>
  </a>
</p>

Fogo Sessions is an open-source standard for Web3 app sessions on Fogo.

Fogo Sessions helps Fogo app developers to provide a great user experience to their users by:

- enabling their apps to be used with any Solana wallet (even those that don't support Fogo!)
- enabling gasless transactions. No more sending some dust to your address to rescue stranded funds!
- reducing the number of times the user needs to sign with their browser wallet. They only need to sign once to log in!

## Getting Started

To jump straight to examples, go to [here](https://github.com/fogo-foundation/fogo-sessions/tree/main/programs/example) for an example program compatible with Fogo Sessions and [here](https://github.com/fogo-foundation/fogo-sessions/tree/main/apps/sessions-demo) for an app that interacts with that example program. To run this app locally, follow the intructions in the **Development** section below.

## Packages

> [!NOTE]
> This is a developer preview. Non-major version bumps may contain breaking changes.

| Package                    | Description                                                            | Version                                                                                                                                |
| :------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `fogo-sessions-sdk`        | Rust utilities for writing SVM programs compatible with Fogo Sessions  | [![crates](https://img.shields.io/crates/v/fogo-sessions-sdk?color=green)](https://crates.io/crates/fogo-sessions-sdk)                 |
| `@fogo/sessions-sdk`       | TypeScript utilities for integrating with Fogo sessions                | [![npm](https://img.shields.io/npm/v/@fogo/sessions-sdk.svg?color=blue)](https://www.npmjs.com/package/@fogo/sessions-sdk)             |
| `@fogo/sessions-sdk-web`   | Framework-agnostic utilities for integrating with Fogo sessions on web | [![npm](https://img.shields.io/npm/v/@fogo/sessions-sdk-web.svg?color=blue)](https://www.npmjs.com/package/@fogo/sessions-sdk-web)     |
| `@fogo/sessions-sdk-react` | React components and hooks for integrating with Fogo sessions          | [![npm](https://img.shields.io/npm/v/@fogo/sessions-sdk-react.svg?color=blue)](https://www.npmjs.com/package/@fogo/sessions-sdk-react) |

## Development

### Toolchain requirements

The Fogo Sessions repository requires the following toolchain versions:

- `nodejs@22.21.1`
- `pnpm@10.25.0`
- `rust@1.87.0`
- `python@3.14.0`

For convenience, there is a `.tool-versions` file that contains a mapping of these tools to the correct versions.
This file works great with [mise](https://mise.jdx.dev/).
If you already have `mise` installed, simply do `mise x -- pnpm i` to get started.

### Demo App

```
tilt up # Starts local test validators, starts demo app
```

### Programs

```
cargo-build-sbf # Build on-chain programs
```

### Tests

```
pnpm turbo test # Run app tests
cargo test # Run program tests
```

You may need to run `anchor build` before running `cargo test`, in order to generate the compiled programs needed for some tests that load those programs in via litesvm.
