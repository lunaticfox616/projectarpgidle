import { nextGoalWithMapAct } from './goal-actions.mjs';
import { nextGoalClampCount } from './goal-actions.mjs';
import { nextGoalBuildNotice } from './goal-actions.mjs';
import { nextGoalGetCosmosJourney } from './goal-progress.mjs';
import { nextGoalGetAstraProgress } from './goal-progress.mjs';
import { nextGoalGetPinnacleJourney } from './goal-progress.mjs';
import { nextGoalGetPinnacleJourneySubtab } from './goal-progress.mjs';
import { nextGoalHasEquippableInventoryItem } from './goal-progress.mjs';
import { nextGoalHasAffordableGemUpgrade } from './goal-progress.mjs';

export const GOAL_NOTICE_RULES = [
    {
        id: 'journal-unread-notice',
        matches(env, g, primary) {
            return primary !== 'journal-unread' && !!(g.noti && g.noti.journal) && env.deps.contentProgression.canOpen('tab-journal', g);
        },
        build(env) { return nextGoalBuildNotice(env, env.deps._t('새 이야기 저널 확인'), 'tab-journal'); }
    },
    {
        id: 'act-reward-notice',
        matches(env, g, primary) {
            return primary !== 'claim-act-reward' && env.deps.getAvailableActRewardZoneIds(g).length > 0;
        },
        build(env, g) { return nextGoalWithMapAct(nextGoalBuildNotice(env, env.deps._t('액트 보상 {n}개 선택', { n: env.deps.getAvailableActRewardZoneIds(g).length }), 'tab-map', 'map-explore-atlas'), env.deps.getAvailableActRewardZoneIds(g)[0]); }
    },
    {
        id: 'cosmos-journey-notice',
        matches(env, g, primary) {
            let journey = nextGoalGetCosmosJourney(g);
            let primaryId = String(primary || '');
            return !!journey && journey.stage !== 'complete' && primaryId !== 'cosmos-unlock-underworld' && !primaryId.startsWith('cosmos-galaxy-');
        },
        build(env, g) {
            let journey = nextGoalGetCosmosJourney(g);
            if (journey.stage === 'unlock') {
                return nextGoalBuildNotice(env, env.deps._t('지하계 30층을 돌파하여 우주계 해금 (현재 {floor}층)', { floor: journey.highestFloor }), 'tab-map', 'map-tab-underworld');
            }
            return nextGoalBuildNotice(env, env.deps._t('G{n} 은하 보스 처치', { n: journey.nextGalaxy }), 'tab-map', 'map-tab-cosmos');
        }
    },
    {
        id: 'cosmos-astra-progress',
        matches(env, g) {
            return !!(g.unlocks && g.unlocks.map) && !!nextGoalGetAstraProgress(g);
        },
        build(env, g) {
            let progress = nextGoalGetAstraProgress(g);
            if (progress.canChallenge) return nextGoalBuildNotice(env, env.deps._t('잔향체 아스트라 도전'), 'tab-map', 'map-explore-root-boss');
            if (progress.ready) return nextGoalBuildNotice(env, env.deps._t('아스트라 도전권(표식: 잔향) 획득'), 'tab-map', 'map-tab-cosmos');
            return nextGoalBuildNotice(env, env.deps._t('아스트라 조건, 은하 보스 {done}/{total} 처치', { done: progress.clearedCount, total: progress.total }), 'tab-map', 'map-tab-cosmos');
        }
    },
    {
        id: 'atlas-pinnacle-progress',
        matches(env, g) {
            let journey = nextGoalGetPinnacleJourney(env, g);
            return !!(g.unlocks && g.unlocks.map) && !!journey && !journey.complete;
        },
        build(env, g) {
            let journey = nextGoalGetPinnacleJourney(env, g);
            let next = journey.next, text = journey.gate.met ? env.deps._t('{name} 도전', { name: env.deps._t(next.name) }) : `${env.deps._t(next.name)}, ${env.deps._t(journey.gate.label)}`;
            // 최종 관문의 조건 줄(gate.label)이 이미 수호자 수를 세므로 관문 앞에서만 붙인다.
            if (!next.pinnacleCapstone) text += ` ${env.deps._t('(수호자 격파 {done}/{total})', { done: journey.guardiansCleared, total: journey.guardianTotal })}`;
            return nextGoalBuildNotice(env, text, 'tab-map', nextGoalGetPinnacleJourneySubtab(journey, g));
        }
    },
    {
        id: 'passive-points',
        matches(env, g) { return nextGoalClampCount(g.passivePoints) > 0 && !!(g.unlocks && g.unlocks.char) && env.deps.contentProgression.canOpen('tab-char', g); },
        build(env, g) { return nextGoalBuildNotice(env, env.deps._t('스킬트리 포인트 {n} 사용', { n: nextGoalClampCount(g.passivePoints) }), 'tab-char'); }
    },
    {
        id: 'equippable-equipment',
        matches(env, g) { return !!(g.unlocks && g.unlocks.items) && env.deps.contentProgression.canOpen('tab-items', g) && nextGoalHasEquippableInventoryItem(env, g); },
        build(env) { return nextGoalBuildNotice(env, env.deps._t('빈 장비 칸에 장비 장착'), 'tab-items', 'item-tab-equip'); }
    },
    {
        id: 'gem-upgrade',
        matches(env, g) { return !!(g.unlocks && g.unlocks.skills) && nextGoalHasAffordableGemUpgrade(env, g); },
        build(env) { return nextGoalBuildNotice(env, env.deps._t('룬 강화'), 'tab-skills', 'skill-tab-enhance'); }
    },
    {
        id: 'season-points',
        matches(env, g) {
            return nextGoalClampCount(g.seasonPoints) > 0 && !!(g.unlocks && g.unlocks.season)
                && (typeof env.deps.hasSpendableSeasonPoint !== 'function' || env.deps.hasSpendableSeasonPoint());
        },
        build(env, g) { return nextGoalBuildNotice(env, env.deps._t('루프 포인트 {n} 사용', { n: nextGoalClampCount(g.seasonPoints) }), 'tab-season'); }
    },
    {
        id: 'cosmos-alt-path',
        matches(env, g, primary) {
            if (primary !== null && !String(primary).startsWith('loop-chaos-')) return false;
            if (typeof env.deps.getAvailableLoopAdvancePaths !== 'function') return false;
            return env.deps.getAvailableLoopAdvancePaths(Math.max(1, Math.floor(Number(g.season) || 1))).includes('cosmos');
        },
        build(env) { return nextGoalBuildNotice(env, env.deps._t('우주계 경로로도 루프 진행'), 'tab-map', 'map-tab-cosmos'); }
    },
    {
        id: 'inventory-near-full',
        matches(env, g) {
            if (typeof env.deps.getInventoryLimit !== 'function' || !Array.isArray(g.inventory)) return false;
            let limit = Math.max(1, Math.floor(env.deps.getInventoryLimit(g)));
            return env.deps.getInventoryUsedCellCount(g) >= Math.floor(limit * env.INVENTORY_NOTICE_RATIO);
        },
        build(env, g) {
            let used = env.deps.getInventoryUsedCellCount(g);
            let limit = Math.floor(env.deps.getInventoryLimit(g));
            return nextGoalBuildNotice(env, env.deps._t('가방 {used}/{limit}칸, 자동 해체 설정', { used, limit }), 'tab-items', 'item-tab-equip');
        }
    }
];
