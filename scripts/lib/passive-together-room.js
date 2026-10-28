'use strict';

// 함께 편집의 방(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에 작업, 원격). 서버가 함께 고치는 트리 하나를 들고, 편집기들이
// 보낸 조각(tools/passive-editor/together-core.js)을 받은 차례대로 적용해 모두에게 보낸다(보낸 사람에게도 가서 받았음을 알린다).
// 전달은 기다리는 요청(long polling)이다: cloudflared 임시 주소(Quick Tunnel)는 Server-Sent Events를 지원하지 않는다(Cloudflare 문서).
// 편집기는 join으로 처음 트리와 사람들을 받고, poll?after=N을 되풀이해 N 다음 소식(ops, presence, peers, saved)을 받는다. 받았다고
// 알린 소식만 지우므로 응답 하나가 길에서 사라져도 다음 poll이 다시 받는다.
// 나가기(2026-10-28 사용자: 새로 고침할 때마다 참가자가 늘기만 한다): 편집기는 창을 닫거나 새로 고칠 때 leave를 보내고, 같은 탭에서 다시
// 들어오면 전의 id를 내밀어 같은 참가자(같은 색)로 돌아온다. 나간 참가자는 잠시 기억해 그 id로 다시 살린다. 터널은 끊긴 요청을 바로 알리지
// 않으므로, leave가 오지 않으면 40초 동안 poll이 없을 때 나간 것으로 본다.
// 30초마다 바뀐 트리를 임시 폴더에 남겨 서버가 꺼져도 저장하지 않은 공동 작업을 되살릴 수 있다.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const COLORS = ['#f2c14e', '#5bc0eb', '#9bc53d', '#e55934', '#c879ff', '#fa7921', '#4ecdc4', '#ff6b9d'];
const BACKUP_FILE = path.join(os.tmpdir(), 'rignin-passive-together-backup.json');
const HOLD_MS = 25000;
const GONE_MS = 40000;
const REMEMBER_MS = 120000;
const BACKUP_MS = 30000;

const gone = message => Object.assign(new Error(message), { status: 410 });

class TogetherRoom {
    /** @param {object} tree the shared tree (the saved source at start) @param {object} core together-core.js */
    constructor(tree, core) {
        this.tree = tree;
        this.core = core;
        this.seq = 0;
        this.clients = new Map();
        this.recent = new Map();
        this.changedSinceBackup = false;
        this.colorTurn = 0;
        this.timers = [setInterval(() => this.dropSilent(), GONE_MS / 4), setInterval(() => this.backup(), BACKUP_MS)];
        this.timers.forEach(timer => timer.unref());
    }

    peers() {
        return [...this.clients.values()].map(({ id, name, color, host }) => ({ id, name, color, host }));
    }

    /** Queues a message for one editor and answers its waiting poll at once. */
    send(client, event, data) {
        client.events.push({ n: ++client.counter, event, data });
        this.answer(client);
    }

    broadcast(event, data, exceptId = null) {
        this.clients.forEach(client => { if (client.id !== exceptId) this.send(client, event, data); });
    }

    answer(client) {
        if (!client.waiter || !client.events.length) return;
        const { response, timer } = client.waiter;
        client.waiter = null;
        clearTimeout(timer);
        respond(response, { events: client.events });
    }

    /** The participant a reloaded tab asks to be again (here or recently left, same host or guest side), or a new one. */
    participant(name, host, resumeId) {
        const known = this.clients.get(resumeId) || this.recent.get(resumeId);
        this.recent.delete(resumeId);
        const id = known && known.host === host ? known.id : crypto.randomBytes(6).toString('hex');
        const color = known && known.host === host ? known.color : COLORS[this.colorTurn++ % COLORS.length];
        const old = this.clients.get(id);
        if (old?.waiter) { clearTimeout(old.waiter.timer); respond(old.waiter.response, { events: [] }); }
        return { id, name: String(name || '').trim().slice(0, 20) || (host ? '호스트' : '손님'), color, host, events: [], counter: 0, waiter: null, seenAt: Date.now() };
    }

