const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const menuCss = fs.readFileSync('css/ui-menu-sockets.css', 'utf8');

function readFunctionSource(name) {
    let start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    if (source.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
    let parameterDepth = 0;
    let bodyStart = -1;
    for (let index = source.indexOf('(', start); index < source.length; index++) {
        if (source[index] === '(') parameterDepth++;
        if (source[index] !== ')') continue;
        parameterDepth--;
        if (parameterDepth === 0) {
            bodyStart = source.indexOf('{', index);
            break;
        }
    }
    assert(bodyStart >= 0, `${name} must have a function body`);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

function makeClassList() {
    const values = new Set();
    return {
        contains: name => values.has(name),
        toggle(name, force) { if (force) values.add(name); else values.delete(name); },
        add: name => values.add(name),
        remove: name => values.delete(name),
        values
    };
}

function makePanelNode(name, className = '') {
    const node = { name, childNodes: [], dataset: {}, classList: makeClassList(), parentElement: null };
    node.className = className;
    className.split(/\s+/).filter(Boolean).forEach(classNamePart => node.classList.add(classNamePart));
    node.appendChild = child => {
        if (child.parentElement) child.parentElement.childNodes = child.parentElement.childNodes.filter(item => item !== child);
        child.parentElement = node;
        node.childNodes.push(child);
        return child;
    };
    node.append = (...children) => children.forEach(child => node.appendChild(child));
    node.replaceChildren = (...children) => {
        node.childNodes.forEach(child => { child.parentElement = null; });
        node.childNodes = [];
        children.forEach(child => node.appendChild(child));
    };
    node.querySelector = selector => {
        if (!selector.startsWith(':scope > .')) return null;
        const classNamePart = selector.slice(':scope > .'.length);
        return node.childNodes.find(child => child.classList.contains(classNamePart)) || null;
    };
    return node;
}

const groupStart = source.indexOf('const MERGED_TAB_GROUPS');
const groupEnd = source.indexOf('\n});', groupStart) + 4;
assert(groupStart >= 0 && groupEnd > groupStart, 'merged tab groups must have one shared definition');
const MERGED_TAB_GROUPS_SOURCE = source.slice(groupStart, groupEnd);

const dots = {};
const elements = {};
['tab-char', 'tab-flask', 'tab-journal'].forEach(id => {
    dots[id] = { style: {} };
    elements['btn-' + id] = { style: {}, classList: makeClassList(), querySelector: () => dots[id] };
});
['tab-char', 'tab-traits', 'tab-jewel', 'tab-talisman', 'tab-flask', 'tab-journal', 'tab-codex'].forEach(id => {
    elements[id] = { classList: makeClassList() };
});

const opened = [];
const context = {
    game: {
        unlocks: { char: true, traits: true, items: true, jewel: false, talisman: true, codex: true },
        noti: { char: false, traits: true, flask: false, jewel: true, talisman: false, journal: false, codex: true }
    },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-codex': 'codex' },
    document: { getElementById: id => elements[id] || null },
    isNotiEnabled: () => true,
    getSelectedMergedTabId: groupKey => ({ growth: 'tab-char', utility: 'tab-talisman', records: 'tab-journal' })[groupKey],
    switchMergedTabSubtab: (groupKey, tabId, options) => opened.push([groupKey, tabId, options]),
    window: {},
    safeExposeGlobals() {},
    Object
};
vm.createContext(context);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isCodexTabUnlockReady'),
    readFunctionSource('isJournalTabUnlockReady'),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('syncMergedTabLauncherVisibility'),
    readFunctionSource('syncMergedTabLauncherState'),
    readFunctionSource('openMergedTabPicker'),
    readFunctionSource('openTabPane'),
    readFunctionSource('getMergedTabGroup')
].join('\n'), context, { filename: 'merged-tab-launchers.js' });

