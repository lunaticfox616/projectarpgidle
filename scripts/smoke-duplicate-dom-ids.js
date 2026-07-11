const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const ids = [];
for (const match of html.matchAll(/\sid="([^"]+)"/g)) ids.push(match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
assert.deepStrictEqual(duplicates, [], `duplicate DOM ids: ${duplicates.join(', ')}`);
console.log('smoke-duplicate-dom-ids passed');
