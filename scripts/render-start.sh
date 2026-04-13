#!/usr/bin/env sh
set -e
# Render sets RENDER_EXTERNAL_URL (e.g. https://your-service.onrender.com).
# Meteor requires ROOT_URL; use an explicit ROOT_URL when you add a custom domain.
if [ -z "${ROOT_URL}" ] && [ -n "${RENDER_EXTERNAL_URL}" ]; then
  export ROOT_URL="${RENDER_EXTERNAL_URL}"
fi
if [ -z "${ROOT_URL}" ]; then
  echo "error: set ROOT_URL in the environment, or deploy on Render so RENDER_EXTERNAL_URL is set." >&2
  exit 1
fi
exec node main.js
