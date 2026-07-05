const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: null,
  globalThis: null,
  localStorage: { getItem() { return null; }, setItem() {} },
  document: { getElementById() { return null; }, createElement() { return { textContent: '', style: {} }; }, head: { appendChild() {} }, body: { appendChild() {} } },
  setInterval() { return 1; },
  clearInterval() {},
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

assert.strictEqual(context.formatChatTime('not-a-date'), '', 'invalid chat timestamps should render as empty text');
const profileBody = { innerHTML: '', style: {} };
context.document.getElementById = (id) => (id === 'social-profile-body' ? profileBody : null);
context.renderProfileData({ updatedAt: 'not-a-date', stats: [], nickname: '테스터' });
assert.ok(!profileBody.innerHTML.includes('NaN'), 'invalid profile timestamps should not render NaN text');
assert.match(context.formatChatTime('2026-07-05T03:04:00Z'), /^\d{2}\/\d{2} \d{2}:\d{2}$/);

console.log('smoke-social-format passed');
