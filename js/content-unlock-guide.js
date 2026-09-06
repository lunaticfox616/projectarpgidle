// 다음 주요 콘텐츠 해금 안내 계산.
// 상태를 읽기만 하며, DOM 표시와 실제 해금 처리는 각각 goal-system/UI와 기존 도메인이 소유한다.
(function () {
    'use strict';

    function count(value) {
        return Math.max(0, Math.floor(Number(value) || 0));
    }

    function requirement(label, met, current, target) {
        let row = { label, met: !!met };
        if (Number.isFinite(current) && Number.isFinite(target)) {
            row.current = Math.max(0, Math.floor(current));
            row.target = Math.max(1, Math.floor(target));
        }
        return row;
    }

    function guide(definition) {
        let requirements = Array.isArray(definition.requirements) ? definition.requirements : [];
        let completed = requirements.filter(row => row.met).length;
        return { ...definition, requirements, completed, total: requirements.length };
    }

    function tabUnlocked(state, id) {
        if (typeof isMapPrimaryContentUnlocked === 'function') return isMapPrimaryContentUnlocked(state, id);
        return Array.isArray(state.unlockedMapContents) && state.unlockedMapContents.includes(id);
    }

    function getRoadmapMilestones() {
        if (typeof SEASON_CONTENT_ROADMAP === 'undefined' || !SEASON_CONTENT_ROADMAP) return [];
        return Object.keys(SEASON_CONTENT_ROADMAP).map(Number).sort((a, b) => a - b).map(loop => {
            let row = SEASON_CONTENT_ROADMAP[loop] || {};
            let features = (Array.isArray(row.features) ? row.features : []).filter(text => !/^심화:|^전술 조건/.test(text));
            return { loop, features };
        }).filter(row => row.features.length > 0);
    }

    function cleanRoadmapFeature(text) {
        return String(text || '').replace(/^(?:조건부 )?해금:\s*/, '').replace(/^전환점:\s*/, '').replace(/\s*\/\s*/g, ' · ');
    }

    function highestChaosDepth(state) {
        if (typeof getHighestUnlockedEndlessChaosDepth === 'function') return count(getHighestUnlockedEndlessChaosDepth(state));
        let depths = Array.isArray(state.abyssUnlockedDepths) ? state.abyssUnlockedDepths.map(count) : [];
        return Math.max(count(state.abyssEndlessDepth), ...depths, 0);
    }

    function loopMilestoneGuide(state) {
        let loop = Math.max(1, count(state.season) || 1);
        let next = getRoadmapMilestones().find(row => row.loop > loop);
        if (!next) return null;
        let titles = next.features.map(cleanRoadmapFeature);
        return guide({
            id: `loop-${next.loop}`,
            title: titles[0],
            description: `루프 ${next.loop}: ${titles.join(' · ')}`,
            requirements: [requirement(`루프 ${next.loop}`, false, loop, next.loop)],
            actionLabel: state.unlocks && state.unlocks.season ? '루프 보기' : '',
            actionTabId: state.unlocks && state.unlocks.season ? 'tab-season' : ''
        });
    }

    function conditionGemGuide(state) {
        if (Math.max(1, count(state.season) || 1) < 2 || state.conditionGemUnlocked) return null;
        let bossClears = Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses.length : 0;
        return guide({
            id: 'condition-gem', title: '컨디션 젬',
            description: '루프 2의 뿌리 보스를 처음 처치하면 전투 조건 설정이 열립니다.',
            requirements: [requirement('루프 2', true), requirement('뿌리 보스 처치', bossClears > 0)],
            actionLabel: '뿌리 보스 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-root-boss'
        });
    }

    function eventUnlockGuide(state) {
        let loop = Math.max(1, count(state.season) || 1);
        if (loop >= 4 && !state.gemEnhanceUnlocked) return guide({
            id: 'gem-enhancement', title: '창공 강화',
            description: '군주의 핵 또는 창공의 정수를 얻으면 스킬 젬 강화가 열립니다.',
            requirements: [requirement('루프 4', true), requirement('강화 재료 획득', false)],
            actionLabel: '스킬 젬 보기', actionTabId: 'tab-skills', actionSubtabId: 'skill-tab-enhance'
        });
        let talismanUnlocked = !!state.talismanUnlocked || !!(state.unlocks && state.unlocks.talisman);
        if (loop >= 6 && !talismanUnlocked) return guide({
            id: 'talisman', title: '부적',
            description: '고대 미궁에서 봉인편린을 처음 획득하면 부적 탭이 나타납니다.',
            requirements: [requirement('루프 6', true), requirement('봉인편린 획득', false)],
            actionLabel: '고대 미궁 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-labyrinth'
        });
        let wedgeUnlocked = !!(state.starWedge && state.starWedge.unlocked);
        if (loop >= 7 && !wedgeUnlocked) return guide({
            id: 'star-wedge', title: '별쐐기와 운석 낙하 지점',
            description: '루프 7에서 액트 7에 도달하면 천문 콘텐츠가 열립니다.',
            requirements: [requirement('루프 7', true), requirement('액트 7 도달', count(state.maxZoneId) >= 7, count(state.maxZoneId), 7)],
            actionLabel: '사냥터 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-hunting'
        });
        return null;
    }

    function chaosRealmGuide(state) {
        let loop = Math.max(1, count(state.season) || 1);
        if (loop < 10 || (state.chaosRealm && state.chaosRealm.unlocked)) return null;
        let woodsmanPct = Math.min(100, count(state.chaosRealm && state.chaosRealm.woodsmanBestDamagePct));
        let loopReady = typeof hasCurrentLoopAbyssRequirementClear === 'function'
            ? hasCurrentLoopAbyssRequirementClear(loop) : false;
        return guide({
            id: 'chaos-realm', title: '혼돈계',
            description: '현재 루프 조건을 달성한 뒤 혼돈 밖 나무꾼에게 최대 생명력의 10% 이상 피해를 주세요.',
            requirements: [
                requirement('루프 10', true),
                requirement('이번 루프 혼돈 조건', loopReady),
                requirement('나무꾼 피해', woodsmanPct >= 10, Math.min(10, woodsmanPct), 10)
            ],
            actionLabel: loopReady ? '혼돈 밖 보기' : '혼돈 보기',
            actionTabId: loopReady ? 'tab-season' : 'tab-map',
            actionSubtabId: loopReady ? '' : 'map-explore-chaos'
        });
    }

    function skyTowerGuide(state) {
        let loop = Math.max(1, count(state.season) || 1);
        if (loop < 15 || (state.skyTower && state.skyTower.unlocked)) return null;
        let chaos20 = typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear(state) : false;
        return guide({
            id: 'sky-tower', title: '창공의 탑',
            description: '루프 15에서 혼돈 20층을 클리어하면 영구 해금됩니다.',
            requirements: [requirement('루프 15', true), requirement('이번 루프 혼돈 20층', chaos20)],
            actionLabel: '혼돈 보기', actionTabId: 'tab-map', actionSubtabId: 'map-explore-chaos'
        });
    }

    function underworldGuide(state) {
        if (tabUnlocked(state, 'map-tab-underworld')) return null;
        let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
        let deep = highestChaosDepth(state);
        let labyrinth = Math.max(1, count(state.labyrinthUnlockedMaxFloor || state.labyrinthFloor) || 1);
        let requirements = [
            requirement('혼돈계 발견', !!(state.chaosRealm && state.chaosRealm.unlocked)),
            requirement('케르베로스 처치', roots.has('s6_beast_cerberus')),
            requirement('혼돈 심화 30층', deep >= 30, Math.min(deep, 30), 30),
            requirement('고대 미궁 100층', labyrinth >= 100, Math.min(labyrinth, 100), 100)
        ];
        let nextSubtab = !roots.has('s6_beast_cerberus') ? 'map-explore-root-boss'
            : deep < 30 ? 'map-explore-chaos' : 'map-explore-labyrinth';
        return guide({
            id: 'underworld', title: '지하계',
            description: '네 갈래의 엔드게임 기록을 모으면 지하계가 영구적으로 나타납니다.',
            requirements, actionLabel: '다음 조건 보기', actionTabId: 'tab-map', actionSubtabId: nextSubtab
        });
    }

    function coreCubeGuide(state) {
        let cube = state.coreCube && typeof state.coreCube === 'object' ? state.coreCube : {};
        if (cube.everUnlocked || cube.unlocked) return null;
        let loop = Math.max(1, count(state.season) || 1);
        let highest = Math.max(1, count(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
        return guide({
            id: 'core-cube', title: '코어 큐브',
            description: '루프 20 이후 지하계 10층을 클리어하면 큐브와 전용 동력원이 열립니다.',
            requirements: [requirement('루프 20', loop >= 20, Math.min(loop, 20), 20), requirement('지하계 10층', highest >= 11, Math.min(highest - 1, 10), 10)],
            actionLabel: '지하계 보기', actionTabId: 'tab-map', actionSubtabId: 'map-tab-underworld'
        });
    }

    function cosmosGuide(state) {
        if (tabUnlocked(state, 'map-tab-cosmos')) return null;
        let journal = new Set(Array.isArray(state.journalEntries) ? state.journalEntries : []);
        let highest = Math.max(1, count(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
        return guide({
            id: 'cosmos', title: '우주계',
            description: '나무꾼의 정체를 확인하고 지하계 30층에 도달하면 우주계가 영구적으로 나타납니다.',
            requirements: [requirement('나무꾼 처치 기록', journal.has('woodsman')), requirement('지하계 30층', highest >= 30, Math.min(highest, 30), 30)],
            actionLabel: highest < 30 ? '지하계 보기' : '지도 보기', actionTabId: 'tab-map', actionSubtabId: highest < 30 ? 'map-tab-underworld' : 'map-tab-zones'
        });
    }

    function astraGuide(state) {
        let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
        if (roots.has('cosmos_astra')) return null;
        let loop = Math.max(1, count(state.season) || 1);
        let zone = SEASON_BOSS_ZONES.find(row => row.id === 'cosmos_astra');
        let gate = zone ? getSeasonBossProgressGate(zone, state) : { met: false, current: 0, target: 5 };
        let keys = count(state.currencies && state.currencies.cosmosSovereignKey);
        let ready = loop >= 31 && gate.met && keys > 0;
        return guide({
            id: 'astra', title: '잔향체 아스트라',
            description: '다섯 은하 보스를 이번 루프에 격파하고 표식: 잔향을 준비하세요.',
            requirements: [requirement('루프 31', loop >= 31, Math.min(loop, 31), 31), requirement('은하 보스', gate.met, gate.current, gate.target), requirement('표식: 잔향', keys > 0, Math.min(keys, 1), 1)],
            actionLabel: ready ? '아스트라 도전' : '우주계 보기', actionTabId: 'tab-map', actionSubtabId: ready ? 'map-explore-root-boss' : 'map-tab-cosmos'
        });
    }

    function getPinnacleSubtab(zone) {
        if (zone.pinnacleTrack === 'underworld') return 'map-tab-underworld';
        if (zone.pinnacleTrack === 'ocean') return 'map-tab-ocean';
        if (zone.pinnacleTrack === 'sky') return 'map-tab-sky';
        return 'map-explore-root-boss';
    }

    function getPinnacleRequirementLabel(zone) {
        if (zone.pinnacleTrack === 'underworld') return '지하계 층수';
        if (zone.pinnacleTrack === 'ocean') return '심해 깊이';
        if (zone.pinnacleTrack === 'sky') return '창공의 탑 층수';
        return '수호자 격파';
    }

    function pinnacleGuide(state) {
        let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
        let zones = SEASON_BOSS_ZONES.filter(zone => zone.milestonePinnacle);
        let next = zones.find(zone => !roots.has(zone.id));
        if (!next) return null;
        let gate = getSeasonBossProgressGate(next, state);
        let isObserver = !!next.pinnacleCapstone;
        return guide({
            id: next.id, title: next.name,
            description: isObserver ? '지하·심해·창공·우주의 네 수호자를 격파하면 최종 관문, 베일라에게 도전할 수 있습니다.'
                : '경계의 수호자입니다. 대응하는 무한 콘텐츠 기록을 완성하세요.',
            requirements: [requirement(getPinnacleRequirementLabel(next), gate.met, gate.current, gate.target)],
            actionLabel: gate.met ? '보스 도전' : '진행 화면 보기', actionTabId: 'tab-map', actionSubtabId: gate.met ? 'map-explore-root-boss' : getPinnacleSubtab(next)
        });
    }

    function contentChoiceGuide(state) {
        return guide({
            id: 'content-choice', title: '콘텐츠 선택 해금',
            description: contentProgression.balance(state) > 0 ? '해금 포인트로 원하는 콘텐츠를 선택하세요.' : `다음 루프에 도달하면 해금 포인트를 ${CONTENT_UNLOCK_POINTS_PER_LOOP}점 얻습니다.`,
            requirements: [requirement('해금 포인트', contentProgression.balance(state) > 0, contentProgression.balance(state), 1)],
            actionLabel: '콘텐츠 선택', actionTabId: state.season >= 2 ? 'tab-unlocks' : 'tab-items'
        });
    }

    function getNextMajorContentUnlock(state) {
        if (!state || typeof state !== 'object') return null;
        if (state.contentProgression) return contentChoiceGuide(state);
        return getNextLegacyContentUnlock(state);
    }

    function getNextLegacyContentUnlock(state) {
        let loop = Math.max(1, count(state.season) || 1);
        const candidates = [conditionGemGuide, eventUnlockGuide, chaosRealmGuide, skyTowerGuide];
        if (loop >= 18) candidates.push(underworldGuide, coreCubeGuide, cosmosGuide);
        if (tabUnlocked(state, 'map-tab-cosmos') && loop >= 31) candidates.push(astraGuide, pinnacleGuide);
        for (const candidate of candidates) {
            const found = candidate(state);
            if (found) return found;
        }
        return loopMilestoneGuide(state);
    }

    safeExposeGlobals({ getNextMajorContentUnlock });
}());
