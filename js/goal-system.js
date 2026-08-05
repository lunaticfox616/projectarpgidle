// 다음 목표 안내 시스템 — 목표 '선정' 계층.
// 역할 분리: 이 파일은 게임 상태를 읽어 가장 적절한 다음 목표 하나와 보조 안내(최대 4개)를
// 계산해 presentGoalDrawer(표시 계층, js/ui-window-manager.js)에 전달만 한다.
// 규칙(matches/build)은 DOM에 접근하지 않고, 게임 상태를 변경하지 않는다.
(function () {
    'use strict';

    // 목표가 빠르게 연속 변경되어도 서랍이 깜빡이지 않도록 갱신을 코얼레싱한다.
    const GOAL_REFRESH_DEBOUNCE_MS = 400;
    const INVENTORY_NOTICE_RATIO = 0.9;

    let goalRefreshTimer = null;

    function goalGame() {
        return (typeof game !== 'undefined' && game && typeof game === 'object') ? game : null;
    }

    function isTabActionAvailable(tabId) {
        let g = goalGame();
        if (!g) return false;
        let gateKey = (typeof TAB_UNLOCK_GATES !== 'undefined' && TAB_UNLOCK_GATES) ? TAB_UNLOCK_GATES[tabId] : null;
        if (!gateKey) return true;
        return !!(g.unlocks && g.unlocks[gateKey]);
    }

    // 목표 버튼은 화면 열기만 허용한다. 대상 탭이 아직 잠겨 있으면 버튼 자체를 빼서
    // 잠긴 창이 열리는 일이 없게 한다.
    function buildTabAction(goal, label, tabId) {
        if (!isTabActionAvailable(tabId)) return goal;
        goal.actionLabel = label;
        goal.actionTabId = tabId;
        return goal;
    }

    function clampCount(value) {
        let num = Math.floor(Number(value) || 0);
        return num > 0 ? num : 0;
    }

    function buildNotice(text, actionTabId, actionSubtabId) {
        let notice = { text };
        if (actionTabId && isTabActionAvailable(actionTabId)) notice.actionTabId = actionTabId;
        if (notice.actionTabId && actionSubtabId) notice.actionSubtabId = actionSubtabId;
        return notice;
    }

    function hasEquippableInventoryItem(g) {
        if (!g || !Array.isArray(g.inventory) || !g.equipment || typeof g.equipment !== 'object') return false;
        return g.inventory.some(item => {
            if (!item) return false;
            let slots = [];
            if (typeof getEquipCandidateSlots === 'function') slots = getEquipCandidateSlots(item) || [];
            else if (item.slot) slots = [item.slot];
            return slots.some(slot => Object.prototype.hasOwnProperty.call(g.equipment, slot) && !g.equipment[slot]);
        });
    }

    function hasAffordableGemUpgrade(g) {
        if (!g || !g.gemEnhanceUnlocked || Math.max(1, Math.floor(Number(g.season) || 1)) < 2) return false;
        if (typeof SKILL_DB === 'undefined' || !SKILL_DB || !Array.isArray(g.skills)) return false;
        let currencies = g.currencies || {};
        return g.skills.some(name => {
            if (!SKILL_DB[name] || !SKILL_DB[name].isGem) return false;
            let gem = (g.gemData && g.gemData[name]) || {};
            let bossLevel = Math.max(0, Math.floor(Number(gem.bossCoreLevel) || 0));
            let skyLevel = Math.max(0, Math.floor(Number(gem.skyCoreLevel) || 0));
            return (bossLevel < 5 && clampCount(currencies.bossCore) >= bossLevel + 1)
                || (skyLevel < 5 && clampCount(currencies.skyEssence) >= skyLevel + 1);
        });
    }

    function getAvailableIncompleteTrial(g) {
        if (!g || typeof TRIAL_ZONES === 'undefined' || !Array.isArray(TRIAL_ZONES)) return null;
        let completed = new Set(Array.isArray(g.completedTrials) ? g.completedTrials : []);
        let unlocked = new Set(Array.isArray(g.unlockedTrials) ? g.unlockedTrials : []);
        return TRIAL_ZONES.find(trial => {
            if (!trial || trial.bloomTrial || completed.has(trial.id)) return false;
            let reqZone = Number(trial.reqZone);
            return (Number.isFinite(reqZone) && reqZone >= 0 && clampCount(g.maxZoneId) >= reqZone)
                || unlocked.has(trial.id);
        }) || null;
    }

    function getAstraProgress(g) {
        if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
        let atlas = g.cosmosAtlas && typeof g.cosmosAtlas === 'object' ? g.cosmosAtlas : null;
        let underworld = g.underworldProgress && typeof g.underworldProgress === 'object' ? g.underworldProgress : null;
        let cosmosUnlocked = !!(atlas && atlas.unlocked) || Math.max(0, Math.floor(Number(underworld && underworld.highestFloor) || 0)) >= 30;
        if (!cosmosUnlocked) return null;
        let required = ['planet-45', 'planet-46', 'planet-47', 'planet-48', 'planet-49'];
        let cleared = new Set(atlas && Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
        let clearedCount = required.filter(id => cleared.has(id)).length;
        let keyCount = clampCount(g.currencies && g.currencies.cosmosSovereignKey);
        return {
            clearedCount,
            total: required.length,
            ready: clearedCount === required.length,
            keyCount,
            canChallenge: clearedCount === required.length && keyCount > 0
        };
    }

    // ── 규칙 레지스트리 ─────────────────────────────────────────────────
    // priority가 큰 규칙부터 검사해, matches가 참인 첫 규칙의 build 결과를 주 목표로 쓴다.
    const GOAL_RULES = [
        {
            // 1순위: 진행을 막는 선택/수령 대기.
            id: 'pending-choice',
            priority: 1000,
            matches(g) {
                return !!(g.pendingLoopHeroSelection || g.pendingLoopDecision || g.pendingLoopReady);
            },
            build(g) {
                if (g.pendingLoopHeroSelection) {
                    return {
                        id: 'pending-hero-select',
                        type: 'blocking',
                        icon: '🧝',
                        categoryLabel: '필수 선택',
                        title: '새 루프 캐릭터를 선택하세요',
                        description: '캐릭터를 선택해야 전투가 다시 시작됩니다.',
                        mandatory: true
                    };
                }
                let goal = {
                    id: 'pending-loop-advance',
                    type: 'blocking',
                    icon: '🔄',
                    categoryLabel: '필수 선택',
                    title: '다음 루프 진행을 결정하세요',
                    description: '루프 조건을 달성했습니다. 진행하거나 이번 루프를 유지할 수 있습니다.',
                    mandatory: true
                };
                return buildTabAction(goal, '루프 화면 열기', 'tab-season');
            }
        },
        {
            // 액트 클리어 보상 미수령.
            id: 'claim-act-reward',
            priority: 900,
            matches(g) {
                return Array.isArray(g.claimableActRewards) && g.claimableActRewards.length > 0;
            },
            build(g) {
                let count = g.claimableActRewards.length;
                let goal = {
                    id: 'claim-act-reward',
                    stage: `n${count}`,
                    type: 'claim',
                    icon: '🎁',
                    categoryLabel: '보상',
                    title: '액트 클리어 보상을 선택하세요',
                    description: `지도의 클리어한 액트에서 보상 ${count}개를 선택할 수 있습니다.`,
                    mandatory: true
                };
                return buildTabAction(goal, '지도 열기', 'tab-map');
            }
        },
        {
            // 2순위: 스토리 액트 진행.
            id: 'story-progress',
            priority: 700,
            matches(g) {
                if (typeof LAST_STORY_ZONE_ID === 'undefined') return false;
                // 액트 밀기 안내는 첫 플레이에서만 사용한다. 첫 루프 이후에는 영구 진행/루프
                // 목표를 안내하고, 반복 액트 구간을 새 스토리 목표처럼 다시 띄우지 않는다.
                if (clampCount(g.loopCount) > 0 || Math.max(1, Math.floor(Number(g.season) || 1)) > 1) return false;
                return clampCount(g.maxZoneId) <= LAST_STORY_ZONE_ID;
            },
            build(g) {
                let frontier = Math.min(clampCount(g.maxZoneId), LAST_STORY_ZONE_ID);
                let zone = (typeof getZone === 'function') ? getZone(frontier) : null;
                if (!zone || !zone.name) return null;
                let act = (typeof getStoryActByZoneId === 'function') ? getStoryActByZoneId(frontier) : null;
                let title = act && act.bossName
                    ? `${zone.name}의 보스 ${act.bossName}를 처치하세요`
                    : `${zone.name}을(를) 돌파하세요`;
                let onFrontier = clampCount(g.currentZoneId) === frontier && Number(g.currentZoneId) === frontier;
                let goal = {
                    id: `story-zone-${frontier}`,
                    type: 'progression',
                    icon: '⚔️',
                    categoryLabel: '스토리',
                    title,
                    description: onFrontier
                        ? '진행도가 100%가 되면 보스가 등장하고, 처치하면 다음 액트가 열립니다.'
                        : '지도에서 최전선 지역으로 이동해 진행하세요.'
                };
                if (onFrontier) {
                    goal.current = Math.max(0, Math.min(100, Math.floor(Number(g.runProgress) || 0)));
                    goal.target = 100;
                    goal.progressPct = goal.current;
                }
                return buildTabAction(goal, '지도 열기', 'tab-map');
            }
        },
        {
            // 3순위: 현재 루프의 필수 돌파 목표(혼돈/혼돈 심화, 우주계 대체 경로 포함).
            id: 'loop-requirement',
            priority: 600,
            matches(g) {
                if (typeof LAST_STORY_ZONE_ID === 'undefined' || typeof getSeasonAbyssDepthCap !== 'function') return false;
                return clampCount(g.maxZoneId) > LAST_STORY_ZONE_ID;
            },
            build(g) {
                let season = Math.max(1, Math.floor(Number(g.season) || 1));
                let cap = Math.max(1, Math.floor(getSeasonAbyssDepthCap(season)));
                let met = (typeof hasCurrentLoopAbyssRequirementClear === 'function') && hasCurrentLoopAbyssRequirementClear(season);
                if (met) {
                    let goal = {
                        id: 'loop-requirement-met',
                        stage: `season-${season}`,
                        type: 'progression',
                        icon: '🔄',
                        categoryLabel: '루프',
                        title: '루프 진행 조건을 달성했습니다',
                        description: '전투 화면의 루프 진행 버튼으로 다음 루프를 시작할 수 있습니다.'
                    };
                    return buildTabAction(goal, '루프 화면 열기', 'tab-season');
                }
                let progress = (g.loopProgressCurrent && typeof g.loopProgressCurrent === 'object') ? g.loopProgressCurrent : {};
                let best = Math.max(0, Math.min(cap, Math.floor(Number(progress.bestAbyssDepth) || 0)));
                let goal = {
                    id: `loop-chaos-${cap}`,
                    stage: `season-${season}`,
                    type: 'progression',
                    icon: '🌌',
                    categoryLabel: '루프 조건',
                    title: `${cap > 20 ? '혼돈 심화' : '혼돈'} ${cap}층을 돌파하세요`,
                    description: '이번 루프를 진행하기 위한 필수 조건입니다.',
                    current: best,
                    target: cap,
                    progressText: `현재 최고 ${best}층`
                };
                return buildTabAction(goal, '혼돈 지도 열기', 'tab-map');
            }
        },
        {
            // 6순위: 자유 성장 — 혼돈 심화 기록의 다음 이정표(5층 단위).
            id: 'endless-chaos-record',
            priority: 200,
            matches(g) {
                void g;
                return typeof getHighestUnlockedEndlessChaosDepth === 'function'
                    && getHighestUnlockedEndlessChaosDepth() >= 21;
            },
            build(g) {
                void g;
                let best = Math.floor(getHighestUnlockedEndlessChaosDepth());
                let target = (Math.floor(best / 5) + 1) * 5;
                let goal = {
                    id: `endless-chaos-${target}`,
                    type: 'record',
                    icon: '🌌',
                    categoryLabel: '기록 갱신',
                    title: `혼돈 심화 ${target}층에 도달하세요`,
                    description: '더 깊은 심화층은 더 좋은 보상과 해금으로 이어집니다.',
                    current: best,
                    target,
                    progressText: `현재 최고 ${best}층`
                };
                return buildTabAction(goal, '혼돈 지도 열기', 'tab-map');
            }
        },
        {
            // 다른 필수 진행 목표가 없을 때 새로 열린 세계 기록을 놓치지 않게 한다.
            id: 'journal-unread',
            priority: 150,
            matches(g) {
                return !!(g.noti && g.noti.journal);
            },
            build() {
                return buildTabAction({
                    id: 'journal-unread',
                    type: 'discovery',
                    icon: '📓',
                    categoryLabel: '새 기록',
                    title: '새로 해금된 저널을 확인하세요',
                    description: '세계의 단서와 이번에 활성화된 영구 효과를 확인할 수 있습니다.'
                }, '저널 열기', 'tab-journal');
            }
        }
    ].sort((a, b) => b.priority - a.priority);

    // ── 보조 안내(최대 4개) ────────────────────────────────────────────
    // 주 목표를 빼앗지 않는 성장 힌트. 각 행은 해당 화면으로만 이동하며 자원을 소비하지 않는다.
    const GOAL_NOTICE_RULES = [
        {
            id: 'journal-unread-notice',
            matches(g, primary) {
                return primary !== 'journal-unread' && !!(g.noti && g.noti.journal);
            },
            build() { return buildNotice('새로운 저널 기록이 해금되었습니다', 'tab-journal'); }
        },
        {
            id: 'act-reward-notice',
            matches(g, primary) {
                return primary !== 'claim-act-reward' && Array.isArray(g.claimableActRewards) && g.claimableActRewards.length > 0;
            },
            build(g) { return buildNotice(`선택하지 않은 액트 보상 ${g.claimableActRewards.length}개`, 'tab-map'); }
        },
        {
            id: 'available-trial',
            matches(g) {
                return !!(g.unlocks && g.unlocks.map) && !!getAvailableIncompleteTrial(g);
            },
            build(g) {
                let trial = getAvailableIncompleteTrial(g);
                return buildNotice(`도전 가능한 전직 시련: ${trial.name}`, 'tab-map', 'map-explore-trials');
            }
        },
        {
            id: 'choose-ascend-class',
            matches(g) {
                return !g.ascendClass && clampCount(g.ascendPoints) > 0 && !!(g.unlocks && g.unlocks.traits);
            },
            build() { return buildNotice('전직 직업을 선택할 수 있습니다', 'tab-traits'); }
        },
        {
            id: 'cosmos-astra-progress',
            matches(g) {
                return !!(g.unlocks && g.unlocks.map) && !!getAstraProgress(g);
            },
            build(g) {
                let progress = getAstraProgress(g);
                if (progress.canChallenge) return buildNotice('잔향체 아스트라 도전 가능', 'tab-map', 'map-explore-root-boss');
                if (progress.ready) return buildNotice('아스트라 조건 완료 · 표식: 잔향 필요', 'tab-map', 'map-tab-cosmos');
                return buildNotice(`아스트라 은하 보스 ${progress.clearedCount}/${progress.total}`, 'tab-map', 'map-tab-cosmos');
            }
        },
        {
            id: 'passive-points',
            matches(g) { return clampCount(g.passivePoints) > 0 && !!(g.unlocks && g.unlocks.char); },
            build(g) { return buildNotice(`사용하지 않은 패시브 포인트 ${clampCount(g.passivePoints)}`, 'tab-char'); }
        },
        {
            id: 'equippable-equipment',
            matches(g) { return !!(g.unlocks && g.unlocks.items) && hasEquippableInventoryItem(g); },
            build() { return buildNotice('빈 장비칸에 장착 가능한 장비가 있습니다', 'tab-items', 'item-tab-equip'); }
        },
        {
            id: 'gem-upgrade',
            matches(g) { return !!(g.unlocks && g.unlocks.skills) && hasAffordableGemUpgrade(g); },
            build() { return buildNotice('강화 가능한 스킬 젬이 있습니다', 'tab-skills', 'skill-tab-enhance'); }
        },
        {
            id: 'ascend-points',
            matches(g) { return !!g.ascendClass && clampCount(g.ascendPoints) > 0 && !!(g.unlocks && g.unlocks.traits); },
            build(g) { return buildNotice(`사용하지 않은 전직 포인트 ${clampCount(g.ascendPoints)}`, 'tab-traits'); }
        },
        {
            id: 'season-points',
            matches(g) { return clampCount(g.seasonPoints) > 0 && !!(g.unlocks && g.unlocks.season); },
            build(g) { return buildNotice(`사용하지 않은 루프 포인트 ${clampCount(g.seasonPoints)}`, 'tab-season'); }
        },
        {
            id: 'cosmos-alt-path',
            matches(g, primary) {
                if (primary !== null && !String(primary).startsWith('loop-chaos-')) return false;
                if (typeof getAvailableLoopAdvancePaths !== 'function') return false;
                return getAvailableLoopAdvancePaths(Math.max(1, Math.floor(Number(g.season) || 1))).includes('cosmos');
            },
            build() { return buildNotice('우주계 경로로도 루프 진행 가능', 'tab-map'); }
        },
        {
            id: 'inventory-near-full',
            matches(g) {
                if (typeof getInventoryLimit !== 'function' || !Array.isArray(g.inventory)) return false;
                let limit = Math.max(1, Math.floor(getInventoryLimit()));
                return g.inventory.length >= Math.floor(limit * INVENTORY_NOTICE_RATIO);
            },
            build(g) { return buildNotice(`인벤토리 ${g.inventory.length}/${Math.floor(getInventoryLimit())}`, 'tab-items', 'item-tab-equip'); }
        }
    ];

    function computeNextGoal() {
        let g = goalGame();
        if (!g) return null;
        for (let rule of GOAL_RULES) {
            let goal = null;
            try {
                if (rule.matches(g)) goal = rule.build(g);
            } catch (error) {
                // 규칙 하나의 오류가 전체 UI 갱신을 멈추지 않도록 격리하고 다음 규칙으로 진행한다.
                console.warn(`[goal-system] rule "${rule.id}" failed:`, error);
                goal = null;
            }
            if (goal && goal.id && goal.title) return goal;
        }
        return null;
    }

    function buildGoalNotices(primaryGoalId) {
        let g = goalGame();
        if (!g) return [];
        let notices = [];
        for (let rule of GOAL_NOTICE_RULES) {
            if (notices.length >= 4) break;
            try {
                if (rule.matches(g, primaryGoalId)) notices.push(rule.build(g));
            } catch (error) {
                console.warn(`[goal-system] notice "${rule.id}" failed:`, error);
            }
        }
        return notices;
    }

    function runGoalSystemRefresh() {
        if (typeof presentGoalDrawer !== 'function') return;
        let goal = computeNextGoal();
        if (goal) goal.notices = buildGoalNotices(goal.id);
        presentGoalDrawer(goal);
    }

    // updateStaticUI 등에서 호출하는 진입점. 짧은 시간 안의 연속 호출은 한 번으로 묶는다.
    function requestGoalSystemRefresh() {
        if (goalRefreshTimer) return;
        goalRefreshTimer = setTimeout(() => {
            goalRefreshTimer = null;
            runGoalSystemRefresh();
        }, GOAL_REFRESH_DEBOUNCE_MS);
    }

    safeExposeGlobals({ requestGoalSystemRefresh, runGoalSystemRefresh });
}());
