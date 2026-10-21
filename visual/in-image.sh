#!/bin/sh
# Runs the screenshot comparisons in Playwright's own container image, pinned
# by digest, so CI and a person updating references use the same browser and
# fonts (LIQ-010 §11.1). Build the Storybook first with `pnpm build-storybook`.
# Arguments go to Playwright:
#
#   sh visual/in-image.sh                              compare
#   sh visual/in-image.sh --update-snapshots=changed   write new and changed references
#   sh visual/in-image.sh --grep "Button"              only some stories
set -eu

image='mcr.microsoft.com/playwright:v1.60.0-noble@sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948'
repository_root=$(cd "$(dirname "$0")/.." && pwd)

if [ ! -f "$repository_root/storybook-static/index.json" ]; then
  echo 'Build the Storybook first: pnpm build-storybook' >&2
  exit 1
fi

# The repository's node_modules are mounted, so the test runner is the one in
# the lockfile; the image supplies the browser, which must be the same version.
docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI \
  -v "$repository_root:/work" -w /work "$image" \
  node node_modules/@playwright/test/cli.js test --config visual/playwright.config.ts "$@"
