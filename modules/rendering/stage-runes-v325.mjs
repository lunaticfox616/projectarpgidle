import { createStageRitualBrush } from './stage-ritual-brush.mjs';
import { createStagePact } from './stage-pact.mjs';
import { createStageSoulDrain } from './stage-soul-drain.mjs';
import { createStageFlurry } from './stage-flurry.mjs';
import { createStageFireBaptism } from './stage-fire-baptism.mjs';
import { createStageViperDance } from './stage-viper-dance.mjs';
import { createStageDescent } from './stage-descent.mjs';

/** 2026-11-26 전달본 V3.24 후속(96 계약)과 V3.25(97 영혼 흡수, 99 야만스러운 난격)의 무대 연출. 98 기공파의 몸과 터짐은 투사체 그림이 맡는다
 * (modules/rendering/stage-ki-wave.mjs). warm(룬 번호): 그 룬을 끼면 그림을 미리 연다(첫 시전부터 보이게, modules/rendering/stage-warmup.mjs).
 * 2026-11-27 V3.24 시뮬레이터의 93 불의 세례, 94 독사의 춤, 95 강림(stage-fire-baptism.mjs, stage-viper-dance.mjs, stage-descent.mjs)도 이 묶음에 둔다. */
export function createStageRunesV325(deps) {
    const shared = createStageRitualBrush(deps);
    const pact = createStagePact(deps, shared), soul = createStageSoulDrain(deps, shared), flurry = createStageFlurry(deps, shared);
    const baptism = createStageFireBaptism(deps, shared), viper = createStageViperDance(deps, shared), descent = createStageDescent(deps, shared);
    const warmers = { 93: () => baptism.ready(), 94: () => viper.ready(), 96: () => pact.open(), 97: () => soul.prepare(), 99: () => flurry.open() };
    return Object.freeze({
        pact: pact.pact.bind(pact),
        soul: soul.soul.bind(soul),
        shield: soul.shield.bind(soul),
        punch: flurry.flurry.bind(flurry),
        pendulum: baptism.swing.bind(baptism),
        pendulumFlame: baptism.flame.bind(baptism),
        viper: viper.swirl.bind(viper),
        viperBite: viper.bite.bind(viper),
        descentLeap: descent.leap.bind(descent),
        descentQuake: descent.quake.bind(descent),
        warm: id => { if (warmers[id]) warmers[id](); }
    });
}
