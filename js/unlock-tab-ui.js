/** 해금 탭(2026-11-02 사용자: NPC에게 받는 해금, 포인트로 여는 해금, 기타 강화를 나눠 알기 쉽게. 이어서 "스킬트리처럼 연결성, 선행조건, 할당 여부가 한눈에").
 * 위에 해금 포인트와 탭, 왼쪽에 판, 오른쪽에 고른 해금의 설명. 판은 탭마다 다르다: 전체, 포인트, NPC 탭은 선행 해금(def.after)을 선으로 이은 트리이고 포인트와
 * NPC 탭은 다른 종류를 흐리게 둔다(연결은 그대로 보인다). 강화 탭은 단계 사슬, 자동 개방 탭은 루프 줄이다. 설명 안에 NPC 그림은 넣지 않는다.
 * 규칙과 장부는 contentProgression, 사고 받는 일은 contentUnlockUi의 것이다. */
const UNLOCK_TABS = Object.freeze([
    { id: 'all', label: '전체 트리' },
    { id: 'points', label: '포인트 해금', kind: 'paid' },
    { id: 'npc', label: 'NPC 해금', kind: 'npc' },
    { id: 'upgrades', label: '강화', note: '해금 포인트로 단계를 올립니다.' },
    { id: 'auto', label: '자동 개방', note: '조건을 채우면 저절로 열립니다.' }
]);
const UNLOCK_KIND_LABEL = Object.freeze({ paid: '포인트 해금', npc: 'NPC 해금', auto: '자동 개방' });
const UNLOCK_TREE_TABS = Object.freeze(['all', 'points', 'npc']);

/** 해금 트리의 자리: 뿌리(장비 제련)에서 def.after를 따라 왼쪽에서 오른쪽으로 편다. 깊이가 열, 잎이 줄이고 부모는 자식들의 가운데에 선다. 깊은 가지가 위로 온다. */
const unlockTree = (() => {
    const GRID = Object.freeze({ col: 118, row: 68, padX: 58, padY: 30, nodeW: 108, icon: 44, root: 'craft' });
    let built = null;
    function unlockTreeChildren() {
        const kids = new Map();
        CONTENT_UNLOCK_CATALOG.filter(def => def.after && !def.series).forEach(def => {
            if (!kids.has(def.after)) kids.set(def.after, []);
            kids.get(def.after).push(def);
        });
        // 가지의 길이: 해금마다 조상을 따라 올라가며 잰다.
        const byId = new Map(CONTENT_UNLOCK_CATALOG.map(def => [def.id, def])), reach = new Map();
        CONTENT_UNLOCK_CATALOG.filter(def => !def.series).forEach(def => {
            for (let up = def, length = 1; up; up = byId.get(up.after), length++) reach.set(up.id, Math.max(reach.get(up.id) || 0, length));
        });
        kids.forEach(list => list.sort((a, b) => reach.get(b.id) - reach.get(a.id) || a.minLoop - b.minLoop));
        return kids;
    }
    /** 뿌리부터 위에서 아래로 도는 차례(깊이 우선): 잎이 이 차례로 줄을 받는다. */
    function unlockTreeWalk(kids) {
        const walk = [], stack = [{ def: CONTENT_UNLOCK_CATALOG.find(def => def.id === GRID.root), depth: 0, parent: null }];
        while (stack.length) {
            const entry = stack.pop(), list = kids.get(entry.def.id) || [];
            walk.push(entry);
            for (let index = list.length - 1; index >= 0; index--) stack.push({ def: list[index], depth: entry.depth + 1, parent: entry.def.id });
        }
        return walk;
    }
    function buildUnlockTree() {
        const kids = unlockTreeChildren(), walk = unlockTreeWalk(kids), rows = new Map(), nodes = new Map();
        walk.filter(entry => !kids.has(entry.def.id)).forEach((entry, leaf) => rows.set(entry.def.id, leaf));
        // 부모는 자식들의 가운데: 돈 차례를 거꾸로 읽으면 자식이 먼저 정해져 있다.
        [...walk].reverse().filter(entry => kids.has(entry.def.id)).forEach(entry => {
            const list = kids.get(entry.def.id);
            rows.set(entry.def.id, (rows.get(list[0].id) + rows.get(list[list.length - 1].id)) / 2);
        });
        walk.forEach(({ def, depth, parent }) => {
            const row = rows.get(def.id);
            nodes.set(def.id, { def, parent, depth, row, x: GRID.padX + depth * GRID.col, y: Math.round(GRID.padY + row * GRID.row) });
        });
        const list = [...nodes.values()].sort((a, b) => a.row - b.row);
        return { nodes, list, kids, width: Math.max(...list.map(node => node.x)) + GRID.padX, height: Math.max(...list.map(node => node.y)) + GRID.padY + 24 };
    }
    const tree = () => built || (built = buildUnlockTree());
    /** 그 해금에서 뿌리까지의 선행 줄(자기 포함). */
    function pathTo(id) {
        const path = [];
        for (let node = tree().nodes.get(id); node; node = tree().nodes.get(node.parent)) path.push(node.def.id);
        return path;
    }
    return Object.freeze({ grid: GRID, tree, pathTo, has: id => tree().nodes.has(id), childrenOf: id => tree().kids.get(id) || [] });
})();

