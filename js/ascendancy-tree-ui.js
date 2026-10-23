/** 전직 트리 보기 (2026-10-09 목표 "전직노드 UI/UX 개선", 2026-10-22 "전직 노드창 개선"). 왼쪽에 노드 나무(칸마다 그림, 값,
 * 능력치 이름, 궁극과 4차 핵심과 특화 줄에는 이름표), 오른쪽에 키스톤과 자세히 카드를 둔다. 좁은 창에서는 나무, 자세히, 키스톤 차례로
 * 쌓고 자세히 카드가 아래에 붙는다. 자세히 카드는 가리키거나 누른 칸의 효과, 찍으면 바뀌는 값, 할 수 있는 일과 그 단추를 보인다. 사고 되돌리는 규칙은 js/ui.js(buyAscend, askRefundAscendNode, buyAscendKeystone,
 * refundAscendKeystone)를 그대로 부른다. 마우스로는 누르면 바로 찍고, 가리킬 수 없는 화면(터치)에서는 첫 탭이 고르기, 같은 칸을
 * 한 번 더 누르면 찍는다(잘못 눌러 되돌리느라 마름병 포자를 쓰지 않게).
 * 아직 열리지 않은 4차 핵심과 전직 특화는 흐리게 미리 보이고, 재능 특화는 개화한 재능이 정해질 때까지 자리만 보인다.
 */
