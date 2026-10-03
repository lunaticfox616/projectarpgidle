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
assert.ok(context.renderProfileSkills(undefined).includes('예전 프로필'), '스킬 정보가 없는 예전 프로필도 깨지지 않는다');
assert.ok(context.renderProfileItemCard(profileSnapshot.equipment[0]).includes('[대검] 검'), '무기 카드 제목은 갈래를 쓴다(게임 툴팁과 같다)');
vm.runInContext("socialState.currentProfileUserId = 'other-player';", context);
context.renderProfileData(profileSnapshot);
assert.ok(!/[·—]/.test(profileBody.innerHTML), '프로필 창 글에는 가운뎃점과 줄표가 없다');
assert.deepStrictEqual(['growthItems', 'growthBoardW', 'growthBoardH', 'growthUnlockedCells'].filter(key => key in profileSnapshot), [],
  '프로필에 생장판 필드를 싣지 않는다');
assert.deepStrictEqual(JSON.parse(JSON.stringify(profileSnapshot.talismans)), [{ kind: 'talisman', name: '배치 부적', rarity: 'rare',
  stats: [{ id: 'flatHp', val: 4 }], effects: ['cry_boss +12'] }], '프로필 부적은 판에 놓인 부적만, 조건부 줄은 효과 문장으로 싣는다');
assert.deepStrictEqual(Array.from(profileSnapshot.equipment, item => item.name), ['검'], '장비 스냅샷은 장착 장비만');
context.profileSnapshotForTest = profileSnapshot;
const equipmentProfileHtml = vm.runInContext("socialState.currentProfile = profileSnapshotForTest; socialState.profileTab = 'equipment'; renderProfileItemsArea();", context);
assert.ok(equipmentProfileHtml.includes('검'), '장비 탭은 장착 장비를 보여 준다');
assert.ok(!require('fs').readFileSync('js/social.js', 'utf8').includes("switchProfileTab('growth')"), 'the profile has no growth board tab');
assert.strictEqual(context.getChatAttachSnapshot('jewel', 0).kind, 'jewel');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 10).kind, 'talisman');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 11).name, '보관 부적', 'stored talismans can be linked too');
assert.strictEqual(context.getChatAttachSnapshot('talisman', 12), null, 'seeds are not talismans');
const talismanProfileHtml = vm.runInContext("socialState.profileTab = 'talismans'; renderProfileItemsArea();", context);
assert.ok(talismanProfileHtml.includes('배치 부적'), '부적 탭은 판에 놓인 부적을 보여야 한다');
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