// 병합 하위 패널(.merged-subtab-pane)은 각 창의 안쪽 선택을 표현하려고 .active를 계속
// 유지한다. 그리고 런처 안으로 옮겨져 문서 순서가 바뀌므로(tab-jewel은 tab-flask 안 =
// tab-skills보다 앞), 셀렉터가 그 패널을 배제하지 않으면 다른 탭이 전부 오인식된다.
// 회귀를 잡으려면 스텁도 셀렉터를 실제로 해석해야 한다.
const activeTabContext = {
    game: {
        unlocks: { char: true, traits: true, items: true, jewel: true, talisman: true },
        settings: { mergedTabSelection: {} }
    },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman' },
    document: {
        // 문서 순서: 남아 있는 하위 패널이 먼저, 최상위 활성 탭이 나중.
        querySelector(selector) {
            let pool = [];
            if (activeTabContext.stalePane) pool.push({ ...activeTabContext.stalePane, mergedPane: true });
            if (activeTabContext.activeContent) pool.push(activeTabContext.activeContent);
            if (selector.includes(':not(.merged-subtab-pane)')) pool = pool.filter(node => !node.mergedPane);
            return pool[0] || null;
        }
    },
    body: { classList: { contains: () => false } },
    activeContent: { id: 'tab-char' },
    stalePane: null,
    Set,
    Object
};
activeTabContext.document.body = activeTabContext.body;
vm.createContext(activeTabContext);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isCodexTabUnlockReady'),
    readFunctionSource('isJournalTabUnlockReady'),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('getMergedTabGroup'),
    readFunctionSource('getSelectedMergedTabId'),
    readFunctionSource('getActiveTopLevelTabElement'),
    readFunctionSource('resolveRenderedTabId'),
    readFunctionSource('getActiveUiTabId')
].join('\n'), activeTabContext, { filename: 'merged-active-tab.js' });

[
    ['growth', 'tab-char', 'tab-traits'],
    ['utility', 'tab-flask', 'tab-jewel'],
    ['utility', 'tab-flask', 'tab-talisman']
].forEach(([groupKey, launcherId, selectedId]) => {
    activeTabContext.activeContent = { id: launcherId };
    activeTabContext.game.settings.mergedTabSelection[groupKey] = selectedId;
    assert.strictEqual(activeTabContext.getActiveUiTabId(), selectedId, `${selectedId} must drive the active panel renderer inside ${launcherId}`);
});
activeTabContext.activeContent = { id: 'tab-items' };
assert.strictEqual(activeTabContext.getActiveUiTabId(), 'tab-items', 'a standalone active tab must keep its own renderer');
activeTabContext.activeContent = { id: 'tab-char' };
activeTabContext.game.unlocks.traits = false;
assert.strictEqual(activeTabContext.getActiveUiTabId(), 'tab-char', 'a stale locked inner selection must fall back to its available launcher');
activeTabContext.activeContent = null;
assert.strictEqual(activeTabContext.getActiveUiTabId(), '', 'no active content must not select a renderer');

// 회귀: 보조장비 창을 한 번 열면 tab-jewel이 .active인 채 tab-flask 안(문서 순서상 앞)에
// 남는다. 그때 스킬 젬·기록·지도로 이동하면 렌더 대상이 tab-jewel로 오인식돼,
// 그 탭들이 열려 있는데도 내용이 갱신되지 않았다.
activeTabContext.game.unlocks.traits = true;
activeTabContext.stalePane = { id: 'tab-jewel' };
[['tab-skills', 'tab-skills'], ['tab-map', 'tab-map'], ['tab-items', 'tab-items']].forEach(([activeId, expected]) => {
    activeTabContext.activeContent = { id: activeId };
    assert.strictEqual(activeTabContext.getActiveUiTabId(), expected,
        `남아 있는 하위 패널이 ${activeId}의 렌더 대상을 가로채면 안 된다`);
});
// 하위 패널이 남아 있어도 병합 런처를 열면 그 그룹의 선택이 렌더 대상이 된다.
activeTabContext.game.settings.mergedTabSelection.utility = 'tab-talisman';
activeTabContext.activeContent = { id: 'tab-flask' };
assert.strictEqual(activeTabContext.getActiveUiTabId(), 'tab-talisman', '런처는 안쪽 선택으로 해석한다');
activeTabContext.stalePane = null;

