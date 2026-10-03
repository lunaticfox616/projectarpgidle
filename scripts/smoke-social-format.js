const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

let nextTimerId = 0;
const activeTimers = new Set();
const context = {
  console,
  window: null,
  globalThis: null,
  localStorage: { getItem() { return null; }, setItem() {} },
  document: {
    getElementById() { return null; },
    createElement() { return { textContent: '', style: {} }; },
    head: { appendChild() {} },
    body: { appendChild() {}, classList: { contains() { return false; } } },
  },
  setInterval() { const id = ++nextTimerId; activeTimers.add(id); return id; },
  clearInterval(id) { activeTimers.delete(id); },
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  JSON,
  encodeURIComponent,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'js/social.js' });

assert.strictEqual(activeTimers.size, 0, 'cloud session 전에는 social background timers를 시작하지 않아야 한다');
context.cloudState = { user: { id: 'user-1' } };
context.cloudJsonRequest = async () => [];
vm.runInContext("setMyNicknameLocal('테스터'); syncSocialBackgroundTasks();", context);
assert.strictEqual(activeTimers.size, 2, 'cloud session 후 heartbeat와 background notification timer만 시작해야 한다');
vm.runInContext('syncSocialBackgroundTasks();', context);
assert.strictEqual(activeTimers.size, 2, 'social background task 동기화는 중복 timer를 만들지 않아야 한다');
context.cloudState.user = null;
vm.runInContext('syncSocialBackgroundTasks();', context);
assert.strictEqual(activeTimers.size, 0, 'logout 시 social background timers를 모두 정리해야 한다');

assert.strictEqual(context.formatChatTime('not-a-date'), '', 'invalid chat timestamps should render as empty text');
const profileBody = { innerHTML: '', style: {} };
context.document.getElementById = (id) => (id === 'social-profile-body' ? profileBody : null);
context.renderProfileData({ updatedAt: 'not-a-date', stats: [], nickname: '테스터' });
assert.ok(!profileBody.innerHTML.includes('NaN'), 'invalid profile timestamps should not render NaN text');
assert.match(context.formatChatTime('2026-07-05T03:04:00Z'), /^\d{2}\/\d{2} \d{2}:\d{2}$/);

const presenceNow = Date.parse('2026-08-11T12:00:00Z');
assert.strictEqual(context.getSocialPresenceState('2026-08-11T11:55:00Z', presenceNow), 'active', 'heartbeat up to five minutes old should be green');
assert.strictEqual(context.getSocialPresenceState('2026-08-11T11:30:01Z', presenceNow), 'recent', 'heartbeat under thirty minutes old should be yellow');
assert.strictEqual(context.getSocialPresenceState('2026-08-11T11:30:00Z', presenceNow), 'recent', 'thirty-minute boundary should remain yellow');
assert.strictEqual(context.getSocialPresenceState('2026-08-11T11:29:59Z', presenceNow), '', 'presence older than thirty minutes should disappear');
const onlineHost = { innerHTML: '', style: {} };
context.cloudState = { user: { id: 'user-1' } };
context.document.getElementById = (id) => (id === 'social-online' ? onlineHost : null);
context.renderOnlineUsers([
  { user_id: 'user-1', nickname: '초록', last_seen: '2026-08-11T11:55:00Z' },
  { user_id: 'user-2', nickname: '노랑', last_seen: '2026-08-11T11:30:00Z' },
  { user_id: 'user-3', nickname: '숨김', last_seen: '2026-08-11T11:29:59Z' }
], presenceNow);
assert.ok(onlineHost.innerHTML.includes('social-presence-dot active') && onlineHost.innerHTML.includes('초록'), 'active presence should use the green design-system state');
assert.ok(onlineHost.innerHTML.includes('social-presence-dot recent') && onlineHost.innerHTML.includes('노랑'), 'recent presence should use the yellow design-system state');
assert.ok(!onlineHost.innerHTML.includes('🟢') && !onlineHost.innerHTML.includes('🟡'), 'presence UI should not mix platform emoji with the game icon language');
assert.ok(!onlineHost.innerHTML.includes('숨김'), 'expired presence chips must be removed');
assert.strictEqual(context.isSocialChatMessageCurrent({ created_at: '2026-08-08T12:00:01Z' }, presenceNow), true, 'messages newer than three days should remain');
assert.strictEqual(context.isSocialChatMessageCurrent({ created_at: '2026-08-08T12:00:00Z' }, presenceNow), false, 'messages reaching three days should expire');

