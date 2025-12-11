#!/bin/bash

THISDIR="$(dirname $0)"

# go up to the repo root
cd "$THISDIR/.."

# install all toolchain items
mise install

# ensure pnpm store isn't located in this dir (which it would be in a devcontainer)
pnpm config set store-dir /home/vscode/.pnpm-store

# install all deps
CI=true pnpm install --force

# install solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# install anchor
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install $(cat .anchor-version)
