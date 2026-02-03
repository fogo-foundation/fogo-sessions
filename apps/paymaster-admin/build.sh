#!/bin/sh
set -eu

# If Vercel image provides Rust here, put it on PATH
if [ -d /rust/bin ]; then
  export PATH="/rust/bin:$PATH"
fi

# If rustup was installed into HOME in install step, source it (but don't fail if missing)
if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

# Also ensure cargo home bin is on PATH (covers some setups)
export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
export PATH="$CARGO_HOME/bin:$PATH"

# Debug (optional but useful)
echo "PATH=$PATH"
command -v rustc || true
command -v cargo || true

# Your actual build
pnpm build