// 회귀: 데스크톱 창 모드는 창을 여러 개 동시에 띄운다. 포커스된 창 하나만 그리면
// 나머지 창은 보이는 채로 갱신이 멈춰(레일 버튼으로 다시 열기 전까지) 고장난 것처럼 보였다.
{
    const openWindowIds = ['tab-items', 'tab-skills', 'tab-flask'];
    const renderingContext = {
        game: {
            unlocks: { char: true, traits: true, items: true, jewel: true, talisman: true, skills: true },
            settings: { mergedTabSelection: { utility: 'tab-talisman' } }
        },
        TAB_UNLOCK_GATES: { 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-skills': 'skills' },
        document: {
            body: { classList: { contains: name => name === 'desktop-windowed-ui' && renderingContext.windowedUi } },
            querySelector: selector => (selector.includes(':not(.merged-subtab-pane)') ? { id: 'tab-items' } : { id: 'tab-talisman' }),
            querySelectorAll: () => openWindowIds.map(id => ({ id }))
        },
        windowedUi: true,
        Set,
        Object,
        Array
    };
    vm.createContext(renderingContext);
    vm.runInContext([
        source.slice(groupStart, groupEnd),
        readFunctionSource('isCodexTabUnlockReady'),
        readFunctionSource('isJournalTabUnlockReady'),
        readFunctionSource('isMergedTabAvailable'),
        readFunctionSource('getMergedTabGroup'),
        readFunctionSource('getSelectedMergedTabId'),
        readFunctionSource('getActiveTopLevelTabElement'),
        readFunctionSource('resolveRenderedTabId'),
        readFunctionSource('getActiveUiTabId'),
        readFunctionSource('getRenderingUiTabIds')
    ].join('\n'), renderingContext, { filename: 'rendering-ui-tabs.js' });

    const windowed = Array.from(renderingContext.getRenderingUiTabIds()).sort();
    assert.deepStrictEqual(windowed, ['tab-items', 'tab-skills', 'tab-talisman'],
        '열려 있는 창은 포커스와 무관하게 모두 렌더 대상이어야 하고, 런처는 안쪽 선택으로 해석해야 한다');

    // 모바일/단일 화면 모드에서는 한 번에 한 화면만 보이므로 활성 탭만 그린다.
    renderingContext.windowedUi = false;
    assert.deepStrictEqual(Array.from(renderingContext.getRenderingUiTabIds()), ['tab-items'],
        '창 모드가 아니면 활성 화면 하나만 그린다');

    const renderBody = readFunctionSource('performUpdateStaticUI');
    assert.ok(!/activeTabId === 'tab-/.test(renderBody),
        '패널 렌더 게이트는 활성 탭 하나가 아니라 보이는 화면 집합(isTabRendering)을 써야 한다');
    ['tab-codex', 'tab-skills', 'tab-journal', 'tab-jewel', 'tab-talisman', 'tab-growthboard'].forEach(tabId => {
        assert.ok(renderBody.includes(`isTabRendering('${tabId}')`), `${tabId} 패널은 보이는 화면 집합으로 판정해야 한다`);
    });
}

const persistentPaneIds = ['tab-traits', 'tab-jewel', 'tab-talisman', 'tab-codex', 'tab-growthboard'];
const switchNodes = {};
function addSwitchNode(id, className) {
    const node = makePanelNode(id, className);
    node.id = id;
    switchNodes[id] = node;
    return node;
}
const switchTopLevel = [addSwitchNode('tab-flask', 'tab-content active'), addSwitchNode('tab-character', 'tab-content')];
const switchPanes = persistentPaneIds.map(id => addSwitchNode(id, 'tab-content merged-subtab-pane active'));
const switchButtons = [addSwitchNode('btn-tab-flask', 'tab-btn active'), addSwitchNode('btn-tab-character', 'tab-btn')];
const tabSwitchContext = {
    game: { unlocks: {}, settings: {}, noti: {} },
    TAB_UNLOCK_GATES: {},
    TAB_HEADER_NOTI_KEYS: [],
    document: {
        body: makePanelNode('body'),
        getElementById: id => switchNodes[id] || null,
        querySelectorAll(selector) {
            if (selector === '.tab-content, .tab-btn') return switchTopLevel.concat(switchPanes, switchButtons);
            if (selector === '.tab-content:not(.merged-subtab-pane), .tab-btn') return switchTopLevel.concat(switchButtons);
            return [];
        }
    },
    window: { matchMedia: () => ({ matches: false }) },
    hideInfoTooltip() {}, hideItemTooltip() {}, syncDerivedTabUnlock() {}, syncMergedTabLauncherState() {},
    setMobileTabDrawerOpen() {},
    isTabGroupingActive: () => false, acknowledgeMapMainAlarm() {}, stopChatPolling() {},
    updateMobileBattlePipVisibility() {}, isMobileBattlePipVisible: () => false, updateStaticUI() {},
    Object, Array
};
vm.createContext(tabSwitchContext);
vm.runInContext([
    'let lastActiveTabId = "tab-flask";',
    source.slice(groupStart, groupEnd),
    readFunctionSource('getMergedTabGroup'),
    readFunctionSource('switchTab')
].join('\n'), tabSwitchContext, { filename: 'merged-pane-persistence.js' });
tabSwitchContext.switchTab('tab-character');
assert(switchNodes['tab-character'].classList.contains('active'), 'the newly selected top-level tab must become active');
assert(!switchNodes['tab-flask'].classList.contains('active'), 'the previous top-level host must relinquish global tab activation');
persistentPaneIds.forEach(id => {
    assert(switchNodes[id].classList.contains('active'), `${id} must keep its selected content while another window opens`);
});

const windowRoot = makePanelNode('window-root');
const windowTitlebar = makePanelNode('titlebar', 'ui-window-titlebar');
const windowBody = makePanelNode('body', 'ui-window-body');
const windowResize = makePanelNode('resize', 'ui-window-resize');
const passiveContent = makePanelNode('passive-content');
const traitPanel = makePanelNode('trait-panel');
windowRoot.append(windowTitlebar, windowBody, windowResize);
windowBody.appendChild(passiveContent);
const panelContext = {
    document: {
        createElement: name => makePanelNode(name),
        getElementById: id => ({ 'tab-char': windowRoot, 'tab-traits': traitPanel })[id] || null
    },
    Object,
    Array
};
vm.createContext(panelContext);
vm.runInContext([source.slice(groupStart, groupEnd), readFunctionSource('mountMergedTabGroup')].join('\n'), panelContext, { filename: 'merged-tab-window-host.js' });
const mergedShell = panelContext.mountMergedTabGroup('growth');
assert.deepStrictEqual(windowRoot.childNodes, [windowTitlebar, windowBody, windowResize], 'merged tabs must not move the desktop window titlebar or resize handle');
assert.strictEqual(windowBody.childNodes[0], mergedShell, 'merged tabs must render inside the desktop window body');
assert.strictEqual(mergedShell.childNodes[1].childNodes[0].childNodes[0], passiveContent, 'the launcher content must stay below the inner subtab row');
assert.strictEqual(mergedShell.childNodes[1].childNodes[1], traitPanel, 'secondary content must become a sibling pane inside the same window body');

const lockedTabTransitions = [];
let lockedTabLogs = 0;
let lockedTabRefreshes = 0;
const lockedTabContext = {
    game: { unlocks: {}, settings: {}, inventory: [], equipment: {}, uniqueCodex: {}, journalEntries: ['prologue'] },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-codex': 'codex' },
    addLog: () => { lockedTabLogs += 1; },
    window: { switchTab: tabId => lockedTabTransitions.push(tabId) },
    updateStaticUI: () => { lockedTabRefreshes += 1; },
    Object,
    Array
};
vm.createContext(lockedTabContext);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isCodexTabUnlockReady'),
    readFunctionSource('isJournalTabUnlockReady'),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('getSelectedMergedTabId'),
    readFunctionSource('switchMergedTabSubtab'),
    readFunctionSource('openMergedTabPicker')
].join('\n'), lockedTabContext, { filename: 'locked-merged-tab.js' });
lockedTabContext.openMergedTabPicker(null, 'records');
lockedTabContext.switchMergedTabSubtab('records', 'tab-codex');
assert.deepStrictEqual(lockedTabTransitions, [], 'locked merged tabs must not open an empty host panel');
assert.strictEqual(lockedTabLogs, 0, 'locked merged tabs must remain silent when no inner panel is available');
assert(source.includes("keepWindowOpen: options.keepWindowOpen !== false"), 'merged tabs must tell the window manager whether to preserve or toggle the host');

