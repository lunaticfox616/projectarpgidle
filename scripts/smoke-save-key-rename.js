// 저장 키 이름 바꿈(2026-10-08, data/constants.js): 예전 이름의 키는 꼴(세 글자 앞말 + 'IdleSaveData_v숫자', 'IdleCloudSession_v1')로만
// 알아보고, 처음 불러올 때 읽어 새 키로 잇는다. 옛 패시브 id도 앞말 꼴(세 글자 + '2_')로 알아본다. 검사의 예전 키는 앞말 'old'를 쓴다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`window.__storage = Object.create({
        getItem(key) { return Object.hasOwn(this, key) ? this[key] : null; },
        setItem(key, value) { this[key] = String(value); },
        removeItem(key) { delete this[key]; },
        clear() { Object.keys(this).forEach(key => delete this[key]); }
    });
    localStorage = window.__storage;
    window.store = entries => { localStorage.clear(); Object.entries(entries).forEach(([key, value]) => localStorage.setItem(key, value)); };`);

// 1. 새 키 이름과 예전 키의 꼴.
assert.equal(run('LOCAL_SAVE_KEY'), 'rigninSaveData_v9');
assert.equal(run('CLOUD_SESSION_STORAGE_KEY'), 'rigninCloudSession_v1');
assert.equal(run(`LEGACY_SAVE_KEY_PATTERN.test(LOCAL_SAVE_KEY)`), false, 'the new key is not an old one');

// 2. 예전 키만 있으면 가장 높은 판을 읽는다. 손상 사본과 다른 데이터는 저장으로 읽지 않는다.
run(`store({ oldIdleSaveData_v8: '{"season":8}', oldIdleSaveData_v9: '{"season":9}', oldIdleSaveData_v9_corrupt_1: 'x', 'unrelated-preference': 'keep' });`);
assert.deepEqual(json('getLegacySaveKeys()'), ['oldIdleSaveData_v9', 'oldIdleSaveData_v8']);
assert.deepEqual(json('readLocalSaveResult()'), { status: 'ok', save: '{"season":9}', sourceKey: 'oldIdleSaveData_v9' });

// 3. 새 키가 있으면 새 키가 먼저다.
run(`localStorage.setItem(LOCAL_SAVE_KEY, '{"season":12}');`);
assert.equal(json('readLocalSaveResult()').sourceKey, 'rigninSaveData_v9');

// 4. 새로 시작하면 새 키에 쓰고 예전 키(손상 사본 포함)와 새 키의 손상 사본을 지운다. 다른 데이터는 남는다.
run(`localStorage.setItem(LOCAL_SAVE_KEY + '_corrupt_2', 'y'); resetLocalSave(mergeDefaults({}));`);
assert.deepEqual(json('Object.keys(localStorage).sort()'), ['rigninSaveData_v9', 'unrelated-preference']);

// 5. 예전 이름의 로그인 세션은 한 번 새 키로 옮겨 로그인이 이어지고, 로그아웃은 두 이름 모두 지운다.
run(`store({ oldIdleCloudSession_v1: JSON.stringify({ access_token: 't', user: { id: 'u' } }) });`);
assert.deepEqual(json('loadStoredCloudSession()'), { access_token: 't', user: { id: 'u' } });
assert.deepEqual(json('Object.keys(localStorage)'), ['rigninCloudSession_v1'], 'moved to the new key');
run(`localStorage.setItem('oldIdleCloudSession_v1', '{}'); clearCloudSessionStorage();`);
assert.deepEqual(json('Object.keys(localStorage)'), [], 'signing out clears both names');

// 6. 옛 패시브 id: 앞말 꼴이면 표에서 찾고, 지금 id와 표에 없는 id는 그대로다.
assert.equal(run(`getCurrentPassiveNodeId('old2_1207')`), 'pt_base_path_001');
assert.equal(run(`getCurrentPassiveNodeId('old2_core_hex_01')`), 'pt_core_keystone_01');
assert.equal(run(`getCurrentPassiveNodeId('old2_99999')`), 'old2_99999');
assert.equal(run(`getCurrentPassiveNodeId('pt_base_path_001')`), 'pt_base_path_001');
assert.equal(run(`Object.keys(PASSIVE_TREE.nodes).filter(id => PASSIVE_NODE_ID_LEGACY_PREFIX.test(id)).length`), 0, 'no current node id has the old shape');
console.log('save key rename smoke passed');
