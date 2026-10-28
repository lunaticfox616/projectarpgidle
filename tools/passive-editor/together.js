// 함께 편집의 편집기 쪽(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에 작업, 원격). 서버의 방(scripts/lib/passive-together-room.js)과
// 기다리는 요청(poll)으로 이어져, 내 변경은 조각(together-core.js)으로 보내고 다른 사람의 조각은 내 트리에 바로 넣는다.
// - 보냈지만 아직 돌아오지 않은 내 조각이 고친 곳은 다른 사람의 조각이 덮지 않는다. 서버가 내 조각을 그 뒤에 적용하므로 결과가 같다.
// - 받아 넣은 조각을 차례로 남긴다(mark, rebase): 실행 취소가 옛 스냅숏에 그 뒤로 받은 조각을 다시 넣어, 남의 변경은 남기고 내 변경만 되돌린다.
// - 연결이 끊겼다 이어지면 서버의 트리를 그대로 받는다(끊긴 동안 다른 사람이 고친 곳을 내 옛 트리가 덮지 않게).
import { advanceSnapshot, applyOps, diffTree, keysOf, snapshotOf } from './together-core.js';

const SEND_MS = 80;
const PRESENCE_MS = 100;
const SAFETY_MS = 2000;
const LOG_LIMIT = 6000;

const entityOf = key => key.split(':').slice(0, 2).join(':');

class TogetherSession {
    constructor(options) {
        this.options = options;
        this.me = null;
        this.base = null;
        this.pending = new Map();
        this.pendingKeys = new Map();
        this.pendingEntities = new Map();
        this.log = [];
        this.logStart = 0;
        this.counter = 0;
        this.lastSend = 0;
        this.sendTimer = null;
        this.presence = null;
        this.presenceTimer = null;
        this.peers = new Map();
        this.outbox = [];
        this.draining = false;
        this.after = 0;
        this.lost = false;
        this.safety = setInterval(() => this.flush(), SAFETY_MS);
    }

    count(map, key, step) {
        const next = (map.get(key) || 0) + step;
        if (next > 0) map.set(key, next);
        else map.delete(key);
    }

    hold(opId, keys) {
        this.pending.set(opId, keys);
        keys.forEach(key => { this.count(this.pendingKeys, key, 1); this.count(this.pendingEntities, entityOf(key), 1); });
    }

    release(opId) {
        (this.pending.get(opId) || []).forEach(key => { this.count(this.pendingKeys, key, -1); this.count(this.pendingEntities, entityOf(key), -1); });
        this.pending.delete(opId);
    }

    /** A remote op without the parts my unanswered ops change (null when nothing is left). */
    unblocked(op) {
        const keys = keysOf(op);
        if (op.kind === 'nodeRemove') return this.pendingEntities.has(keys[0]) ? null : op;
        if (op.kind !== 'node') return this.pendingKeys.has(keys[0]) ? null : op;
        if (this.pendingKeys.has(`n:${op.id}`)) return null;
        const free = field => !this.pendingKeys.has(`n:${op.id}:${field}`);
        const set = Object.fromEntries(Object.entries(op.set).filter(([field]) => free(field))), unset = op.unset.filter(free);
        return Object.keys(set).length || unset.length ? { ...op, set, unset } : null;
    }

    hello(data) {
        const again = !!this.me;
        this.me = data.you;
        this.after = 0;
        this.base = snapshotOf(data.tree);
        [...this.pending.keys()].forEach(opId => this.release(opId));
        this.outbox = [];
        this.log = [];
        this.logStart = 0;
        this.peers = new Map(data.peers.filter(peer => peer.id !== this.me.id).map(peer => [peer.id, { ...peer, cursor: null, selection: [] }]));
        this.options.onHello(data.tree, again);
        this.options.onPeers(this.peerList(), this.me);
    }

    receive(data) {
        if (data.clientId === this.me.id) return this.release(data.opId);
        const ops = data.ops.map(op => this.unblocked(op)).filter(Boolean);
        if (!ops.length) return undefined;
        advanceSnapshot(this.base, ops);
        const result = applyOps(this.options.getTree(), ops);
        this.log.push(...ops);
        if (this.log.length > LOG_LIMIT) {
            const drop = this.log.length - LOG_LIMIT;
            this.log.splice(0, drop);
            this.logStart += drop;
        }
        return this.options.onRemote(result, this.peers.get(data.clientId));
    }

    /** Call after every local change: sends what differs from the shared tree, at most every SEND_MS (drags stream). */
    changed() {
        if (!this.me || this.sendTimer) return;
        const wait = Math.max(0, SEND_MS - (Date.now() - this.lastSend));
        this.sendTimer = setTimeout(() => { this.sendTimer = null; this.flush(); }, wait);
    }

    /** Takes what differs from the shared tree into the outbox and sends the outbox in order. */
    async flush() {
        const tree = this.options.getTree();
        if (!this.me || !tree) return;
        const ops = diffTree(tree, this.base);
        if (ops.length) {
            const opId = `${this.me.id}-${++this.counter}`;
            this.lastSend = Date.now();
            this.hold(opId, ops.flatMap(keysOf));
            advanceSnapshot(this.base, ops);
            this.outbox.push({ opId, ops });
        }
        await this.drain();
    }

