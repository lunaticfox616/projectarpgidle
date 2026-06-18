const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const uiSource = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
const layoutCss = fs.readFileSync(path.join(root, 'css/layout.css'), 'utf8');
const componentCss = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(root, 'css/ui-polish.css'), 'utf8');
const stateSource = fs.readFileSync(path.join(root, 'js/state.js'), 'utf8');

function extractFunctionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

assert(
  uiSource.includes('getVisibleHuntingMapCapZoneId()') && uiSource.includes('getAbyssZoneIdForDepth(20)'),
  'hunting map rendering must cap visible main hunting zones at chaos 20'
);
assert(
  uiSource.includes("document.getElementById('ui-deep-chaos-header').style.display = 'none'") &&
    uiSource.includes("document.getElementById('ui-deep-chaos-list').innerHTML = ''"),
  'legacy standalone deep-chaos section must stay hidden to avoid duplicate cards'
);
assert(
  uiSource.includes('buildMapZoneGroupHtml') && uiSource.includes('toggleMapZoneGroup'),
  'hunting map groups must be rendered through collapsible section controls'
);
assert(
  uiSource.includes('getDeepChaosMapEntryHtml()') && uiSource.includes('rootBossListHtml += getDeepChaosMapEntryHtml();'),
  'deep chaos entry must appear in both the chaos hunting list and root-boss challenge list'
);
assert(
  uiSource.includes('map-zone-grid--${groupKey}') && componentCss.includes('.map-zone-grid--hunting') && componentCss.includes('.map-zone-grid--chaos'),
  'hunting map and chaos maps must render into separate grids for responsive mobile layouts'
);
assert(
  uiSource.includes("buildMapZoneGroupHtml('hunting', '일반 사냥터'") &&
    uiSource.includes("buildMapZoneGroupHtml('chaos', '혼돈'"),
  'hunting and chaos map sections must be grouped separately'
);
assert(
  layoutCss.includes('.map-grid.map-grid--split') &&
    layoutCss.includes('.map-zone-group-header') &&
    layoutCss.includes('.map-zone-grid'),
  'split hunting map grids and collapsible headers must have base desktop styles'
);
assert(
  componentCss.includes('#ui-map-list.map-grid--split .map-zone-grid--hunting { grid-template-columns: repeat(2, minmax(0, 1fr)); }'),
  'mobile hunting maps must render two cards per row'
);
assert(
  componentCss.includes('#ui-map-list.map-grid--split .map-zone-grid--chaos { grid-template-columns: repeat(5, minmax(0, 1fr));'),
  'mobile chaos maps must render five cards per row'
);
assert(
  uiSource.includes('map-item map-item--sky-tower') && uiPolishCss.includes('.map-item--sky-tower .map-item-main'),
  'sky tower map card must use dedicated layout rules so long Korean labels do not wrap vertically'
);
assert(
  uiPolishCss.includes('word-break: keep-all;') && uiPolishCss.includes('@media (max-width: 720px)') && uiPolishCss.includes('.map-item--sky-tower .map-item-actions'),
  'sky tower card mobile CSS must keep text readable and move actions onto a full-width row'
);


const stateRuntime = {
  game: { season: 12, abyssEndlessDepth: 37, abyssUnlockedDepths: [20, 21, 37], loopProgressCurrent: { chaos20Cleared: true } },
  ACT_ZONE_COUNT: 10,
  ABYSS_START_ZONE_ID: 10,
  abyssTiers: [8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20],
  MAP_ZONES: Array.from({ length: 30 }, (_, id) => ({ id, name: id >= 10 ? `혼돈 ${id - 9}` : `액트 ${id + 1}`, type: id >= 10 ? 'abyss' : 'act', tier: 1, maxKills: 1, ele: 'chaos', depth: id >= 10 ? id - 9 : 0 })),
  OUTSIDE_CHAOS_ZONE_ID: 'outside_chaos',
  CHAOS_REALM_ZONE_ID: 'chaos_realm',
  SKY_TOWER_ZONE_ID: 'sky_tower',
  WOODSMAN_ECHO_ZONE_ID: 'woodsman_echo',
  UNDERWORLD_ZONE_ID: 'underworld',
  METEOR_FALL_ZONE_ID: 'meteor',
  LABYRINTH_ZONE_ID: 'labyrinth',
  TRIAL_ZONES: [],
  SEASON_BOSS_ZONES: []
};
vm.createContext(stateRuntime);
vm.runInContext([
  extractFunctionBlock(stateSource, 'getAbyssDepthFromZoneId'),
  extractFunctionBlock(stateSource, 'getAbyssZoneIdForDepth'),
  extractFunctionBlock(stateSource, 'hasCurrentLoopChaos20Clear'),
  extractFunctionBlock(stateSource, 'getHighestUnlockedEndlessChaosDepth'),
  extractFunctionBlock(stateSource, 'getAutoProgressZoneId'),
  extractFunctionBlock(stateSource, 'getAbyssZoneTier'),
  extractFunctionBlock(stateSource, 'getZone'),
  'this.getZone = getZone; this.getAbyssZoneIdForDepth = getAbyssZoneIdForDepth; this.getAutoProgressZoneId = getAutoProgressZoneId;'
].join('\n'), stateRuntime);
const chaos20Zone = stateRuntime.getZone(stateRuntime.getAbyssZoneIdForDepth(20));
assert.strictEqual(chaos20Zone.name, '혼돈 20', 'chaos 20 map card must not inherit the last visited deep-chaos depth');
assert.strictEqual(chaos20Zone.depth, 20, 'chaos 20 map card must keep exact depth 20');
assert.strictEqual(stateRuntime.getAutoProgressZoneId(stateRuntime.getAbyssZoneIdForDepth(20)), stateRuntime.getAbyssZoneIdForDepth(21), 'auto-progress after chaos 20 must start at deep chaos 21 instead of the highest recorded deep-chaos floor');

console.log('smoke-map-hunting-layout: ok');
