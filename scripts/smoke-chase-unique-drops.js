#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const itemDataSource = fs.readFileSync('data/items.js', 'utf8');

['영원', '칠흑의 연사기', '영겁의 마도서'].forEach(name => {
  assert(itemDataSource.includes(`name: "${name}"`) && itemDataSource.includes('ultraRare: true'), `${name} must remain an ultra-rare chase unique`);
});

assert(!passivesSource.includes('hasUnknownLegacyChaseDrop'), 'legacy boolean-only chase state must not disable every chase unique drop');
assert(passivesSource.includes('let chaseOptions = UNIQUE_DB.filter(unique => unique.ultraRare'), 'chase unique pool must be built from ultra-rare uniques');
assert(!passivesSource.includes('seasonChaseDrops.has(unique.name)'), 'chase uniques must not be limited to one drop per item');
assert(!uiSource.includes('legacySeasonChaseUniqueDropped || merged.seasonChaseUniqueDrops.length > 0'), 'save normalization must not preserve an unknown legacy chase flag as a global blocker');
assert(uiSource.includes('merged.seasonChaseUniqueDropped = merged.seasonChaseUniqueDrops.length > 0;'), 'legacy chase boolean should be derived only from known dropped names');

console.log('chase unique drop smoke checks passed');
