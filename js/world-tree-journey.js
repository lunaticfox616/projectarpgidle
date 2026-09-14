// Domain ledger only. Combat owns travel, fights and loot; UI owns choices and existing content entry.
const worldTreeJourney = (() => {
    const definition = id => WORLD_TREE_JOURNEY.nodes.find(node => node.id === id);
    const stamp = (state, id) => `${state.worldTreeJourney.stage}:${id}`;
    const cleared = (state, id) => state.worldTreeJourney.cleared.includes(stamp(state, id));
    function unlockedStage(state) {
        const completed = state.worldTreeJourney.cleared;
        let stage = 1;
        while (stage < WORLD_TREE_JOURNEY.maxStage && completed.includes(`${stage}:worldtree_guardian`)) stage++;
        return stage;
    }
    function lockReason(state, id) {
        const node = definition(id);
        if (!node) return '아직 연결되지 않은 지역입니다.';
        if (state.season < 10 || !state.chaosRealm.unlocked || !hasCurrentLoopChaos20Clear(state)) return '혼돈계 입장 조건을 먼저 달성하세요.';
        if (node.parents.length && !node.parents.some(parent => cleared(state, parent))) return '연결된 앞 지역을 먼저 탐험하세요.';
        return null;
    }
    function pathTo(state, target, via = 'grove') {
        if (!definition(target)) return [];
        const pending = [['worldtree_root']];
        while (pending.length) {
            const path = pending.shift(), tail = path[path.length - 1];
            if (tail === target) return path.filter(id => !cleared(state, id) || id === target);
            const next = WORLD_TREE_JOURNEY.nodes.filter(node => node.parents.includes(tail));
            next.sort((a,b) => Number(b.kind === via) - Number(a.kind === via));
            for (const node of next) pending.push([...path, node.id]);
        }
        return [];
    }
    function enter(state, id) {
        const ledger = state.worldTreeJourney;
        ledger.active = { id, stage:ledger.stage };
        ledger.lastResult = '';
        ledger.notice = null;
    }
    function onTravel(state, zone) {
        stop(state, '');
        if (zone.worldTreeNode) { combatLootReceipts.reset(state); enter(state, zone.id); }
        state.currentZoneId = zone.id;
    }
    function fail(state, zone) {
        if (!zone?.worldTreeNode) return;
        const plan = state.worldTreeJourney.plan;
        stop(state, '도전에 실패했습니다. 발견한 길은 유지됩니다.');
        state.worldTreeJourney.plan = plan;
        state.worldTreeJourney.notice = {kind:'defeat', nodeId:zone.id, stage:zone.worldTreeStage};
        state.combatHalted = true;
        state.moveTimer = 0;
        state.voidRift.active = false;
    }
    function complete(state, zone) {
        const ledger = state.worldTreeJourney;
        if (!zone.worldTreeNode || ledger.active?.id !== zone.id) return null;
        const first = !cleared(state, zone.id);
        if (first) ledger.cleared.push(stamp(state, zone.id));
        const discovery = first && definition(zone.id).kind === 'grove' && !ledger.hiveDiscovered;
        if (discovery) ledger.hiveDiscovered = true;
        ledger.active = null;
        ledger.lastResult = discovery ? '벌집 거점을 발견했습니다.' : `${zone.name} 탐험 완료`;
        if (ledger.plan) ledger.plan.index = ledger.plan.nodes.indexOf(zone.id) + 1;
        ledger.notice = {kind:completionKind(zone.id,discovery,ledger), nodeId:zone.id, stage:zone.worldTreeStage};
        return { first, discovery, boss:definition(zone.id).kind === 'boss' };
    }
    function completionKind(id, discovery, ledger) {
        if (discovery) return 'discovery';
        if (definition(id).kind === 'boss') return 'guardian';
        if (ledger.plan && ledger.plan.index < ledger.plan.nodes.length && !ledger.queue.length) return 'paused';
        return 'arrival';
    }
    function stop(state, result) {
        state.worldTreeJourney.active = null;
        state.worldTreeJourney.queue = [];
        state.worldTreeJourney.plan = null;
        state.worldTreeJourney.notice = null;
        state.worldTreeJourney.lastResult = result;
    }
    function restoreTravel(state, raw) {
        const ledger = state.worldTreeJourney;
        if (!String(state.currentZoneId).startsWith('worldtree_')) return;
        state.combatHalted = true;
        if (raw.active?.id !== state.currentZoneId || raw.active?.stage !== ledger.stage) return;
        if (lockReason(state, raw.active.id)) { state.currentZoneId = 0; return; }
        ledger.active = { id:raw.active.id, stage:ledger.stage };
        state.combatHalted = false;
        restoreQueue(state, raw);
    }
    function restoreQueue(state, raw) {
        const ledger = state.worldTreeJourney;
        let tail = raw.active.id;
        // Preserve the chosen branch and an intentionally empty (pause) queue.
        for (const id of Array.isArray(raw.queue) ? raw.queue.slice(0,4) : []) {
            const node = definition(id);
            if (!node) break;
            if (!node.parents.includes(tail) && !node.parents.some(id => cleared(state,id))) break;
            if (ledger.queue.includes(id) || id === raw.active.id) break;
            ledger.queue.push(id);
            tail = id;
        }
    }
    function normalize(state) {
        const raw = state.worldTreeJourney || {};
        const valid = WORLD_TREE_JOURNEY.nodes.flatMap(node => [1,2,3].map(stage => `${stage}:${node.id}`));
        state.worldTreeJourney = {
            cleared:[...new Set((Array.isArray(raw.cleared) ? raw.cleared : []).filter(id => valid.includes(id)))],
            stage:1, selected:definition(raw.selected) ? raw.selected : 'worldtree_guardian',
            hiveDiscovered:raw.hiveDiscovered === true, active:null, queue:[], plan:null, notice:null, lastResult:''
        };
        const ledger = state.worldTreeJourney;
        ledger.stage = Math.min(unlockedStage(state), Math.max(1, Math.min(3, Math.floor(Number(raw.stage) || 1))));
        restoreTravel(state, raw);
        restorePlan(state, raw);
    }
    // Persist the journey's intent independently of the active fight or a visit to a side destination.
    function restorePlan(state, raw) {
        const ledger = state.worldTreeJourney;
        ledger.plan = readPlan(state, raw.plan);
        if (ledger.active) {
            const index = ledger.plan ? ledger.plan.nodes.indexOf(ledger.active.id) : -1;
            if (index >= 0 && ledger.queue.every((id,i) => ledger.plan.nodes[index+1+i] === id)) ledger.plan.index = index;
            else ledger.plan = {nodes:[ledger.active.id,...ledger.queue], stage:ledger.stage, index:0};
            return;
        }
        restoreNotice(state,raw.notice);
    }
    function restoreNotice(state, notice) {
        const ledger = state.worldTreeJourney;
        if (!notice || notice.stage !== ledger.stage || !definition(notice.nodeId)) return;
        if (!['discovery','guardian','arrival','paused','defeat'].includes(notice.kind)) return;
        if (notice.kind !== 'defeat' && !cleared(state,notice.nodeId)) return;
        const requiredKind = {guardian:'boss',discovery:'grove'}[notice.kind];
        if (requiredKind && definition(notice.nodeId).kind !== requiredKind) return;
        ledger.notice = {kind:notice.kind,nodeId:notice.nodeId,stage:ledger.stage};
    }
    function readPlan(state, plan) {
        if (!plan || plan.stage !== state.worldTreeJourney.stage || !Array.isArray(plan.nodes)) return null;
        const nodes = plan.nodes;
        if (!validPlanNodes(nodes)) return null;
        if (!Number.isInteger(plan.index)) return null;
        if (plan.index < 0 || plan.index > nodes.length) return null;
        if (!nodes.slice(0,plan.index).every(id => cleared(state,id))) return null;
        const valid = nodes.every((id,index) => !index || definition(id).parents.includes(nodes[index-1])
            || definition(id).parents.some(parent => cleared(state,parent)));
        return valid ? {nodes:[...nodes],stage:plan.stage,index:plan.index} : null;
    }
    function validPlanNodes(nodes) {
        return nodes.length > 0 && nodes.length <= 5 && new Set(nodes).size === nodes.length
            && nodes.every(id => definition(id));
    }
    function encounterPlan(zone) {
        const stage = WORLD_TREE_JOURNEY.stages[zone.worldTreeStage-1];
        if (zone.worldTreeKind === 'boss') {
            const guards = Array.from({length:stage.guardWaves},(_,index) => ({
                at:Math.round(100*(index+1)/(stage.guardWaves+1)),count:stage.guardPack,elite:true
            }));
            return [...guards,{at:100,count:1,boss:true}];
        }
        const elite = zone.worldTreeNode === 'worldtree_crossing';
        return [28,62,100].map(at=>({at,count:stage.pack,elite}));
    }
    return { definition, cleared, unlockedStage, lockReason, pathTo, enter, onTravel, fail, complete, stop, normalize, encounterPlan };
})();
