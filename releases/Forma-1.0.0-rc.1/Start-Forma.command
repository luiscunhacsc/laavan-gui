#!/bin/sh
FORMA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
exec /bin/sh "$FORMA_DIR/Start-Forma.sh" "$@"
