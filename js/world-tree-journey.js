// Persisted chart and travel ledger. Combat owns kills and rewards; UI only chooses routes.
const worldTreeJourney = (() => {
    const definition = id => WORLD_TREE_JOURNEY.nodes.find(node => node.id === id);
    const stamp = (state, id) => state.worldTreeJourney.stage + ':' + id;
    const cleared = (state, id) => state.worldTreeJourney.cleared.includes(stamp(state,id));
    const available = state => state.worldTreeJourney.unlocked || (state.season >= 10 && hasCurrentLoopChaos20Clear(state));
    const unlockedStage = state => Math.min(8, 1 + Math.max(0,...(state.worldTreeJourney.guardians || [])));
    function lockReason(state,id) {
        const node = definition(id);
        if (!node) return '존재하지 않는 탐험지입니다.';
        if (!available(state)) return '루프 10에서 혼돈 20층을 클리어하세요.';
        if (state.worldTreeJourney.stage > unlockedStage(state)) return '이전 지도 수호자를 먼저 격파하세요.';
        if (cleared(state,id)) return '탐험을 마친 지역입니다. 수호자 격파 후 새 지도를 열 수 있습니다.';
        if (node.parents.length && !node.parents.some(parent=>cleared(state,parent))) return '앞 지역을 먼저 탐험하세요.';
        return null;
    }
    function pathTo(state,target,via='grove') {
        if (!definition(target) || cleared(state,target)) return [];
        const pending = [['worldtree_root']];
        while (pending.length) {
            const path = pending.shift(), tail = path.at(-1);
            if (tail === target) return path.filter(id=>!cleared(state,id));
            const next = WORLD_TREE_JOURNEY.nodes.filter(node=>node.parents.includes(tail));
            const preferred = state.worldTreeJourney.branches || [];
            next.sort((a,b)=>(2*Number(preferred.includes(b.id))+Number(b.kind===via))-(2*Number(preferred.includes(a.id))+Number(a.kind===via)));
            for (const node of next) pending.push([...path,node.id]);
        }
        return [];
    }
    function enter(state,id) {
        const ledger = state.worldTreeJourney;
        ledger.unlocked = true;
        ledger.active = {id,stage:ledger.stage,cycle:ledger.cycle};
        ledger.lastResult = '';
        ledger.notice = null;
    }
    function onTravel(state,zone) {
        stop(state,'');
        if (zone.worldTreeNode) { combatLootReceipts.reset(state); enter(state,zone.id); }
        state.currentZoneId = zone.id;
    }
    function fail(state,zone) {
        if (!zone?.worldTreeNode) return;
        const plan = state.worldTreeJourney.plan;
        stop(state,'탐험 실패');
        state.worldTreeJourney.plan = plan;
        state.worldTreeJourney.notice = {kind:'defeat',nodeId:zone.id,stage:zone.worldTreeStage};
        state.combatHalted = true;
        state.moveTimer = 0;
        state.voidRift.active = false;
    }
    function complete(state,zone) {
        const ledger = state.worldTreeJourney;
        if (!zone.worldTreeNode || ledger.active?.id !== zone.id || cleared(state,zone.id)) return null;
        if (zone.worldTreeCycle !== ledger.cycle || zone.worldTreeStage !== ledger.stage) return null;
        ledger.cleared.push(stamp(state,zone.id));
        ledger.active = null;
        const boss = zone.worldTreeKind === 'boss';
        if (boss) recordGuardian(state);
        if (zone.worldTreeKind === 'grove') ledger.hiveDiscovered = true;
        ledger.lastResult = zone.name + ' 탐험 완료';
        if (ledger.plan) ledger.plan.index = ledger.plan.nodes.indexOf(zone.id)+1;
        ledger.notice = {kind:completionKind(ledger,boss),nodeId:zone.id,stage:ledger.stage};
        return {first:true,discovery:false,boss,rewards:rewards(state,zone)};
    }
    function completionKind(ledger,boss) {
        if (boss) return 'guardian';
        return ledger.plan && ledger.plan.index<ledger.plan.nodes.length && !ledger.queue.length ? 'paused' : 'arrival';
    }
    function recordGuardian(state) {
        const ledger = state.worldTreeJourney;
        if (!ledger.guardians.includes(ledger.stage)) ledger.guardians.push(ledger.stage);
        const season = Math.max(1,state.season || 1);
        const best = ledger.loopClear.season === season ? ledger.loopClear.stage : 0;
        ledger.loopClear = {season,stage:Math.max(best,ledger.stage)};
    }
    function rewards(state,zone) {
        const ledger = state.worldTreeJourney;
        const risk = WORLD_TREE_JOURNEY.risks[zone.worldTreeRisk];
        const event = WORLD_TREE_JOURNEY.events.find(row=>row.id===zone.worldTreeKind);
        if (event) return [[event.currency,Math.max(1,Math.floor(event.amount*risk.reward*(1+(ledger.stage-1)*0.12)))]];
        const focus = WORLD_TREE_JOURNEY.focuses.find(row=>row.id===ledger.focus);
        return [[focus.currency,Math.ceil(focus.amount*risk.reward*(1+ledger.stage*0.25))]];
    }
    function stop(state,result) {
        Object.assign(state.worldTreeJourney,{active:null,queue:[],plan:null,notice:null,lastResult:result});
    }
    function newChart(state,stage) {
        const ledger = state.worldTreeJourney;
        if (chartInProgress(ledger)) return false;
        if (!Number.isInteger(stage) || stage<1 || stage>unlockedStage(state)) return false;
        // Changing tiers cannot reroll an unfinished chart.
        if (ledger.cleared.length && !cleared(state,'worldtree_guardian')) return false;
        if (!ledger.cleared.length && stage===ledger.stage) return false;
        const cycle=ledger.cycle+Number(cleared(state,'worldtree_guardian'));
        stop(state,'');
        Object.assign(ledger,{stage,cycle,cleared:[],selected:'worldtree_guardian'});
        return true;
    }
    function chartInProgress(ledger) {
        return !!ledger.active || !!(ledger.plan && ledger.plan.index<ledger.plan.nodes.length);
    }
    function configure(state,key,value) {
        const ledger = state.worldTreeJourney;
        if (ledger.active || ledger.cleared.length || ledger.plan) return false;
        if (key==='risk' && Number.isInteger(value) && value>=0 && value<=2) ledger.risk=value;
        else if (key==='focus' && WORLD_TREE_JOURNEY.focuses.some(row=>row.id===value)) ledger.focus=value;
        else return false;
        return true;
    }
    function chooseBranch(state,id) {
        const node = definition(id), ledger = state.worldTreeJourney;
        if (!node || ![2,3].includes(node.floor) || ledger.active || ledger.plan) return;
        ledger.branches = ledger.branches.filter(other=>definition(other).floor!==node.floor);
        ledger.branches.push(id);
    }
    function normalize(state) {
        const raw = state.worldTreeJourney || {};
        const legacy = raw.version !== 2;
        const valid = WORLD_TREE_JOURNEY.nodes.flatMap(node=>Array.from({length:8},(_,i)=>(i+1)+':'+node.id));
        const entries = [...new Set((Array.isArray(raw.cleared)?raw.cleared:[]).filter(id=>valid.includes(id)))];
        state.worldTreeJourney = {
            ...readChartSettings(raw),
            unlocked:raw.unlocked===true || (legacy && state.season>10),
            guardians:readGuardians(raw,entries,legacy),
            stage:1,cleared:[],selected:definition(raw.selected)?raw.selected:'worldtree_guardian',
            branches:['worldtree_grove','worldtree_crossing'],
            loopClear:{season:0,stage:0},hiveDiscovered:raw.hiveDiscovered===true,
            active:null,queue:[],plan:null,notice:null,lastResult:''
        };
        const ledger = state.worldTreeJourney;
        ledger.stage = Math.min(unlockedStage(state),Math.max(1,Math.floor(Number(raw.stage)||1)));
        ledger.cleared = entries.filter(id=>id.startsWith(ledger.stage+':'));
        for (const id of Array.isArray(raw.branches)?raw.branches:[]) chooseBranch(state,id);
        restoreLoopClear(state,raw,legacy);
        restoreTravel(state,raw,legacy);
    }
    function readChartSettings(raw) {
        return {version:2,seed:Number.isSafeInteger(raw.seed)?raw.seed:Date.now()%2147483647,
            cycle:Math.max(0,Math.min(1e9,Math.floor(Number(raw.cycle)||0))),
            risk:Number.isInteger(raw.risk)&&raw.risk>=0&&raw.risk<=2?raw.risk:0,
            focus:WORLD_TREE_JOURNEY.focuses.some(row=>row.id===raw.focus)?raw.focus:'craft'};
    }
    function readGuardians(raw,entries,legacy) {
        const values=legacy?[1,2,3].filter(n=>entries.includes(n+':worldtree_guardian')):raw.guardians;
        return [...new Set((Array.isArray(values)?values:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=8))];
    }
    function restoreLoopClear(state,raw,legacy) {
        const ledger=state.worldTreeJourney;
        if (!legacy && raw.loopClear?.season===state.season && ledger.guardians.includes(raw.loopClear.stage))
            ledger.loopClear={season:state.season,stage:raw.loopClear.stage};
    }
    function restoreTravel(state,raw,legacy) {
        const ledger = state.worldTreeJourney;
        const valid = validActive(state,raw.active);
        const traveling = String(state.currentZoneId).startsWith('worldtree_');
        if (traveling) {
            state.combatHalted = true;
            if (!legacy && valid && state.currentZoneId===raw.active.id) {
                ledger.active = {...raw.active};
                state.combatHalted = false;
            }
        }
        const plan = readPlan(state,raw.plan);
        if (!legacy && plan) ledger.plan = plan;
        restoreQueueAndNotice(state,raw);
    }
    function validActive(state,active) {
        const ledger=state.worldTreeJourney;
        return active?.stage===ledger.stage && active?.cycle===ledger.cycle && !lockReason(state,active.id);
    }
    function restoreQueueAndNotice(state,raw) {
        const ledger=state.worldTreeJourney,plan=ledger.plan;
        if (ledger.active && plan && Array.isArray(raw.queue)) ledger.queue=plan.nodes.slice(plan.index+1).filter(id=>raw.queue.includes(id));
        restoreNotice(state,raw.notice);
    }
    function restoreNotice(state,notice) {
        const ledger=state.worldTreeJourney;
        if (ledger.active || notice?.stage!==ledger.stage || !definition(notice.nodeId)) return;
        if (['defeat','paused','arrival','guardian'].includes(notice.kind) && (notice.kind==='defeat'||cleared(state,notice.nodeId))) ledger.notice={...notice};
    }
    function readPlan(state,plan) {
        const ledger=state.worldTreeJourney;
        if (!plan || plan.stage!==ledger.stage || !Array.isArray(plan.nodes)) return null;
        const nodes=plan.nodes;
        if (!validPlanNodes(nodes)) return null;
        if (!Number.isInteger(plan.index) || plan.index<0 || plan.index>nodes.length) return null;
        if (!nodes.slice(0,plan.index).every(id=>cleared(state,id))) return null;
        return {nodes:[...nodes],stage:plan.stage,index:plan.index};
    }
    function validPlanNodes(nodes) {
        if (!nodes.length || nodes.length>4 || new Set(nodes).size!==nodes.length || !nodes.every(definition)) return false;
        return nodes.every((id,i)=>!i || definition(id).parents.includes(nodes[i-1]));
    }
    function encounterPlan(zone) {
        const stage = WORLD_TREE_JOURNEY.stages[zone.worldTreeStage-1];
        if (zone.worldTreeKind==='boss') return [
            ...Array.from({length:stage.guardWaves},(_,i)=>({at:Math.round(85*(i+1)/(stage.guardWaves+1)),count:stage.guardPack,elite:true})),
            {at:100,count:1,boss:true}
        ];
        const count = stage.pack + zone.worldTreeRisk;
        const marks = zone.worldTreeKind==='breach'?[12,24,36,48,60,72,84]:[20,40,60,80];
        return [...marks.map((at,i)=>({at,count:Math.min(10,count),elite:zone.worldTreeKind==='grove'&&i===2})),
            {at:100,count:1,boss:true}];
    }
    function enemyName(zone,boss,elite,fallback) {
        if (zone.worldTreeKind!=='grove') return fallback;
        if (boss) return '벌집 수호자';
        return elite?'정예 수호벌':'벌집 전투벌';
    }
    return {definition,cleared,available,unlockedStage,lockReason,pathTo,enter,onTravel,fail,complete,stop,normalize,enemyName,
        encounterPlan,newChart,configure,chooseBranch};
})();
