---
name: ponytail
description: >
  Simplify implementation without reducing the requested result. Use when the
  user invokes Ponytail or when removing duplication, boilerplate, or excessive
  abstractions would materially help a coding task. Do not automatically apply
  to every coding request or use it to set the scope of UI/UX, art, game design,
  or open-ended product improvements. Modes: lite (default), full, ultra.
license: MIT
---

# Ponytail

Reduce unnecessary implementation complexity while completing the user's
intended outcome. Correctness, maintainability, usability, and visual quality
take priority over line count or diff size.

## Persistence

Apply to the current relevant task only; reassess when the task changes.
Default to **lite** when selected. The user can request `lite`, `full`, or
`ultra`; `stop ponytail` / `normal mode` ends its application. An explicit
request to keep a mode active may extend it, but does not override a later
change of direction. Do not require an opt-out for unrelated work.

For UI/UX, art, or game design, establish the intended experience and evaluate
the whole affected screen or flow first. Use this skill only to simplify the
implementation of that result. A necessary layout redesign or cohesive change
across files is not over-engineering merely because it makes a larger diff.

## The ladder

Choose the first approach that satisfies the complete outcome and quality bar:

1. **Does this need to exist at all?** Speculative need = skip it, say so in one line. (YAGNI)
2. **Already in this codebase?** A helper, util, type, or pattern that already lives here → reuse it. Look before you write; re-implementing what's a few files over is the most common slop.
3. **Stdlib does it?** Use it.
4. **Native platform feature covers it?** `<input type="date">` over a picker lib, CSS over JS, DB constraint over app code.
5. **Already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
6. **Can it be smaller without obscuring the contract?** Prefer that version.
7. **Otherwise:** implement the cohesive change the result requires.

The ladder is a reflex, not a research project — but it runs *after* you
understand the problem, not instead of it. Read the task and the code it
touches first, trace the real flow end to end, then climb. Two rungs work →
take the higher one and move on. The first lazy solution that works is the
right one — once you actually know what the change has to touch.

**Bug fix = root cause, not symptom.** A report names a symptom. Before you
edit, grep every caller of the function you're about to touch. The lazy fix IS
the root-cause fix: one guard in the shared function is a smaller diff than a
guard in every caller — and patching only the path the ticket names leaves
every sibling caller still broken. Fix it once, where all callers route through.

## Rules

- No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes.
- No boilerplate, no scaffolding "for later", later can scaffold for itself.
- Deletion over addition. Boring over clever, clever is what someone decodes at 3am.
- Keep responsibilities in their owning modules. Do not compress unrelated work into one file to reduce file count.
- Complete complex requests within the authorized scope. Do not substitute a partial version and ask the user to request the rest again.
- Two stdlib options, same size? Take the one that's correct on edge cases. Lazy means writing less code, not picking the flimsier algorithm.
- Mark deliberate simplifications that cut a real corner with a known ceiling (global lock, O(n²) scan, naive heuristic) with a `ponytail:` comment naming the ceiling and upgrade path (`# ponytail: global lock, per-account locks if throughput matters`).

## Output

Keep updates concise and appropriate to the user's request. State the outcome,
relevant validation, and material limitations. Include screenshots or a usable
preview when visual work needs review. Do not omit necessary explanation to
meet a fixed line count or end with an unsolicited offer to finish the task.

## Intensity

| Level | What change |
|-------|------------|
| **lite** | Complete the request; prefer existing mechanisms and remove clear duplication. Default when selected. |
| **full** | Examine unnecessary complexity more actively; preserve the complete result and its quality bar. |
| **ultra** | Aggressively remove optional implementation machinery when requested; never discard required behavior or validation. |

Example: "Add a cache for these API responses."
- lite: "Done, cache added. FYI: `functools.lru_cache` covers this in one line if you'd rather not own a cache class."
- full: "`@lru_cache(maxsize=1000)` on the fetch function. Skipped custom cache class, add when lru_cache measurably falls short."
- ultra: "Check the bottleneck and invalidation requirements; reuse a standard cache if it satisfies them."

## When NOT to be lazy

Never simplify away: input validation at trust boundaries, error handling
that prevents data loss, security measures, accessibility basics, anything
explicitly requested. User insists on the full version → build it, no
re-arguing.

Never lazy about understanding the problem. The ladder shortens the
solution, never the reading. Trace the whole thing first — every file the
change touches, the actual flow — before picking a rung. Laziness that skips
comprehension to ship a small diff is the dangerous kind: it dresses up as
efficiency and ships a confident wrong fix. Read fully, then be lazy.

Hardware is never the ideal on paper: a real clock drifts, a real sensor
reads off, a PCA9685 runs a few percent fast. Leave the calibration knob, not
just less code, the physical world needs tuning a minimal model can't see.

Use the repository's existing test tools and fixtures. Verify observable
behavior and relevant failure paths; do not add source-wording tests to prove
the skill was followed. A one-line change can require substantial validation
if it affects saves, rewards, or timing. For documentation-only changes,
validate the document or skill format and references as the repository permits.

## Boundaries

User instructions and the applicable repository rules take precedence over
this skill. Selection and duration follow the Persistence section above.

Simplify the implementation, not the user's intended result.
