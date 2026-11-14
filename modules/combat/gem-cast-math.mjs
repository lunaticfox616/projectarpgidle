import { effectExpansionExtra } from '../domain/skill-effect-expansion.mjs';

// 시간 가속·과냉각 혼합물 never do.
export function gemGrow(stats) { return effectExpansionExtra(stats && stats.sSkill); }

export function gemMs(c, value) { return Math.round(value/c.speed); }

/** 무대의 주인공이 놓는 순간(js/combat-player-attack.js noteNativeGemSwing): 그 룬의 동작이 이때 타격 장에 온다. */
export function gemLetGo(c, impact, until) {c.swing={impact,until};}

export function gemSupportShots(env, c) { return env.deps.projectileShots.supportExtra(c.stats.sSkill); }

/** 신성한 기도(2026-11-05 전달본 V3.9.2, 사용자 "창이 각각 랜덤으로 하늘에서 떨어지는 느낌, 동시가 아닌 짧은 시간차, 처음엔 주변 3명과 그 주위로 반경,
 * 대상수나 범위가 늘어나는 것의 영향"): 찾는 범위 안 가까운 적 셋을 섞은 순서로 친다. 첫 창은 기도가 놓이는 순간 뒤 0~0.03초, 다음 창마다 0.07~0.14초 뒤
 * 떨어지기 시작해 0.15~0.2초에 꽂히고, 떨어지기 시작할 때 대상이 있던 자리 둘레 안의 적을 모두 친다(stepLance). 적이 셋보다 적으면 창도 그만큼이다.
 * 효과 확장 +N은 창 +N, 둘레 +0.5N칸, 찾는 범위 +N칸이고, 넓은 판정(보조룬)의 +1은 둘레와 찾는 범위만 1칸 늘린다(창 수 그대로). */
export function gemBetween(env, [low,high]) { return low+env.deps.random()*(high-low); }

/** 투사체 연쇄(패시브 트리의 무기 줄): 맞힌 적에서 안 맞은 가까운 적으로 튄다. 피해는 추가 발사 배율이다. 탄성 플라스크는 튀는 횟수가 늘어난다(stepBounce). */
export function gemChainsOf(c) { return Math.max(0,Math.floor(c.stats.sSkill.projectileChain||0)); }

/** 병이 처음 맞힌 때: 연쇄 투사체는 병 하나에 한 번이다(js/combat-support-runes.js augmentNative). */
export function gemNoteLeadContact(c,hit) {
    if(!hit || c.led)return;
    c.led=true;hit.leadContact=true;
}
