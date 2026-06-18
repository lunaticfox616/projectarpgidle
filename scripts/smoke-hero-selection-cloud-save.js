const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
function extractFunctionBlock(name, fromSource = source) {
  const start = fromSource.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = fromSource.indexOf('{', fromSource.indexOf(')', start));
  assert(bodyStart >= 0, `${name} body must start`);
  let depth = 0;
  let stringQuote = null;
  let escaped = false;
  for (let i = bodyStart; i < fromSource.length; i++) {
    const ch = fromSource[i];
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
      if (depth === 0) return fromSource.slice(start, i + 1);
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
    appearanceHeroId: null,
    discoveredHeroIds: ['hero1'],
    heroSelectionInitialized: true,
    heroFreeSwitchUnlocked: true,
    unlocks: { char: false }
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
  extractFunctionBlock('getHeroAppearanceId', passivesSource),
  extractFunctionBlock('getHeroSelectionDef'),
  extractFunctionBlock('syncHeroSelectionState'),
  extractFunctionBlock('persistHeroSelectionChange'),
  extractFunctionBlock('applyHeroSelection')
].join('\n'), sandbox);

assert.strictEqual(sandbox.applyHeroSelection('hero2', { cosmeticOnly: true }), true, 'settings hero selection should succeed as a cosmetic change');
assert.strictEqual(sandbox.game.selectedHeroId, 'hero1', 'settings hero selection must not change the actual talent hero');
assert.strictEqual(sandbox.game.appearanceHeroId, 'hero2', 'settings hero selection must change only the appearance hero');
assert.strictEqual(sandbox.game.unlocks.char, true, 'initialized talent selection must keep the card/skill-tree tab unlocked');
assert.strictEqual(JSON.stringify(sandbox.saves), JSON.stringify([{ skipCloudSync: true }]), 'cosmetic hero change must first persist local save without scheduling duplicate cloud sync');
assert.strictEqual(JSON.stringify(sandbox.cloudReasons), JSON.stringify(['캐릭터 외형 변경']), 'cosmetic hero change must request immediate cloud upload with an appearance reason');

saves.length = 0;
cloudReasons.length = 0;
assert.strictEqual(sandbox.applyHeroSelection('hero2'), true, 'loop hero selection should still support actual talent changes');
assert.strictEqual(sandbox.game.selectedHeroId, 'hero2', 'loop hero selection must change the actual talent hero');
assert.strictEqual(sandbox.game.appearanceHeroId, 'hero2', 'actual hero changes must not clear an existing cosmetic appearance');
assert.strictEqual(JSON.stringify(sandbox.cloudReasons), JSON.stringify(['캐릭터 재능 변경']), 'actual hero change must keep the talent-change upload reason');

saves.length = 0;
cloudReasons.length = 0;
sandbox.applyHeroSelection('hero1', { skipSave: true, silent: true });
assert.strictEqual(JSON.stringify(sandbox.saves), JSON.stringify([]), 'skipSave hero selections are persisted by their callback boundary');
assert.strictEqual(JSON.stringify(sandbox.cloudReasons), JSON.stringify([]), 'skipSave must not upload before callback finalizes related state');
