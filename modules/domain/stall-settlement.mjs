import { stallRulesPayouts } from './stall-ledger.mjs';
import { stallRulesAdvance } from './stall-visits.mjs';
import { stallRulesRows } from './stall-access.mjs';

/** Settles the visits up to now (advance) and says what changed, for the notices (modules/ui/listings-actions.mjs): { paid (dew worth),
 * sold (the sale events since the last settlement), gains [{ key, amount }] (new proceeds per currency), offers (listings with a
 * new price offer), changed (an offer came, went or was replaced) }. */
export function stallRulesSettle(env, owner, now) {
    const stall = owner.listings, since = stall.lastAt, before = stallRulesPayouts(env, stall), sequence = stall.offerSequence;
    const offerIds = stallRulesRows(stall).map(row => row.offer?.id).filter(Boolean);
    const paid = stallRulesAdvance(env, owner, now);
    const gains = stallRulesPayouts(env, stall).map(row => ({ key: row.key, amount: row.amount - (before.find(old => old.key === row.key)?.amount || 0) }))
        .filter(row => row.amount > 0);
    const withOffer = stallRulesRows(stall).filter(row => row.offer);
    return { paid, sold: paid > 0 ? stall.history.filter(event => event.sold && event.at > since) : [], gains,
        offers: withOffer.filter(row => !offerIds.includes(row.offer.id)),
        changed: sequence !== stall.offerSequence || offerIds.join(',') !== withOffer.map(row => row.offer.id).join(',') };
}