    /** An editor comes in: the shared tree as it is now, who is here, and its own id and colour. */
    join({ name, host, resumeId }) {
        const client = this.participant(name, !!host, String(resumeId || ''));
        this.clients.set(client.id, client);
        this.broadcast('peers', { peers: this.peers() }, client.id);
        return { you: { id: client.id, name: client.name, color: client.color, host: client.host }, seq: this.seq, tree: this.tree, peers: this.peers() };
    }

    /** An editor closed or reloaded: gone for the others at once, remembered a while to come back as the same participant. */
    leave({ clientId }) {
        const client = this.clients.get(clientId);
        if (!client) return;
        if (client.waiter) { clearTimeout(client.waiter.timer); respond(client.waiter.response, { events: [] }); }
        this.forget(client);
        this.broadcast('peers', { peers: this.peers() });
    }

    forget(client) {
        this.clients.delete(client.id);
        this.recent.set(client.id, { id: client.id, color: client.color, host: client.host, leftAt: Date.now() });
    }

    /** One editor's wait for news after message number after: answered now if there is any, else when some comes or after HOLD_MS. */
    poll(request, response, { clientId, after }) {
        const client = this.clients.get(clientId);
        if (!client) throw gone('함께 편집 방에서 나간 것으로 되어 있습니다. 다시 들어갑니다.');
        client.seenAt = Date.now();
        client.events = client.events.filter(entry => entry.n > after);
        if (client.waiter) { clearTimeout(client.waiter.timer); respond(client.waiter.response, { events: [] }); }
        client.waiter = { response, timer: setTimeout(() => { if (client.waiter?.response === response) { client.waiter = null; respond(response, { events: [] }); } }, HOLD_MS) };
        request.on('close', () => { if (client.waiter?.response === response) { clearTimeout(client.waiter.timer); client.waiter = null; } });
        this.answer(client);
    }

    dropSilent() {
        const now = Date.now(), silent = [...this.clients.values()].filter(client => !client.waiter && now - client.seenAt > GONE_MS);
        silent.forEach(client => this.forget(client));
        this.recent.forEach((entry, id) => { if (now - entry.leftAt > REMEMBER_MS) this.recent.delete(id); });
        if (silent.length) this.broadcast('peers', { peers: this.peers() });
    }

    /** Ops from one editor, applied in arrival order and sent to everyone (the sender gets them back as its receipt). */
    submit({ clientId, opId, ops }) {
        if (!this.clients.has(clientId)) throw gone('함께 편집 방에서 나간 것으로 되어 있습니다. 다시 들어갑니다.');
        if (!this.core.validOps(ops)) throw Object.assign(new Error('알 수 없는 변경입니다.'), { status: 400 });
        this.core.applyOps(this.tree, ops);
        this.seq += 1;
        this.changedSinceBackup = true;
        this.broadcast('ops', { seq: this.seq, clientId, opId, ops });
        return { seq: this.seq };
    }

    presence({ clientId, cursor, selection }) {
        if (!this.clients.has(clientId)) return;
        const point = cursor && Number.isFinite(cursor.x) && Number.isFinite(cursor.y) ? { x: cursor.x, y: cursor.y } : null;
        const ids = Array.isArray(selection) ? selection.slice(0, 200).map(String) : [];
        this.broadcast('presence', { clientId, cursor: point, selection: ids }, clientId);
    }

    saved(message) {
        this.broadcast('saved', { message });
    }

    backup() {
        if (!this.changedSinceBackup) return;
        this.changedSinceBackup = false;
        fs.writeFileSync(BACKUP_FILE, `${JSON.stringify(this.tree)}\n`);
    }
}

function respond(response, payload) {
    if (response.writableEnded) return;
    const body = JSON.stringify(payload);
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
    response.end(body);
}

module.exports = { BACKUP_FILE, TogetherRoom };