context.getJewelStats = jewel => jewel.stats || [];
// 부적은 그루터기 함 아이템이다(2026-09-30).
context.stumpBox = { itemById: (state, id) => (state.stumpBox.items || []).find(item => item.id === id) || null };
context.talismans = { describeLine: line => `${line.id} +${line.value}` };
context.getStatName = stat => stat;
// 장비 카드는 게임 툴팁과 같은 규칙(옵션 순서, 방어 수치)을 쓴다: 실제 js/item-tooltip-rules.js와 그 잠식 줄 함수, 그루터기 함과 부적 자료.
context.safeExposeGlobals = () => {};
context.safeExposeData = () => {};
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
vm.runInContext(passivesSource.slice(passivesSource.indexOf('function getImmutableItemSpecialStats('), passivesSource.indexOf('function getItemExplicitOptionCount(')), context);
for (const source of ['js/item-tooltip-rules.js', 'data/stump-box.js', 'data/talismans.js']) vm.runInContext(fs.readFileSync(source, 'utf8'), context, { filename: source });
context.stumpBox.isMature = item => item.ripe === true;
context.talismanEffects = { summarize: () => ({ suppressed: new Set(), amplified: new Set() }) };
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const chatSizeStart = uiSource.indexOf('function applyChatMessageSize(');
const chatSizeEnd = uiSource.indexOf('function updateSettings()', chatSizeStart);
const chatSizeContext = { document: { body: { dataset: {} } } };
vm.createContext(chatSizeContext);
vm.runInContext(uiSource.slice(chatSizeStart, chatSizeEnd), chatSizeContext, { filename: 'chat-message-size.js' });
assert.strictEqual(chatSizeContext.applyChatMessageSize('large'), 'large');
assert.strictEqual(chatSizeContext.document.body.dataset.chatMessageSize, 'large', 'chat size selection must immediately update the live UI');
assert.strictEqual(chatSizeContext.applyChatMessageSize('invalid'), 'medium', 'damaged save data must fall back to the readable default size');
context.game = {
  equipment: { 무기: { name: '검', rarity: 'rare', stats: [] } },
  inventory: [{ name: '장갑', slot: '장갑', rarity: 'magic', stats: [] }],
  jewelInventory: [{ name: '보관 주얼', rarity: 'magic', stats: [] }],
  stumpBox: {
    items: [
      { id: 10, family: 'talisman', name: '배치 부적', rarity: 'rare', ripe: true,
        lines: [{ kind: 'stat', id: 'flatHp', value: 4 }, { kind: 'condition', id: 'cry_boss', value: 12 }] },
      { id: 11, family: 'talisman', name: '보관 부적', rarity: 'magic', lines: [{ kind: 'stat', id: 'crit', value: 2 }] },
      { id: 12, family: 'seed', color: 'fire' }
    ],
    board: [null, 12, 10].concat(Array(22).fill(null))
  },
  starWedge: { wedges: [{ id: 30, unique: true, uniqueType: 'sun', lines: [{ stat: 'flatHp', val: 8 }] }] },
  // 프로필 형식 8(2026-10-03): 직업과 전직, 스킬 젬 구성.
  selectedClassId: 'warrior', ascendClass: 'berserker', level: 31,
  activeSkill: '회오리바람', mobilitySkill: '방패 돌진', equippedSupports: ['날카로움'], equippedSummonSkills: ['벌떼 소환'],
  gemData: { '회오리바람': { level: 12, quality: 5 }, '방패 돌진': { level: 4 }, '벌떼 소환': { level: 7 } },
  supportGemData: { '날카로움': { level: 3 } }, summonSkillCounts: { '벌떼 소환': 3 }
};
context.PLAYER_CLASS_DEFS = { warrior: { label: '전사' } };
context.CLASS_TEMPLATES = { berserker: { name: '버서커' } };
context.getWeaponCategoryName = item => (item && item.name === '검' ? '대검' : '');
// 게임의 비교 표(COMPARE_STAT_META)를 흉내 낸다: 이름은 키 그대로, 값은 문자열.
context.COMPARE_STAT_META = new Proxy({}, { get: (target, key) => ({ label: `이름:${String(key)}`, format: value => String(value) }) });
let playerStats = { dps: 100, summonDps: 40, totalDps: 140, baseDmg: 20 };
context.getPlayerStats = () => playerStats;
// 별쐐기는 없어졌다(2026-10-01): 옛 저장에 남은 별쐐기가 있어도 채팅에 걸 수 없다.
const profileSnapshot = context.buildProfileSnapshot();
assert.strictEqual(profileSnapshot.version, 8, '직업과 전직, 스킬 젬, 무기 갈래를 싣는 프로필 형식이어야 한다');
assert.deepStrictEqual([profileSnapshot.heroClassName, profileSnapshot.className], ['전사', '버서커'], '직업(6종)과 전직을 함께 싣는다');
assert.strictEqual(profileSnapshot.power, 140, '총 DPS는 직접 DPS와 소환 DPS의 합(게임의 권장 전투력 비교와 같은 값)');
assert.ok(profileSnapshot.stats.some(row => row.key === 'summonDps'), '소환수가 있으면 소환 DPS 줄이 있다');
assert.ok(profileSnapshot.stats.every(row => row.label.includes('이름:')), '능력치 이름은 게임의 비교 표에서 가져온다');
assert.deepStrictEqual(JSON.parse(JSON.stringify(profileSnapshot.skills)), {
  active: { name: '회오리바람', level: 12, quality: 5 }, supports: [{ name: '날카로움', level: 3 }],
  mobility: { name: '방패 돌진', level: 4, quality: 0 }, summons: [{ name: '벌떼 소환', level: 7, quality: 0, count: 3 }]
}, '스킬은 주 스킬과 보조 젬, 이동 스킬, 소환수(수)를 싣는다');
assert.strictEqual(profileSnapshot.equipment[0].category, '대검', '무기는 갈래를 싣는다');
playerStats = { dps: 100, summonDps: 0, totalDps: 100 };
assert.ok(!context.buildProfileSnapshot().stats.some(row => row.key === 'summonDps'), '소환수가 없으면 소환 DPS 줄은 없다');
const chips = context.renderProfileIdentityChips(profileSnapshot);
assert.ok(['Lv.31', '전사', '버서커', '총 DPS 140'].every(text => chips.includes(text)) && !chips.includes('·'), '머리 줄은 가운뎃점 없는 칩이다');
assert.ok(context.renderProfileIdentityChips({ version: 7, level: 3, className: '워리어', power: 50 }).includes('전투력 50'), '예전 프로필의 값은 전처럼 전투력이다');
const skillsHtml = context.renderProfileSkills(profileSnapshot.skills);
assert.ok(['주 스킬', '회오리바람', 'Lv.12', '품질 5', '보조', '날카로움', '이동', '방패 돌진', '소환', '3마리'].every(text => skillsHtml.includes(text)), '스킬 탭은 젬 구성을 보여 준다');
const tabCats = profile => JSON.parse(JSON.stringify(context.profileTabList(profile))).map(([cat]) => cat);
assert.deepStrictEqual(tabCats({ version: 7, equipment: [] }), ['equipment'], '스킬 정보가 없는 예전 프로필에는 스킬 탭이 없다');
assert.deepStrictEqual(tabCats(profileSnapshot), ['equipment', 'skills'], '소켓에 주얼이 없고 그루터기 함 판이 비었으면 주얼과 그루터기 함 탭은 없다');
assert.ok(context.renderProfileItemCard(profileSnapshot.equipment[0]).includes('[대검] 검'), '무기 카드 제목은 갈래를 쓴다(게임 툴팁과 같다)');
vm.runInContext("socialState.currentProfileUserId = 'other-player';", context);
context.renderProfileData(profileSnapshot);
assert.ok(!/[·—]/.test(profileBody.innerHTML), '프로필 창 글에는 가운뎃점과 줄표가 없다');

