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
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('syncMergedTabLauncherVisibility'),
    readFunctionSource('syncMergedTabLauncherState'),
    readFunctionSource('openMergedTabPicker'),
    readFunctionSource('openTabPane'),
    readFunctionSource('getMergedTabGroup')
].join('\n'), context, { filename: 'merged-tab-launchers.js' });

const activeTabContext = {
    game: {
        unlocks: { char: true, traits: true, items: true, jewel: true, talisman: true },
        settings: { mergedTabSelection: {} }
    },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman' },
    document: { querySelector: () => activeTabContext.activeContent },
    activeContent: { id: 'tab-char' }
};
vm.createContext(activeTabContext);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('getMergedTabGroup'),
    readFunctionSource('getSelectedMergedTabId'),
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
const lockedTabContext = {
    game: { unlocks: { codex: true }, settings: {}, inventory: [], equipment: {}, uniqueCodex: {} },
    TAB_UNLOCK_GATES: { 'tab-char': 'char', 'tab-traits': 'traits', 'tab-jewel': 'jewel', 'tab-talisman': 'talisman', 'tab-codex': 'codex' },
    addLog: () => { lockedTabLogs += 1; },
    window: { switchTab: tabId => lockedTabTransitions.push(tabId) },
    Object,
    Array
};
vm.createContext(lockedTabContext);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isCodexTabUnlockReady'),
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

    assert(html.includes('data-merged-tab-launcher="growth"') && html.includes('data-merged-tab-launcher="utility"')
        && html.includes('data-merged-tab-launcher="records"'), 'the three combined menu circles must be wired in HTML');
    assert(html.includes('>스킬트리 <span id="noti-char"') && html.includes('>보조장비 <span id="jewel-inventory-full-warning"')
        && html.includes('>기록 <span id="noti-journal"'), 'combined circles must use their concise progression labels');
    assert(menuCss.includes('[data-merged-tab-member="1"] { display: none !important; }'), 'secondary menu circles must stay hidden on desktop and mobile');
    console.log('smoke-merged-tab-launchers passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
