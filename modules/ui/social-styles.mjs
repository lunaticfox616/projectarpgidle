const SOCIAL_STYLES = `@layer components {
        .social-notice{color:var(--copy-bright);font-size:12px;line-height:1.5;}
        .social-notice{background:rgba(20,34,56,0.6);border:1px solid #24344f;border-radius:8px;padding:12px;margin-top:8px;}
        .social-notice-loading{border-color:#386383;background:linear-gradient(110deg,rgba(20,46,67,.72),rgba(17,29,48,.72));box-shadow:inset 3px 0 #64b5e5;}
        .social-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin:10px 0;}
        .social-profile-summary{display:grid;gap:1px;min-width:0;}.social-profile-summary>span{color:var(--copy-muted);font-size:12px;}.social-profile-summary>strong{overflow:hidden;color:#e8d7b6;text-overflow:ellipsis;white-space:nowrap;}.social-profile-summary em{color:#d58478;font-style:normal;}
        .social-toolbar-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;}
        .social-online{background:rgba(13,15,13,.72);border:1px solid #40392e;border-radius:5px;padding:8px 10px;margin-bottom:8px;}
        .social-online-title{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--copy-bright);font-size:12px;font-weight:700;margin-bottom:6px;}
        .social-presence-summary{display:flex;gap:8px;color:var(--copy-muted);font-weight:500;}.social-presence-summary>span{display:inline-flex;align-items:center;gap:4px;}
        .social-presence-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#767169;box-shadow:0 0 0 1px rgba(0,0,0,.7);}.social-presence-dot.active{background:#62b36f;box-shadow:0 0 6px rgba(98,179,111,.38);}.social-presence-dot.recent{background:#c8a64f;}
        .social-online-list{display:flex;flex-wrap:wrap;gap:6px;}
        .social-online-chip{display:inline-flex;align-items:center;gap:6px;min-height:26px;font-size:12px;background:#11130f;border:1px solid #3d382e;border-radius:3px;padding:2px 8px;color:#ddd5c8;cursor:pointer;}.social-online-chip em{padding-left:5px;border-left:1px solid #454036;color:#bfa36d;font-size:12px;font-style:normal;}
        .social-online-chip.active{border-color:#3f6744;}
        .social-online-chip.recent{border-color:#6b5b32;color:#c8bfaa;opacity:.88;}
        .social-online-chip:hover{filter:brightness(1.18);}
        .social-online-chip.me{border-color:#8b6838;box-shadow:inset 0 0 0 1px rgba(213,174,105,.08);}
        .social-online-empty{color:var(--copy-muted);font-size:12px;}
        .social-chat-wrap{position:relative;display:flex;flex-direction:column;gap:8px;}
        .social-chat-online{position:absolute;top:5px;right:10px;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:1px 7px;font-size:12px;line-height:1.4;color:var(--copy-muted);background:rgba(10,12,10,.82);border:1px solid #3d382e;border-radius:9px;pointer-events:none;}
        .social-chat-online>span{display:inline-flex;align-items:center;gap:4px;}
        .social-chat-online[hidden]{display:none;}
        .social-chat-online:not([hidden]) + .social-chat-list{margin-top:28px;} /* 접속 인원 칸 자리는 목록 밖에: 목록의 padding은 PC 창과 휴대폰 규칙에 덮였고, 스크롤과 함께 올라가 맨 위 줄의 시각을 가렸다. */
        .social-chat-list{height:calc(46vh / var(--scale-display-factor, 1));min-height:240px;overflow-y:auto;background:linear-gradient(170deg,#0d1420,#111c2c);border:1px solid #24344f;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}
        .social-chat-empty{display:grid;justify-items:center;gap:5px;color:var(--copy-muted);text-align:center;margin:auto;font-size:12px;}.social-chat-empty>span{display:grid;place-items:center;width:36px;height:36px;border:1px solid #5b4a31;border-radius:50%;color:#d6b572;font-size:18px;}.social-chat-empty strong{color:#cfc5b5;}.social-chat-empty small{font-size:12px;}
        .social-chat-list>.social-chat-msg:first-child{margin-top:auto;} /* 메시지가 적을 때는 아래에 모인다(2026-10-30 사용자 요청). 넘치면 auto 여백이 0이 되어 그대로 스크롤된다. */
        .social-chat-msg{max-width:82%;align-self:flex-start;background:#141713;border:1px solid #343229;border-radius:6px;padding:7px 9px;}
        .social-chat-msg.mine{align-self:flex-end;background:#1b1914;border-color:#5b4930;}
        .social-chat-head{display:flex;align-items:center;gap:6px;min-width:0;}.social-chat-author{display:inline-flex;align-items:center;min-width:0;padding:0;border:0;background:none;color:inherit;cursor:pointer;}.social-chat-self{padding:1px 4px;border:1px solid #675132;border-radius:2px;color:#c9aa70;font-size:12px;}
        .social-chat-nick{overflow:hidden;color:#d6b572;font-weight:700;font-size:12px;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}
        .social-chat-nick:hover{text-decoration:underline;}
        .social-chat-time{margin-left:auto;color:var(--copy-muted);font-size:12px;white-space:nowrap;}.social-chat-delete{flex:none;min-height:0;padding:0 6px;font-size:12px;line-height:16px;color:#f0b4a0;background:#2a1714;border:1px solid #6a3a30;border-radius:3px;cursor:pointer;}
        .social-chat-body{color:var(--copy-bright);margin:4px 0 0;white-space:pre-wrap;word-break:break-word;font-size:var(--font-size-chat,12px);line-height:1.5;}
        .social-chat-inputbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:stretch;}
        .social-chat-input-shell{position:relative;min-width:0;}
        .social-chat-input-shell input{box-sizing:border-box;width:100%;height:100%;min-height:44px;padding:8px 52px 8px 11px;background:#0e1726;border:1px solid #2a3e5c;border-radius:7px;color:#ffffff;}
        .social-chat-inputbar button{box-sizing:border-box;min-width:0;min-height:44px;margin:0;padding:7px 11px;white-space:nowrap;line-height:1;}
        .social-attach-btn{background:#16243a;border:1px solid #2f5180;color:#ffffff;cursor:pointer;}
        .social-attach-btn span{font-size:15px;line-height:0;}
        .social-chat-inputbar .social-send-btn{min-width:58px;background:linear-gradient(180deg,#315b7c,#203d58);border-color:#4d7898;color:var(--copy-bright);}
        .social-chat-counter{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--copy-muted);pointer-events:none;text-align:right;}
        .social-pending-items{display:flex;flex-wrap:wrap;gap:6px;}
        .social-pending-chip{display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#0f1a28;border:1px solid;border-radius:14px;padding:2px 6px 2px 9px;}
        .social-pending-chip button{background:none;border:none;color:inherit;cursor:pointer;padding:0 2px;font-size:12px;}
        .social-item-link{display:inline;font-size:12px;font-weight:700;border:0;padding:0;margin:0 1px;background:none;cursor:pointer;}
        .social-item-link:hover{text-decoration:underline;text-underline-offset:2px;}
        .social-modal-overlay{position:fixed;inset:0;background:rgba(4,8,14,0.78);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;}
        .social-modal-box{position:relative;width:min(760px,calc(96vw / var(--scale-display-factor, 1)));max-height:calc(90vh / var(--scale-display-factor, 1));display:flex;flex-direction:column;overflow:hidden;background:var(--color-surface);border:1px solid var(--color-line-strong);border-radius:var(--radius-lg);color:var(--color-text);}
        .social-modal-content{flex:1 1 auto;overflow-y:auto;padding:20px;min-height:0;overscroll-behavior:contain;}
        /* position 계열에 !important: ui-premium.css 의 고특이도 전역 버튼 규칙(position:relative)이
           덮어쓰면 X버튼이 왼쪽 위 일반 흐름으로 배치되어 한 줄을 차지하는 문제가 재발한다. */
        .social-modal-close{position:absolute !important;top:10px !important;right:12px !important;left:auto !important;z-index:3;box-sizing:border-box;width:36px;height:36px;min-height:0;padding:0;display:flex;align-items:center;justify-content:center;background:var(--color-surface-raised);border:1px solid var(--color-line);color:var(--color-text);border-radius:50%;cursor:pointer;font-size:12px;line-height:1;}
        .social-modal-close:hover{background:var(--color-control);}
        .social-profile-empty{color:var(--copy-muted);text-align:center;padding:24px;}
        .social-profile-header{border-bottom:1px solid var(--color-line);padding-bottom:12px;margin-bottom:14px;padding-right:34px;}
        .social-profile-name{font-size:1.4em;font-weight:800;color:var(--color-accent);}
        .social-profile-sub{color:var(--copy-bright);margin-top:4px;}
        .social-profile-updated{color:var(--copy-muted);font-size:12px;margin-top:4px;}
        .social-profile-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:9px;}
        .social-profile-col{min-width:0;}.social-profile-cols{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:16px;}
        @media(max-width:640px){.social-profile-cols{grid-template-columns:1fr;}}
        .social-profile-col h3{color:var(--copy-bright);font-size:1em;margin:0 0 8px;}
        .social-profile-tabs{display:flex;gap:6px;margin-bottom:8px;}
        .social-profile-tabs button{flex:1;min-width:0;min-height:40px;padding:6px 4px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:7px;color:var(--color-text);cursor:pointer;font-size:12px;}
        .social-profile-tabs button.active{background:var(--color-control);border-color:var(--color-accent);color:var(--color-text);font-weight:700;}
        @media(max-width:420px){
            .social-chat-inputbar{grid-template-columns:44px minmax(0,1fr) 64px;gap:5px;}
            .social-chat-inputbar button{padding:7px 8px;font-size:12px;}
            .social-attach-btn{font-size:0!important;}
            .social-attach-btn span{font-size:16px!important;}
            .social-send-btn{min-width:52px!important;}
        }
        .social-stat-grid{display:grid;grid-template-columns:1fr;gap:4px;}
        .social-stat-item{display:flex;justify-content:space-between;gap:10px;background:var(--color-surface-raised);border:1px solid var(--color-line);border-radius:6px;padding:5px 9px;}
        .social-stat-label{display:inline-flex;align-items:center;color:var(--copy-bright);font-size:12px;}
        .social-stat-label .combat-log-icon,.social-stat-icon{flex:0 0 auto;width:16px;height:16px;margin-right:6px;}
        .social-stat-icon{display:inline-block;background:url('assets/ui/passive-tree-icons-v5.png') no-repeat;background-size:110px 198px;}
        .social-stat-icon.is-none{background:none;}
        .social-stat-value{color:var(--color-text);font-weight:700;font-size:12px;}
        .social-mini-grid{display:flex;flex-direction:column;gap:6px;}
        .social-mini-card{background:var(--color-surface-raised);border:1px solid;border-left-width:3px;border-radius:7px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .social-mini-card:hover{background:var(--color-control);}
        .social-paperdoll{margin:0;}
        .social-paperdoll .social-slot{min-height:62px;display:flex;flex-direction:column;gap:2px;justify-content:center;align-items:center;text-align:center;padding:6px 5px;border-radius:8px;cursor:pointer;background:var(--color-surface-raised);}
        .social-paperdoll .social-slot.empty{cursor:default;border:1px dashed var(--color-line);}
        .social-paperdoll .social-slot-tag{font-size:12px;color:var(--copy-muted);font-weight:700;}
        .social-paperdoll .social-slot-name{font-size:12px;font-weight:700;line-height:1.15;word-break:break-all;}
        .social-equip-grid{display:flex;flex-direction:column;gap:8px;}
        .social-item-card{background:#0f1a28;border:1px solid #2c4063;border-left-width:3px;border-radius:8px;padding:8px 10px;}
        .social-item-title{font-weight:700;font-size:12px;}
        .social-item-base{color:var(--copy-muted);font-size:12px;margin:2px 0 4px;}
        .social-item-unique{color:#d7b8ff;font-size:12px;margin:3px 0;}
        .social-item-stat{color:var(--copy-bright);font-size:12px;line-height:1.4;}
        .social-item-stat.base{color:#f1c40f;}
        .social-roll{color:var(--copy-muted);font-size:12px;}
        .social-tooltip{position:fixed;z-index:10001;max-width:320px;pointer-events:none;display:none;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.6));}
        .social-tooltip .social-item-card{background:#0c1421;border-width:1px;border-left-width:3px;}
        }`;

// styles: explicit account state and dependency ports; no ambient game/global state.
export class SocialStyles {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["injectSocialStyles"].forEach(name => { this[name] = this[name].bind(this); });
    }

    injectSocialStyles() {
        if (this.deps.document.getElementById('social-styles')) return;
        let style = this.deps.document.createElement('style');
        style.id = 'social-styles';
        // 레이어 안에 둔다: 레이어 밖 CSS는 모든 @layer 규칙(스킨 포함)을 이겨 테마가 덮지 못한다.
        style.textContent = SOCIAL_STYLES;
        this.deps.document.head.appendChild(style);
    }
}
