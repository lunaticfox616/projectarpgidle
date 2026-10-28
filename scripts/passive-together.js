#!/usr/bin/env node
'use strict';
/**
 * 함께 편집 시작(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에 작업, 원격). 패시브 트리 편집기를 함께 편집으로 켜고,
 * cloudflared가 있으면 임시 인터넷 주소(https://….trycloudflare.com, 계정이 필요 없고 이 창을 닫으면 사라진다)를 열어 손님에게 보낼 주소를 찍는다.
 *   npm run passive:together            인터넷 주소(cloudflared 필요: winget install --id Cloudflare.cloudflared)
 *   npm run passive:together -- --lan   같은 네트워크나 Tailscale: 이 PC의 주소로 열고 터널은 쓰지 않는다
 *   ... -- --from <트리.json>            저장된 원본 대신 그 트리로 방을 연다(다시 켤 때 공동 작업 백업이나 내보낸 파일을 이어받기)
 * 호스트는 이 PC에서 http://127.0.0.1:4175/ 를 연다. 손님 주소의 열쇠는 켤 때마다 새로 만든다(지난 주소는 다시 못 쓴다).
 */
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PASSIVE_EDITOR_PORT) || 4175;
const KEY = crypto.randomBytes(12).toString('hex');
const LAN = process.argv.includes('--lan');
const FROM_AT = process.argv.indexOf('--from');
const FROM = FROM_AT >= 0 ? path.resolve(process.argv[FROM_AT + 1] || '') : '';

function findCloudflared() {
    const candidates = [
        path.join(process.env['ProgramFiles(x86)'] || '', 'cloudflared', 'cloudflared.exe'),
        path.join(process.env.ProgramFiles || '', 'cloudflared', 'cloudflared.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe')
    ];
    const found = candidates.find(file => file && fs.existsSync(file));
    if (found) return found;
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cloudflared'], { encoding: 'utf8' });
    return which.status === 0 ? which.stdout.split(/\r?\n/)[0].trim() : null;
}

function lanAddresses() {
    return Object.values(os.networkInterfaces()).flat().filter(row => row && row.family === 'IPv4' && !row.internal).map(row => row.address);
}

function openTunnel(children) {
    const cloudflared = findCloudflared();
    if (!cloudflared) {
        console.log('cloudflared가 없어 인터넷 주소를 열지 못했습니다. 설치: winget install --id Cloudflare.cloudflared');
        console.log('같은 네트워크나 Tailscale이면 이렇게 켭니다: npm run passive:together -- --lan');
        return;
    }
    const tunnel = spawn(cloudflared, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(tunnel);
    let shown = false;
    const watch = chunk => {
        const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (!match || shown) return;
        shown = true;
        console.log(`손님에게 보낼 주소: ${match[0]}/?key=${KEY}`);
        console.log('이 창을 닫으면 주소가 사라집니다.');
    };
    tunnel.stdout.on('data', watch);
    tunnel.stderr.on('data', watch);
    tunnel.on('exit', code => { if (!shown) console.log(`cloudflared가 주소를 열지 못하고 멈췄습니다(코드 ${code}).`); });
}

const server = spawn(process.execPath, [path.join(__dirname, 'passive-tree-editor-server.js')], {
    stdio: 'inherit', env: { ...process.env, PASSIVE_TOGETHER: '1', PASSIVE_TOGETHER_KEY: KEY, PASSIVE_EDITOR_HOST: LAN ? '0.0.0.0' : '127.0.0.1',
        PASSIVE_TOGETHER_FROM: FROM }
});
const children = [server];
const stop = () => children.forEach(child => child.kill());
process.on('SIGINT', () => { stop(); process.exit(0); });
server.on('exit', code => { stop(); process.exit(code || 0); });

console.log(`호스트(이 PC): http://127.0.0.1:${PORT}/`);
if (LAN) lanAddresses().forEach(address => console.log(`손님 주소(같은 네트워크나 Tailscale): http://${address}:${PORT}/?key=${KEY}`));
else openTunnel(children);
