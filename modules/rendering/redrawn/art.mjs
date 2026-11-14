/** 새로 그린 스킬 이펙트 17종의 도트 그림 (Hana 스킬 인계 2026-09-29 + 변경분).
 * Ported from the handoff's void_fx.js (kept verbatim in docs/skill-assets-hana/reference/void_fx.js.txt) so every
 * function stays within this repo's size/complexity rules. The drawn dots are identical to the handoff's.
 * Coordinates are board dots (one 48px cell = 16 dots); dot(x, y, colour) paints one dot. Shapes are fixed per
 * seed/variant so nothing flickers. Pure drawing: no combat state, no timers.
 */
import { crescent, slashMark, frostRing, flake, elemSpark, flame } from './slash-elements.mjs';
import { F, EL, R, rng, line, layer, jag, stroke } from './raster.mjs';
import { mist, S, whirl, cut, W5 } from './mist-wind.mjs';
import { frostFront, frostPulse, collapse, ST } from './frost-earth.mjs';
import { lance, censer, swingTrail, arcBolt, groundSpark, BR } from './radiant-censer.mjs';
import { bloodSlash, bloodSplash, drain, drainTint, DRAIN_T, BL } from './blood-drain.mjs';
import { quakeGround, quakeFore, quakeHit, GQ, celticClock, clockMark, clockAngle, CK } from './quake-clock.mjs';

export const redrawnSkillArt = Object.freeze({
    VoidCrescent: { crescent, slashMark },
    FrostRing: { ring: frostRing, flake, colors: F },
    TriWave: { spark: elemSpark, colors: EL },
    DragonSweep: { flame, colors: R },
    HolyMist: { mist, colors: S },
    Whirlwind: { whirl, cut, colors: W5 },
    FrostWave: { front: frostFront, pulse: frostPulse },
    GravityCollapse: { collapse, colors: ST },
    RadiantLance: { lance },
    RippleSwing: { censer, trail: swingTrail, bolt: arcBolt, spark: groundSpark, colors: BR },
    BloodDrain: { slash: bloodSlash, splash: bloodSplash, drain, tint: drainTint, timing: DRAIN_T, colors: BL },
    GoldQuake: { ground: quakeGround, fore: quakeFore, hit: quakeHit, colors: GQ },
    CelticClock: { clock: celticClock, mark: clockMark, angle: clockAngle, colors: CK },
    // shared by js/canvas-redrawn-skill-art-extra.js (the 09-30 additions draw with the same rasteriser and bolts)
    lib: { rng, line, layer, jag, stroke }
});