const ascendancyTreeUi = (() => {
    const ROWS = Object.freeze([['n1'], ['n2', 'n3'], ['n4', 'n5', 'n6'], ['n7', 'n8', 'n9'], ['n10'], ['n11', 'n12'], ['n13a', 'n13b', 'n13c', 'n13d']]);
    const RANK = Object.freeze({ n10: '궁극 노드', n11: '4차 핵심', n12: '4차 핵심', n13a: '재능 특화', n13b: '재능 특화', n13c: '전직 특화', n13d: '전직 특화' });
    // 능력치 → 노드 가운데 도트 그림(js/ui.js PIXEL_ICONS). 표에 없으면 별.
    const ICONS = Object.freeze({
        pctDmg: 'sword', flatDmg: 'sword', meleePctDmg: 'sword', physPctDmg: 'sword', slamPctDmg: 'sword', attackPctDmg: 'sword',
        elementalPctDmg: 'flame', firePctDmg: 'flame', coldPctDmg: 'drop', lightPctDmg: 'up', chaosPctDmg: 'drop', dotPctDmg: 'flame',
        spellPctDmg: 'star', projectilePctDmg: 'reticle', aoePctDmg: 'split', summonPctDmg: 'fork', summonHpPct: 'heart',
        pctHp: 'heart', flatHp: 'heart', regen: 'drop', leech: 'leech', dr: 'shield', armor: 'shield', armorPct: 'shield',
        evasion: 'boot', evasionPct: 'boot', energyShield: 'shield', resAll: 'shield', resChaos: 'shield', blockChance: 'shield',
        aspd: 'speed', ds: 'speed', move: 'boot', crit: 'crit', critDmg: 'eye', resPen: 'pierce', physIgnore: 'physIgnore', suppCap: 'star'
    });
    const NODE_TEXT = Object.freeze({ taken: '찍음', open: '찍을 수 있음', nopoint: '포인트 없음', locked: '이어진 노드가 먼저', closed: '짝 노드를 골라 닫힘', future: '아직 열리지 않음' });
    const KEYSTONE_TEXT = Object.freeze({ taken: '고름', open: '고를 수 있음', nopoint: '키스톤 포인트 없음', full: '다섯 개를 다 고름', locked: '선행 키스톤이 먼저', fifth: '5차 전직 뒤' });
    let focus = null; // { kind: 'node' | 'keystone', id } 마지막으로 누른 칸
    let shown = null; // 자세히 카드가 읽는 칸: 마지막으로 가리키거나 누른 칸
    const ROW_LABEL = Object.freeze({ n10: '궁극', n11: '4차 핵심', n13a: '특화' });
    const NODE_ACTIONS = Object.freeze({ taken: '되돌리기', open: '찍기' });
    const KEYSTONE_ACTIONS = Object.freeze({ taken: '되돌리기', open: '고르기' });
    /** The stat's dot picture (the talent window marks each ascendancy with its main stat's, js/talent-ui.js). */
    const iconOf = stat => ICONS[stat] || 'star';

    const esc = value => escapeHTML(String(value));
    const statName = stat => String((P_STATS[stat] && P_STATS[stat].name) || getStatName(stat)).replace(/\s*\(%\)$/, '');
    const percent = stat => !!(P_STATS[stat] && P_STATS[stat].isPct);
    const linesOf = node => (node && Array.isArray(node.stats) ? node.stats : (node && node.stat ? [{ stat: node.stat, val: node.val }] : []));
    function lineText(line) {
        if (line.stat === 'suppCap') return '보조스킬룬 장착 한도 +1';
        return `${statName(line.stat)} +${formatValue(line.stat, line.val)}${percent(line.stat) ? '%' : ''}`;
    }
    const shortValue = line => (line.stat === 'suppCap' ? '+1' : `+${formatValue(line.stat, line.val)}${percent(line.stat) ? '%' : ''}`);
    const reqIds = req => (Array.isArray(req) ? req : (req ? [req] : []));
    const touchOnly = () => typeof matchMedia === 'function' && !matchMedia('(hover: hover)').matches;

    // ---------------------------------------------------------------- nodes
    /** The class tree plus the nodes this loop has not opened yet, so the whole plan shows: 4차 핵심 from the class's core lines and
     * 전직 특화 from its job lines (js/passives.js addAscendancyPairNodes uses the same), the talent pair as an empty spot. */
    function fullTree(cls) {
        const tree = { ...getClassTreeDef(cls) }, defs = ASCENDANCY_NODE_DEFS[cls] || {};
        const pair = (ids, lines, req, future) => ids.forEach((id, index) => {
            if (!tree[id]) tree[id] = { ...(lines ? { stat: lines[index].stat, val: lines[index].val } : {}), req, exclusive: ids[1 - index], future };
        });
        pair(['n11', 'n12'], defs.core || ASCENDANCY_NODE_FALLBACK.core, 'n10', '4차 전직 시련을 처음 통과하면 열립니다.');
        pair(['n13a', 'n13b'], null, ['n11', 'n12'], '재능 개화(5차 전직)를 하면 그 재능의 특화 둘이 열립니다.');
        pair(['n13c', 'n13d'], defs.job || ASCENDANCY_NODE_FALLBACK.job, ['n11', 'n12'], '재능 개화(5차 전직)를 하면 열립니다.');
        return tree;
    }
    function nodeState(node, id) {
        if (node.future) return 'future';
        if (game.ascendNodes.includes(id)) return 'taken';
        if (node.exclusive && game.ascendNodes.includes(node.exclusive)) return 'closed';
        if (!isAscendNodeRequirementMet(node)) return 'locked';
        return game.ascendPoints > 0 ? 'open' : 'nopoint';
    }
    /** Positions in a 0~100 box: rows top to bottom, nodes spread evenly in their row. */
    function layout(rows) {
        const at = new Map();
        rows.forEach((ids, row) => ids.forEach((id, index) => at.set(id, { x: (index + 1) * 100 / (ids.length + 1), y: (row + 0.5) * 100 / rows.length })));
        return at;
    }
    function linkHtml(from, to, state) {
        return `<line class="is-${state}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" vector-effect="non-scaling-stroke"></line>`;
    }
    /** Both ends taken: gold; the way on from a taken node: lit; the rest waits dim. */
    const linkState = (a, b) => (a === 'taken' && b === 'taken' ? 'done' : (a === 'taken' ? 'lit' : 'dim'));
    function nodeButton(id, node, pos, state, tight) {
        const lines = linesOf(node), icon = iconOf((lines[0] || {}).stat), label = lines.length ? shortValue(lines[0]) : '?';
        const stat = lines.length ? statName(lines[0].stat) : '재능 특화', name = `${RANK[id] || stat}, ${NODE_TEXT[state]}`;
        const focused = focus && focus.kind === 'node' && focus.id === id ? ' is-focus' : '';
        return `<button type="button" class="ascend-node is-${state}${RANK[id] ? ' is-major' : ''}${tight ? ' is-tight' : ''}${focused}" style="--x:${pos.x}%;--y:${pos.y}%"
            aria-label="${esc(name)}" aria-pressed="${state === 'taken'}" onclick="ascendancyTreeUi.press('node','${id}')"
            onmouseenter="ascendancyTreeUi.hint('node','${id}')" onfocus="ascendancyTreeUi.hint('node','${id}')"><span class="ascend-node-head">${renderPixelIcon(icon, 'ascend-node-icon')}<b>${esc(label)}</b></span><span class="ascend-node-name">${esc(stat)}</span></button>`;
    }
    /** The prerequisites a node's lines come from. Nodes of one row that share the same choice of several prerequisites (n13a~d
     * after n11 or n12) draw only from the nearest one, or their lines cross into an X; a lone node (n10 after n7~n9) keeps them all. */
    function linkSources(tree, rows, at, id) {
        const reqs = reqIds(tree[id].req).filter(req => at.has(req)), key = reqs.join(',');
        const row = rows.find(ids => ids.includes(id)) || [];
        if (reqs.length < 2 || row.filter(other => reqIds(tree[other].req).join(',') === key).length < 2) return reqs;
        const x = at.get(id).x;
        return [reqs.reduce((best, req) => (Math.abs(at.get(req).x - x) < Math.abs(at.get(best).x - x) ? req : best))];
    }
    function nodeGraphHtml(tree) {
        const rows = ROWS.map(ids => ids.filter(id => tree[id])).filter(ids => ids.length), at = layout(rows);
        const states = new Map([...at.keys()].map(id => [id, nodeState(tree[id], id)]));
        const links = [...at.keys()].flatMap(id => linkSources(tree, rows, at, id)
            .map(req => linkHtml(at.get(req), at.get(id), linkState(states.get(req), states.get(id)))));
        const tight = new Set(rows.filter(ids => ids.length > 3).flat());
        const buttons = [...at.keys()].map(id => nodeButton(id, tree[id], at.get(id), states.get(id), tight.has(id)));
        const labels = rows.map(ids => ids.find(id => ROW_LABEL[id])).filter(Boolean)
            .map(id => `<span class="ascend-row-label" style="--y:${at.get(id).y}%">${esc(ROW_LABEL[id])}</span>`);
        return `<div class="ascend-graph" style="--rows:${rows.length}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join('')}</svg>${labels.join('')}${buttons.join('')}</div>`;
    }

    // ---------------------------------------------------------------- keystones
    const keystoneReqs = k => [k.req, ...(Array.isArray(k.reqAny) ? k.reqAny : [])].filter(Boolean);
    function keystoneState(k) {
        if (game.ascendKeystones.includes(k.id)) return 'taken';
        if (k.fifthJobOnly && !isAscendKeystoneRequirementMet(k)) return 'fifth';
        if (!isAscendKeystoneRequirementMet(k)) return 'locked';
        if (game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT) return 'full';
        return Math.floor(game.ascendKeystonePoints || 0) > 0 ? 'open' : 'nopoint';
    }
    /** Rows by prerequisite depth (the old card view's order), relaxed pass by pass (no recursion); a 5th-job keystone goes last. */
    function keystoneRows(defs) {
        const ids = new Set(defs.map(k => k.id)), depth = new Map(defs.map(k => [k.id, 0]));
        for (let pass = 0; pass < defs.length; pass++) {
            defs.forEach(k => {
                const reqs = keystoneReqs(k).filter(id => ids.has(id));
                if (reqs.length) depth.set(k.id, 1 + Math.max(...reqs.map(id => depth.get(id))));
            });
        }
        const last = Math.max(0, ...depth.values()) + 1, rows = [];
        defs.forEach(k => { const d = k.fifthJobOnly ? last : depth.get(k.id); (rows[d] = rows[d] || []).push(k.id); });
        return rows.filter(Boolean);
    }
    function keystoneButton(k, pos, state) {
        const focused = focus && focus.kind === 'keystone' && focus.id === k.id ? ' is-focus' : '';
        return `<button type="button" class="ascend-node ascend-keystone is-${state}${focused}" style="--x:${pos.x}%;--y:${pos.y}%"
            aria-label="${esc(`${k.name}, ${KEYSTONE_TEXT[state]}`)}" aria-pressed="${state === 'taken'}" onclick="ascendancyTreeUi.press('keystone','${k.id}')"
            onmouseenter="ascendancyTreeUi.hint('keystone','${k.id}')" onfocus="ascendancyTreeUi.hint('keystone','${k.id}')">${renderPixelIcon('star', 'ascend-node-icon')}<span>${esc(k.name)}</span></button>`;
    }
    function keystoneGraphHtml(defs) {
        if (!defs.length) return '<p class="ascend-muted">이 전직에는 키스톤이 없습니다.</p>';
        const rows = keystoneRows(defs), at = layout(rows);
        const states = new Map(defs.map(k => [k.id, keystoneState(k)]));
        const links = defs.flatMap(k => keystoneReqs(k).filter(id => at.has(id))
            .map(id => linkHtml(at.get(id), at.get(k.id), linkState(states.get(id), states.get(k.id)))));
        const buttons = defs.map(k => keystoneButton(k, at.get(k.id), states.get(k.id)));
        return `<div class="ascend-graph is-keystones" style="--rows:${rows.length}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join('')}</svg>${buttons.join('')}</div>`;
    }

    // ---------------------------------------------------------------- summary and the note
    /** What the next first clear brings (js/combat.js trial clears: 1~3차 노드 +2, 4차 +1, 각 키스톤 +1; 재능 개화 노드 +2, 키스톤 +1). */
    function nextPoints() {
        const done = Array.isArray(game.completedTrials) ? game.completedTrials : [];
        const trial = ['trial_1', 'trial_2', 'trial_3', 'trial_4'].find(id => !done.includes(id));
        if (trial) return `다음 포인트: ${trial.slice(-1)}차 전직 시련 첫 통과(노드 +${trial === 'trial_4' ? 1 : 2}, 키스톤 +1)`;
        return game.bloomedClassThisLoop ? '이번 루프의 포인트를 모두 받았습니다.' : '다음 포인트: 재능 개화(노드 +2, 키스톤 +1)';
    }
    function totalsText(tree) {
        const sums = new Map();
        game.ascendNodes.forEach(id => linesOf(tree[id]).forEach(line => sums.set(line.stat, (sums.get(line.stat) || 0) + Number(line.val || 0))));
        return [...sums].map(([stat, val]) => lineText({ stat, val })).join(', ');
    }
    function summaryHtml(cls, tree) {
        const template = CLASS_TEMPLATES[cls], total = totalsText(tree), ks = game.ascendKeystones.length;
        return `<div class="ascend-summary"><div class="ascend-summary-name"><strong>${esc(template.name)}</strong><span>${esc(template.desc)}</span></div>
            <div class="ascend-summary-chips"><span>노드 포인트 <b>${Math.max(0, Math.floor(game.ascendPoints || 0))}</b></span>
            <span>키스톤 <b>${ks}/${CLASS_KEYSTONE_PICK_LIMIT}</b>, 포인트 <b>${Math.max(0, Math.floor(game.ascendKeystonePoints || 0))}</b></span>
            <span>찍은 노드 <b>${game.ascendNodes.length}</b></span>
            ${game.ascendNodes.length ? '<button type="button" class="ascend-reset" onclick="resetAscendNodes()">노드 초기화</button>' : ''}</div>
            <p class="ascend-muted">${esc(nextPoints())}. 이번 루프의 노드 포인트는 최대 9점이라 다 찍을 수는 없습니다.</p>
            ${total ? `<p class="ascend-total">합계: ${statToneText.html(total)}</p>` : ''}${getAscendancyPlanContinueHtml()}</div>`;
    }
    function nodeNote(tree, id) {
        const node = tree[id];
        if (!node) return '';
        const state = nodeState(node, id), lines = linesOf(node);
        const body = lines.length ? lines.map(line => `<span style="color:${getItemStatToneColor(line.stat)}">${esc(lineText(line))}</span>`).join('<br>') : '개화한 재능에 따라 정해집니다.';
        return `${detailHead(RANK[id] || '전직 노드', NODE_TEXT[state], state)}<p class="ascend-detail-lines">${body}</p>
            ${canTake(state) ? previewHtml('ascendNodes', id, '찍으면') : ''}<p class="ascend-detail-advice">${esc(nodeAdvice(tree, node, id, state))}</p>${actionHtml(NODE_ACTIONS[state])}`;
    }
    /** A node or keystone the hero can take now or once a point comes. */
    const canTake = state => state === 'open' || state === 'nopoint';
    /** The card's title line: the cell's name and its state. */
    const detailHead = (title, stateText, state) => `<p class="ascend-detail-head"><strong>${esc(title)}</strong><small class="is-${state}">${esc(stateText)}</small>
        <button type="button" class="ascend-detail-close" onclick="ascendancyTreeUi.clear()">닫기</button></p>`;
    /** The card's button (찍기, 고르기, 되돌리기) for what it shows; nothing when the cell waits on something else. */
    const actionHtml = label => (label ? `<button type="button" class="ascend-detail-act" onclick="ascendancyTreeUi.act()">${esc(label)}</button>` : '');
    /** "찍으면 DPS 61 → 64, 생명력 186 → 196": the stats with id added to game[field], read on a copy (js/passives.js previewBuildStats). */
    function previewHtml(field, id, verb) {
        const parts = buildStatPreviewParts(previewBuildStats(copy => { copy[field] = [...(copy[field] || []), id]; }));
        return parts ? `<p class="ascend-preview">${verb} ${parts}</p>` : '';
    }
    function nodeAdvice(tree, node, id, state) {
        if (state === 'future') return node.future;
        if (state === 'taken') return '다시 누르면 되돌립니다(마름병 포자 1개, 이 노드에 기대는 노드가 없을 때).';
        if (state === 'closed') return '둘 중 하나만 고를 수 있습니다. 짝 노드를 되돌리면 고를 수 있습니다.';
        if (state === 'locked') return `먼저 찍을 노드: ${reqIds(node.req).map(req => linesOf(tree[req]).map(lineText).join(', ')).join(' 또는 ')}`;
        if (state === 'nopoint') return `전직 포인트가 없습니다. ${nextPoints()}.`;
        return `${touchOnly() ? '한 번 더 누르면' : '누르면'} 찍습니다${node.exclusive ? '(짝 노드와 둘 중 하나)' : ''}.`;
    }
    function keystoneNote(defs, id) {
        const k = defs.find(row => row.id === id);
        if (!k) return '';
        const state = keystoneState(k), names = keystoneReqs(k).map(req => (defs.find(row => row.id === req) || {}).name).filter(Boolean);
        const advice = {
            taken: '다시 누르면 되돌립니다(마름병 포자 1개, 이 키스톤에 기대는 키스톤이 없을 때).',
            fifth: '재능 개화(5차 전직)를 하면 고를 수 있습니다.',
            locked: `먼저 고를 키스톤: ${names.join(Array.isArray(k.reqAny) ? ' 또는 ' : ', ')}`,
            full: `키스톤은 ${CLASS_KEYSTONE_PICK_LIMIT}개까지 고릅니다. 하나를 되돌리면 바꿀 수 있습니다.`,
            nopoint: '키스톤 포인트가 없습니다. 전직 시련을 처음 통과할 때마다 1점씩 받습니다.',
            open: `${touchOnly() ? '한 번 더 누르면' : '누르면'} 고릅니다.`
        }[state];
        return `${detailHead(k.name, KEYSTONE_TEXT[state], state)}<p class="ascend-detail-lines">${statToneText.html(k.desc)}</p>
            ${canTake(state) ? previewHtml('ascendKeystones', id, '고르면') : ''}<p class="ascend-detail-advice">${esc(advice)}</p>${actionHtml(KEYSTONE_ACTIONS[state])}`;
    }
    function detailBody(tree, defs) {
        const body = shown ? (shown.kind === 'node' ? nodeNote(tree, shown.id) : keystoneNote(defs, shown.id)) : '';
        return body || '<p class="ascend-muted">노드나 키스톤을 가리키거나 누르면 효과와 할 수 있는 일이 여기에 나옵니다.</p>';
    }

    // ---------------------------------------------------------------- screen and actions
    function render() {
        const box = document.getElementById('ui-ascend-tree-container'), cls = game.ascendClass;
        if (!box || !cls || !CLASS_TEMPLATES[cls]) return;
        game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
        game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
        const tree = fullTree(cls), defs = getClassKeystoneDefs(cls);
        box.innerHTML = `${summaryHtml(cls, tree)}<div class="ascend-layout">
            <section class="ascend-board is-nodes" aria-label="전직 노드"><h3>전직 노드</h3>${nodeGraphHtml(tree)}</section>
            <section class="ascend-board is-keystones" aria-label="키스톤"><h3>키스톤 <button type="button" class="ascend-reset" onclick="resetAscendKeystones()">키스톤 초기화</button></h3>${keystoneGraphHtml(defs)}</section>
            <section class="ascend-detail${shown ? '' : ' is-empty'}" aria-label="자세히" aria-live="polite">${detailBody(tree, defs)}</section></div>`;
    }
    /** Pointer or keyboard on a node: the note reads it; nothing is bought. */
    function hint(kind, id) {
        const card = document.querySelector('#ui-ascend-tree-container .ascend-detail'), cls = game.ascendClass;
        // 터치의 탭은 가리키기(mouseenter, focus)를 먼저 보낸다: 여기서 카드를 띄우면 좁은 창에서는 아래에 붙은 카드가 누른 칸을 덮어 정작
        // 누름이 카드로 갔다. 터치에서는 누름(press)이 카드를 띄운다.
        if (!card || !cls || touchOnly()) return;
        shown = { kind, id };
        card.innerHTML = detailBody(fullTree(cls), getClassKeystoneDefs(cls));
        card.classList.remove('is-empty');
    }
    /** A press: on a touch screen the first one only reads the node; otherwise (and on the second touch) it buys or refunds. */
    function press(kind, id) {
        const again = !!focus && focus.kind === kind && focus.id === id;
        focus = { kind, id };
        shown = focus;
        if (!touchOnly() || again) (kind === 'node' ? actOnNode(id) : actOnKeystone(id));
        render();
        keepFocusAboveCard();
    }
    /** 좁은 창에서는 자세히 카드가 화면 아래에 붙어 뜬다(css/ascendancy-tree.css): 방금 누른 칸이 그 밑에 깔리면(나무 위쪽 칸을 누르면 카드가
     * 바로 그 칸을 덮었다) 카드 위로 보이게 민다. */
    function keepFocusAboveCard() {
        requestAnimationFrame(() => {
            const box = document.getElementById('ui-ascend-tree-container');
            const cell = box && box.querySelector('.ascend-node.is-focus'), card = box && box.querySelector('.ascend-detail');
            if (!cell || !card || getComputedStyle(card).position !== 'sticky') return;
            // 카드는 스크롤 칸 아래 끝에 붙는다: 그 자리 위로 칸이 오도록 민다(카드가 아직 칸 아래의 제자리에 있어도 밀고 나면 붙는다).
            const scroller = scrollerOf(box), port = scroller === document.scrollingElement ? innerHeight : scroller.getBoundingClientRect().top + scroller.clientTop + scroller.clientHeight;
            const over = cell.getBoundingClientRect().bottom + 8 - (Math.min(port, innerHeight) - card.getBoundingClientRect().height);
            if (over > 0) scroller.scrollBy({ top: over / (uiDisplay.factor || 1) });
        });
    }
    function scrollerOf(el) {
        for (let at = el.parentElement; at; at = at.parentElement) {
            if (/auto|scroll/.test(getComputedStyle(at).overflowY) && at.scrollHeight > at.clientHeight) return at;
        }
        return document.scrollingElement;
    }
    /** 닫기(좁은 창에서만 보인다): 카드를 내리고 고른 칸을 잊는다. */
    function clear() {
        shown = null;
        focus = null;
        render();
    }
    /** The card's button: the same as pressing the cell it shows (on a touch screen without the second tap). */
    function act() {
        if (!shown) return;
        if (shown.kind === 'node') actOnNode(shown.id);
        else actOnKeystone(shown.id);
        render();
    }
    function actOnNode(id) {
        const tree = fullTree(game.ascendClass), node = tree[id], state = node ? nodeState(node, id) : 'future';
        if (state === 'taken') return askRefundAscendNode(id);
        if (state === 'open') return buyAscend(id);
        addLog(nodeAdvice(tree, node, id, state), 'attack-monster');
    }
    function actOnKeystone(id) {
        const k = getClassKeystoneDefs(game.ascendClass).find(row => row.id === id);
        if (!k) return;
        const state = keystoneState(k);
        if (state === 'taken') return refundAscendKeystone(id);
        if (state === 'open') return buyAscendKeystone(id);
        hint('keystone', id);
    }
    /** The stats nodes n1~n9 give, first seen first, each once, four at most (a class that reshuffles its rows reads its real nodes). */
    function focusStats(key) {
        const tree = getClassTreeDef(key), stats = [];
        ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9'].forEach(id => linesOf(tree[id]).forEach(line => {
            if (line.stat && !stats.includes(line.stat)) stats.push(line.stat);
        }));
        return stats.slice(0, 4);
    }
    /** The pick screen's card for one ascendancy (2026-10-22: the choice holds for the loop, so the card carries what decides it): the
     * main stat's picture, name and line, the node stats with their pictures, the first keystones with what they do, a 고르기 footer.
     * selectClass asks before it takes. */
    function pickCardHtml(key) {
        const template = CLASS_TEMPLATES[key], defs = getClassKeystoneDefs(key), stats = focusStats(key);
        const chips = stats.map(stat => `<span class="ascend-pick-chip">${renderPixelIcon(iconOf(stat), 'ascend-pick-chip-icon')}${esc(statName(stat))}</span>`).join('');
        const keys = (keystoneRows(defs)[0] || []).map(id => defs.find(k => k.id === id)).filter(Boolean)
            .map(k => `<span class="ascend-pick-key"><b>${esc(k.name)}</b><span>${statToneText.html(k.desc)}</span></span>`).join('');
        return `<button type="button" class="class-card ascend-pick-card" onclick="selectClass('${key}')">
            <span class="ascend-pick-head">${renderPixelIcon(iconOf(stats[0]), 'ascend-pick-icon')}<strong>${esc(template.name)}</strong></span>
            <span class="ascend-pick-desc">${esc(template.desc)}</span>
            <span class="ascend-pick-section">노드</span><span class="ascend-pick-chips">${chips}</span>
            <span class="ascend-pick-section">첫 키스톤 (${defs.length}개 가운데 ${CLASS_KEYSTONE_PICK_LIMIT}개를 고릅니다)</span><span class="ascend-pick-keys">${keys}</span>
            <span class="ascend-pick-cta">이 전직 고르기</span></button>`;
    }
    return Object.freeze({ render, hint, press, act, clear, pickCardHtml, icon: iconOf });
})();
safeExposeGlobals({ ascendancyTreeUi });