// 회귀: 도감 해금은 game.unlocks.codex가 권위다. "지금 고유를 들고 있는가"를 다시 보면
// 고유를 처분하거나 루프를 넘긴 직후 기록 메뉴가 통째로 사라져 저널·도감을 열 수 없었다.
lockedTabContext.game.unlocks.codex = true;
assert.strictEqual(lockedTabContext.getSelectedMergedTabId('records'), 'tab-journal',
    '고유를 하나도 들고 있지 않아도 해금된 기록 메뉴는 열려 있어야 한다');
assert.strictEqual(lockedTabContext.isMergedTabAvailable({ id: 'tab-codex', gate: 'codex' }), true,
    '도감은 보유 고유가 0개여도 해금 플래그가 서 있으면 열 수 있어야 한다');
// 저널은 루프를 건너 유지되는 영구 기록이므로 도감이 다시 잠겨도 남아 있어야 한다.
lockedTabContext.game.unlocks.codex = false;
lockedTabContext.game.journalEntries = ['prologue', 'act_1'];
assert.strictEqual(lockedTabContext.getSelectedMergedTabId('records'), 'tab-journal',
    '기록을 가진 플레이어는 루프 정산으로 도감이 잠겨도 저널을 볼 수 있어야 한다');
assert.strictEqual(lockedTabContext.isMergedTabAvailable({ id: 'tab-codex', gate: 'codex' }), false,
    '도감은 해금 플래그가 내려가면 닫혀야 한다');