// 장비 카드(2026-10-03): 게임 툴팁처럼 베이스와 단계, 아이템 레벨, 요구 조건, 소켓, "베이스 옵션"과 "추가 옵션 (n/6)".
const socketJewel = { kind: 'jewel', name: '붉은 주얼', rarity: 'magic', stats: [{ id: 'flatHp', val: 10 }, { id: 'crit', val: 1, petite: true }] };
const weaponCard = {
  slot: '무기', category: '곡도', name: '흑철 곡도', rarity: 'rare', baseName: '흑철 곡도', baseStep: [2, 5], itemLevel: 40, grade: 5,
  requirements: { level: 30, attributes: { str: 50, dex: 40, int: 0 }, exempt: false },
  sockets: [{ label: '심연 소켓 1', jewel: socketJewel }, { label: '공허 소켓', jewel: null }],
  baseStats: [{ id: 'flatDmg', val: 12, valMin: 10, valMax: 14 }], stats: [{ id: 'crit', val: 3, tier: 4, valMin: 2, valMax: 4 }]
};
const weaponHtml = context.renderProfileItemCard(weaponCard);
for (const text of ['[곡도] 흑철 곡도', '베이스: 흑철 곡도', '[2/5]', '아이템 Lv.40', '요구 Lv.30, str 50, dex 40', '◆ 심연 소켓 1: ', '붉은 주얼',
  ', flatHp +10, 쁘띠 crit +1', '베이스 옵션', '추가 옵션 (1/6)', 'crit +3</span> <span class="social-roll">(2~4)</span>']) {
  assert.ok(weaponHtml.includes(text), `장비 카드에 "${text}"가 있다`);
}
assert.ok(!weaponHtml.includes('공허 소켓'), '빈 소켓은 보여 주지 않는다');
assert.ok(!/[·—]/.test(weaponHtml), '장비 카드 글에는 가운뎃점과 줄표가 없다');
assert.ok(context.renderProfileItemCard({ slot: '투구', name: '천 두건', rarity: 'normal', baseStats: [], stats: [] }).includes('일반 아이템: 추가 옵션 없음'));

