const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
function extractFunctionBlock(name) {
  const start = source.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', source.indexOf(')', start));
  assert(bodyStart >= 0, `${name} body must start`);
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];
    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      stringQuote = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

const logs = [];
const saves = [];
const cloudReasons = [];
const sandbox = {
  HERO_SELECTION_DEFS: {
    hero1: { label: 'Hero 1', blindLabel: 'Hero 1', talentsText: 'A' },
    hero2: { label: 'Hero 2', blindLabel: 'Hero 2', talentsText: 'B' }
  },
  HERO_SELECTION_ORDER: ['hero1', 'hero2'],
  game: {
    selectedHeroId: 'hero1',
    discoveredHeroIds: ['hero1'],
    heroSelectionInitialized: true,
    heroFreeSwitchUnlocked: true
  },
  battleAssets: { ready: false },
  logs,
  saves,
  cloudReasons,
  addLog(message, type) { logs.push({ message, type }); },
  renderHeroSelectionControls() {},
  buildBattleAssetAtlas() { return {}; },
  saveGame(options) { saves.push(options); return true; },
  requestImmediateCloudSave(reason) { cloudReasons.push(reason); return true; },
  document: { getElementById() { return null; } }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext([
  extractFunctionBlock('getHeroSelectionDef'),
  extractFunctionBlock('syncHeroSelectionState'),
  extractFunctionBlock('persistHeroSelectionChange'),
  extractFunctionBlock('applyHeroSelection')
].join('\n'), sandbox);

assert.strictEqual(sandbox.applyHeroSelection('hero2'), true, 'hero selection should succeed');
assert.strictEqual(sandbox.game.selectedHeroId, 'hero2', 'selected hero must change');
assert.strictEqual(JSON.stringify(sandbox.saves), JSON.stringify([{ skipCloudSync: true }]), 'hero change must first persist local save without scheduling duplicate cloud sync');
assert.strictEqual(JSON.stringify(sandbox.cloudReasons), JSON.stringify(['캐릭터 재능 변경']), 'hero change must request immediate cloud upload');

sandbox.saves = [];
sandbox.cloudReasons = [];
sandbox.applyHeroSelection('hero1', { skipSave: true, silent: true });
assert.strictEqual(JSON.stringify(sandbox.saves), JSON.stringify([]), 'skipSave hero selections are persisted by their callback boundary');
assert.strictEqual(JSON.stringify(sandbox.cloudReasons), JSON.stringify([]), 'skipSave must not upload before callback finalizes related state');
