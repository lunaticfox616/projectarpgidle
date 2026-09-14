# Browser fixtures

`first-journey/` and `world-tree-journey/` are versioned, isolated browser test entry pages.
They load the production `index.html` with the existing tracked unlock-lab storage bridge;
they do not read or overwrite the player's persistent save. The two build JSON files
are synthetic equipment fixtures, not player exports. `seed.js` also provides explicitly
synthetic high-power navigation states; those states are not balance evidence.

Browser tests must not depend on ignored local `artifacts/` previews. The existing
`artifacts/unlock-ui/test-bridge.js` is tracked and shared with the unlock-lab tests.
The Android packaging allowlist excludes this directory.
