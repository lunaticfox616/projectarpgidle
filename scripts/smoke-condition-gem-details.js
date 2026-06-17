#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const skillsSource = fs.readFileSync('data/skills.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function extractFunctionBlock(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = text.indexOf('{', text.indexOf(')', start));
  let depth = 0, quote = null, escaped = false;
  for (let i = bodyStart; i < text.length; i++) {
    const ch = text[i];
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
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

const dataSandbox = { window: {} };
vm.createContext(dataSandbox);
vm.runInContext(skillsSource, dataSandbox);
const entries = Object.values(dataSandbox.window.CONDITION_GEM_DB).flat();

const sandbox = { game: { conditionGemLevels: {} }, Math };
vm.createContext(sandbox);
vm.runInContext([
  extractFunctionBlock(combatSource, 'getConditionGemLevel'),
  extractFunctionBlock(combatSource, 'getConditionGemStatDelta'),
  extractFunctionBlock(combatSource, 'getEnemyConditionDebuffFactor'),
  extractFunctionBlock(combatSource, 'getSkillAilmentStats'),
  'this.getUiConditionGemStatDelta = getConditionGemStatDelta;',
  extractFunctionBlock(uiSource, 'getConditionGemDetail'),
  extractFunctionBlock(uiSource, 'showPlayerBuffTooltip'),
  'this.getConditionGemDetail = getConditionGemDetail;',
  'this.showPlayerBuffTooltip = showPlayerBuffTooltip;'
].join('\n'), sandbox);

const details = new Map(entries.map(entry => [entry.name, sandbox.getConditionGemDetail(entry)]));
for (const [name, detail] of details) {
  assert(detail && detail !== '특수 효과', `${name} must render an explicit condition gem effect`);
}
assert(details.get('파멸 징표').includes('체력이 낮은 적'), 'doom mark must explain its special low-life effect');
assert(details.get('가시 방패').includes('피격 반격'), 'thorn guard must explain its retaliation effect');
assert(details.get('결전 신호').includes('저항 관통'), 'decisive signal must include its distinctive penetration effect');
sandbox.game.conditionGemLevels = { '쇠약의 기도': 2, '재의 표식': 1 };
const weaken = sandbox.getConditionGemStatDelta('쇠약의 기도', 'curse');
assert(weaken.enemyDmgMul < 1, 'condition gem multiplier scaling must keep enemy damage reduction below 1');
sandbox.game.enemyConditionDebuffs = { e1: [{ name: '재의 표식', expiresAt: Date.now() + 5000 }] };
const curseFx = sandbox.getEnemyConditionDebuffFactor({ id: 'e1' });
assert.strictEqual(curseFx.ailmentChanceAdd.ignite, 0.15, 'condition curse ignite chance bonus must be exposed to hit application');
assert(curseFx.ailmentTakenMul.ignite > 1, 'condition curse ignite taken multiplier must be exposed to hit application');
const ailmentStats = sandbox.getSkillAilmentStats({ igniteChance: 0, sSkill: { ele: 'fire' } }, 'fire', curseFx);
assert.strictEqual(ailmentStats.igniteChance, 15, 'condition curse ignite chance bonus must apply to ailment stats as percent chance');
let tooltipHtml = '';
sandbox.showInfoTooltipHtml = (_x, _y, html) => { tooltipHtml = html; };
sandbox.getAllConditionGemEntries = () => entries;
sandbox.showPlayerBuffTooltip({ clientX: 0, clientY: 0 }, '재의 표식', 'curse', 3);
assert(tooltipHtml.includes('화염 저항 감소') && tooltipHtml.includes('점화 받는피해'), 'active condition tooltip must render localized effect text');
assert(!tooltipHtml.includes('enemyResFShred') && !tooltipHtml.includes('+0'), 'active condition tooltip must not expose internal English keys or misleading +0 values');
console.log('condition gem detail smoke checks passed');
