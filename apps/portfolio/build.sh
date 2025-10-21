#!/bin/sh

set -e

. "$HOME/.cargo/env"
cd ../..
turbo run build --filter={apps/portfolio}...
