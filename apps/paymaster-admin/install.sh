#!/bin/sh

set -e

# Install systemd-devel for libudev
dnf install -y systemd-devel
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked

pnpm i
