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
        // 저널처럼 TAB_UNLOCK_GATES에 없는 병합 탭도 안쪽 패널이 잠기면 열리지 않는다.
        // 표시 계층의 판정과 같은 함수를 써서, 눌러도 아무 일도 없는 바로가기를 만들지 않는다.
        if (typeof isTabSurfaceAvailable === 'function') return !!isTabSurfaceAvailable(tabId);
        let gateKey = (typeof TAB_UNLOCK_GATES !== 'undefined' && TAB_UNLOCK_GATES) ? TAB_UNLOCK_GATES[tabId] : null;
        if (!gateKey) return true;
        return !!(g.unlocks && g.unlocks[gateKey]);
    }

    // 목표 버튼은 화면 열기만 허용한다. 대상 탭이 아직 잠겨 있으면 버튼 자체를 빼서
    // 잠긴 창이 열리는 일이 없게 한다.
    // subtabId를 주면 그 목표가 실제로 가리키는 세부 화면까지 열어, 탭만 열어 두고
    // 플레이어가 안에서 다시 찾아다니지 않게 한다.
    function buildTabAction(goal, label, tabId, subtabId) {
        if (!isTabActionAvailable(tabId)) return goal;
        goal.actionLabel = label;
        goal.actionTabId = tabId;
        if (subtabId) goal.actionSubtabId = subtabId;
        return goal;
    }

    // 혼돈은 1~20층과 21층 이상(심화) 입장 카드를 지도 > 탐험 > [혼돈] 한 화면에 함께 보여준다.
    // (전용 [혼돈 심화층] 세부 탭은 중복 표시를 피하려고 숨겨져 있어 대상으로 쓰면 안 된다.)
    const CHAOS_EXPLORE_SUBTAB = 'map-explore-chaos';

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
            let level = Math.max(0, Math.floor(Number(gem.enhanceLevel) || 0));
            return level < GEM_CORE_FORGE.maxLevel && clampCount(currencies[GEM_CORE_FORGE.materialKey]) >= GEM_CORE_FORGE.costs[level];
        });
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

    function getCosmosJourney(g) {
        if (!g) return null;
        const journal = Array.isArray(g.journalEntries) ? g.journalEntries : [];
        if (!journal.includes('woodsman_echo')) return null;
        const underworld = g.underworldProgress && typeof g.underworldProgress === 'object' ? g.underworldProgress : {};
        const highestFloor = Math.max(0, Math.floor(Number(underworld.highestFloor) || 0));
        if (highestFloor < 30) return { stage: 'unlock', highestFloor };
        const atlas = g.cosmosAtlas && typeof g.cosmosAtlas === 'object' ? g.cosmosAtlas : {};
        const bosses = new Set(Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
        const bossIds = ['planet-46', 'planet-47', 'planet-48', 'planet-49', 'planet-45'];
        const nextGalaxy = bossIds.findIndex(id => !bosses.has(id)) + 1;
        return { stage: nextGalaxy > 0 ? 'atlas' : 'complete', highestFloor, nextGalaxy };
    }

    function getPinnacleJourney(g) {
        if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
        const ids = ['pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky', 'pinnacle_observer'];
        const zones = ids.map(id => SEASON_BOSS_ZONES.find(zone => zone.id === id)).filter(Boolean);
        const cleared = new Set(Array.isArray(g.clearedRootBosses) ? g.clearedRootBosses : []);
        const next = zones.find(zone => !cleared.has(zone.id));
        if (!next) return { complete: true };
        // 최종 관문의 조건인 네 수호자(아스트라 포함)를 센다. 셋만 세어 3/3 옆에 관문 조건 3/4가 함께 보였다.
        const guardians = (zones.find(zone => zone.pinnacleCapstone) || {}).requiresPinnacles || [];
        const guardiansCleared = guardians.filter(id => cleared.has(id)).length;
        return { complete: false, next, gate: getSeasonBossProgressGate(next, g), guardiansCleared, guardianTotal: guardians.length };
    }

    function getPinnacleJourneySubtab(journey, g) {
        if (!journey || !journey.next || journey.gate.met) return 'map-explore-root-boss';
        if (journey.next.pinnacleTrack === 'underworld') return 'map-tab-underworld';
        if (journey.next.pinnacleTrack === 'ocean') return 'map-tab-ocean';
        if (journey.next.pinnacleTrack === 'sky') return 'map-tab-sky';
        const cleared = new Set(Array.isArray(g && g.clearedRootBosses) ? g.clearedRootBosses : []);
        return cleared.has('cosmos_astra') ? 'map-explore-root-boss' : 'map-tab-cosmos';
    }

    // ── 규칙 레지스트리 ─────────────────────────────────────────────────
    // priority가 큰 규칙부터 검사해, matches가 참인 첫 규칙의 build 결과를 주 목표로 쓴다.
    // 목표 글(2026-11-03 사용자): 문장 대신 짧은 이름. 지금 할 수 있으면 "~ 장착", "~ 선택", "~ 사용", 이뤄야 하면 "~ 돌파", "~ 도달", "~ 처치".
    // 설명은 꼭 필요할 때만 한 줄로 둔다.
    const GOAL_RULES = [
        {
            // 첫 루프의 시작 무기가 가방에서 장착을 기다린다(js/combat.js grantLoopStarterWeaponOnFirstKill)
            id: 'first-weapon-equip',
            priority: 850,
            matches(g) {
                const id = g.starterWeaponTutorialPending;
                return id != null && (g.inventory || []).some(item => item && item.id === id);
            },
            build(g) {
                const item = g.inventory.find(row => row && row.id === g.starterWeaponTutorialPending);
                return buildTabAction({
                    id: 'first-weapon-equip', type: 'progression', categoryLabel: _t('첫 무기'),
                    title: _t('{name} 장착', { name: _t(item.name) })
                }, _t('장비 열기'), 'tab-items');
            }
        },
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
                        categoryLabel: _t('필수 선택'),
                        title: _t('새 루프 직업 선택'),
                        mandatory: true
                    };
                }
                let goal = {
                    id: 'pending-loop-advance',
                    type: 'blocking',
                    categoryLabel: _t('필수 선택'),
                    title: _t('다음 루프 진행 선택'),
                    description: _t('진행 또는 이번 루프 유지'),
                    mandatory: true
                };
                return buildTabAction(goal, _t('루프 화면 열기'), 'tab-season');
            }
        },
        {
            // 액트 클리어 보상 미수령.
            id: 'claim-act-reward',
            priority: 900,
            matches(g) {
                return getAvailableActRewardZoneIds(g).length > 0;
            },
            build(g) {
                let count = getAvailableActRewardZoneIds(g).length;
                let goal = {
                    id: 'claim-act-reward',
                    stage: `n${count}`,
                    type: 'claim',
                    categoryLabel: _t('보상'),
                    title: _t('액트 보상 선택'),
                    description: _t('남은 보상 {count}개', { count }),
                    mandatory: true
                };
                // 보상 선택 카드는 탐험 > 나무(사냥터) 화면의 액트 목록에 붙는다.
                return buildTabAction(goal, _t('액트 보상 열기'), 'tab-map', 'map-explore-hunting');
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
                let title = act && act.bossName ? _t('{zone}의 보스 {boss} 처치', { zone: _t(zone.name), boss: _t(act.bossName) }) : _t('{zone} 돌파', { zone: _t(zone.name) });
                let onFrontier = clampCount(g.currentZoneId) === frontier && Number(g.currentZoneId) === frontier;
                let goal = {
                    id: `story-zone-${frontier}`,
                    type: 'progression',
                    iconKind: 'attack',
                    categoryLabel: _t('이야기'),
                    title,
                    description: onFrontier ? '' : _t('지도에서 {zone} 선택', { zone: _t(zone.name) })
                };
                if (onFrontier) {
                    goal.current = Math.max(0, Math.min(100, Math.floor(Number(g.runProgress) || 0)));
                    goal.target = 100;
                    goal.progressPct = goal.current;
                    // 진행 상태는 바로만 보여 주고, 목표 카드의 중복 수치 문구는 생략한다.
                    goal.progressText = '';
                }
                return buildTabAction(goal, _t('지도 열기'), 'tab-map', 'map-explore-hunting');
            }
        },
        {
            id: 'cosmos-endgame-path',
            priority: 650,
            matches(g) {
                const journey = getCosmosJourney(g);
                return !!journey && journey.stage !== 'complete';
            },
            build(g) {
                const journey = getCosmosJourney(g);
                if (journey.stage === 'unlock') {
                    return buildTabAction({
                        id: 'cosmos-unlock-underworld', type: 'progression', categoryLabel: _t('지하계'),
                        title: _t('지하계 30층을 돌파하여 우주계 해금'),
                        current: journey.highestFloor, target: 30, progressText: _t('현재 최고 {floor}층', { floor: journey.highestFloor })
                    }, _t('지하계 열기'), 'tab-map', 'map-tab-underworld');
                }
                return buildTabAction({
                    id: `cosmos-galaxy-${journey.nextGalaxy}`, type: 'progression', categoryLabel: _t('우주계'),
                    title: _t('G{n} 은하 보스 처치', { n: journey.nextGalaxy }),
                    description: _t('별길 {n}개 안정화 후 도전', { n: COSMOS_ROUTE_G1.requiredClears })
                }, _t('우주계 열기'), 'tab-map', 'map-tab-cosmos');
            }
        },
        {
            // 3순위: 현재 루프의 필수 돌파 목표(혼돈/혼돈 심화, 우주계 대체 경로 포함).
            id: 'loop-requirement',
            // 우주계는 루프의 대체 진행 경로다. 아직 현재 루프 조건이 남아 있다면
            // 엔드게임 장기 목표보다 먼저 보여 플레이어가 당장 해야 할 일을 잃지 않게 한다.
            priority: 950,
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
                        categoryLabel: _t('루프'),
                        title: _t('다음 루프 진행'),
                        mandatory: true
                    };
                    return buildTabAction(goal, _t('루프 화면 열기'), 'tab-season');
                }
                let progress = (g.loopProgressCurrent && typeof g.loopProgressCurrent === 'object') ? g.loopProgressCurrent : {};
                let best = Math.max(0, Math.min(cap, Math.floor(Number(progress.bestAbyssDepth) || 0)));
                let goal = {
                    id: `loop-chaos-${cap}`,
                    stage: `season-${season}`,
                    type: 'progression',
                    categoryLabel: _t('루프 조건'),
                    title: _t(cap > 20 ? '혼돈 심화 {n}층 돌파' : '혼돈 {n}층 돌파', { n: cap }),
                    current: best,
                    target: cap,
                    progressText: _t('현재 최고 {floor}층', { floor: best })
                };
                return buildTabAction(goal, _t('혼돈 열기'), 'tab-map', CHAOS_EXPLORE_SUBTAB);
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
                    categoryLabel: _t('기록 갱신'),
                    title: _t('혼돈 심화 {n}층 도달', { n: target }),
                    current: best,
                    target,
                    progressText: _t('현재 최고 {floor}층', { floor: best })
                };
                return buildTabAction(goal, _t('혼돈 열기'), 'tab-map', CHAOS_EXPLORE_SUBTAB);
            }
        },
        {
            // 다른 필수 진행 목표가 없을 때 새로 열린 세계 기록을 놓치지 않게 한다.
            id: 'journal-unread',
            priority: 150,
            matches(g) {
                return !!(g.noti && g.noti.journal) && contentProgression.canOpen('tab-journal', g);
            },
            build() {
                return buildTabAction({
                    id: 'journal-unread',
                    type: 'discovery',
                    categoryLabel: _t('저널'),
                    title: _t('새 이야기 저널 확인')
                }, _t('이야기 저널 열기'), 'tab-journal');
            }
        }
    ].sort((a, b) => b.priority - a.priority);

    // ── 보조 안내(최대 4개) ────────────────────────────────────────────
    // 주 목표를 빼앗지 않는 성장 힌트. 각 행은 해당 화면으로만 이동하며 자원을 소비하지 않는다.
    const GOAL_NOTICE_RULES = [
        {
            id: 'journal-unread-notice',
            matches(g, primary) {
                return primary !== 'journal-unread' && !!(g.noti && g.noti.journal) && contentProgression.canOpen('tab-journal', g);
            },
            build() { return buildNotice(_t('새 이야기 저널 확인'), 'tab-journal'); }
        },
        {
            id: 'act-reward-notice',
            matches(g, primary) {
                return primary !== 'claim-act-reward' && getAvailableActRewardZoneIds(g).length > 0;
            },
            build(g) { return buildNotice(_t('액트 보상 {n}개 선택', { n: getAvailableActRewardZoneIds(g).length }), 'tab-map', 'map-explore-hunting'); }
        },
        {
            id: 'cosmos-journey-notice',
            matches(g, primary) {
                let journey = getCosmosJourney(g);
                let primaryId = String(primary || '');
                return !!journey && journey.stage !== 'complete' && primaryId !== 'cosmos-unlock-underworld' && !primaryId.startsWith('cosmos-galaxy-');
            },
            build(g) {
                let journey = getCosmosJourney(g);
                if (journey.stage === 'unlock') {
                    return buildNotice(_t('지하계 30층을 돌파하여 우주계 해금 (현재 {floor}층)', { floor: journey.highestFloor }), 'tab-map', 'map-tab-underworld');
                }
                return buildNotice(_t('G{n} 은하 보스 처치', { n: journey.nextGalaxy }), 'tab-map', 'map-tab-cosmos');
            }
        },
        {
            id: 'cosmos-astra-progress',
            matches(g) {
                return !!(g.unlocks && g.unlocks.map) && !!getAstraProgress(g);
            },
            build(g) {
                let progress = getAstraProgress(g);
                if (progress.canChallenge) return buildNotice(_t('잔향체 아스트라 도전'), 'tab-map', 'map-explore-root-boss');
                if (progress.ready) return buildNotice(_t('아스트라 도전권(표식: 잔향) 획득'), 'tab-map', 'map-tab-cosmos');
                return buildNotice(_t('아스트라 조건, 은하 보스 {done}/{total} 처치', { done: progress.clearedCount, total: progress.total }), 'tab-map', 'map-tab-cosmos');
            }
        },
        {
            id: 'atlas-pinnacle-progress',
            matches(g) {
                let journey = getPinnacleJourney(g);
                return !!(g.unlocks && g.unlocks.map) && !!journey && !journey.complete;
            },
            build(g) {
                let journey = getPinnacleJourney(g);
                let next = journey.next, text = journey.gate.met ? _t('{name} 도전', { name: _t(next.name) }) : `${_t(next.name)}, ${_t(journey.gate.label)}`;
                // 최종 관문의 조건 줄(gate.label)이 이미 수호자 수를 세므로 관문 앞에서만 붙인다.
                if (!next.pinnacleCapstone) text += ` ${_t('(수호자 격파 {done}/{total})', { done: journey.guardiansCleared, total: journey.guardianTotal })}`;
                return buildNotice(text, 'tab-map', getPinnacleJourneySubtab(journey, g));
            }
        },
        {
            id: 'passive-points',
            matches(g) { return clampCount(g.passivePoints) > 0 && !!(g.unlocks && g.unlocks.char) && contentProgression.canOpen('tab-char', g); },
            build(g) { return buildNotice(_t('스킬트리 포인트 {n} 사용', { n: clampCount(g.passivePoints) }), 'tab-char'); }
        },
        {
            id: 'equippable-equipment',
            matches(g) { return !!(g.unlocks && g.unlocks.items) && contentProgression.canOpen('tab-items', g) && hasEquippableInventoryItem(g); },
            build() { return buildNotice(_t('빈 장비 칸에 장비 장착'), 'tab-items', 'item-tab-equip'); }
        },
        {
            id: 'gem-upgrade',
            matches(g) { return !!(g.unlocks && g.unlocks.skills) && hasAffordableGemUpgrade(g); },
            build() { return buildNotice(_t('룬 강화'), 'tab-skills', 'skill-tab-enhance'); }
        },
        {
            id: 'season-points',
            matches(g) {
                return clampCount(g.seasonPoints) > 0 && !!(g.unlocks && g.unlocks.season)
                    && (typeof hasSpendableSeasonPoint !== 'function' || hasSpendableSeasonPoint());
            },
            build(g) { return buildNotice(_t('루프 포인트 {n} 사용', { n: clampCount(g.seasonPoints) }), 'tab-season'); }
        },
        {
            id: 'cosmos-alt-path',
            matches(g, primary) {
                if (primary !== null && !String(primary).startsWith('loop-chaos-')) return false;
                if (typeof getAvailableLoopAdvancePaths !== 'function') return false;
                return getAvailableLoopAdvancePaths(Math.max(1, Math.floor(Number(g.season) || 1))).includes('cosmos');
            },
            build() { return buildNotice(_t('우주계 경로로도 루프 진행'), 'tab-map', 'map-tab-cosmos'); }
        },
        {
            id: 'inventory-near-full',
            matches(g) {
                if (typeof getInventoryLimit !== 'function' || !Array.isArray(g.inventory)) return false;
                let limit = Math.max(1, Math.floor(getInventoryLimit(g)));
                return getInventoryUsedCellCount(g) >= Math.floor(limit * INVENTORY_NOTICE_RATIO);
            },
            build(g) {
                let used = getInventoryUsedCellCount(g);
                let limit = Math.floor(getInventoryLimit(g));
                return buildNotice(_t('가방 {used}/{limit}칸, 자동 해체 설정', { used, limit }), 'tab-items', 'item-tab-equip');
            }
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

    function getMajorUnlockGoal(g) {
        if (typeof getNextMajorContentUnlock !== 'function') return null;
        let unlock = getNextMajorContentUnlock(g);
        if (!unlock || !unlock.id || !unlock.title) return null;
        if (unlock.actionTabId && !isTabActionAvailable(unlock.actionTabId)) {
            delete unlock.actionLabel;
            delete unlock.actionTabId;
            delete unlock.actionSubtabId;
        }
        return unlock;
    }

    function buildMajorUnlockFallback(unlock) {
        return {
            id: `major-unlock-${unlock.id}`,
            stage: `${unlock.completed || 0}-${unlock.total || 0}`,
            type: 'progression',
            categoryLabel: _t('다음 주요 해금'),
            title: unlock.title,
            description: unlock.description || '',
            requirements: unlock.requirements || [],
            actionLabel: unlock.actionLabel,
            actionTabId: unlock.actionTabId,
            actionSubtabId: unlock.actionSubtabId
        };
    }

    function runGoalSystemRefresh() {
        if (typeof presentGoalDrawer !== 'function') return;
        let g = goalGame();
        let goal = computeNextGoal();
        let nextUnlock = getMajorUnlockGoal(g);
        if (!goal && nextUnlock) goal = buildMajorUnlockFallback(nextUnlock);
        else if (goal && nextUnlock) goal.nextUnlock = nextUnlock;
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