// 추가 옵션은 게임 툴팁과 같은 순서(방어도, 생명력, 피해, 치명타 ...)와 개수(혼돈 주입 포함). 방어 수치는 최종값과 베이스.
const armorCard = context.renderProfileItemCard({ slot: '갑옷', name: '판금 갑옷', rarity: 'rare', baseStats: [{ id: 'armor', val: 100, valMin: 90, valMax: 110 }],
  stats: [{ id: 'crit', val: 2 }, { id: 'flatHp', val: 30 }, { id: 'armorPct', val: 50 }], chaosInfusion: { id: 'firePctDmg', val: 9 } });
const order = ['armorPct +50', 'flatHp +30', '[주입] firePctDmg +9', 'crit +2'].map(text => armorCard.indexOf(text));
assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `추가 옵션은 게임과 같은 순서다: ${order}`);
assert.ok(armorCard.includes('추가 옵션 (4/6)'), '혼돈 주입도 추가 옵션 개수에 든다');
assert.ok(armorCard.includes('armor: <span style="color:#cfe0f5;">150</span> <span style="color:var(--copy-bright);">(100)</span> <span class="social-roll">(90~110)</span>'),
  '방어도는 % 옵션까지 더한 최종값, 괄호에 베이스, 그다음 굴림 범위');
const affixCard = context.renderProfileItemCard({ slot: '반지1', name: '반지', rarity: 'rare', stats: [
  { id: 'flatDmg', val: 5, valMin: 4, valMax: 6, extraStats: [{ id: 'crit', val: 1 }], source: '홀씨', honey: true }, { id: 'resF', val: 8, fixed: true }],
  encroached: { liberated: true, chosen: { id: 'aspd', val: 4 } } });
