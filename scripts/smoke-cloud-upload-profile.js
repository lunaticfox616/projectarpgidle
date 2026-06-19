#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const saveSource = fs.readFileSync('js/save.js', 'utf8');

assert(indexSource.includes('id="ui-cloud-upload-profile"'), 'settings cloud panel must expose the last upload profile field');
assert(stateSource.includes('lastCloudUploadProfile: null'), 'new saves must persist a last cloud upload profile slot');
assert(saveSource.includes('lastCloudUploadProfile'), 'save metadata normalization must preserve the upload profile slot');
assert(!uiSource.includes('☁️ 업로드 시간 ${totalMs}ms'), 'manual cloud upload timing must not be written to the combat log');
assert(uiSource.includes('rememberCloudUploadProfile({ at: syncedAt, fetchMs, serializeMs, uploadMs, totalMs, payloadBytes: payloadSize })'), 'normal cloud uploads must remember their latest timing profile');

const helperStart = uiSource.indexOf('function normalizeCloudUploadProfile');
const helperEnd = uiSource.indexOf('\nfunction applyExternalSave', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'cloud upload profile helpers must exist');
const context = {
  game: { saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0 } },
  defaultGame: { saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null } },
  cloudState: {},
  ensureSaveMeta() {
    if (!context.game.saveMeta || typeof context.game.saveMeta !== 'object') context.game.saveMeta = { lastModifiedAt: 0, lastCloudSyncAt: 0, lastCloudUploadProfile: null };
  },
  Date,
  Math,
};
vm.createContext(context);
vm.runInContext(`${uiSource.slice(helperStart, helperEnd)}; this.formatCloudUploadProfile = formatCloudUploadProfile; this.rememberCloudUploadProfile = rememberCloudUploadProfile;`, context);

const profile = context.rememberCloudUploadProfile({ at: 1234, fetchMs: 5.8, serializeMs: 7, uploadMs: 9, totalMs: 21, payloadBytes: 1536 });
assert.strictEqual(profile.at, 1234, 'remembered upload profile must keep the upload timestamp');
assert.deepStrictEqual(context.game.saveMeta.lastCloudUploadProfile, profile, 'remembered upload profile must be stored in save metadata');
assert.strictEqual(context.formatCloudUploadProfile(profile), '21ms (조회 5ms · 직렬화 7ms · 전송 9ms · 1.5KB)', 'settings display must keep the former upload-time format');
assert.strictEqual(context.formatCloudUploadProfile(null), '없음', 'missing upload profile must render as empty state');

console.log('cloud upload profile smoke checks passed');
