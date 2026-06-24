const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/items.js', 'utf8');

function extractFunctionBlock(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = text.indexOf('{', text.indexOf(')', start));
  let depth = 0;
  let quote = null;
  let escaped = false;
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

const sandbox = {
  UNIQUE_DB: [{
    name: '테스트 고유',
    slots: ['반지'],
    reqTier: 3,
    uniqueEffect: '테스트 고유 효과',
    stats: [{ id: 'crit', min: 3, max: 7 }, { id: 'resAll', min: 8, max: 12 }]
  }],
  BASE_ITEM_DB: [{ id: 'test_ring', slot: '반지', name: '테스트 반지', reqTier: 3, baseStats: [{ id: 'resAll', base: 5 }] }],
  game: { uniqueCodex: {} },
  escapeHTML(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); },
  getStatName(id) { return ({ crit: '치명타 확률', resAll: '모든 저항' })[id] || id; },
  formatValue(_id, value) { return String(value); }
};
vm.createContext(sandbox);
vm.runInContext([
  extractFunctionBlock(source, 'getBlackMarketBaseRollRange'),
  extractFunctionBlock(source, 'getBlackMarketBaseTooltipOptionLines'),
  extractFunctionBlock(source, 'getBlackMarketUniqueTooltipOptionLines'),
  extractFunctionBlock(source, 'getBlackMarketOfferTooltipHtml'),
  'this.getBlackMarketOfferTooltipHtml = getBlackMarketOfferTooltipHtml;'
].join('\n'), sandbox);

const baseHtml = sandbox.getBlackMarketOfferTooltipHtml({
  type: 'baseItem',
  name: '테스트 반지 베이스',
  slot: '반지',
  hiddenTier: 3,
  baseStats: [{ id: 'resAll', base: 5 }]
});
assert(baseHtml.includes('숨겨진 티어 3'), 'black-market base tooltip must display hidden tier instead of required tier');
assert(baseHtml.includes('베이스 옵션 · 모든 저항 +4~+6'), 'black-market base tooltip must show base option ranges');

const html = sandbox.getBlackMarketOfferTooltipHtml({
  type: 'unique',
  name: '테스트 고유',
  slot: '반지',
  reqTier: 3,
  hiddenTier: 3,
  baseName: '테스트 반지',
  baseStats: [{ id: 'resAll', base: 5 }],
  chase: false
});
assert(html.includes('✨ 고유 효과: 테스트 고유 효과'), 'black-market unique tooltip must show the unique effect');
assert(html.includes('베이스: 테스트 반지 · 숨겨진 티어 3'), 'black-market unique tooltip must show its base and hidden tier');
assert(html.includes('베이스 옵션 · 모든 저항 +4~+6'), 'black-market unique tooltip must show base option ranges');
assert(html.includes('고유 옵션 · 치명타 확률 +3~+7'), 'black-market unique tooltip must show first unique stat range');
assert(html.includes('고유 옵션 · 모든 저항 +8~+12'), 'black-market unique tooltip must show second unique stat range');

const savedOfferHtml = sandbox.getBlackMarketOfferTooltipHtml({
  type: 'unique',
  name: '테스트 고유',
  slot: '반지',
  reqTier: 3,
  uniqueEffect: '저장된 효과',
  uniqueStats: [{ id: 'crit', min: 4, max: 9 }]
});
assert(savedOfferHtml.includes('✨ 고유 효과: 저장된 효과'), 'saved market offers must use stored unique effect text when present');
assert(savedOfferHtml.includes('고유 옵션 · 치명타 확률 +4~+9'), 'saved market offers must use stored unique stat ranges when present');

console.log('black market unique tooltip smoke checks passed');