assert.ok(affixCard.includes('flatDmg +5</span>, <span style="color:#cfe0f5;">crit +1</span> <span class="social-roll">(4~6)</span>'), '복합 옵션은 한 줄에 두 개, 범위는 첫 줄 끝에');
assert.ok(affixCard.includes('<span class="equipment-craft-source">홀씨</span>') && affixCard.includes('🍯 벌꿀 고정'), '제작 출처와 벌꿀 고정 표시');
assert.ok(affixCard.includes('resF +8</span> <span class="tier-badge tier-badge-fixed">[T0]</span>'), '고정 옵션은 [T0]');
assert.ok(affixCard.includes('[잠식] aspd +4'), '해방한 잠식 옵션');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.snapStat({ id: 'crit', val: 3, baseRollMin: 1, baseRollMax: 5, lockedByHoney: true, petite: true, waxBonus: true }))),
  { id: 'crit', val: 3, baseRollMin: 1, baseRollMax: 5, honey: true, wax: true }, '벌꿀 고정과 밀랍을 싣고, 밀랍 보너스 줄은 쁘띠가 아니다');
assert.ok(context.renderProfileItemCard({ slot: '투구', name: '투구', rarity: 'magic', baseStats: [{ id: 'flatHp', val: 30, baseRollMin: 20, baseRollMax: 40 }], stats: [] })
  .includes('(20~40)'), '옵션 범위가 없으면 베이스 굴림 범위(게임과 같다)');
assert.ok(context.renderProfileItemCard({ slot: '무기', name: '<b>x</b>', rarity: 'rare', baseName: '"><img>', grade: '<i>', itemLevel: '7<b>',
  requirements: { level: '<script>', attributes: { '<i>': 3 } }, sockets: [{ label: '<u>', jewel: { name: '<s>' } }], stats: [] }).indexOf('<b>x') < 0,
  '남의 프로필 글은 모두 이스케이프한다');

// 주얼 카드: 게임 툴팁처럼 배정 키스톤, 평균 티어, 줄마다 밀랍과 쁘띠, 굴림 범위. 고유 주얼은 고정 옵션.
const jewelHtml = context.renderProfileItemCard({ kind: 'jewel', name: '쌍둥이 주얼', rarity: 'rare',
  stats: [{ id: 'crit', val: 2, tier: 3, valMin: 1, valMax: 3, wax: true }, { id: 'flatHp', val: 5, petite: true }],
  keystone: { name: '혈맹', ascend: '버서커', active: true } });
for (const text of ['🔯 배정 키스톤: 혈맹(버서커), 할당 중', '옵션 평균 티어: T3.0', '밀랍 ', '쁘띠 ', 'crit: +2', 'T3', '(고정 범위 1~3)', '(고정 범위 5~5)']) {
  assert.ok(jewelHtml.includes(text), `주얼 카드에 "${text}"가 있다`);
}
const uniqueJewelHtml = context.renderProfileItemCard({ kind: 'jewel', name: '심연의 눈', rarity: 'unique', uniqueEffect: '처치 시 폭발', stats: [] });
assert.ok(uniqueJewelHtml.includes('✨ 고유 효과: 처치 시 폭발') && uniqueJewelHtml.includes('고유 고정 옵션, 티어 평가 제외'));

// 부적 카드: 희귀도 줄, 줄 문장(조건부는 보라색), 판 위 상태, 깨어나는 중이면 그 진행과 접붙이기. 예전 형식(stats, effects)도 그린다.
const placedTalisman = { kind: 'talisman', name: '배치 부적', rarity: 'rare', lines: [{ text: 'flatHp +4', condition: false }, { text: 'cry_boss +12', condition: true }] };
const talismanHtml = context.renderProfileItemCard({ ...placedTalisman, state: 'amplified', ripe: true });
for (const text of ['희귀 부적', 'flatHp +4', '<div class="social-item-stat" style="color:#d7b8ff;">cry_boss +12</div>', '깨어남, 척력으로 효과 +25%']) {
  assert.ok(talismanHtml.includes(text), `부적 카드에 "${text}"가 있다`);
}
const sleepingHtml = context.renderProfileItemCard({ ...placedTalisman, state: 'asleep', ripe: false, xp: 30, need: 300, graft: 2, graftPct: 20 });
assert.ok(sleepingHtml.includes('깨어남 30 / 300') && sleepingHtml.includes('접붙이기 2단계, 이 칸에 놓인 것의 효과 +20%'), '잠든 부적은 깨어남 진행과 접붙이기');
assert.ok(context.getChatAttachSnapshot('talisman', 10).state === 'awake', '판에 놓인 다 깨어난 부적의 상태');
assert.ok(context.renderProfileItemCard({ kind: 'talisman', name: '옛 부적', rarity: 'magic', stats: [{ id: 'crit', val: 1 }], effects: ['옛 효과'] }).includes('옛 효과'),
  '예전 형식의 부적도 그린다');
