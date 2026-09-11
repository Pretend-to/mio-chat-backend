#!/bin/bash
set -e

# Backward-compatible entry point. Runtime URL and credentials are resolved by
# the Node runner; this wrapper intentionally contains no port assumptions.
exec node scripts/utils/run-integration-tests.js
