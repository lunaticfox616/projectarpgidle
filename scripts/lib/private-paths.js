// Files that never go into the public repo. scripts/publish-github.cjs splits them out; scripts/setup-worktree.js copies the game's
// ones into a fresh worktree from a sibling.
// Changing PRIVATE_PATHS rewrites public history: the next publish run then stops and needs --force-public.
const PRIVATE_PATHS = Object.freeze(['assets/playable/hana', 'assets/summon/hana', 'docs/skill-assets-hana/reference']);
// Files put into the private repo by hand (never in any public commit, so never in rignin-next): kept as they are on every sync.
const HAND_PRIVATE_PATHS = Object.freeze(['assets/stage-vfx/vfx.png', 'assets/stage-vfx/vfx2.png']);

module.exports = { PRIVATE_PATHS, HAND_PRIVATE_PATHS };