assert.ok(!context.renderProfileItemCard({ kind: 'talisman', name: '부적', rarity: '__proto__', state: '__proto__', lines: [] }).includes('[object Object]'),
  '알 수 없는 희귀도와 상태는 무시한다');

// 주얼 탭: 장비 소켓에 박힌 주얼은 자리([곡도] 심연 소켓 1)와 함께.
vm.runInContext('socialState.profileTips = {};', context);
context.profileWithSocketsForTest = { equipment: [weaponCard] };
const jewelTabHtml = vm.runInContext("socialState.currentProfile = profileWithSocketsForTest; socialState.profileTab = 'jewels'; renderProfileItemsArea();", context);
assert.ok(jewelTabHtml.includes('붉은 주얼') && jewelTabHtml.includes('<small>[곡도] 심연 소켓 1</small>'), '주얼 탭은 주얼이 박힌 자리를 보여 준다');
assert.deepStrictEqual(tabCats(context.profileWithSocketsForTest), ['equipment', 'jewels'], '소켓에 주얼이 있으면 주얼 탭');

// 장비 탭: 끼고 있는 칸만 그리고, 코어를 끼고 있으면 왼쪽 위 코어 칸. 아무것도 없으면 한 줄.
context.coreProfileForTest = { equipment: [weaponCard], core: { kind: 'core', name: '파괴의 코어', lines: ['공격 속도 +5%'] } };
const coreTabHtml = vm.runInContext("socialState.currentProfile = coreProfileForTest; socialState.profileTab = 'equipment'; renderProfileItemsArea();", context);
assert.ok(coreTabHtml.includes('slot-코어') && coreTabHtml.includes('[코어]') && coreTabHtml.includes('slot-무기'), '코어 칸과 낀 장비 칸');
assert.ok(!coreTabHtml.includes('비어있음') && !coreTabHtml.includes('slot-투구'), '빈 장비 칸은 그리지 않는다');
assert.ok(vm.runInContext("socialState.profileTips['eq:코어']", context).includes('공격 속도 +5%'), '코어 카드는 게임 코어 툴팁과 같은 줄');
assert.ok(context.renderProfileEquipPaperdoll({ equipment: [] }).includes('장착한 장비 없음'));

// 그루터기 함 탭: 5×5 판. 닫힌 칸은 체크 무늬, 놓인 것은 게임과 같은 그림, 자라는 중이면 막대, 접붙이기 단계 숫자. 누르면 카드.
const stumpCells = Array(25).fill(null);
stumpCells[12] = { graft: 2, graftPct: 20, item: { kind: 'stump', family: 'seed', color: 'fire', stage: 'flower', name: '화염 꽃', ripe: true, quality: 110,
  yieldText: '화염 피해 +6.6%', resonant: true, note: '다 자란 화염 3개가 공명해 능력치 +10%' } };
