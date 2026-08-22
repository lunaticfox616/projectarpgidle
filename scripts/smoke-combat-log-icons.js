const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const start = uiSource.indexOf('function stripCombatLogEmoji');
const end = uiSource.indexOf('function captureCombatLogScroll', start);
assert(start >= 0 && end > start, 'combat-log decoration helpers must be executable in isolation');

const context = {
  stripHtmlMessage(raw) { return String(raw || '').replace(/<[^>]*>/g, ''); },
  escapeHTML(raw) { return String(raw || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); },
  getInventoryItemVisualAsset(item, kind) {
    return kind === 'jewel' ? 'assets/items/chaos-jewel-v3.png' : `assets/items/${item.slot || 'default'}.png`;
  }
};
vm.createContext(context);
vm.runInContext(uiSource.slice(start, end), context, { filename: 'combat-log-icons.js' });

const incoming = context.decorateCombatLogMessage('🩸 [화염] 피격 (12 피해)', 'attack-monster', { element:'fire' });
assert(incoming.includes('combat-log-icon--fire'), 'incoming elemental damage must use its generated element icon');
assert(!/\p{Extended_Pictographic}/u.test(incoming), 'combat-log output must not retain emoji glyphs');

const ailment = context.decorateCombatLogMessage('☣️ 상태이상: 동결', 'attack-monster', { element:'cold' });
assert(ailment.includes('combat-log-icon--cold'), 'ailments must use the matching generated element icon');

const dealt = context.decorateCombatLogMessage('⚔️ 25 피해', 'attack-player', { logIcon:'attack' });
assert(dealt.includes('combat-log-icon--attack'), 'damage dealt by the player must use the sword icon');

const item = context.decorateCombatLogMessage('🎁 [가지 지팡이] 획득!', 'loot-rare', {
  item:{ name:'가지 지팡이', slot:'무기' }
});
assert(item.includes('combat-log-item-icon') && item.includes('assets/items/무기.png'),
  'item acquisition must use the acquired item visual at log-icon size');

const plain = context.decorateCombatLogMessage('✨ 경험치 +20', 'exp-txt', {});
assert.strictEqual(plain, '경험치 +20', 'non-combat emoji must be removed without adding an unrelated icon');

const atlas = 'assets/ui/combat-log-icons-v1.webp';
assert(fs.existsSync(atlas), 'the generated combat-log icon atlas must exist');
assert(fs.statSync(atlas).size <= 32 * 1024, 'the combat-log icon atlas must stay below 32 KB');
assert(fs.readFileSync('css/layout.css', 'utf8').includes("url('../assets/ui/combat-log-icons-v1.webp?v=20260822-2')"),
  'combat-log icon styles must consume the compressed generated atlas');

console.log('smoke-combat-log-icons: ok');