lockedTabContext.game.journalEntries = ['prologue'];
assert.strictEqual(lockedTabContext.getSelectedMergedTabId('records'), null,
    '아직 기록도 도감도 없는 새 게임에서는 기록 메뉴가 없어야 한다');

// 회귀: 루프 정산으로 탭이 다시 잠기면 실행 버튼만 사라지고, 이미 열려 있던 창은
// 갱신도 안 되고 닫을 방법도 없는 잔상으로 남았다(스킬 젬·기록 창이 "고장난" 증상).
{
    const relockNodes = {};
    function addRelockNode(id, className) {
        const node = makePanelNode(id, className);
        node.id = id;
        relockNodes[id] = node;
        return node;
    }
    const relockContents = [
        addRelockNode('tab-skills', 'tab-content active ui-window-open'),
        addRelockNode('tab-journal', 'tab-content ui-window-open'),
        addRelockNode('tab-character', 'tab-content')
    ];
    ['btn-tab-skills', 'btn-tab-journal'].forEach(id => addRelockNode(id, 'tab-btn active'));
    const closedWindows = [];
    const relockContext = {
        game: {
            unlocks: { skills: false, codex: false },
            settings: {},
            inventory: [], equipment: {}, uniqueCodex: {}, journalEntries: ['prologue']
        },
        TAB_UNLOCK_GATES: { 'tab-skills': 'skills', 'tab-codex': 'codex' },
        document: {
            getElementById: id => relockNodes[id] || null,
            querySelectorAll: selector => (selector === '.tab-content:not(.merged-subtab-pane)' ? relockContents : [])
        },
        closeWindow: tabId => closedWindows.push(tabId),
        Object,
        Array
    };
    vm.createContext(relockContext);
    vm.runInContext([
        'let lastActiveTabId = "tab-skills";',
        source.slice(groupStart, groupEnd),
        readFunctionSource('isCodexTabUnlockReady'),
        readFunctionSource('isJournalTabUnlockReady'),
        readFunctionSource('isMergedTabAvailable'),
        readFunctionSource('getMergedTabGroup'),
        readFunctionSource('getSelectedMergedTabId'),
        readFunctionSource('isTabSurfaceAvailable'),
        readFunctionSource('closeRelockedTabSurfaces'),
        'globalThis.readLastActiveTabId = () => lastActiveTabId;'
    ].join('\n'), relockContext, { filename: 'relocked-tab-surfaces.js' });

    assert.strictEqual(relockContext.isTabSurfaceAvailable('tab-skills'), false, '잠긴 스킬 젬 탭은 열어 둘 수 없다');
    assert.strictEqual(relockContext.isTabSurfaceAvailable('tab-journal'), false, '안쪽 패널이 모두 잠긴 기록 런처는 열어 둘 수 없다');
    assert.strictEqual(relockContext.isTabSurfaceAvailable('tab-character'), true, '게이트 없는 탭은 항상 열 수 있다');

    relockContext.closeRelockedTabSurfaces();
    assert.deepStrictEqual(closedWindows.slice().sort(), ['tab-journal', 'tab-skills'],
        '다시 잠긴 탭의 창은 열린 채로 남지 않고 닫혀야 한다');
    assert(!relockNodes['tab-skills'].classList.contains('active'), '잠긴 탭은 활성 화면 자리를 넘겨야 한다');
    assert(!relockNodes['btn-tab-skills'].classList.contains('active'), '잠긴 탭의 메뉴 버튼도 활성 표시를 지워야 한다');
    assert.strictEqual(relockContext.readLastActiveTabId(), null, '잠긴 탭이 마지막 활성 탭으로 남으면 안 된다');
    assert(!closedWindows.includes('tab-character'), '열 수 있는 탭은 건드리지 않는다');

    // 다시 해금되면 정상 탭은 그대로 유지된다(잔상 정리가 과잉 동작하지 않는다).
    relockContext.game.unlocks.skills = true;
    relockNodes['tab-skills'].classList.add('active');
    relockNodes['tab-skills'].classList.add('ui-window-open');
    closedWindows.length = 0;
    relockContext.closeRelockedTabSurfaces();
    assert(!closedWindows.includes('tab-skills'), '해금된 탭의 창은 닫지 않는다');
    assert(relockNodes['tab-skills'].classList.contains('active'), '해금된 탭은 활성 상태를 유지한다');

    assert(readFunctionSource('updateTabUnlockButtons').includes('closeRelockedTabSurfaces'),
        '해금 판정의 권위 지점이 잠긴 탭 화면 정리를 함께 수행해야 한다');
    assert(readFunctionSource('performUpdateStaticUI').includes('isTabSurfaceAvailable(activeHostId)'),
        '화면 갱신은 열려 있는 최상위 화면이 다시 잠겼는지 매번 확인해야 한다');
}