stumpCells[7] = { item: { ...placedTalisman, state: 'asleep', stage: 'sealed', ripe: false, xp: 30, need: 300 } };
stumpCells[11] = { item: { kind: 'stump', family: 'sap', color: '<x>', stage: 'javascript:', name: '수상한 수액', ripe: false, xp: 0, need: 500 } };
stumpCells[13] = {};
context.stumpProfileForTest = { equipment: [], stump: { cells: stumpCells } };
assert.deepStrictEqual(tabCats(context.stumpProfileForTest), ['equipment', 'stump'], '판에 하나라도 놓였으면 그루터기 함 탭');
assert.strictEqual(JSON.parse(JSON.stringify(context.profileTabList(context.stumpProfileForTest)))[1][1], '그루터기 함');
const stumpHtml = vm.runInContext("socialState.currentProfile = stumpProfileForTest; socialState.profileTab = 'stump'; renderProfileItemsArea();", context);
assert.strictEqual((stumpHtml.match(/class="social-stump-cell/g) || []).length, 25, '판은 25칸');
assert.strictEqual((stumpHtml.match(/is-locked/g) || []).length, 21, '닫힌 칸 21개');
assert.ok(stumpHtml.includes('src="assets/px/stump/flower-fire.png"') && stumpHtml.includes('src="assets/px/stump/sealed-rare.png"'), '게임 판과 같은 그림');
assert.ok(fs.existsSync('assets/px/stump/flower-fire.png') && fs.existsSync('assets/px/stump/sealed-rare.png'), '그림 파일이 있다');
assert.ok(!stumpHtml.includes('javascript:') && !stumpHtml.includes('<x>'), '알 수 없는 단계나 색은 그림 주소에 쓰지 않는다');
assert.ok(stumpHtml.includes('is-filled is-resonant') && stumpHtml.includes('<span class="social-stump-graft">2</span>'), '공명 테와 접붙이기 단계');
assert.ok(stumpHtml.includes('<i style="width:10%"></i>'), '깨어나는 중인 부적은 진행 막대');
const seedCard = vm.runInContext("socialState.profileTips['st:12']", context);
for (const text of ['화염 꽃', '품질 110%', '다 자랐습니다.', '화염 피해 +6.6%', '공명해 능력치 +10%', '접붙이기 2단계']) {
  assert.ok(seedCard.includes(text), `씨앗 카드에 "${text}"가 있다`);
}
assert.ok(vm.runInContext("socialState.profileTips['st:7']", context).includes('깨어남 30 / 300'), '판의 부적 칸은 부적 카드');
context.oldTalismanProfileForTest = { equipment: [], talismans: [{ kind: 'talisman', name: '옛 부적', rarity: 'magic', stats: [], effects: [] }] };
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.profileTabList(context.oldTalismanProfileForTest)))[1], ['stump', '부적'], '판 정보가 없는 예전 프로필은 부적 목록');
assert.ok(vm.runInContext("socialState.currentProfile = oldTalismanProfileForTest; renderProfileItemsArea();", context).includes('옛 부적'));
assert.deepStrictEqual(['growthItems', 'growthBoardW', 'growthBoardH', 'growthUnlockedCells'].filter(key => key in profileSnapshot), [],
  '프로필에 생장판 필드를 싣지 않는다');
assert.deepStrictEqual(['jewels', 'talismans'].filter(key => key in profileSnapshot), [],
  '주얼은 장비 소켓 줄에, 부적은 그루터기 함 판에 싣는다(따로 된 목록 없음)');
assert.deepStrictEqual(Array.from(profileSnapshot.equipment, item => item.name), ['검'], '장비 스냅샷은 장착 장비만');
context.profileSnapshotForTest = profileSnapshot;
const equipmentProfileHtml = vm.runInContext("socialState.currentProfile = profileSnapshotForTest; socialState.profileTab = 'equipment'; renderProfileItemsArea();", context);
assert.ok(equipmentProfileHtml.includes('검') && !equipmentProfileHtml.includes('비어있음'), '장비 탭은 장착 장비만 보여 준다');
assert.ok(!require('fs').readFileSync('js/social.js', 'utf8').includes("switchProfileTab('growth')"), 'the profile has no growth board tab');
assert.strictEqual(context.getChatAttachSnapshot('jewel', 0).kind, 'jewel');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 10).kind, 'talisman');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 11).name, '보관 부적', 'stored talismans can be linked too');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 12), null, 'seeds are not talismans');
assert.strictEqual(context.getChatAttachSnapshot('growthPlaced', 21), null, 'growth links are gone');
assert.strictEqual(context.getChatAttachSnapshot('starWedge', 30), null, 'star-wedge links are gone');
const pickerGroups = context.getChatItemPickerGroups();
assert.deepStrictEqual(Array.from(pickerGroups, group => group.title),
  ['장착 장비', '장비 인벤토리', '주얼', '부적']);
assert.ok(context.renderChatItemPickerGroup(pickerGroups[2]).includes("attachChatItem('jewel',0)"), 'stored jewels should be selectable in the chat picker');
assert.deepStrictEqual(Array.from(pickerGroups[3].entries, entry => [entry.key, entry.label]), [[10, '[판]'], [11, '[보관]']],
  'the talisman picker lists the stump box talismans, placed or stored');

