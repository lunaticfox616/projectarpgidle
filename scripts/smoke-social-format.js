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
  document: { getElementById() { return null; }, createElement() { return { textContent: '', style: {} }; }, head: { appendChild() {} }, body: { appendChild() {} } },
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
vm.runInContext("socialState.nickname = '테스터'; syncSocialBackgroundTasks();", context);
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

console.log('smoke-social-format passed');
