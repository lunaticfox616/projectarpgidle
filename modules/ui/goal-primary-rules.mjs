import { nextGoalBuildTabAction } from './goal-actions.mjs';
import { nextGoalWithMapAct } from './goal-actions.mjs';
import { nextGoalClampCount } from './goal-actions.mjs';
import { nextGoalGetCosmosJourney } from './goal-progress.mjs';

export const GOAL_RULES = [
    {
        // 첫 루프의 시작 무기가 가방에서 장착을 기다린다(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill)
        id: 'first-weapon-equip',
        priority: 850,
        matches(env, g) {
            const id = g.starterWeaponTutorialPending;
            return id != null && (g.inventory || []).some(item => item && item.id === id);
        },
        build(env, g) {
            const item = g.inventory.find(row => row && row.id === g.starterWeaponTutorialPending);
            return nextGoalBuildTabAction(env, {
                id: 'first-weapon-equip', type: 'progression', categoryLabel: env.deps._t('첫 무기'),
                title: env.deps._t('{name} 장착', { name: env.deps._t(item.name) })
            }, env.deps._t('장비 열기'), 'tab-items');
        }
    },
    {
        // 1순위: 진행을 막는 선택/수령 대기.
        id: 'pending-choice',
        priority: 1000,
        matches(env, g) {
            return !!(g.pendingLoopHeroSelection || g.pendingLoopDecision || g.pendingLoopReady);
        },
        build(env, g) {
            if (g.pendingLoopHeroSelection) {
                return {
                    id: 'pending-hero-select',
                    type: 'blocking',
                    categoryLabel: env.deps._t('필수 선택'),
                    title: env.deps._t('새 루프 직업 선택'),
                    mandatory: true
                };
            }
            let goal = {
                id: 'pending-loop-advance',
                type: 'blocking',
                categoryLabel: env.deps._t('필수 선택'),
                title: env.deps._t('다음 루프 진행 선택'),
                description: env.deps._t('진행 또는 이번 루프 유지'),
                mandatory: true
            };
            return nextGoalBuildTabAction(env, goal, env.deps._t('루프 화면 열기'), 'tab-season');
        }
    },
    {
        // 액트 클리어 보상 미수령.
        id: 'claim-act-reward',
        priority: 900,
        matches(env, g) {
            return env.deps.getAvailableActRewardZoneIds(g).length > 0;
        },
        build(env, g) {
            let count = env.deps.getAvailableActRewardZoneIds(g).length;
            let goal = {
                id: 'claim-act-reward',
                stage: `n${count}`,
                type: 'claim',
                categoryLabel: env.deps._t('보상'),
                title: env.deps._t('액트 보상 선택'),
                description: env.deps._t('남은 보상 {count}개', { count }),
                mandatory: true
            };
            // 보상 선택은 세계 지도에서 그 액트를 고른 설명 칸에 있다(js/world-map-ui.js, actionMapAct).
            return nextGoalWithMapAct(nextGoalBuildTabAction(env, goal, env.deps._t('액트 보상 열기'), 'tab-map', 'map-explore-atlas'), env.deps.getAvailableActRewardZoneIds(g)[0]);
        }
    },
    {
        // 2순위: 스토리 액트 진행.
        id: 'story-progress',
        priority: 700,
        matches(env, g) {
            if (typeof env.deps.LAST_STORY_ZONE_ID === 'undefined') return false;
            // 액트 밀기 안내는 첫 플레이에서만 사용한다. 첫 루프 이후에는 영구 진행/루프
            // 목표를 안내하고, 반복 액트 구간을 새 스토리 목표처럼 다시 띄우지 않는다.
            if (nextGoalClampCount(g.loopCount) > 0 || Math.max(1, Math.floor(Number(g.season) || 1)) > 1) return false;
            return nextGoalClampCount(g.maxZoneId) <= env.deps.LAST_STORY_ZONE_ID;
        },
        build(env, g) {
            let frontier = Math.min(nextGoalClampCount(g.maxZoneId), env.deps.LAST_STORY_ZONE_ID);
            let zone = (typeof env.deps.getZone === 'function') ? env.deps.getZone(frontier) : null;
            if (!zone || !zone.name) return null;
            let act = (typeof env.deps.getStoryActByZoneId === 'function') ? env.deps.getStoryActByZoneId(frontier) : null;
            const title = nextGoalStoryTitle(env, act, zone);
            let onFrontier = nextGoalClampCount(g.currentZoneId) === frontier && Number(g.currentZoneId) === frontier;
            let goal = {
                id: `story-zone-${frontier}`,
                type: 'progression',
                iconKind: 'attack',
                categoryLabel: env.deps._t('이야기'),
                title,
                description: onFrontier ? '' : env.deps._t('지도에서 {zone} 선택', { zone: env.deps._t(zone.name) })
            };
            if (onFrontier) {
                goal.current = Math.max(0, Math.min(100, Math.floor(Number(g.runProgress) || 0)));
                goal.target = 100;
                goal.progressPct = goal.current;
                // 진행 상태는 바로만 보여 주고, 목표 카드의 중복 수치 문구는 생략한다.
                goal.progressText = '';
            }
            return nextGoalWithMapAct(nextGoalBuildTabAction(env, goal, env.deps._t('지도 열기'), 'tab-map', 'map-explore-atlas'), frontier);
        }
    },
    {
        id: 'cosmos-endgame-path',
        priority: 650,
        matches(env, g) {
            const journey = nextGoalGetCosmosJourney(g);
            return !!journey && journey.stage !== 'complete';
        },
        build(env, g) {
            const journey = nextGoalGetCosmosJourney(g);
            if (journey.stage === 'unlock') {
                return nextGoalBuildTabAction(env, {
                    id: 'cosmos-unlock-underworld', type: 'progression', categoryLabel: env.deps._t('지하계'),
                    title: env.deps._t('지하계 30층을 돌파하여 우주계 해금'),
                    current: journey.highestFloor, target: 30, progressText: env.deps._t('현재 최고 {floor}층', { floor: journey.highestFloor })
                }, env.deps._t('지하계 열기'), 'tab-map', 'map-tab-underworld');
            }
            return nextGoalBuildTabAction(env, {
                id: `cosmos-galaxy-${journey.nextGalaxy}`, type: 'progression', categoryLabel: env.deps._t('우주계'),
                title: env.deps._t('G{n} 은하 보스 처치', { n: journey.nextGalaxy }),
                description: env.deps._t('별길 {n}개 안정화 후 도전', { n: env.deps.COSMOS_ROUTE_G1.requiredClears })
            }, env.deps._t('우주계 열기'), 'tab-map', 'map-tab-cosmos');
        }
    },
    {
        // 3순위: 현재 루프의 필수 돌파 목표(혼돈/혼돈 심화, 우주계 대체 경로 포함).
        id: 'loop-requirement',
        // 우주계는 루프의 대체 진행 경로다. 아직 현재 루프 조건이 남아 있다면
        // 엔드게임 장기 목표보다 먼저 보여 플레이어가 당장 해야 할 일을 잃지 않게 한다.
        priority: 950,
        matches(env, g) {
            if (typeof env.deps.LAST_STORY_ZONE_ID === 'undefined' || typeof env.deps.getSeasonAbyssDepthCap !== 'function') return false;
            return nextGoalClampCount(g.maxZoneId) > env.deps.LAST_STORY_ZONE_ID;
        },
        build(env, g) {
            let season = Math.max(1, Math.floor(Number(g.season) || 1));
            let cap = Math.max(1, Math.floor(env.deps.getSeasonAbyssDepthCap(season)));
            let met = (typeof env.deps.hasCurrentLoopAbyssRequirementClear === 'function') && env.deps.hasCurrentLoopAbyssRequirementClear(season);
            if (met) {
                let goal = {
                    id: 'loop-requirement-met',
                    stage: `season-${season}`,
                    type: 'progression',
                    categoryLabel: env.deps._t('루프'),
                    title: env.deps._t('다음 루프 진행'),
                    mandatory: true
                };
                return nextGoalBuildTabAction(env, goal, env.deps._t('루프 화면 열기'), 'tab-season');
            }
            let progress = (g.loopProgressCurrent && typeof g.loopProgressCurrent === 'object') ? g.loopProgressCurrent : {};
            let best = Math.max(0, Math.min(cap, Math.floor(Number(progress.bestAbyssDepth) || 0)));
            let goal = {
                id: `loop-chaos-${cap}`,
                stage: `season-${season}`,
                type: 'progression',
                categoryLabel: env.deps._t('루프 조건'),
                title: env.deps._t(cap > 20 ? '혼돈 심화 {n}층 돌파' : '혼돈 {n}층 돌파', { n: cap }),
                current: best,
                target: cap,
                progressText: env.deps._t('현재 최고 {floor}층', { floor: best })
            };
            return nextGoalBuildTabAction(env, goal, env.deps._t('혼돈 열기'), 'tab-map', env.CHAOS_EXPLORE_SUBTAB);
        }
    },
    {
        // 6순위: 자유 성장 — 혼돈 심화 기록의 다음 이정표(5층 단위).
        id: 'endless-chaos-record',
        priority: 200,
        matches(env, g) {
            void g;
            return typeof env.deps.getHighestUnlockedEndlessChaosDepth === 'function'
                && env.deps.getHighestUnlockedEndlessChaosDepth() >= 21;
        },
        build(env, g) {
            void g;
            let best = Math.floor(env.deps.getHighestUnlockedEndlessChaosDepth());
            let target = (Math.floor(best / 5) + 1) * 5;
            let goal = {
                id: `endless-chaos-${target}`,
                type: 'record',
                categoryLabel: env.deps._t('기록 갱신'),
                title: env.deps._t('혼돈 심화 {n}층 도달', { n: target }),
                current: best,
                target,
                progressText: env.deps._t('현재 최고 {floor}층', { floor: best })
            };
            return nextGoalBuildTabAction(env, goal, env.deps._t('혼돈 열기'), 'tab-map', env.CHAOS_EXPLORE_SUBTAB);
        }
    },
    {
        // 다른 필수 진행 목표가 없을 때 새로 열린 세계 기록을 놓치지 않게 한다.
        id: 'journal-unread',
        priority: 150,
        matches(env, g) {
            return !!(g.noti && g.noti.journal) && env.deps.contentProgression.canOpen('tab-journal', g);
        },
        build(env) {
            return nextGoalBuildTabAction(env, {
                id: 'journal-unread',
                type: 'discovery',
                categoryLabel: env.deps._t('저널'),
                title: env.deps._t('새 이야기 저널 확인')
            }, env.deps._t('이야기 저널 열기'), 'tab-journal');
        }
    }
].sort((a, b) => b.priority - a.priority);

function nextGoalStoryTitle(env, act, zone) {
    return act && act.bossName ? env.deps._t('{zone}의 보스 {boss} 처치', { zone: env.deps._t(zone.name), boss: env.deps._t(act.bossName) }) : env.deps._t('{zone} 돌파', { zone: env.deps._t(zone.name) });
}