const socialRoot = { innerHTML: '' };
const socialHost = { querySelector() { return socialRoot; }, classList: { contains() { return false; } } };
context.document.getElementById = (id) => (id === 'tab-social' ? socialHost : null);
context.cloudState = { initialized: false, configured: false, busy: false, user: null };
context.renderSocialTab();
assert.ok(socialRoot.innerHTML.includes('클라우드 세션을 연결하는 중입니다.'), 'session restore 전에는 로그인 요구 대신 연결 중 상태를 표시해야 한다');

context.cloudState = { initialized: true, configured: true, busy: false, user: { id: 'user-1' } };
context.cloudJsonRequest = async () => [{ nickname: '테스터' }];
context.renderSocialTab();
assert.ok(socialRoot.innerHTML.includes('class="social-chat-input-shell"'), 'chat input and counter should share a stable input shell');
assert.ok(socialRoot.innerHTML.includes('class="social-send-btn"'), 'send action should have a dedicated layout class');
assert.ok(socialRoot.innerHTML.includes('id="social-chat-input" name="social-chat-message"'), 'chat composer should expose a stable non-credential field name');
assert.ok(socialRoot.innerHTML.includes('autocomplete="off"'), 'chat composer must not show prior browser input suggestions');
assert.ok(!socialRoot.innerHTML.includes('닉네임 클릭 →'), 'obsolete social hint should be removed');

const chatList = { innerHTML: '', scrollHeight: 900, scrollTop: 0, clientHeight: 260, isConnected: true };
context.document.getElementById = (id) => (id === 'social-chat-list' ? chatList : null);
vm.runInContext("socialState.lastChatRenderKey = ''; socialState.scrollChatToLatestOnNextRender = true;", context);
context.renderChatMessages([{ id: 1, user_id: 'user-2', nickname: '새친구', body: '안녕하세요', created_at: '2026-07-17T12:00:00Z' }], true);
assert.strictEqual(chatList.scrollTop, chatList.scrollHeight, 'opening chat should place the viewport at the newest message');
assert.ok(chatList.innerHTML.includes('<article class="social-chat-msg">'), 'chat messages should expose row semantics instead of generic bubbles');
assert.ok(chatList.innerHTML.includes('class="social-chat-head"') && chatList.innerHTML.includes('class="social-chat-nick"'), 'chat rows should provide a stable author hierarchy');
assert.ok(!chatList.innerHTML.includes('social-chat-avatar'), 'chat nicknames must not repeat their first letter inside a decorative circle');
assert.ok(chatList.innerHTML.includes('class="social-chat-body">안녕하세요'), 'chat body content should remain visible under the author row');

vm.runInContext("socialState.lastChatRenderKey = '';", context);
context.cloudState.user = { id: 'user-1' };
context.renderChatMessages([{ id: 2, user_id: 'user-1', nickname: '테스터', body: '내 메시지', created_at: '2026-07-17T12:01:00Z' }], false);
assert.ok(chatList.innerHTML.includes('social-chat-msg mine') && chatList.innerHTML.includes('social-chat-self">나'), 'own messages should remain identifiable without a separate chat bubble color');

const html = fs.readFileSync('index.html', 'utf8');
const socialSource = fs.readFileSync('js/social.js', 'utf8');
assert.ok(html.includes('id="chk-social-chat-noti"'), 'settings should expose a new-chat notification toggle');
assert.ok(html.includes('id="sel-chat-message-size"'), 'settings should expose a persistent chat message size control');
assert.ok(socialSource.includes('var(--font-size-chat,12px)'), 'chat message text should follow the shared size setting instead of a fixed pixel value');
assert.ok(socialSource.includes('SOCIAL_BG_NOTI_POLL_MS = 15000'), 'background chat notifications should arrive promptly');
assert.ok(socialSource.includes("showGameToast(`새 채팅"), 'incoming chat should create an in-game notification');
const socialSql = fs.readFileSync('db/social.sql', 'utf8');
assert.ok(socialSql.includes("created_at < now() - interval '3 days'"), 'database cleanup must delete chat messages after three days');

console.log('smoke-social-format passed');
