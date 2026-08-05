const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const storage = new Map([['arpg_social_nickname', 'Na']]);
const input = { value: '안녕하세요', focus() {} };
const pending = { innerHTML: '', style: {} };
const counter = { textContent: '', style: {} };
const toasts = [];
let chatPosts = 0;

const context = {
  console,
  window: null,
  globalThis: null,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document: {
    readyState: 'complete',
    getElementById(id) {
      if (id === 'social-chat-input') return input;
      if (id === 'social-pending-items') return pending;
      if (id === 'social-chat-counter') return counter;
      return null;
    },
    createElement() { return { textContent: '', style: {} }; },
    head: { appendChild() {} },
    body: { appendChild() {} }
  },
  showGameToast(message, tone) { toasts.push({ message, tone }); },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout() { return 1; },
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  JSON,
  encodeURIComponent
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'js/social.js' });

async function run() {
  context.cloudState = { user: { id: 'user-1' } };
  context.cloudJsonRequest = async () => [];

  assert.strictEqual(context.getMyNickname(), '', 'legacy global nickname must not leak into a signed-in account');
  assert.strictEqual(storage.has('arpg_social_nickname'), false, 'legacy global nickname should be removed');

  vm.runInContext("setMyNicknameLocal('Alpha')", context);
  assert.strictEqual(storage.get('arpg_social_nickname:user-1'), 'Alpha');

  context.cloudState.user = { id: 'user-2' };
  assert.strictEqual(context.getMyNickname(), '', 'switching accounts must not reuse the previous account nickname');
  context.cloudJsonRequest = async path => path.includes('player_profiles') ? [{ nickname: 'Beta' }] : [];
  await context.restoreNicknameFromServer();
  assert.strictEqual(context.getMyNickname(), 'Beta', 'the current account nickname should come from its server profile');
  assert.strictEqual(storage.get('arpg_social_nickname:user-2'), 'Beta');

  context.cloudState.user = { id: 'user-3' };
  vm.runInContext("setMyNicknameLocal('Na')", context);
  context.cloudJsonRequest = async (path, options = {}) => {
    if (path.includes('player_profiles') && (!options.method || options.method === 'GET')) return [];
    if (path === '/rest/v1/player_profiles') throw new Error('duplicate key value violates unique constraint player_profiles_nickname_unique');
    if (path === '/rest/v1/chat_messages') chatPosts++;
    return [];
  };

  await context.sendChatMessage();
  assert.strictEqual(chatPosts, 0, 'chat must not be inserted when the public profile cannot be created');
  assert.strictEqual(context.getMyNickname(), '', 'a conflicting cached nickname should be cleared');
  assert.strictEqual(input.value, '안녕하세요', 'failed chat text should remain available for retry');
  assert.ok(toasts.some(entry => entry.message.includes('이미 사용 중인 닉네임')), 'nickname conflicts should be visible to the player');

  const sql = fs.readFileSync('db/social.sql', 'utf8');
  assert.ok(sql.includes('select lower(profile.nickname)'), 'chat insert policy should require a public profile');
  assert.ok(sql.includes('and lower(nickname) = ('), 'chat nickname must match the owned profile');
  console.log('smoke-social-identity passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
