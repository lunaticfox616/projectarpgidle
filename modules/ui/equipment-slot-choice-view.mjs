import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

const DIALOG_IDS = Object.freeze({ ring: 'ring-slot-overlay', glove: 'glove-slot-overlay', weapon: 'weapon-slot-overlay' });

/** Pending item choices belong to their dialog and to the game that opened it. */
export class EquipmentSlotChoiceView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.dialogs = new Map();
        this.pending = new Map();
    }

    open(kind, itemId) {
        if (!this.active) return;
        this.pending.set(kind, { itemId: Number.isFinite(itemId) ? itemId : null, owner: this.deps.game });
        const dialog = this.deps.document.getElementById(DIALOG_IDS[kind]);
        if (!dialog) return;
        this.bindDialog(kind, dialog);
        if (!dialog.open) dialog.showModal();
    }

    bindDialog(kind, dialog) {
        const previous = this.dialogs.get(kind);
        if (previous === dialog) return;
        if (previous) releaseViewTarget(this, previous);
        this.dialogs.set(kind, dialog);
        listenView(this, dialog, 'click', event => this.click(kind, dialog, event));
        listenView(this, dialog, 'cancel', event => { event.preventDefault(); this.close(kind); });
        listenView(this, dialog, 'keydown', event => event.stopPropagation());
        listenView(this, dialog, 'close', () => { if (!dialog.open) this.pending.delete(kind); });
    }

    click(kind, dialog, event) {
        const button = event.target.closest('[data-equipment-slot], [data-equipment-cancel]');
        if (!button || !dialog.contains(button)) return;
        if (button.hasAttribute('data-equipment-cancel')) this.close(kind);
        else this.select(kind, button.getAttribute('data-equipment-slot'));
    }

    close(kind) {
        this.pending.delete(kind);
        const dialog = this.deps.document.getElementById(DIALOG_IDS[kind]);
        if (dialog) dialog.close();
    }

    select(kind, slot) {
        const choice = this.pending.get(kind);
        this.close(kind);
        if (!this.active || !choice || choice.owner !== this.deps.game) return;
        if (!Number.isInteger(choice.itemId)) return;
        if (kind === 'weapon' && !['무기', '방패'].includes(slot)) return;
        this.deps.equipItemById(choice.itemId, slot);
    }

    dispose() {
        for (const kind of this.dialogs.keys()) this.close(kind);
        this.pending.clear();
        this.dialogs.clear();
        releaseViewEvents(this);
    }
}
