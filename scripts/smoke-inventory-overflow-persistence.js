// 보관 컬렉션의 초과분이 불러오기에서 사라지지 않는다는 계약(주얼·별쐐기·장비).
//
// 전투 드랍은 보관함이 가득 차도 희귀·고유 주얼만은 유실 방지로 한도를 넘겨
// 보관한다(combat.js의 protectOverflow). 그런데 mergeDefaults가 불러올 때
// jewelInventory를 한도까지 slice해서, 바로 그 아껴 둔 주얼이 조용히 사라졌다.
// 앞에서부터 남기므로 가장 최근에 지켜 낸 것이 먼저 지워진다.
// 실측: 유효한 주얼 43개(한도 40 + 보호 3) → 불러오기 후 40개, 보호분 3개 전멸.
//
// 장비 보관함은 같은 이유로 자르지 않고 초과 보관을 허용한다("유실 방지를 위해
// 초과 보관됩니다"). 주얼도 같은 규칙을 따라야 한다.
const assert = require('assert');
const fs = require('fs');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');

// ── 불러오기가 초과분을 잘라내면 안 된다 ────────────────────────────────
assert.ok(!/merged\.jewelInventory\s*=\s*merged\.jewelInventory\.slice\(/.test(ui),
    '불러오기에서 주얼 보관함을 한도까지 자르면, 유실 방지로 지켜 둔 희귀·고유 주얼이 조용히 사라진다');
assert.ok(/merged\.jewelInventory = Array\.isArray\(merged\.jewelInventory\)/.test(ui),
    '주얼 보관함 정규화 자체는 남아 있어야 한다');

// 장비 보관함도 자르지 않는다(두 보관함의 정책이 갈라지면 안 된다).
assert.ok(!/merged\.inventory\s*=\s*merged\.inventory\.slice\(/.test(ui),
    '장비 보관함도 초과 보관을 허용해야 한다(정책이 갈라지면 안 된다)');

// ── 드랍 쪽 유실 방지는 그대로 있어야 한다 ──────────────────────────────
// 이게 사라지면 위 계약의 전제가 없어진다(자를 것도 없어진다).
assert.ok(/protectOverflow/.test(combat),
    '가득 찬 보관함에서 희귀·고유 주얼을 지켜 주는 경로가 있어야 한다');
const dropBlock = combat.slice(combat.indexOf('let protectOverflow'), combat.indexOf('let protectOverflow') + 400);
assert.ok(/rarity === 'rare' \|\| jewelRarity === 'unique'|jewelRarity === 'rare'/.test(dropBlock),
    '유실 방지 대상은 희귀·고유여야 한다');

// ── 자발적으로 넣는 경로는 여전히 한도를 지킨다 ─────────────────────────
// 초과 보관을 허용한다고 해서 한도가 무의미해지면 안 된다.
// (드랍의 유실 방지만 예외이고, 제작·회수 등은 계속 막혀야 한다)
const guarded = (passives.match(/jewelInventory\.length >= getJewelInventoryLimit\(\)/g) || []).length;
assert.ok(guarded >= 3,
    `제작·회수 등 자발적 추가 경로는 한도를 확인해야 한다 (현재 ${guarded}곳)`);

// ── 키스톤 회수는 주얼을 버리지 않는다 ──────────────────────────────────
// 심연 군주를 반환하면 추가 슬롯의 주얼이 보관함으로 돌아온다. 이때 한도를
// 넘더라도 버리지 않는다(위에서 불러오기가 더 이상 자르지 않으므로 안전하다).
const reclaim = passives.slice(passives.indexOf('function reclaimKeystoneJewelSlots'),
    passives.indexOf('function isChaseUniqueItem'));
assert.ok(/jewelInventory\.push\(jewel\)/.test(reclaim), '회수한 주얼은 보관함으로 돌려줘야 한다');
assert.ok(!/salvageJewel/.test(reclaim), '회수 과정에서 주얼을 녹이면 안 된다');

// ── 보유 별쐐기도 같은 이유로 잘라내지 않는다 ───────────────────────────
// 획득 경로(드랍·제작) 어디에도 보유 한도 검사가 없고 화면에도 한도 표시가 없는데,
// 불러오기에서만 60개로 잘라 초과분이 조용히 사라졌다(실측 70개 → 60개, 최신 10개 소멸).
// 별쐐기 하나가 운석 파편 77개 + 불완전한 별쐐기 1개다.
assert.ok(!/starWedge\.wedges[^\n]*\.slice\(0,\s*\d+\)/.test(ui),
    '보유 별쐐기를 불러오기에서 잘라내면 최근에 얻은 것부터 조용히 사라진다');
assert.ok(/merged\.starWedge\.wedges = Array\.isArray\(merged\.starWedge\.wedges\)[^\n]*filter\(/.test(ui),
    '별쐐기 유효성 검사(filter)는 남아 있어야 한다');
// 장착 수 제한은 살아 있어야 한다(보유와 장착은 다른 이야기다).
assert.ok(/merged\.starWedge\.sockets[^\n]*slice\(0, starWedgeSocketCap\)/.test(ui),
    '장착 슬롯 상한은 유지되어야 한다');

console.log('smoke-inventory-overflow-persistence passed');
