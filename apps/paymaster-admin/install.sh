#!/bin/sh
set -eu

# Ensure we use a writable cargo home and it is on PATH
export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
export PATH="$CARGO_HOME/bin:$PATH"

# If rustup exists in the image, use it. If not, install it.
if command -v rustup >/dev/null 2>&1; then
  echo "rustup already present: $(command -v rustup)"
else
  echo "Installing rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | \
    sh -s -- -y --profile minimal --default-toolchain nightly
fi

# Make sure nightly is available (won't reinstall if already present)
rustup toolchain install nightly --profile minimal
rustup default nightly

# IMPORTANT:
# Avoid OS package installs like dnf/apt here; Vercel often doesn't allow it.

# If you truly need anchor during build, prefer a prebuilt binary or vendor it.
# Otherwise remove it from the Vercel build step.
# cargo install ... often fails due to missing system deps on Vercel.
# cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli

pnpm i
