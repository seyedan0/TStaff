#!/usr/bin/env bash
set -e

echo "Running architecture boundary checks for TStaff..."

has_error=0

# 1. apps/web must not import from apps/api or packages/database
if grep -rnE "from\s+['\"].*(@tstaff/(database|api)|apps/api|packages/database)['\"]" apps/web/src/ 2>/dev/null; then
    echo "BOUNDARY ERROR: apps/web imports from apps/api or packages/database!"
    has_error=1
fi

# 2. Domain layers must not import NestJS or ORMs
if grep -rnE "from\s+['\"](@nestjs|drizzle-orm|pg)['\"]" apps/api/src/modules/*/domain/ 2>/dev/null; then
    echo "BOUNDARY ERROR: Domain layer imports framework or ORM!"
    has_error=1
fi

# 3. No cross-module deep internal imports
if grep -rnE "from\s+['\"](\.\./)+[a-z-]+/(infrastructure|presentation)/" apps/api/src/modules/ 2>/dev/null; then
    echo "BOUNDARY ERROR: Illegal internal cross-module deep import!"
    has_error=1
fi

if [ $has_error -ne 0 ]; then
    echo "Architecture boundary checks FAILED!"
    exit 1
fi

echo "All architecture boundary checks PASSED cleanly!"
exit 0
