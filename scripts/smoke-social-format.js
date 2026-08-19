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
context.getTalismanDisplayName = talisman => talisman.name;
context.getStatName = stat => stat;
context.getStarWedgeUniqueDef = type => type === 'sun' ? { name: '태양', desc: '핵심 옵션 증폭' } : null;
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const talismanNameStart = uiSource.indexOf('const TALISMAN_NAME_STEMS =');
const talismanNameEnd = uiSource.indexOf('const TALISMAN_UNIQUE_POOL =', talismanNameStart);
const talismanNameContext = { Object, String };
vm.createContext(talismanNameContext);
vm.runInContext(uiSource.slice(talismanNameStart, talismanNameEnd), talismanNameContext, { filename: 'talisman-names.js' });
assert.strictEqual(talismanNameContext.getGeneratedTalismanName({ stat: 'flatHp', shape: 'L' }), '생명의 모서리',
  'ordinary talismans must receive a stat-and-shape name instead of displaying only their option');
assert.strictEqual(talismanNameContext.getGeneratedTalismanName({ statName: '막기 확률(%)', shape: 'T' }), '막기 확률의 갈림쇠',
  'unknown future talisman stats must still generate a readable fallback name');
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
  jewelSlots: [{ name: '장착 주얼', rarity: 'rare', stats: [{ id: 'crit', val: 3 }] }],
  jewelInventory: [{ name: '보관 주얼', rarity: 'magic', stats: [] }],
  talismanPlacements: { 10: { talisman: { id: 10, name: '배치 부적', rarity: 'rare', stat: 'flatHp', value: 4 } } },
  talismanInventory: [{ id: 11, name: '보관 부적', rarity: 'magic', stat: 'crit', value: 2 }],
  growthInventory: [{ id: 20, name: '보관 생장판', rarity: 'rare', stats: [] }],
  starWedge: { wedges: [{ id: 30, unique: true, uniqueType: 'sun', lines: [{ stat: 'flatHp', val: 8 }] }] }
};
context.getPlacedGrowthEntries = () => [{ item: { id: 21, name: '배치 생장판', rarity: 'unique', stats: [] } }];
assert.strictEqual(context.getChatAttachSnapshot('jewel', 0).kind, 'jewel');
assert.strictEqual(context.getChatAttachSnapshot('talismanPlaced', 10).kind, 'talisman');
assert.strictEqual(context.getChatAttachSnapshot('growthPlaced', 21).name, '배치 생장판');
assert.strictEqual(context.getChatAttachSnapshot('starWedge', 30).name, '태양 #30');
const pickerGroups = context.getChatItemPickerGroups();
assert.deepStrictEqual(Array.from(pickerGroups, group => group.title),
  ['장착 장비', '장비 인벤토리', '주얼', '부적', '생장판', '별쐐기']);
assert.ok(context.renderChatItemPickerGroup(pickerGroups[2]).includes("attachChatItem('jewelSlot',0)"), 'equipped jewels should be selectable in the chat picker');
assert.ok(context.renderChatItemPickerGroup(pickerGroups[5]).includes('태양 #30'), 'star wedges should render as item links with their unique name');

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
assert.ok(socialSource.includes('var(--social-chat-message-size,12px)'), 'chat message text should follow the shared size setting instead of a fixed pixel value');
assert.ok(socialSource.includes('SOCIAL_BG_NOTI_POLL_MS = 15000'), 'background chat notifications should arrive promptly');
assert.ok(socialSource.includes("showGameToast(`새 채팅"), 'incoming chat should create an in-game notification');
const socialSql = fs.readFileSync('db/social.sql', 'utf8');
assert.ok(socialSql.includes("created_at < now() - interval '3 days'"), 'database cleanup must delete chat messages after three days');

console.log('smoke-social-format passed');