const routedCalls = [];
let routedRefreshes = 0;
const routedContext = {
    game: { unlocks: { char: true, traits: true, items: true, jewel: true, talisman: true, codex: true }, inventory: [{ rarity: 'unique' }], settings: {}, noti: {} },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-codex': 'codex' },
    window: { switchTab: (tabId, options) => routedCalls.push([tabId, options]) },
    updateStaticUI: () => { routedRefreshes += 1; },
    Object,
    Array
};
vm.createContext(routedContext);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isCodexTabUnlockReady'),
    readFunctionSource('isJournalTabUnlockReady'),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('switchMergedTabSubtab')
].join('\n'), routedContext, { filename: 'routed-merged-tab.js' });
[
    ['growth', 'tab-traits'],
    ['utility', 'tab-jewel'],
    ['utility', 'tab-talisman'],
    ['records', 'tab-codex']
].forEach(([groupKey, tabId]) => routedContext.switchMergedTabSubtab(groupKey, tabId));
assert.deepStrictEqual(JSON.parse(JSON.stringify(routedCalls)), [
    ['tab-char', { keepWindowOpen: true }],
    ['tab-flask', { keepWindowOpen: true }],
    ['tab-flask', { keepWindowOpen: true }],
    ['tab-journal', { keepWindowOpen: true }]
], 'inner tabs must switch content without closing their host window');
assert.strictEqual(routedRefreshes, 4, 'each affected inner tab must request its content renderer in an already-open host');
assert.ok(
    menuCss.includes('body.desktop-windowed-ui .merged-tab-panels > .merged-subtab-pane.active'),
    'desktop window mode must override the generic hidden tab-content rule for the selected merged inner panel'
);
assert.ok(
    /\.ui-window-body > \.merged-tab-shell \{[\s\S]*?display: flex;[\s\S]*?height: 100%;[\s\S]*?min-height: 0;/.test(menuCss),
    'a merged window must constrain its shell to the available window body height'
);
assert.ok(
    /\.merged-tab-shell > \.merged-tab-panels \{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;[\s\S]*?overflow: hidden;/.test(menuCss),
    'merged panels must provide a bounded scroll viewport below their subtab buttons'
);
assert.ok(
    /\.merged-tab-panels > \.merged-subtab-pane\.active \{[\s\S]*?height: 100%;[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/.test(menuCss),
    'each selected merged panel must accept mouse-wheel scrolling inside its host window'
);

(async () => {
    const unlockedState = context.game.unlocks;
    context.game.unlocks = {};
    context.syncMergedTabLauncherVisibility();
    assert.strictEqual(elements['btn-tab-char'].style.display, 'none');
    assert.strictEqual(elements['btn-tab-flask'].style.display, 'none');
    assert.strictEqual(elements['btn-tab-journal'].style.display, 'none', 'a new game must start without later combined menus');
    context.game.unlocks = unlockedState;
    context.syncMergedTabLauncherVisibility();
    assert.strictEqual(elements['btn-tab-char'].style.display, 'flex');
    assert.strictEqual(elements['btn-tab-flask'].style.display, 'flex', 'unlocking equipment must surface the utility launcher');

elements['tab-char'].classList.toggle('active', true);
context.syncMergedTabLauncherState();
assert(elements['btn-tab-char'].classList.contains('active'), 'opening a merged root must highlight its combined launcher');
    assert.strictEqual(dots['tab-char'].style.display, 'block', 'member notifications must surface on the combined launcher');
    assert.strictEqual(dots['tab-journal'].style.display, 'block', 'codex notices must surface on the records launcher');

    await context.openMergedTabPicker(null, 'growth');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(opened)), [['growth', 'tab-char', { keepWindowOpen: false }]], 'a combined launcher must toggle its saved inner subtab host');

    await context.openMergedTabPicker(null, 'utility');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(opened.at(-1))), ['utility', 'tab-talisman', { keepWindowOpen: false }],
        'a launcher must reopen the inner subtab the player last used');

    // 전투 화면 플라스크처럼 특정 화면을 콕 집어 여는 경로는 그 탭이 실제로 보여야 한다.
    // switchTab만 쓰면 tab-flask는 그룹 런처라 창만 열리고 안쪽은 마지막에 보던 탭이 남는다.
    context.openTabPane('tab-flask');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(opened.at(-1))).slice(0, 2), ['utility', 'tab-flask'],
        'openTabPane must surface the requested pane, not just its window');
    assert(source.includes("onclick=\"openTabPane('tab-flask')\""),
        'the combat flask strip must open the flask pane directly');

    // 해금 상태가 바뀌면 열려 있는 병합 창의 내부 탭도 다시 그려야 한다.
    // 회귀: 루프 정산으로 큐브가 잠긴 뒤에도 큐브 화면이 그대로 남고, 내부 탭 버튼에
    // 잠긴 탭이 계속 보였다(선택 상태만 조용히 다른 탭으로 바뀜).
    assert(readFunctionSource('updateTabUnlockButtons').includes('renderMergedTabPanels'),
        'unlock changes must re-render the open merged window so locked tabs disappear');

    assert(html.includes('data-merged-tab-launcher="growth"') && html.includes('data-merged-tab-launcher="utility"')
        && html.includes('data-merged-tab-launcher="records"'), 'the three combined menu circles must be wired in HTML');
    assert(html.includes('>스킬트리 <span id="noti-char"') && html.includes('>보조장비 <span id="jewel-inventory-full-warning"')
        && html.includes('>기록 <span id="noti-journal"'), 'combined circles must use their concise progression labels');
    assert(menuCss.includes('[data-merged-tab-member="1"] { display: none !important; }'), 'secondary menu circles must stay hidden on desktop and mobile');
    // 큐브·생장판은 game.unlocks 플래그가 아니라 런타임 판정으로 열린다
    // (isCoreCubeUnlocked / isGrowthBoardUnlocked). 루프가 넘어가 큐브가 다시 잠기면
    // 저장된 보조장비 선택이 잠긴 탭을 가리킨 채로 남는데, 그때 빈 창이 열리면 안 된다.
    {
        const runtimeContext = {
            game: {
                unlocks: { jewel: true, talisman: true, cube: true },
                settings: { mergedTabSelection: { utility: 'tab-cube' } },
                inventory: [], equipment: {}, uniqueCodex: {}
            },
            TAB_UNLOCK_GATES: { 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-cube': 'cube' },
            isCoreCubeUnlocked: () => runtimeContext.__cubeOpen,
            isGrowthBoardUnlocked: () => runtimeContext.__growthOpen,
            __cubeOpen: true,
            __growthOpen: true,
            addLog: () => {},
            window: { switchTab: () => {} },
            Object,
            Array
        };
        vm.createContext(runtimeContext);
        vm.runInContext([
            source.slice(groupStart, groupEnd),
            readFunctionSource('isCodexTabUnlockReady'),
            readFunctionSource('isJournalTabUnlockReady'),
            readFunctionSource('isMergedTabAvailable'),
            readFunctionSource('getSelectedMergedTabId')
        ].join('\n'), runtimeContext, { filename: 'runtime-gated-merged-tab.js' });

        assert.strictEqual(runtimeContext.getSelectedMergedTabId('utility'), 'tab-cube',
            '열려 있는 동안에는 저장된 선택을 그대로 쓴다');
        assert.strictEqual(runtimeContext.isMergedTabAvailable({ id: 'tab-growthboard' }), true,
            '생장판은 런타임 판정으로 열린다');

        // 루프 리셋: 큐브가 다시 잠기고 game.unlocks.cube도 내려간다.
        runtimeContext.__cubeOpen = false;
        runtimeContext.game.unlocks.cube = false;
        assert.strictEqual(runtimeContext.isMergedTabAvailable({ id: 'tab-cube' }), false,
            '재잠금된 큐브 탭은 열 수 없어야 한다');
        assert.strictEqual(runtimeContext.getSelectedMergedTabId('utility'), 'tab-jewel',
            '잠긴 선택이 남아 있어도 열 수 있는 첫 탭으로 되돌아가야 한다(빈 창 금지)');

        // 루프 25 전: 생장판도 같은 방식으로 막힌다.
        runtimeContext.__growthOpen = false;
        assert.strictEqual(runtimeContext.isMergedTabAvailable({ id: 'tab-growthboard' }), false,
            '해금 전 생장판 탭은 열 수 없어야 한다');

        // 보조장비의 모든 구성원이 잠기면 선택 자체가 없어야 한다(런처도 숨는다).
        runtimeContext.game.unlocks.jewel = false;
        runtimeContext.game.unlocks.talisman = false;
        assert.strictEqual(runtimeContext.getSelectedMergedTabId('utility'), null,
            '열 수 있는 탭이 하나도 없으면 선택이 없어야 한다');
    }

    console.log('smoke-merged-tab-launchers passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
