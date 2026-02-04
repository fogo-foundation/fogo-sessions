#!/bin/sh

set -e

cd ../..
turbo run build --filter={apps/portfolio}...
