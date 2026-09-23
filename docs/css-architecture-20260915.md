# CSS architecture migration

## Baseline and scope

Work started from a fresh clone of `main` at `9ccb14b` (PR #1028), on
`codex/css-architecture-20260915`. Other local development copies were not modified.
The actual entry contained **40 stylesheet links**, rather than the 41 in the initial estimate.
The original CSS contained 1,006 `!important` declarations, plus two in the HTML style block.

This is a presentation architecture change. Classic script order, DOM classes and IDs,
inline event handlers, gameplay, saves, intentional emoji strings and desktop layout remain intact.
The currently rendered system Korean fonts are preserved. DOSSaemmul and MulmaruMono font assets
remain available; restoring pixel fonts would be a separate visual decision.

## Ownership and cascade

`css/main.css` is the development entry. It declares the following order:

```css
@layer reset, base, components, features, overrides;
```

| Owner | Responsibility |
| --- | --- |
| `reset.css` | Document sizing reset |
| `tokens.css`, base layer | All 80 global custom-property defaults in one `:root` |
| components layer | Shared presentation and existing theme/responsive variants |
| features layer | Independent crafting and gem-forge workspace presentation |
| overrides layer | Explicit application presentation/state precedence |
| `components/bars.css` | Flat health, shield, XP and progress bars, including skins |
| `components/tabs.css` | Tab buttons, selected states and responsive variants |
| `components/modals.css` | Shared dialog/overlay shells |
| `components/tooltips.css` | Shared custom tooltip presentation |

429 shared rules were relocated with their original selectors and conditional contexts.
Adjacent identical selector/context blocks were merged without changing declaration order.
The remaining content files own content-specific presentation. They are not copied into the new
components, and should not accumulate a second definition of a shared component.

The bar and tab files exceed the recommended 500-line size because they retain existing desktop,
theme and responsive variants. Keeping those variants together preserves the cascade during this
migration. A later reduction should remove redundant declarations after state-specific comparison,
rather than split the files by release date or add further override stylesheets.

## Token decisions

Global defaults use the values that actually won in the original stylesheet load order.
Theme and component-scoped overrides remain scoped; moving those into `:root` would change behavior.

| Previous token | Semantic replacement | Preserved default |
| --- | --- | --- |
| `--ui-accent` | `--color-accent` | `#d7b36f`, final gold override |
| `--game-panel` | `--color-panel-bg` | `rgba(8, 15, 25, .94)` |
| `--game-font-body` | `--font-body` | Existing Korean system font stack |
| `--game-font-title` | `--font-title` | Current body stack |
| `--ui-gold` | `--color-accent-gold` | Fixed gold role, distinct from theme accent |
| `--ui-display-factor` | `--scale-display-factor` | Runtime-owned display scale |
| `--social-chat-message-size` | `--font-size-chat` | `12px` |

The five previous release/feature prefixes were replaced throughout production CSS, HTML,
JavaScript consumers and relevant tests. There are no permanent old-name aliases.
Colors that represent different semantic roles remain distinct even where their default values match.
This does not claim that every existing hardcoded component color has been tokenized.

## Important exceptions and runtime boundaries

Total authored `!important` declarations: **1,008 → 68**. Each remaining declaration has a reason
immediately above it. `ui-reliquary-shell.css` itself went from 438 to 9 after shared rules moved out.
The CSS checker prevents the exception count growing unnoticed.

Remaining exceptions cover existing inline visibility/geometry contracts and a few theme-state
precedence rules. In particular, the shared search renderer emits `display:contents` and inline
spacing. The equipment grid must override these to retain a real ten-column drag/drop coordinate box
and its compact toolbar. Removing these exceptions breaks interaction, not just decoration.

`js/ui-display.js` now traverses same-origin imported stylesheets as well as nested rules. Imported
sheets are visited once. This preserves viewport-unit and media-query scaling in development with
`@import`; the production bundle has no imports. No frame-time stylesheet traversal was added.

Two malformed original CSS fragments were made parseable before PostCSS bundling. Chromium's
previous error recovery was inspected first; only already-rendered declarations were preserved.

## Build and delivery

```sh
npm ci
npm run dev
npm run check:css
npm test
npm run check:architecture
npm run build
npm run build:mobile
```

PostCSS resolves imports and source-relative asset URLs, autoprefixer handles browser prefixes,
and cssnano optimizes the result. Cross-rule merging and identifier removal are disabled to preserve
the legacy cascade and animation contracts. No JavaScript is bundled or converted to modules.
CSS tooling uses cssnano 7 and postcss-import 16 to retain Node 20 LTS compatibility (20.9+),
instead of versions requiring newer Node majors. CI continues using Node 22.

Both web and Android packaging use the same CSS build function. Web output is `dist/`;
Android web output remains `www/`. Each generated HTML has one stylesheet URL:
`css/game-<content hash>.css`. The hash comes from the emitted bytes, not a manual patch date.

The original linked CSS total was 856,918 bytes. The migrated release CSS is approximately 722 KB,
or 135 KB with gzip (actual transport compression depends on the host). Development imports still
load separate source files; the single network request applies to the built release.

**Publish `dist/` to use the release bundle.** Serving the repository root still runs the development
entry and will not gain the one-request bundle. Existing hosting settings have not been changed and
this work has not been deployed. GitHub CI verifies the build without adding browser CI jobs.
The existing service worker keeps its network-first code/style policy.

## Verification

- All 200 smoke tests pass, including deterministic hash, rebased assets, single CSS request and
  unchanged script order checks.
- Runtime architecture/lint ratchet passes.
- CSS parser/ownership/layer/exception checks pass.
- Web and Android web bundles build successfully.
- Real game screenshots cover login, battle, character, skill tree, light theme, mobile battle,
  equipment, gems, map and settings in source and minified release builds.
- The compared main ID-bearing elements have identical recorded style/geometry properties
  to the unlayered reference across those ten scenes. The timed goal drawer can be visible in a
  different capture frame behind the character window. This is a sampled regression check, not a
  claim that every possible content state has been pixel-diffed.
- Local browser checks cover drag/drop, popup stacking, equipment/gem flows, desktop/mobile layout,
  theme switching and repeated scaling through imported/layered CSS.
- Expanded local browser run: 242 passed, 21 intentionally skipped, three failures. After fixing
  the obsolete fossil-tab expectation in both viewport projects and restoring the inline toast
  visibility override during mobile chat, all three failed cases passed their targeted rerun.
  Final covered result: 245 passed, 21 skipped. Browser tests were run locally, not added to CI.

Pre-existing test assumptions were corrected: crafting tests used removed UI selectors and a removed
fossil panel, and text-asset hashes assumed LF despite Windows checkout CRLF. The UI tests now exercise
the actual currency workspace and legacy redirect; the hash test normalizes text newlines only, retaining strict binary
asset hashes. Tests were not replaced with source-string assertions.

Local comparison artifacts are under `artifacts/css-architecture/` (ignored, not shipped).
Use `npm run review:css -- before` and `npm run review:css -- after` around future changes; set
`CSS_REVIEW_URL` to the source or built game URL. Capture contexts are isolated from player saves.
