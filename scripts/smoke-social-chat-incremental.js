const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const timers = new Map();
let timerId = 0;
const queries = [];
const now = Date.parse('2026-08-11T12:00:00Z');
const context = {
  console,
  window: null,
  globalThis: null,
  cloudState: { user: { id: 'user-1' } },
  cloudJsonRequest: async path => {
    queries.push(path);
    if (path.includes('id=gt.2')) return [{ id: 3, created_at: '2026-08-11T11:59:00Z', body: '셋' }];
    return [
      { id: 2, created_at: '2026-08-11T11:58:00Z', body: '둘' },
      { id: 1, created_at: '2026-08-11T11:57:00Z', body: '하나' }
    ];
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  document: {
    readyState: 'complete',
    getElementById() { return null; },
    createElement() { return { textContent: '', style: {} }; },
    head: { appendChild() {} },
    body: { appendChild() {}, classList: { contains() { return false; } } }
  },
  setInterval(fn, delay) { const id = ++timerId; timers.set(id, delay); return id; },
  clearInterval(id) { timers.delete(id); },
  setTimeout() { return 1; },
  Date, Math, Number, String, Array, Object, Map, RegExp, JSON, encodeURIComponent
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/social.js', 'utf8'), context, { filename: 'js/social.js' });

async function run() {
  const initial = await context.loadChatMessages(null, now);
  assert.deepStrictEqual(Array.from(initial, row => row.id), [1, 2], 'initial load should restore chronological order');
  assert.ok(queries[0].includes('order=created_at.desc') && !queries[0].includes('id=gt.'), 'initial load should fetch only the latest window');

  const incremental = await context.loadChatMessages(2, now);
  assert.deepStrictEqual(Array.from(incremental, row => row.id), [3], 'incremental load should return only unseen messages');
  assert.ok(queries[1].includes('id=gt.2') && queries[1].includes('order=id.asc'), 'incremental load should use the message id cursor');

  const merged = context.mergeSocialChatMessages(initial, [initial[1], incremental[0]], now);
  assert.deepStrictEqual(Array.from(merged, row => row.id), [1, 2, 3], 'local chat cache should deduplicate and preserve chronological order');
  const many = Array.from({ length: 60 }, (_, index) => ({ id: index + 1, created_at: '2026-08-11T11:59:00Z' }));
  assert.deepStrictEqual(Array.from(context.mergeSocialChatMessages([], many, now), row => row.id), Array.from({ length: 50 }, (_, index) => index + 11), 'local chat cache should retain only the newest 50 messages');

  context.startChatPolling();
  assert.deepStrictEqual(Array.from(timers.values()).sort((a, b) => a - b), [4000, 30000], 'chat and presence should poll on separate schedules');
  context.stopChatPolling();
  assert.strictEqual(timers.size, 0, 'stopping chat should clear both polling timers');
  console.log('smoke-social-chat-incremental passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
