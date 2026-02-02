#!/bin/sh

set -e

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain nightly
. "$HOME/.cargo/env"

# Install systemd-devel for libudev
dnf install -y systemd-devel
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli

pnpm i