    /** One request at a time, oldest first; a failed one stays and is tried again (a repeat lands the same values). */
    async drain() {
        if (this.draining || !this.outbox.length) return;
        this.draining = true;
        try {
            while (this.outbox.length) {
                const { opId, ops } = this.outbox[0];
                const response = await fetch('/api/together/ops', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: this.me.id, opId, ops }) });
                if (!response.ok) throw new Error((await response.json()).error || '변경을 보내지 못했습니다.');
                this.outbox.shift();
            }
        } catch (error) {
            this.options.onLost(`함께 편집에 변경을 보내지 못했습니다. 다시 보내는 중… (${error.message})`);
            setTimeout(() => this.drain(), 1500);
        } finally {
            this.draining = false;
        }
    }

    /** Where my pointer is (world point or null) and which nodes I picked; sent at most every PRESENCE_MS. */
    setPresence(next) {
        this.presence = { ...(this.presence || { cursor: null, selection: [] }), ...next };
        if (!this.me || this.presenceTimer) return;
        this.presenceTimer = setTimeout(() => {
            this.presenceTimer = null;
            fetch('/api/together/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: this.me.id, ...this.presence }) }).catch(() => {});
        }, PRESENCE_MS);
    }

    dispatch(event, data) {
        if (event === 'ops') this.receive(data);
        else if (event === 'peers') this.peersChanged(data);
        else if (event === 'presence') this.presenceOf(data);
        else if (event === 'saved') this.options.onSaved(data.message);
    }

    peerList() {
        return [...this.peers.values()];
    }

    peersChanged(data) {
        const next = new Map();
        data.peers.filter(peer => peer.id !== this.me.id).forEach(peer => next.set(peer.id, { cursor: null, selection: [], ...this.peers.get(peer.id), ...peer }));
        this.peers = next;
        this.options.onPeers(this.peerList(), this.me);
    }

    presenceOf(data) {
        const peer = this.peers.get(data.clientId);
        if (!peer) return;
        peer.cursor = data.cursor;
        peer.selection = data.selection;
        this.options.onPresence(this.peerList());
    }

    /** How far the received log reaches now; an undo snapshot keeps it to catch up later. */
    mark() {
        return this.logStart + this.log.length;
    }

    /** Puts the ops received since mark into an older copy of the tree. false when the log no longer reaches that far. */
    rebase(tree, mark) {
        if (mark < this.logStart) return false;
        applyOps(tree, this.log.slice(mark - this.logStart));
        return true;
    }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function postJson(url, payload) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || '요청 실패'), { status: response.status });
    return result;
}

/** Joins the room (again after the server forgot this editor) and keeps asking for news; one poll waits up to 25 seconds. */
async function pollLoop(session) {
    for (;;) {
        try {
            const response = await fetch(`/api/together/poll?clientId=${encodeURIComponent(session.me.id)}&after=${session.after}`);
            if (response.status === 410) {
                await enter(session);
                continue;
            }
            if (!response.ok) throw new Error(`응답 ${response.status}`);
            const { events } = await response.json();
            if (session.lost) { session.lost = false; session.options.onBack(); }
            events.forEach(entry => { session.after = entry.n; session.dispatch(entry.event, entry.data); });
        } catch {
            if (!session.lost) session.options.onLost('함께 편집 연결이 끊겼습니다. 다시 잇는 중…');
            session.lost = true;
            await wait(1500);
        }
    }
}

// 같은 탭에서 새로 고쳐도 같은 참가자로 돌아오도록 탭마다 id를 남기고, 창을 닫거나 새로 고칠 때 나감을 알린다(sendBeacon은 페이지가
// 사라지는 중에도 간다).
const RESUME_KEY = 'rignin-passive-together-id';

function rememberedId() {
    try { return sessionStorage.getItem(RESUME_KEY) || ''; } catch { return ''; }
}

function remember(session) {
    try { sessionStorage.setItem(RESUME_KEY, session.me.id); } catch { /* 기억하지 못하면 새로 고칠 때 새 참가자로 들어오고, 옛 자리는 나감 알림으로 지워진다 */ }
}

async function enter(session) {
    session.hello(await postJson('/api/together/join', { name: session.options.name, resumeId: session.me?.id || rememberedId() }));
    remember(session);
}

/**
 * Joins the room and resolves with the session once the shared tree has arrived (onHello runs first).
 * @param {{ name: string, getTree: () => object, onHello: Function, onRemote: Function, onPeers: Function, onPresence: Function,
 *   onSaved: Function, onLost: Function, onBack: Function }} options
 */
export async function joinTogether(options) {
    const session = new TogetherSession(options);
    await enter(session);
    window.addEventListener('pagehide', () => {
        navigator.sendBeacon('/api/together/leave', new Blob([JSON.stringify({ clientId: session.me.id })], { type: 'application/json' }));
    });
    pollLoop(session);
    return session;
}