const unlockTabUi = {
    tab: '',
    selectedId: '',
    shownKey: '',
    shownTab: '',
    allLoops: false,
    boughtId: '',
    revealId: '',

    tabForUnlock(def) {
        if (def.series) return 'upgrades';
        if (!unlockTree.has(def.id)) return 'auto';
        return UNLOCK_TREE_TABS.includes(this.tab) ? this.tab : 'all';
    },
    /** 강화 줄마다 단계와 다음 단계. */
    upgradeRows() {
        return CONTENT_UNLOCK_SERIES.map(spec => {
            const steps = CONTENT_UNLOCK_CATALOG.filter(row => row.series === spec.series), rank = contentProgression.rank(spec.series);
            const next = steps[rank] || null;
            return { spec, steps, rank, next, ready: !!next && contentProgression.status(next.id).available };
        });
    },
    treeDefs(kind) {
        return unlockTree.tree().list.map(node => node.def).filter(def => !kind || contentProgression.kind(def) === kind);
    },
    readyCount(tabId) {
        if (tabId === 'auto') return 0;
        if (tabId === 'upgrades') return this.upgradeRows().filter(row => row.ready).length;
        const kinds = tabId === 'all' ? ['paid', 'npc'] : [UNLOCK_TABS.find(row => row.id === tabId).kind];
        return kinds.flatMap(kind => this.treeDefs(kind)).filter(def => contentProgression.status(def.id).available).length;
    },
    currentTab() {
        if (!this.tab) this.tab = 'all';
        return this.tab;
    },
    nodeState(status) {
        if (status.unlocked) return 'owned';
        return status.available ? 'ready' : 'waiting';
    },
    stateLine(status) {
        if (status.unlocked) return '해금 완료';
        if (status.available) return status.npc ? '받을 수 있음' : '지금 열 수 있음';
        return status.reason;
    },

    // ---------------------------------------------------------------- 트리
    /** 그림 위의 표: 포인트 값, 아직 닿지 않은 루프. 해금한 것에는 달지 않는다. */
    nodeBadgesHtml(def, status) {
        if (status.unlocked) return '';
        const loop = game.season < def.minLoop ? `<b class="unlock-node-loop">L${def.minLoop}</b>` : '';
        return `${loop}${def.cost ? `<b class="unlock-node-cost">${def.cost}P</b>` : ''}`;
    },
    treeNodeHtml(node) {
        const def = node.def, status = contentProgression.status(def.id), chosen = this.selectedId === def.id, grid = unlockTree.grid;
        const line = this.stateLine(status), kind = contentProgression.kind(def);
        return `<button type="button" class="unlock-node kind-${kind} is-${this.nodeState(status)}${chosen ? ' is-chosen' : ''}" style="left:${node.x - grid.nodeW / 2}px;top:${node.y - grid.icon / 2}px"
            data-unlock-select="${def.id}" data-tip="${escapeHTML(line)}" aria-pressed="${chosen}" aria-label="${escapeHTML(def.name)}, ${escapeHTML(line)}">
            <span class="unlock-node-icon"><span class="unlock-node-frame"><img src="${contentUnlockUi.art(def)}" alt="" loading="lazy" draggable="false"></span>${this.nodeBadgesHtml(def, status)}</span>
            <span class="unlock-node-name">${escapeHTML(def.name)}</span></button>`;
    },
    /** 선: 둘 다 열렸으면 밝고, 부모만 열렸으면 다음 차례로 점선, 나머지는 어둡다. 고른 해금의 선행 줄은 더 굵다. */
    treeEdgeClass(node, path) {
        const parentOwned = contentProgression.isUnlocked(node.parent), owned = contentProgression.isUnlocked(node.def.id);
        const state = parentOwned ? (owned ? 'is-lit' : 'is-next') : '';
        return `${state}${path.includes(node.def.id) ? ' is-path' : ''}`;
    },
    /** 선은 꺾은 직선이다: 부모 오른쪽에서 두 열 사이의 줄기로 나와 자식에게 들어간다. 대각선은 아래 칸들의 이름 위를 지났다. 밝은 선이 위에 오도록 어두운 선부터 그린다. */
    treeLinesHtml(tree) {
        const path = unlockTree.pathTo(this.selectedId), rank = name => (name.includes('is-path') ? 3 : name.includes('is-lit') ? 2 : name ? 1 : 0);
        const edges = tree.list.filter(node => node.parent).map(node => ({ node, name: this.treeEdgeClass(node, path) }));
        return edges.sort((a, b) => rank(a.name) - rank(b.name)).map(({ node, name }) => {
            const from = tree.nodes.get(node.parent), mid = from.x + unlockTree.grid.col / 2;
            return `<polyline points="${from.x},${from.y} ${mid},${from.y} ${mid},${node.y} ${node.x},${node.y}" class="${name}" data-edge-to="${node.def.id}"/>`;
        }).join('');
    },
    legendHtml() {
        const shape = (kind, label) => `<span class="unlock-legend-item"><i class="unlock-node kind-${kind} is-owned"><span class="unlock-node-frame"></span></i>${label}</span>`;
        const state = (name, label) => `<span class="unlock-legend-item"><i class="unlock-node kind-paid is-${name}"><span class="unlock-node-frame"></span></i>${label}</span>`;
        return `<div class="unlocks-legend">${shape('paid', '포인트')}${shape('npc', 'NPC')}${shape('auto', '자동')}<span class="unlocks-legend-gap"></span>
            ${state('owned', '해금 완료')}${state('ready', '지금 가능')}${state('waiting', '조건 대기')}</div>`;
    },
    treeHtml() {
        const tree = unlockTree.tree();
        return `${this.legendHtml()}<div class="unlock-tree" style="width:${tree.width}px;height:${tree.height}px">
            <svg class="unlock-tree-lines" width="${tree.width}" height="${tree.height}" aria-hidden="true">${this.treeLinesHtml(tree)}</svg>
            ${tree.list.map(node => this.treeNodeHtml(node)).join('')}</div>`;
    },

    // ---------------------------------------------------------------- 강화
    upgradeEffect(spec, rank) {
        if (spec.series === 'offlineHours') return `${OFFLINE_PROGRESS_RECOGNITION_HOURS[rank]}시간`;
        if (spec.series === 'offlineRate') return `${Math.round(OFFLINE_PROGRESS_EFFICIENCY_RATES[rank] * 100)}%`;
        if (spec.series === 'bagPage') return `${1 + rank}쪽`;
        return `+${rank * spec.storage}칸`;
    },
    upgradeStepHtml(def, index) {
        const status = contentProgression.status(def.id), chosen = this.selectedId === def.id, line = this.stateLine(status);
        return `<button type="button" class="unlock-step is-${this.nodeState(status)}${chosen ? ' is-chosen' : ''}" data-unlock-select="${def.id}" aria-pressed="${chosen}"
            data-tip="${escapeHTML(`${def.cost}P, ${line}`)}" aria-label="${escapeHTML(def.name)}, ${escapeHTML(line)}">${index + 1}</button>`;
    },
    upgradeRowHtml({ spec, steps, rank, next, ready }) {
        const effect = next ? `${escapeHTML(this.upgradeEffect(spec, rank))} → <b>${escapeHTML(this.upgradeEffect(spec, rank + 1))}</b>` : `<b>${escapeHTML(this.upgradeEffect(spec, rank))}</b>`;
        return `<article class="unlock-upgrade${ready ? ' is-ready' : ''}${next ? '' : ' is-max'}"><img src="assets/${spec.art}" alt="">
            <div class="unlock-upgrade-text"><strong>${escapeHTML(spec.name)}<small>${rank}/${steps.length}단계</small></strong><span class="unlock-upgrade-effect">${effect}</span>
            <div class="unlock-chain" role="group" aria-label="${escapeHTML(spec.name)} 단계">${steps.map((def, index) => this.upgradeStepHtml(def, index)).join('')}</div></div></article>`;
    },
    upgradeListHtml() {
        return `<div class="unlock-upgrades">${this.upgradeRows().map(row => this.upgradeRowHtml(row)).join('')}</div>`;
    },

    // ---------------------------------------------------------------- 자동 개방
    autoLoopHtml(loop) {
        const rows = contentUnlockUi.listed(loop).filter(def => contentProgression.kind(def) === 'auto' && !unlockTree.has(def.id));
        const additions = contentUnlockUi.roadmapAdditions(loop);
        const state = loop < game.season ? '지난 루프' : loop === game.season ? '지금 루프' : '';
        const items = rows.map(def => {
            const status = contentProgression.status(def.id), chosen = this.selectedId === def.id;
            return `<button type="button" class="unlock-auto-item${status.unlocked ? ' is-owned' : ''}${chosen ? ' is-chosen' : ''}" data-unlock-select="${def.id}" aria-pressed="${chosen}"><span>${escapeHTML(def.name)}</span><small>${escapeHTML(status.unlocked ? '열림' : status.reason)}</small></button>`;
        }).join('');
        return `<article class="unlock-auto-loop${loop === game.season ? ' is-now' : ''}${loop < game.season ? ' is-past' : ''}"><header><strong>루프 ${loop}</strong>${state ? `<small>${state}</small>` : ''}</header>
            <p class="unlock-auto-need">${escapeHTML(getLoopAbyssRequirementText(loop))}</p>${items ? `<div class="unlock-auto-items">${items}</div>` : ''}
            ${additions.length ? `<p class="unlock-auto-extra">${additions.map(escapeHTML).join('<br>')}</p>` : ''}</article>`;
    },
    autoListHtml() {
        const loops = Object.keys(SEASON_CONTENT_ROADMAP).map(Number);
        const shown = this.allLoops ? loops : loops.filter(loop => loop >= game.season && loop <= game.season + 4);
        return `<button type="button" class="unlock-auto-toggle" data-unlocks-loops="toggle">${this.allLoops ? '앞으로 다섯 루프만' : '모든 루프 보기'}</button>
            <div class="unlock-auto-list">${shown.map(loop => this.autoLoopHtml(loop)).join('')}</div>`;
    },

    // ---------------------------------------------------------------- 설명 칸
    lifecycleHtml(def) {
        const life = def.lifecycle;
        if (!life) return '<p class="unlock-lifetime-note">기능 해금은 다음 루프에도 유지됩니다.</p>';
        return `<details class="unlock-lifetime" id="unlock-lifetime-${def.id}"><summary>루프 전환 시, ${escapeHTML(life.label)}</summary><p class="unlock-lifetime-note">기능 해금은 영구 유지</p>
            ${life.kept ? `<p><b>유지</b>${escapeHTML(life.kept)}</p>` : ''}${life.reset ? `<p><b>초기화</b>${escapeHTML(life.reset)}</p>` : ''}</details>`;
    },
    relatedHtml(def) {
        if (!def.features) return '';
        return `<details class="unlock-related" id="unlock-related-${def.id}"><summary>포함된 성장 요소</summary>${def.features.map(row =>
            `<p><strong>${escapeHTML(row.name)}</strong>${escapeHTML(row.description)}</p>`).join('')}</details>`;
    },
    /** 이 해금을 두고 누가 한 말(data/story-journal.js STORY_LOOP_MILESTONES). 글만 보인다. */
    loreHtml(id) {
        const lore = STORY_LOOP_MILESTONES[id];
        if (!lore) return '';
        return `<blockquote class="story-scene-quote"><p>${lore.narration.map(escapeHTML).join(' ')}</p>
            <p><strong>${escapeHTML(lore.speaker)}</strong> ${escapeHTML(lore.quote)}</p></blockquote>`;
    },
    /** 이 해금 뒤에 열리는 해금: 누르면 그쪽으로 간다. */
    nextUnlocksHtml(def) {
        const kids = unlockTree.childrenOf(def.id);
        if (!kids.length) return '';
        return `<div class="unlock-next"><h4>다음 해금</h4><div>${kids.map(kid => `<button type="button" data-unlock-select="${kid.id}">${escapeHTML(kid.name)}</button>`).join('')}</div></div>`;
    },
    openButtonHtml(def) {
        return contentUnlockUi.routeAction(def) ? `<button type="button" data-open-content="${def.id}"><span class="px-center">바로 사용하기</span></button>` : '<span class="content-unlock-owned">해금 완료</span>';
    },
    actionHtml(def, status, kind) {
        if (status.unlocked) return this.openButtonHtml(def);
        if (kind === 'auto') return '<button type="button" disabled><span class="px-center">조건 달성 시 자동 개방</span></button>';
        const reason = escapeHTML(status.reason), disabled = status.available ? '' : 'disabled';
        if (kind === 'npc') return `<button type="button" class="unlock-npc-gift" data-npc-open="${def.npc}" ${disabled}><span class="px-center">${reason}</span></button>`;
        return `<button type="button" data-unlock-content="${def.id}" ${disabled}><span class="px-center">${status.available ? `${def.cost}P 해금` : reason}</span></button>`;
    },
    /** 강화 단계는 그 단계가 올려 주는 값, 다른 해금은 gain. */
    detailGainHtml(def) {
        if (!def.series) return def.gain ? `<p class="unlock-gain">${escapeHTML(def.gain)}</p>` : '';
        const spec = CONTENT_UNLOCK_SERIES.find(row => row.series === def.series);
        return `<p class="unlock-gain">${escapeHTML(this.upgradeEffect(spec, def.rank - 1))} → ${escapeHTML(this.upgradeEffect(spec, def.rank))}</p>`;
    },
    /** 고른 해금의 설명. 해금 단추는 맨 아래에 붙어 늘 보인다(1366×768에서 스크롤 밖으로 밀려났다). */
    detailHtml(def) {
        const status = contentProgression.status(def.id), kind = contentProgression.kind(def), conditions = contentProgression.requirements(def.id);
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">${escapeHTML(def.group)}, ${UNLOCK_KIND_LABEL[kind]}</span>
            <div class="unlock-detail-art"><img src="${contentUnlockUi.art(def)}" alt=""></div><h3>${escapeHTML(def.name)}</h3>${this.detailGainHtml(def)}<p>${escapeHTML(def.description)}</p>${this.loreHtml(def.id)}</div>
            <div class="unlock-detail-reward">${contentUnlockUi.entryReward(def, status)}</div>
            <div class="unlock-requirements"><h4>${status.unlocked ? '해금 완료' : `해금 조건${kind === 'paid' ? ', ' + def.cost + 'P' : ''}`}</h4>${conditions.map(row => `<div class="${row.met ? 'is-met' : ''}"><span>${escapeHTML(row.label)}</span><small>${row.met ? '달성' : '미달성'}</small></div>`).join('')}</div>
            ${this.nextUnlocksHtml(def)}${this.lifecycleHtml(def)}${this.relatedHtml(def)}
            <div class="unlock-detail-action">${this.actionHtml(def, status, kind)}</div>`;
    },
    autoSummaryHtml() {
        const next = game.season + 1;
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">자동 개방</span><h3>루프 ${game.season}</h3>
            <p>항목을 누르면 설명이 여기에 나옵니다.</p></div>
            <div class="unlock-requirements"><h4>다음 루프 ${next}</h4><div><span>${escapeHTML(getLoopAbyssRequirementText(next))}</span></div></div>`;
    },
    /** 먼저 고를 해금: 지금 할 수 있는 것, 다음으로 가장 가까운 루프의 것. */
    firstOfUnlocks(defs) {
        const by = name => defs.filter(def => this.nodeState(contentProgression.status(def.id)) === name);
        return by('ready')[0] || by('waiting').sort((a, b) => a.minLoop - b.minLoop)[0] || defs[0] || null;
    },
    /** 강화 단계를 산 직후에는 그 줄의 다음 단계를 고른다(연달아 올리기 좋게). */
    stepAfterPurchase(held) {
        if (!held || !held.series || this.boughtId !== held.id || !contentProgression.isUnlocked(held.id)) return null;
        this.boughtId = '';
        return CONTENT_UNLOCK_CATALOG.find(row => row.after === held.id) || null;
    },
    selectablePool(tabId) {
        if (tabId === 'upgrades') return CONTENT_UNLOCK_CATALOG.filter(def => def.series);
        if (tabId === 'auto') return CONTENT_UNLOCK_CATALOG.filter(def => contentProgression.kind(def) === 'auto' && !unlockTree.has(def.id));
        return this.treeDefs();
    },
    /** 고른 것이 이 탭에 없으면 이 탭의 첫 차례를 고른다. 자동 개방 탭은 비워 둔다. */
    settleSelection(tabId) {
        const pool = this.selectablePool(tabId), held = pool.find(def => def.id === this.selectedId), next = this.stepAfterPurchase(held);
        if (held && !next) return held;
        if (!next && tabId === 'auto') { this.selectedId = ''; return null; }
        const kind = UNLOCK_TABS.find(row => row.id === tabId).kind;
        const first = next || this.firstOfUnlocks(kind ? this.treeDefs(kind) : pool);
        this.selectedId = first ? first.id : '';
        return first;
    },

    // ---------------------------------------------------------------- 화면
    pointsHtml() {
        const points = contentProgression.points();
        if (points.complete) return '<div class="unlocks-points is-complete" data-tip="넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 됩니다."><strong>전체 해금 완료</strong></div>';
        const tip = points.balance === points.remaining ? '남은 해금에 필요한 포인트를 모두 모았습니다. 넘치는 몫은 그루터기 함 접붙이기 점수가 됩니다.'
            : `루프마다 ${CONTENT_UNLOCK_POINT_AWARDS.perLoop}P. 남은 해금 비용을 넘는 몫은 그루터기 함 접붙이기 점수가 됩니다.`;
        return `<div class="unlocks-points" data-tip="${tip}"><span>해금 포인트</span><strong>${points.balance}<small>P</small></strong></div>`;
    },
    tabsHtml(current) {
        return `<nav class="unlocks-tabs" aria-label="해금 종류">${UNLOCK_TABS.map(row => {
            const count = this.readyCount(row.id);
            return `<button type="button" class="unlocks-tab is-${row.id}" data-unlocks-tab="${row.id}" aria-pressed="${row.id === current}"><span class="px-center">${row.label}${count ? `<b>${count}</b>` : ''}</span></button>`;
        }).join('')}</nav>`;
    },
    listHtml(tabId) {
        const note = UNLOCK_TABS.find(row => row.id === tabId).note;
        const head = note ? `<p class="unlocks-note">${note}</p>` : '';
        if (tabId === 'upgrades') return head + this.upgradeListHtml();
        return tabId === 'auto' ? head + this.autoListHtml() : this.treeHtml();
    },
    render() {
        const root = document.getElementById('content-unlock-panel');
        if (!root || !game.contentProgression) return;
        const tabId = this.currentTab(), selected = this.settleSelection(tabId);
        const states = CONTENT_UNLOCK_CATALOG.map(def => [def.id, contentProgression.status(def.id), contentProgression.requirements(def.id)]);
        const key = JSON.stringify([game.season, contentProgression.balance(), states, tabId, this.selectedId, this.allLoops, Object.keys(game.npcMet).length]);
        if (this.shownKey === key && root.childNodes.length) return;
        this.shownKey = key;
        this.bindUnlockPanel(root);
        const list = root.querySelector('.unlocks-list'), kept = list && this.shownTab === tabId ? [list.scrollLeft, list.scrollTop] : [0, 0];
        captureUiDisclosureState(root);
        root.innerHTML = `<header class="unlocks-head">${this.pointsHtml()}${this.tabsHtml(tabId)}</header>
            <div class="unlocks-body is-${tabId}"><div class="unlocks-list">${this.listHtml(tabId)}</div>
            <aside class="unlock-detail" aria-label="고른 해금">${selected ? this.detailHtml(selected) : this.autoSummaryHtml()}</aside></div>`;
        restoreUiDisclosureState(root);
        this.shownTab = tabId;
        this.placeUnlockList(root, kept);
    },
    /** 판의 스크롤을 지키고, 다른 창에서 고른 해금은 보이는 자리로 끌어온다. */
    placeUnlockList(root, [left, top]) {
        const list = root.querySelector('.unlocks-list');
        if (!list) return;
        list.scrollLeft = left;
        list.scrollTop = top;
        if (this.revealId) root.querySelector(`.unlocks-list [data-unlock-select="${this.revealId}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        this.revealId = '';
    },
    /** 고르기: 그 해금이 있는 탭으로 간다(다른 창에서 불러도 된다). */
    select(id) {
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        if (!def) return;
        this.tab = this.tabForUnlock(def);
        this.selectedId = id;
        this.revealId = id;
        this.render();
        const root = document.getElementById('content-unlock-panel');
        if (root && root.clientWidth <= 720) root.querySelector('.unlock-detail')?.scrollIntoView({ block: 'nearest' });
    },
    handleClick(event) {
        const control = event.target.closest?.('#content-unlock-panel button');
        if (!control) return;
        const data = control.dataset;
        if (data.unlockContent) this.boughtId = data.unlockContent;
        if (data.unlockSelect) { this.select(data.unlockSelect); return; }
        if (data.unlocksTab) this.tab = data.unlocksTab;
        if (data.unlocksLoops) this.allLoops = !this.allLoops;
        if (data.unlocksTab || data.unlocksLoops) this.render();
    },

    // ---------------------------------------------------------------- 판 위의 손놀림
    /** 해금 위에 마우스를 올리면 뿌리까지의 선행 줄이 밝아진다(다시 그리지 않고 표시만 옮긴다). */
    markUnlockPath(root, id) {
        root.querySelectorAll('.is-hover-path').forEach(el => el.classList.remove('is-hover-path'));
        if (!id) return;
        unlockTree.pathTo(id).forEach(step => {
            const edge = root.querySelector(`[data-edge-to="${step}"]`);
            edge?.classList.add('is-hover-path');
            edge?.parentNode.appendChild(edge); // 줄기를 함께 쓰는 다른 선 위로
            root.querySelector(`.unlock-tree .unlock-node[data-unlock-select="${step}"]`)?.classList.add('is-hover-path');
        });
    },
    /** 마우스로 판의 빈 곳을 끌면 판이 움직인다(스킬트리처럼). 손가락은 그대로 스크롤한다. */
    startUnlockTreePan(event, list) {
        if (event.pointerType !== 'mouse' || event.button || event.target.closest('button, a, input, select, summary')) return;
        const scale = uiDisplay.factor || 1, from = { x: event.clientX, y: event.clientY, left: list.scrollLeft, top: list.scrollTop };
        const pan = move => {
            list.scrollLeft = from.left - (move.clientX - from.x) / scale;
            list.scrollTop = from.top - (move.clientY - from.y) / scale;
        };
        const release = () => {
            window.removeEventListener('pointermove', pan);
            list.classList.remove('is-panning');
        };
        list.classList.add('is-panning');
        window.addEventListener('pointermove', pan);
        window.addEventListener('pointerup', release, { once: true });
    },
    bindUnlockPanel(root) {
        if (root.dataset.unlockTreeBound) return;
        root.dataset.unlockTreeBound = '1';
        root.addEventListener('pointerover', event => {
            const node = event.target.closest?.('.unlock-tree .unlock-node');
            this.markUnlockPath(root, node ? node.dataset.unlockSelect : '');
        });
        root.addEventListener('pointerleave', () => this.markUnlockPath(root, ''));
        root.addEventListener('pointerdown', event => {
            const list = event.target.closest?.('.unlocks-list');
            if (list) this.startUnlockTreePan(event, list);
        });
    }
};
document.addEventListener('click', event => unlockTabUi.handleClick(event));
safeExposeGlobals({ unlockTabUi });
