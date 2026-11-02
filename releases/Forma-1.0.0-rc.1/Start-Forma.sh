#!/bin/sh
# Works from the source folder or an extracted portable release.
FORMA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
FORMA_SERVER="$FORMA_DIR/serve.py"
if [ ! -f "$FORMA_SERVER" ]; then
    FORMA_SERVER="$FORMA_DIR/scripts/release-serve.py"
fi
if [ ! -f "$FORMA_SERVER" ]; then
    printf '%s\n' 'The Forma launcher files are missing. Extract the complete ZIP first.' >&2
    exit 1
fi
for FORMA_PYTHON in python3 python; do
    if command -v "$FORMA_PYTHON" >/dev/null 2>&1 &&
       "$FORMA_PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 8))' >/dev/null 2>&1; then
        exec "$FORMA_PYTHON" "$FORMA_SERVER" "$@"
    fi
done
printf '%s\n' 'Python 3.8 or newer is required to start Forma.' \
    'Install Python 3, then run Start-Forma again.' >&2
exit 1
