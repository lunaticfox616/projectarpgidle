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
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
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
    switchMergedTabSubtab: (groupKey, tabId) => opened.push([groupKey, tabId]),
    safeExposeGlobals() {},
    Object
};
vm.createContext(context);
vm.runInContext([
    source.slice(groupStart, groupEnd),
    readFunctionSource('isMergedTabAvailable'),
    readFunctionSource('syncMergedTabLauncherVisibility'),
    readFunctionSource('syncMergedTabLauncherState'),
    readFunctionSource('openMergedTabPicker')
].join('\n'), context, { filename: 'merged-tab-launchers.js' });

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
    assert.deepStrictEqual(opened, [['growth', 'tab-char']], 'a combined launcher must open its saved inner subtab directly');

    await context.openMergedTabPicker(null, 'utility');
    assert.deepStrictEqual(opened.at(-1), ['utility', 'tab-talisman']);

    assert(html.includes('data-merged-tab-launcher="growth"') && html.includes('data-merged-tab-launcher="utility"')
        && html.includes('data-merged-tab-launcher="records"'), 'the three combined menu circles must be wired in HTML');
    assert(html.includes('>스킬트리 <span id="noti-char"') && html.includes('>보조장비 <span id="jewel-inventory-full-warning"')
        && html.includes('>기록 <span id="noti-journal"'), 'combined circles must use their concise progression labels');
    assert(menuCss.includes('[data-merged-tab-member="1"] { display: none !important; }'), 'secondary menu circles must stay hidden on desktop and mobile');
    console.log('smoke-merged-tab-launchers passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
