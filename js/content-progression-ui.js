/** Menu projection and purchase event boundary; the ledger is owned by contentProgression. */
// 해금 카드의 "…에 있습니다" 줄: 콘텐츠가 있는 곳을 메뉴 이름 그대로.
const CONTENT_ROUTE_PATHS = Object.freeze({
    'item-tab-equip': '장비 → 장비 창', 'item-tab-craft': '장비 → 제작실', 'item-tab-fossil': '장비 → 제작실', 'item-tab-market': '장비 → 거래소',
    'item-tab-hall': '장비 → 장비 전당',
    'skill-tab-equip': '스킬룬 → 장착과 보조', 'skill-tab-enhance': '스킬룬 → 성장과 각인', 'skill-tab-research': '스킬룬 → 룬 연구',
    'skill-tab-condition': '스킬룬 → 전술 규칙',
    'tab-codex': '기록 → 도감', 'tab-traits': '스킬트리 → 전직', 'tab-char': '스킬트리',
    'tab-season': '루프 패시브', 'tab-stump': '그루터기 함', 'tab-talent': '재능',
    'map-tab-pvp': '지도 → 대전', 'map-explore-labyrinth': '지도 → 혼돈의 뿌리 → 고대 미궁', 'map-explore-beehive': '지도 → 탐험 → 벌집',
    'map-explore-voidrift': '지도 → 혼돈의 뿌리 → 대균열', 'map-explore-colony': '지도 → 탐험 → 군락지',
    'map-explore-trials': '지도 → 탐험 → 전직 시련', 'map-explore-chaos': '지도 → 혼돈의 뿌리 → 혼돈 심화', 'map-explore-meteor': '지도 → 탐험 → 운석 낙하'
});
// 자기 안내 카드가 따로 있는 콘텐츠(카드 키). 해금 카드는 띄우지 않는다.
const CONTENT_CARD_DEDICATED = Object.freeze({
    stump: 'unlock_stump_box', timerift: 'unlock_time_rift',
    chaosRealm: 'unlock_chaos_realm', sky: 'unlock_sky_tower', underworld: 'unlock_underworld', cosmos: 'unlock_cosmos',
    ocean: 'unlock_ocean_fishing', fishing: 'unlock_ocean_fishing', beyond: 'unlock_beyond_boundary', meteorSite: 'meteor_unlocked'
});
const contentUnlockUi = {
    renderedKey: '',
    selectedId: 'craft',
    view: 'choice',
    group: 'all',
    showAllMilestones: false,
    upgradesOpen: false,
    announceStarterGem(name) {
        if (!name || (game.seenTutorials || []).includes('tutorial_starter_gem_equip')) return;
        game.unlocks.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('tutorial_starter_gem_equip', '첫 스킬룬 장착',
            `[${name}] 룬을 얻었습니다.\n‘스킬룬’에서 빛나는 룬을 누르고 ‘장착’을 누르세요.\n장착한 룬으로 자동 전투의 공격이 바뀝니다.`, 'tab-skills');
    },
    /** The loop card: the points, then the unlocks this loop adds to the tab, by name only (2026-10-27 사용자: 짧게, 필요한 것만).
     * Free contents are left out: each gets its own card when it opens (announceContent). A loop that adds none names the next one. */
    announceLoop() {
        if (!game.contentProgression) {
            queueTutorialNotice('unlock_content_loop_' + game.season, '다음 콘텐츠 선택',
                `루프 ${game.season}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.`, 'tab-unlocks');
            return;
        }
        const added = this.listed(game.season).filter(def => contentProgression.kind(def) !== 'auto' && !contentProgression.isUnlocked(def.id));
        const paid = added.filter(def => contentProgression.kind(def) === 'paid').map(def => `[${def.name}]`);
        const byNpc = new Map();
        added.filter(def => def.npc).forEach(def => byNpc.set(def.npc, [...(byNpc.get(def.npc) || []), `[${def.name}]`]));
        if (contentProgression.points().complete && !added.length) return;
        const lines = [`해금 포인트 ${contentProgression.balance()}P`];
        if (paid.length) lines.push(`새 해금: ${paid.join(', ')}`);
        byNpc.forEach((names, npc) => lines.push(`${contentProgression.npcName(npc)}: ${names.join(', ')}`));
        // 고를 것이 새로 없는 루프(7, 9)는 다음에 열리는 루프를 한 줄 미리 보인다.
        if (!added.length) {
            const ahead = CONTENT_UNLOCK_CATALOG.filter(def => !def.series && def.minLoop > game.season).reduce((min, def) => Math.min(min, def.minLoop), Infinity);
            if (Number.isFinite(ahead)) lines.push(`루프 ${ahead}: ${this.listed(ahead).map(def => `[${def.name}]`).join(', ')}`);
        }
        queueTutorialNotice('unlock_content_loop_' + game.season, `루프 ${game.season}`, lines.join('\n'), 'tab-unlocks');
    },
    sync() {
        if (!game.contentProgression) return;
        const enabled = !!game.contentProgression;
        document.body.classList.toggle('content-choice-progression', enabled);
        document.body.classList.toggle('content-support-locked', enabled && !contentProgression.isUnlocked('support'));
        document.body.classList.toggle('content-craft-locked', !contentProgression.isUnlocked('craft'));
        document.getElementById('loop-passive-locked')?.toggleAttribute('hidden', contentProgression.isUnlocked('loopTree'));
        for (const def of CONTENT_UNLOCK_CATALOG) {
            const locked = !contentProgression.isUnlocked(def.id);
            for (const selector of def.sections || []) {
                document.querySelectorAll(selector).forEach(el => el.toggleAttribute('data-content-locked', locked));
            }
            // 경로는 canOpen을 따른다: 세계수 아틀라스 창은 혼돈계 항목에 걸려 있지만 아틀라스가 열리면 연다. 항목 잠금을 그대로 쓰면
            // 루프 10에 아틀라스가 열려도 창이 숨어 빈 화면이 됐다(2026-10-07 리뷰).
            for (const route of def.routes || []) this.syncRoute(route, !contentProgression.canOpen(route));
        }
        // 해금 목록 항목 없이 진행 조건으로만 열리는 경로.
        for (const route of ['tab-map', 'tab-season', 'tab-unlocks']) this.syncRoute(route, !contentProgression.canOpen(route));
        this.resetClosedSelection('itemSubtab', 'item-tab-equip', '#tab-items');
        this.resetClosedSelection('skillSubtab', 'skill-tab-equip', '#tab-skills');
        this.resetClosedSelection('mapSubtab', 'map-tab-zones', '#tab-map');
        this.resetClosedSelection('mapExploreSubtab', 'map-explore-hunting', '#map-tab-zones');
        this.syncSkillCopy();
        this.render();
    },
    syncSkillCopy() {
        const label = document.querySelector('#btn-skill-tab-equip strong');
        if (label) label.textContent = contentProgression.isUnlocked('support') ? '장착과 보조' : '스킬룬';
    },
    syncRoute(route, locked) {
        // A merged launcher may remain available through another purchased child.
        const group = getMergedTabGroup(route);
        const launcher = group && group[1].launcher === route;
        const closed = launcher ? !getSelectedMergedTabId(group[0]) : locked;
        document.getElementById('btn-' + route)?.toggleAttribute('data-content-locked', closed);
        if (!launcher) document.getElementById(route)?.toggleAttribute('data-content-locked', locked);
    },
    resetClosedSelection(key, fallback, rootId) {
        if (contentProgression.canOpen(game[key])) return;
        game[key] = fallback;
        const panels = key === 'mapExploreSubtab' ? ' .vertical-tab-panel' : ' > .subtab-content';
        const buttons = key === 'mapExploreSubtab' ? ' .vertical-tab-btn' : ' > .subtab-row > button';
        document.querySelectorAll(rootId + panels).forEach(el => el.classList.toggle('active', el.id === fallback));
        document.querySelectorAll(rootId + buttons).forEach(el => el.classList.toggle('active', el.id === 'btn-' + fallback));
    },
    art(def) {
        const root = CONTENT_UNLOCK_CATALOG.find(row => row.id === this.branchRoot(def));
        return 'assets/' + (def.art || root.art || 'ui/currency/sap-bud.png');
    },
    node(def) {
        const status = contentProgression.status(def.id);
        const state = status.unlocked ? 'owned' : status.available ? 'ready' : 'locked';
        // 이번 루프에 새로 고를 수 있게 된 해금은 그림 모서리 점으로만 표시한다(루프 2 · 3에 한꺼번에 몰린다, 2026-10-27).
        const fresh = !status.unlocked && def.minLoop === game.season && def.minLoop > 1 ? ' is-new' : '';
        return `<button type="button" class="unlock-node is-${state}${fresh}" data-unlock-select="${def.id}" aria-pressed="${this.selectedId === def.id}">
            <span class="unlock-node-art"><img src="${this.art(def)}" alt="" loading="lazy">${this.npcFace(def)}</span>
            <strong>${escapeHTML(def.name)}</strong>${def.gain ? `<span class="unlock-gain">${escapeHTML(def.gain)}</span>` : ''}<small>${escapeHTML(this.caption(def, status))}</small><span class="unlock-lifetime-tag">${escapeHTML(def.lifecycle?.label || '해금 영구 유지')}</span></button>`;
    },
    /** The line under an unlock: done, how it opens now (its price or its NPC) or what it still needs. */
    caption(def, status) {
        if (status.unlocked) return '해금 완료';
        if (!status.available) return status.reason;
        return status.npc ? status.reason : `선택 가능, ${def.cost}P`;
    },
    /** A growth choice of the tree: bought in this tab or given by an NPC, not content that opens by itself (contentProgression.kind).
     * 강화 steps have their own cards (upgradesHtml). */
    growth: def => contentProgression.kind(def) !== 'auto' && !def.series,
    /** What a loop's milestone lists: its unlocks without the 강화 steps (their cards say when the next step opens). */
    listed: loop => CONTENT_UNLOCK_CATALOG.filter(row => row.minLoop === loop && !row.series),
    /** 강화(2026-10-25 사용자: 영구 방치 성장, 가방 쪽, 그루터기 보관함을 해금으로): 시리즈마다 한 장. 지금 효과 → 다음 단계, 그리고
     * 다음 단계를 사는 단추(값 또는 아직 모자란 조건). 다 사면 최대. */
    upgradesHtml() {
        const series = CONTENT_UNLOCK_SERIES.map(spec => this.upgradeState(spec)), cards = series.map(row => this.upgradeCard(row)).join('');
        return `<section class="unlock-upgrades${this.upgradesOpen ? ' is-open' : ''}" aria-label="강화"><h3>강화</h3>${this.upgradeStrip(series)}<div class="unlock-upgrade-list">${cards}</div></section>`;
    },
    upgradeState(spec) {
        const rows = CONTENT_UNLOCK_CATALOG.filter(row => row.series === spec.series), rank = contentProgression.rank(spec.series);
        const next = rows[rank] || null, status = next && contentProgression.status(next.id);
        return { spec, steps: rows.length, rank, next, status, ready: !!next && status.available };
    },
    upgradeCard({ spec, steps, rank, next, status, ready }) {
        const now = this.upgradeEffect(spec, rank), then = next ? ` → <b>${escapeHTML(this.upgradeEffect(spec, rank + 1))}</b>` : '';
        const action = !next ? '<span class="unlock-upgrade-max">최대</span>'
            : `<button type="button" data-unlock-content="${next.id}"${ready ? '' : ' disabled'}><span class="px-center">${escapeHTML(ready ? next.cost + 'P' : status.reason)}</span></button>`;
        return `<article class="unlock-upgrade${ready ? ' is-ready' : ''}${next ? '' : ' is-max'}" data-tip="${escapeHTML(spec.description)}">`
            + `<img src="assets/${spec.art}" alt=""><div><strong>${escapeHTML(spec.name)}<small>${rank}/${steps}</small></strong>`
            + `<span>${escapeHTML(now)}${then}</span></div>${action}</article>`;
    },
    /** 세로로 짧은 창에서 강화 카드 대신 보이는 한 줄(css/content-progression.css): 시리즈마다 그림과 단계, 살 수 있는 수. 누르면 카드가 연결도 위로 펼쳐진다. */
    upgradeStrip(series) {
        const chips = series.map(row => `<span class="unlock-upgrade-chip${row.ready ? ' is-ready' : ''}${row.next ? '' : ' is-max'}" data-tip="${escapeHTML(row.spec.name)}"><img src="assets/${row.spec.art}" alt=""><small>${row.rank}/${row.steps}</small></span>`).join('');
        const ready = series.filter(row => row.ready).length;
        return `<button type="button" class="unlock-upgrade-strip" data-unlock-upgrades="toggle" aria-expanded="${this.upgradesOpen}"><strong>강화</strong>${chips}${ready ? `<span class="unlock-upgrade-ready">구매 가능 ${ready}</span>` : ''}</button>`;
    },
    upgradeEffect(spec, rank) {
        if (spec.series === 'offlineHours') return `${OFFLINE_PROGRESS_RECOGNITION_HOURS[rank]}시간`;
        if (spec.series === 'offlineRate') return `${Math.round(OFFLINE_PROGRESS_EFFICIENCY_RATES[rank] * 100)}%`;
        if (spec.series === 'bagPage') return `${1 + rank}쪽`;
        return `+${rank * spec.storage}칸`;
    },
    /** An NPC unlock's mark: the face of the NPC who gives it, on the corner of its picture (stage art; a missing one is dropped). */
    npcFace(def) {
        if (!def.npc) return '';
        return `<span class="unlock-npc-face" data-tip="${escapeHTML(contentProgression.npcName(def.npc))}에게서 받는 해금"><img src="${STAGE_NPC_ART.path}${def.npc}-portrait.webp" alt=""></span>`;
    },
    branchRoot(def) {
        if (def.displayBranch) return def.displayBranch;
        let node = def;
        while (node.after && !node.branchStart && !node.displayBranch) node = CONTENT_UNLOCK_CATALOG.find(row => row.id === node.after);
        return node.displayBranch || node.id;
    },
    depth(def) {
        if (def.displayBranch) return 0;
        let depth = 0, node = def;
        while (node.after && !node.branchStart && !node.displayBranch) { depth++; node = CONTENT_UNLOCK_CATALOG.find(row => row.id === node.after); }
        return depth;
    },
    connections(nodes, depths) {
        // Coordinates match the fixed node columns (136px wide, 150px node + 20px gap); SVG scales with the compact mobile grid.
        const columns = depths.map(depth => nodes.filter(row => this.depth(row) === depth));
        const position = def => ({ x:depths.indexOf(this.depth(def)) * 160 + 68,
            y:columns[depths.indexOf(this.depth(def))].findIndex(row => row.id === def.id) * 170 + 69 });
        const entries = nodes.filter(row => row.after === 'craft').map(def =>
            `<path pathLength="1" d="M-15,${position(def).y} H${position(def).x - 34}"/>`).join('');
        const paths = nodes.filter(row => nodes.some(parent => parent.id === row.after)).map(def => {
            const from = position(nodes.find(row => row.id === def.after)), to = position(def);
            const start = from.x + 34, end = to.x - 34, middle = (start + end) / 2;
            return `<path pathLength="1" d="M${start},${from.y} C${middle},${from.y} ${middle},${to.y} ${end},${to.y}"/>`;
        }).join('');
        return `<svg class="unlock-connections" viewBox="0 0 ${columns.length * 160 - 24} ${Math.max(...columns.map(rows => rows.length)) * 170 + 16}" preserveAspectRatio="none" aria-hidden="true">${entries}${paths}</svg>`;
    },
    choiceMap() {
        const starter = CONTENT_UNLOCK_CATALOG.find(row => row.id === 'craft');
        if (!contentProgression.isUnlocked('craft')) return this.upgradesHtml() + `<div class="unlock-start"><span class="unlock-eyebrow">첫 성장</span>${this.node(starter)}<p>${escapeHTML(contentProgression.npcName(starter.npc))}에게서 장비 제련을 받으면<br>다음 성장 갈래가 열립니다.</p></div>`;
        const roots = CONTENT_UNLOCK_CATALOG.filter(row => this.growth(row) && (!row.after || row.branchStart));
        const filters = roots.map(row => `<button type="button" data-unlock-group="${row.id}" aria-pressed="${this.group === row.id}">${escapeHTML(row.group)}</button>`).join('');
        const branches = roots.filter(row => this.group === 'all' || row.id === this.group).map(root => {
            const nodes = CONTENT_UNLOCK_CATALOG.filter(row => this.growth(row) && row.id !== 'craft' && this.branchRoot(row) === root.id);
            const depths = [...new Set(nodes.map(row => this.depth(row)))].sort((a,b) => a-b);
            const columns = depths.map(depth => `<div class="unlock-depth"><span class="unlock-depth-label">${depths.indexOf(depth) + 2}단계</span>${nodes.filter(row => this.depth(row) === depth).map(row => this.node(row)).join('')}</div>`).join('');
            return `<section class="unlock-branch" aria-label="${escapeHTML(root.group)}"><span class="unlock-trunk" aria-hidden="true"></span><h3>${escapeHTML(root.group)}</h3><div class="unlock-path">${this.connections(nodes, depths)}${columns}</div></section>`;
        }).join('');
        return this.upgradesHtml() + `<nav class="unlock-filters" aria-label="성장 분야"><button type="button" data-unlock-group="all" aria-pressed="${this.group === 'all'}">전체</button>${filters}</nav>
            <div class="unlock-map" tabindex="0" aria-label="성장 해금 연결도"><button type="button" class="unlock-origin" data-unlock-select="craft" aria-pressed="${this.selectedId === 'craft'}"><span class="unlock-node-art"><img src="${this.art(starter)}" alt="">${this.npcFace(starter)}</span><span class="unlock-origin-label">장비 제련 <small>해금 완료, 이어지는 성장 선택</small></span></button>${branches}</div>`;
    },
    /** A one-time visual transition from the existing starter; never stored in the progression ledger. */
    revealBranches(root, previous) {
        const origin = root.querySelector('.unlock-origin .unlock-node-art');
        if (!previous || !origin) return;
        const visible = previous.bottom > 0 && previous.top < window.innerHeight;
        if (!visible) root.querySelector('.unlock-filters').scrollIntoView({ block:'start', behavior:'instant' });
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const current = origin.getBoundingClientRect();
        const start = visible ? `translate(${previous.left - current.left}px, ${previous.top - current.top}px)` : 'translateY(8px)';
        origin.animate([{ transform:start }, { transform:'none' }], { duration:420, easing:'cubic-bezier(.22,1,.36,1)' });
        root.querySelector('.unlock-origin-label').animate([{ opacity:0 }, { opacity:1 }], { duration:350, delay:200, fill:'backwards' });
        root.querySelectorAll('.unlock-branch').forEach((branch, index) => {
            const delay = 280 + index * 100;
            branch.querySelector('.unlock-trunk').animate([{ transform:'scaleY(0)' }, { transform:'scaleY(1)' }], { duration:420, delay, fill:'backwards' });
            branch.querySelectorAll('path').forEach(path => path.animate(
                [{ strokeDasharray:'1', strokeDashoffset:1 }, { strokeDasharray:'1', strokeDashoffset:0 }],
                { duration:480, delay:delay + 100, fill:'backwards' }));
            branch.querySelectorAll('.unlock-depth, h3').forEach((column, depth) => column.animate(
                [{ opacity:0, transform:'translateX(-12px)' }, { opacity:1, transform:'none' }],
                { duration:420, delay:delay + 140 + depth * 70, fill:'backwards', easing:'ease-out' }));
        });
    },
    /** Roadmap lines a loop adds beside the unlock catalog (deepening, the stump box, the atlas, 세계수 껍질 ...). Loop settlement shows them too. */
    roadmapAdditions(loop) {
        return (SEASON_CONTENT_ROADMAP[loop]?.features || []).filter(text => /심화:|그루터기 함|아틀라스:|야생 부적|전환점:|전술 조건|버려진 날붙이|최종 관문|세계수 껍질/.test(text));
    },
    milestone(loop, end = loop) {
        const rows = this.listed(loop);
        const of = kind => rows.filter(row => contentProgression.kind(row) === kind);
        const additions = this.roadmapAdditions(loop);
        return `<details id="unlock-milestone-${loop}" class="unlock-milestone" ${loop === game.season ? 'open' : ''}>
            <summary><strong>루프 ${end > loop ? `${loop}–${end}` : loop}</strong><span>${loop < game.season ? '도달 완료' : loop === game.season ? '현재 여정' : '예정'}${this.milestoneTeaser(loop)}</span></summary>
            <p class="unlock-loop-requirement">${escapeHTML(getLoopAbyssRequirementText(loop))}</p>
            ${this.milestoneRows(of('auto'), '자동 개방')}${this.milestoneRows(of('npc'), 'NPC 해금')}${this.milestoneRows(of('paid'), '성장 선택')}
            ${additions.length ? `<p class="unlock-expansion">${additions.map(escapeHTML).join('<br>')}</p>` : ''}</details>`;
    },
    /** 같은 예고만 이어지는 앞날의 루프는 한 줄로 묶는다(루프 21 ~ 24가 "심화: 혼돈 단계 상승" 네 줄이었다 — 검토 5차). */
    milestoneRuns(loops) {
        return loops.reduce((runs, loop) => {
            const plain = loop > game.season && !this.listed(loop).length;
            const key = plain ? this.milestoneTeaser(loop) : null, last = runs[runs.length - 1];
            if (key && last && last.key === key && last.end === loop - 1) last.end = loop;
            else runs.push({ start: loop, end: loop, key });
            return runs;
        }, []);
    },
    /** 접힌 이정표 줄에도 그 루프에 열리는 것을 한두 개 보인다(빈 "예정" 줄만 늘어서 있었다 — 검토 4차). */
    milestoneTeaser(loop) {
        if (loop === game.season) return '';
        const names = this.listed(loop).map(row => row.name);
        const first = names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` 외 ${names.length - 2}` : '')
            : (SEASON_CONTENT_ROADMAP[loop]?.features || [])[0];
        return first ? `, ${escapeHTML(first)}` : '';
    },
    /** 진행 · 이정표에서 아직 고른 항목이 없을 때의 오른쪽 설명(앞 화면에서 고른 항목이 남아 있었다 — 검토 4차). */
    loopSummary() {
        const next = game.season + 1;
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">진행과 이정표</span><h3>루프 ${game.season}</h3>
            <p>루프마다 자동으로 열리는 전투 콘텐츠와 고를 수 있는 성장 수단입니다. 목록의 항목을 누르면 설명이 여기에 나옵니다.</p></div>
            <div class="unlock-requirements"><h4>다음 루프 ${next}</h4><div><span>${escapeHTML(getLoopAbyssRequirementText(next))}</span></div></div>`;
    },
    setView(view) {
        this.view = view;
        this.selectedId = view === 'choice' ? this.selectedId || 'craft' : null;
    },
    milestoneRows(rows, label) {
        if (!rows.length) return '';
        return `<div class="unlock-milestone-group"><h4>${label}</h4>${rows.map(def => {
            const caption = this.caption(def, contentProgression.status(def.id));
            return `<button type="button" data-unlock-select="${def.id}" class="unlock-milestone-item"><span>${escapeHTML(def.name)}<span class="unlock-lifetime-tag">${escapeHTML(def.lifecycle?.label || '해금 영구 유지')}</span></span><small>${escapeHTML(caption)}</small></button>`;
        }).join('')}</div>`;
    },
    progressionMap() {
        const loops = Object.keys(SEASON_CONTENT_ROADMAP).map(Number);
        const shown = this.showAllMilestones ? loops : loops.filter(loop => loop >= game.season && loop <= game.season + 4);
        const toggle = this.showAllMilestones ? '현재/다음 이정표만' : '전체 이정표 보기';
        return `<div class="unlock-milestone-intro"><p>전투는 진행에 따라 열리고, 성장 수단은 직접 선택합니다.</p>
            <button type="button" data-unlock-horizon="toggle">${toggle}</button></div>
            <div class="unlock-milestones">${this.milestoneRuns(shown).map(run => this.milestone(run.start, run.end)).join('') || this.milestone(game.season)}</div>`;
    },
    /** hides(id): in the NPC window's 즉시 해금, whether an unlock is still hidden there (npcKnows); its name is left out of the first reward. */
    entryReward(def, status, hides) {
        const text = hides ? this.withoutHidden(def.rewardText, hides) : def.rewardText;
        const reward = !status.unlocked && text ? `<p class="unlock-reward">${escapeHTML(text)}</p>` : '';
        const picker = !status.unlocked && def.rewardChoices?.length > 1 ? `<label class="content-unlock-choice">첫 보상<select data-unlock-reward="${def.id}" aria-label="${escapeHTML(def.name)} 첫 보상">${def.rewardChoices.map(row => `<option value="${row.key}">${escapeHTML(row.label)}</option>`).join('')}</select></label>` : '';
        return reward + picker;
    },
    lockAttribute(id) {
        return contentProgression.isUnlocked(id) ? '' : 'data-content-locked';
    },
    lifecycle(def) {
        const life = def.lifecycle;
        if (!life) return '<p class="unlock-lifetime-note">기능 해금은 다음 루프에도 유지됩니다.</p>';
        return `<details class="unlock-lifetime" id="unlock-lifetime-${def.id}"><summary>루프 전환 시, ${escapeHTML(life.label)}</summary><p class="unlock-lifetime-note">기능 해금은 영구 유지</p>
            ${life.kept ? `<p><b>유지</b>${escapeHTML(life.kept)}</p>` : ''}${life.reset ? `<p><b>초기화</b>${escapeHTML(life.reset)}</p>` : ''}</details>`;
    },
    /** The parts of a ", " list that name no unlock still hidden in the NPC window. A name followed by 의 is part of another noun
     * (the gem material 창공의 정수 is not the 창공 unlock). */
    withoutHidden(text, hides) {
        const names = CONTENT_UNLOCK_CATALOG.filter(row => hides(row.id)).map(row => row.name);
        const named = part => names.some(name => part.split(name).slice(1).some(rest => !rest.startsWith('의 ')));
        return String(text || '').split(', ').filter(part => !named(part)).join(', ');
    },
    relatedFeatures(def) {
        if (!def.features) return '';
        return `<details class="unlock-related" id="unlock-related-${def.id}"><summary>포함된 성장 요소</summary>${def.features.map(row =>
            `<p><strong>${escapeHTML(row.name)}</strong>${escapeHTML(row.description)}</p>`).join('')}</details>`;
    },
    detail(def) {
        const status = contentProgression.status(def.id), kind = contentProgression.kind(def);
        const conditions = contentProgression.requirements(def.id);
        // 첫 보상은 설명 바로 아래, 해금 단추는 맨 아래에서 창 본문 아래쪽에 붙어(sticky) 늘 보인다 — 작은 창(1366×768 ·
        // HUD 위 작업 영역)에서 단추가 스크롤 밖으로 밀려났다.
        return `<div class="unlock-detail-top"><span class="unlock-eyebrow">${escapeHTML(def.group)}, ${{ paid: '선택 해금', npc: 'NPC 해금', auto: '자동 개방' }[kind]}</span>
            <div class="unlock-detail-art"><img src="${this.art(def)}" alt=""></div><h3>${escapeHTML(def.name)}</h3>${def.gain ? `<p class="unlock-gain">${escapeHTML(def.gain)}</p>` : ''}<p>${escapeHTML(def.description)}</p>${this.loreHtml(def.id)}</div>
            <div class="unlock-detail-reward">${this.entryReward(def, status)}</div>
            ${this.lifecycle(def)}${this.relatedFeatures(def)}
            <div class="unlock-requirements"><h4>${status.unlocked ? '해금 완료' : `해금 조건${kind === 'paid' ? ', ' + def.cost + 'P' : ''}`}</h4>${conditions.map(row => `<div class="${row.met ? 'is-met' : ''}"><span>${escapeHTML(row.label)}</span><small>${row.met ? '달성' : '미달성'}</small></div>`).join('')}</div>
            <div class="unlock-detail-action">${this.actionButton(def, status, kind)}</div>`;
    },
    /** Opened: the way to it. Paid: buy with points. NPC unlock: its NPC's window (npcFoot) once met and ready. Automatic: none. */
    actionButton(def, status, kind) {
        if (status.unlocked) return this.openButton(def);
        if (kind === 'auto') return '<button type="button" disabled><span class="px-center">조건 달성 시 자동 개방</span></button>';
        const reason = escapeHTML(status.reason), disabled = status.available ? '' : 'disabled';
        if (kind === 'npc') return `<button type="button" class="unlock-npc-gift" data-npc-open="${def.npc}" data-unlock-npc="${def.id}" ${disabled}><span class="px-center">${reason}</span></button>`;
        return `<button type="button" data-unlock-content="${def.id}" ${disabled}><span class="px-center">${reason}</span></button>`;
    },
    /** Who speaks for this unlock and what (data/story-journal.js STORY_LOOP_MILESTONES), under the unlock's description, with
     * the face of that NPC when the stage art is here (for an NPC unlock, the NPC who gives it). */
    loreHtml(id) {
        const lore = STORY_LOOP_MILESTONES[id];
        if (!lore) return '';
        const npc = Object.values(STORY_NPCS).find(row => this.personal(row.name) === this.personal(lore.speaker));
        const face = npc && stageView.enabled() ? `<img class="unlock-lore-face" src="${STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt="">` : '';
        return `<blockquote class="story-scene-quote${face ? ' has-face' : ''}">${face}<p>${lore.narration.map(escapeHTML).join(' ')}</p>
            <p><strong>${escapeHTML(lore.speaker)}</strong> ${escapeHTML(lore.quote)}</p></blockquote>`;
    },
    openButton(def) {
        const reachable = def.action || (def.routes || []).some(route => route.startsWith('tab-') || route.startsWith('item-tab-') || route.startsWith('skill-tab-') || route.startsWith('map-'));
        return reachable ? `<button type="button" data-open-content="${def.id}"><span class="px-center">바로 사용하기</span></button>` : '<span class="content-unlock-owned">해금 완료</span>';
    },
    pointBalanceHtml() {
        const points = contentProgression.points();
        if (points.complete) return '<div class="content-unlock-balance" data-tip="넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 됩니다.">전체 해금 완료</div>';
        const title = points.balance === points.remaining ? '남은 해금에 필요한 포인트를 모두 모았습니다. 넘치는 몫은 그루터기 함 접붙이기 점수가 됩니다.'
            : `루프마다 ${CONTENT_UNLOCK_POINT_AWARDS.perLoop}P. 남은 해금 비용을 넘는 몫은 그루터기 함 접붙이기 점수. NPC 해금은 포인트 없이 그 NPC에게서 받습니다.`;
        return `<div class="content-unlock-balance" data-tip="${title}"><span>해금</span><strong>${points.balance}</strong><span>P</span></div>`;
    },
    render() {
        const root = document.getElementById('content-unlock-panel');
        if (!root || !game.contentProgression) return;
        const states = CONTENT_UNLOCK_CATALOG.map(def => [def.id, contentProgression.status(def.id), contentProgression.requirements(def.id)]);
        const key = JSON.stringify([game.season, contentProgression.balance(), states, this.view, this.group, this.selectedId, this.showAllMilestones, this.upgradesOpen, Object.keys(game.npcMet).length]);
        if (this.renderedKey === key && root.childNodes.length) return;
        this.renderedKey = key;
        const starter = root.querySelector('.unlock-start .unlock-node-art')?.getBoundingClientRect();
        const scroll = [...root.querySelectorAll('.unlock-map, .unlock-milestones')].map(el => [el.className, el.scrollLeft, el.scrollTop]);
        captureUiDisclosureState(root);
        const selected = CONTENT_UNLOCK_CATALOG.find(row => row.id === this.selectedId);
        root.innerHTML = `<header class="content-unlock-heading"><span>루프 ${game.season}</span>${this.pointBalanceHtml()}</header>
            <div class="unlock-toolbar"><nav aria-label="해금 방식"><button type="button" data-unlock-view="choice" aria-pressed="${this.view === 'choice'}">선택 해금</button><button type="button" data-unlock-view="progress" aria-pressed="${this.view === 'progress'}">진행, 이정표</button></nav></div>
            <div class="unlock-workspace"><div class="unlock-content">${this.view === 'choice' ? this.choiceMap() : this.progressionMap()}</div>
            <aside class="unlock-detail" aria-label="선택한 콘텐츠">${selected ? this.detail(selected) : this.loopSummary()}</aside></div>`;
        restoreUiDisclosureState(root);
        scroll.forEach(([name, left, top]) => root.getElementsByClassName(name)[0]?.scrollTo({ left, top }));
        this.revealBranches(root, starter);
    },
    handleControl(control) {
        if (!control) return;
        const data = control.dataset;
        if (data.unlockSelect) { this.select(data.unlockSelect); return; }
        if (data.unlockView) this.setView(data.unlockView);
        if (data.unlockGroup) this.group = data.unlockGroup;
        if (data.unlockHorizon) this.showAllMilestones = !this.showAllMilestones;
        if (data.unlockUpgrades) this.upgradesOpen = !this.upgradesOpen;
        this.render();
    },
    /** 펼친 강화 카드는 바깥을 누르면 접힌다(연결도를 가린다). */
    foldUpgrades(target) {
        if (!this.upgradesOpen || target.closest('.unlock-upgrades')) return;
        this.upgradesOpen = false;
        this.render();
    },
    select(id) {
        if (!CONTENT_UNLOCK_CATALOG.some(row => row.id === id)) return;
        this.selectedId = id;
        this.render();
        const root = document.getElementById('content-unlock-panel');
        root.querySelector(`[data-unlock-select="${id}"]`)?.focus({ preventScroll:true });
        if (root.clientWidth < 840) root.querySelector('.unlock-detail').scrollIntoView({ block:'nearest' });
    },
    /** scope: the detail the button was pressed in (its first reward choice). */
    purchase(id, scope = document) {
        this.takeContent(id, scope, contentProgression.purchase);
    },
    /** An NPC's 즉시 해금: the same as purchase, for no points (contentProgression.gift). */
    gift(id, scope) {
        this.takeContent(id, scope, contentProgression.gift);
    },
    takeContent(id, scope, take) {
        const key = scope.querySelector(`[data-unlock-reward="${id}"]`)?.value, opened = this.openedContents();
        const result = take(id, game, key);
        if (!result.ok) { addLog(result.message, 'attack-monster', { toast: true }); return; }
        // The unlock card says the same and more: no toast (PC) or bottom notice (phone) on top of it.
        const carded = this.announceContent(id);
        addLog(result.message, 'season-up', { toast: !carded, noToast: carded });
        this.announceOpenedSince(opened); // free content that comes with it (거래소 · 장비 전당 with 장비 제련)
        // 지금 살 수 있는 해금이 남았을 때만 알림: 뒤 루프의 강화 단계를 기다리는 포인트는 소식이 아니다(2026-10-25).
        game.noti.season = CONTENT_UNLOCK_CATALOG.some(def => contentProgression.kind(def) === 'paid' && contentProgression.status(def.id).available);
        checkUnlocks();
        updateStaticUI();
        saveGame({ skipCloudSync: false });
    },
    routeAction(def) {
        if (def.action) return def.action;
        const route = def.routes?.[0];
        if (!route) return null;
        if (route.startsWith('item-tab-')) return { tab:'tab-items', subtab:route };
        if (route.startsWith('skill-tab-')) return { tab:'tab-skills', skillSubtab:route };
        if (route.startsWith('map-explore-')) return { tab:'tab-map', mapSubtab:'map-tab-zones', explore:route };
        if (route.startsWith('map-tab-')) return { tab:'tab-map', mapSubtab:route };
        if (route.startsWith('tab-')) return { tab:route };
        return null;
    },
    openSection(id) {
        uiDisclosureState[`id:${id}`] = true;
        const section = document.getElementById(id);
        if (section) section.open = true;
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block:'nearest' }));
    },
    /** The route an unlock card or button opens: explore / sub-tab / tab, whichever is most exact. */
    routeKey(action) {
        const map = action.mapSubtab && action.mapSubtab !== 'map-tab-zones' ? action.mapSubtab : null;
        return action.explore || action.subtab || action.skillSubtab || map || action.tab;
    },
    /** New content card: what it is (the catalog line) and where it lives. Once per content; returns true if queued. */
    announceContent(id) {
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        // 강화 단계(def.series)는 카드 없이 기록만 남긴다: 가방 쪽, 그루터기 보관함은 새 콘텐츠가 아니다.
        if (!def || def.series || (def.minLoop <= 1 && id !== 'tactics') || CONTENT_CARD_DEDICATED[id]) return false;
        const action = this.routeAction(def), route = action ? this.routeKey(action) : null;
        const path = CONTENT_ROUTE_PATHS[route];
        const before = tutorialQueue.length;
        queueTutorialNotice(`unlock_content_${id}`, def.name, path ? `${def.description}\n‘${path}’에 있습니다.` : def.description,
            action ? action.tab : null, { subtabId: route, contentId: id, openLabel: `${def.name} 열기` });
        return tutorialQueue.length > before;
    },
    /** Free contents open right now (contentProgression keeps them in automatic once reached). */
    openedContents() {
        return new Set(game.contentProgression ? game.contentProgression.automatic : []);
    },
    announceOpenedSince(before) {
        this.openedContents().forEach(id => { if (!before.has(id)) this.announceContent(id); });
    },
    /** contentProgression.sync, plus a card for each free content that has just opened (loop reached, condition met).
     * Contents open at load are not news: the save migration syncs before any of this runs. */
    syncOpened() {
        const before = this.openedContents();
        contentProgression.sync();
        this.announceOpenedSince(before);
    },
    /** Whether the hero may know of an unlock now: bought, or its loop, progress, earlier-unlock (and meeting) conditions are met. */
    npcKnows(id) {
        return contentProgression.isUnlocked(id) || contentProgression.requirements(id).every(row => row.met);
    },
    personal: text => String(text || '').split(/[\s,]+/).pop(),
    /** What the NPC has for the hero, for the mark over it on the stage (js/canvas-act-title-card.js) and in the NPC tab: 'unlock'
     * while one of its unlocks can be opened now (npcReady), 'talk' while a keyword it can speak of has not been heard, else ''.
     * npc: { id, name }. */
    npcNews(npc) {
        if (!game.contentProgression) return '';
        if (this.npcReady(npc.id).length) return 'unlock';
        return this.npcTopics(npc).open.some(row => !this.npcHeard(npc, row.topic)) ? 'talk' : '';
    },
    /** 즉시 해금: the NPC's own unlocks (catalog npc, contentProgression.kind 'npc') not opened yet whose conditions are met, opened
     * here for no points (2026-10-16 사용자: 조우 후 NPC를 누르면 그 NPC의 콘텐츠를 바로 해금, 포인트 없이 공짜로). Since 2026-10-21 only
     * these few early unlocks (사용자: NPC 해금과 일반 해금 분리); the unlock tab sells the rest. Ones still behind a loop, a progress step
     * or another unlock stay hidden, so the window spoils nothing (2026-10-16 사용자: 아직 알지 못하는 정보의 해금과 불가능한 해금은
     * 안 보이게). npcId: STORY_NPCS id. */
    npcReady(npcId) {
        return CONTENT_UNLOCK_CATALOG.filter(def => def.npc === npcId && !contentProgression.isUnlocked(def.id) && this.npcKnows(def.id));
    },
    /** The NPC's window, an ARPG's NPC talk (2026-10-15 사용자: "POE처럼 키워드 누르면 관련 스크립트만", "NPC 대화창도 정성들여서"):
     * the NPC's portrait on the left; on the right its name, a speech box with what it says (its line on the stage when the window
     * opens, then the chosen keyword's), the keywords it can speak of (STORY_NPCS dialogues, new ones marked until heard, heard ones
     * grey) and, under them, its unlocks to open now (즉시 해금) and the door to its shop (js/npc-shop-ui.js), which takes the body.
     * npc: { id, name, title, tone, line } (js/canvas-act-title-card.js npcAt, js/npc-roster-ui.js). */
    openNpc(npc) {
        const old = document.getElementById('npc-dialog');
        if (!npc || (old && old.open)) return false;
        if (old) old.remove(); // closed a moment ago, its close event (which removes it) not yet run
        const view = { npc, mode: 'talk', topic: null };
        const dialog = document.createElement('dialog');
        dialog.id = 'npc-dialog';
        dialog.className = 'npc-dialog';
        dialog.dataset.tone = npc.tone || 'gold';
        dialog.setAttribute('aria-labelledby', 'npc-dialog-name');
        dialog.addEventListener('click', event => this.npcClick(dialog, view, event));
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        document.body.appendChild(dialog);
        this.renderNpc(dialog, view);
        dialog.showModal();
        return true;
    },
    renderNpc(dialog, view) {
        const npc = view.npc;
        dialog.classList.toggle('is-shop', view.mode === 'shop');
        dialog.innerHTML = `<figure class="npc-dialog-figure"><img class="npc-dialog-portrait" src="${STAGE_NPC_ART.path}${npc.id}-portrait.webp" alt=""></figure>
            <div class="npc-dialog-main"><header class="npc-dialog-head"><div class="npc-dialog-who">
            <h2 id="npc-dialog-name">${escapeHTML(npc.name)}</h2><p class="npc-dialog-title">${escapeHTML(npc.title || '')}</p></div>
            <button type="button" class="npc-dialog-close" data-npc-close>닫기</button></header>
            ${view.mode === 'shop' ? npcShopUi.body(npc) : this.npcTalkBody(view)}</div>`;
    },
    /** The speech box, the keywords and the foot (npcFoot). */
    npcTalkBody(view) {
        const npc = view.npc, { open } = this.npcTopics(npc), topic = open.find(row => row.topic === view.topic) || null;
        const keys = open.map(row => {
            const heard = this.npcHeard(npc, row.topic);
            return `<li><button type="button" class="${heard ? 'is-heard' : 'is-new'}" data-npc-topic="${escapeHTML(row.topic)}" aria-pressed="${row === topic}">
                <span>${escapeHTML(row.topic)}</span>${heard ? '' : '<em>새 이야기</em>'}</button></li>`;
        }).join('');
        return `<section class="npc-dialog-speech" aria-live="polite">${topic ? `<h3>${escapeHTML(topic.topic)}</h3>` : ''}
            <p>${escapeHTML(topic ? topic.line : this.npcGreeting(npc))}</p></section>
            <nav class="npc-dialog-talk" aria-label="이야깃거리"><h4>이야기</h4><ul class="npc-dialog-topics">${keys}</ul></nav>
            ${this.npcFoot(view)}`;
    },
    /** 즉시 해금 (npcReady), each opened right here for no points with its first reward choice; then the door to the shop. */
    npcFoot(view) {
        const hides = id => !this.npcKnows(id);
        const rows = this.npcReady(view.npc.id).map(def => `<li class="npc-instant-row"><img src="${this.art(def)}" alt="">
            <div><strong>${escapeHTML(def.name)}</strong><p>${escapeHTML(def.description)}</p>${this.entryReward(def, contentProgression.status(def.id), hides)}</div>
            <button type="button" data-npc-gift="${def.id}">해금</button></li>`).join('');
        const instant = rows ? `<section class="npc-dialog-instant" aria-label="즉시 해금"><h4>즉시 해금<small>포인트 없이 바로 엽니다</small></h4>
            <ul>${rows}</ul></section>` : '';
        const shop = npcShopUi.door(view.npc);
        return instant || shop ? `<footer class="npc-dialog-foot">${instant}${shop}</footer>` : '';
    },
    /** The keywords the NPC can speak of now (STORY_NPCS dialogues, docs/story-bible.md section 4): a keyword waits for the act it
     * speaks of (reqAct, any act after a first loop) and for its loop (reqLoop). */
    npcTopics(npc) {
        const rows = (STORY_NPCS[npc.id] || {}).dialogues || [], act = this.npcReachedAct(), loop = game.season || 1;
        return { open: rows.filter(row => (!row.reqAct || act >= row.reqAct) && (!row.reqLoop || loop >= row.reqLoop)) };
    },
    /** The furthest story act the hero has reached in this loop (STORY_ACTS order), or every act after a first loop. */
    npcReachedAct() {
        if ((game.season || 1) > 1) return STORY_ACTS.length;
        const zone = Math.max(Number(game.maxZoneId) || 0, Number.isInteger(game.currentZoneId) ? game.currentZoneId : 0);
        return STORY_ACTS.filter((act, index) => index <= zone).reduce((top, act) => Math.max(top, act.order), 1);
    },
    /** What the NPC says when the window opens: its line on the stage, else its first words in the latest act it met the hero. */
    npcGreeting(npc) {
        if (npc.line) return npc.line;
        const me = this.personal(npc.name), act = this.npcReachedAct();
        const met = STORY_ACTS.filter(row => row.order <= act).map(row => (STORY_ACT_ENCOUNTERS[row.order] || {}).npc)
            .filter(said => said && this.personal(said.name) === me).pop();
        return met ? met.bark : npc.title;
    },
    /** Heard keywords are kept in the save (game.npcHeard, "npcId:keyword"): the window and the stage mark tell new ones apart. */
    npcHeardKey: (npc, topic) => `${npc.id}:${topic}`,
    npcHeard(npc, topic) {
        return game.npcHeard.includes(this.npcHeardKey(npc, topic));
    },
    hearNpcTopic(npc, topic) {
        if (!this.npcHeard(npc, topic)) game.npcHeard.push(this.npcHeardKey(npc, topic));
    },
    /** A keyword shows its line (and counts as heard; 상점 opens the shop, its 대화 the talk again); 해금 opens the content for no
     * points (gift). The shop's own presses are js/npc-shop-ui.js's. */
    npcClick(dialog, view, event) {
        const control = event.target.closest('button');
        if (!control) return;
        if (control.dataset.npcClose !== undefined) { dialog.close(); return; }
        if (control.dataset.npcTopic) { this.npcPickTopic(view, control.dataset.npcTopic); this.renderNpc(dialog, view); return; }
        if (control.dataset.npcGift) { this.gift(control.dataset.npcGift, control.closest('.npc-instant-row')); this.renderNpc(dialog, view); }
    },
    npcPickTopic(view, topic) {
        if (topic === 'shop') { view.mode = 'shop'; return; }
        const known = this.npcTopics(view.npc).open.some(row => row.topic === topic);
        Object.assign(view, { mode: 'talk', topic: known ? topic : null });
        if (known) this.hearNpcTopic(view.npc, topic);
    },
    open(id) {
        if (!contentProgression.isUnlocked(id)) return false;
        const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
        const action = this.routeAction(def);
        if (!action) return false;
        switchTab(action.tab, { keepWindowOpen: true });
        if (action.subtab) switchItemSubtab(action.subtab);
        if (action.skillSubtab) switchSkillSubtab(action.skillSubtab);
        if (action.mapSubtab) switchMapSubtab(action.mapSubtab);
        if (action.explore) switchMapExploreSubtab(action.explore);
        if (action.section) this.openSection(action.section);
        return true;
    }
};
document.addEventListener('click', event => {
    contentUnlockUi.foldUpgrades(event.target);
    contentUnlockUi.handleControl(event.target.closest('button'));
    const button = event.target.closest('[data-unlock-content]');
    if (button && !button.disabled) contentUnlockUi.purchase(button.dataset.unlockContent, button.closest('.unlock-detail') || document);
    const open = event.target.closest('[data-open-content]');
    if (open) contentUnlockUi.open(open.dataset.openContent);
});
// The loop's starter gem picked up from the floor (js/combat.js receiveStarterGemRow): its log line, and in a first loop the equip
// guide right there (checkUnlocks → announceStarterGem), with the room already cleared.
window.addEventListener('project-idle:starter-gem-received', event => {
    addLog(`스킬룬 [${event.detail.gem}] 획득`, 'loot-rare');
    checkUnlocks();
});
// NPC pictures are local stage art (assets/stage-npcs): where one is missing, drop it rather than show a broken image.
document.addEventListener('error', event => {
    if (!(event.target instanceof HTMLImageElement)) return;
    if (event.target.matches('.unlock-npc-face img')) event.target.parentElement.remove();
    else if (event.target.matches('.npc-dialog-portrait, .unlock-lore-face, .npc-roster-portrait')) event.target.remove();
}, true);
safeExposeGlobals({ contentUnlockUi });
