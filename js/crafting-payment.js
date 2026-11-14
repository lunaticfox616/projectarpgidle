// GENERATED from modules/crafting-payment*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/crafting-payment.mjs
  function craftingPayment(owner, action) {
    const have = owner.currencies[action] || 0;
    return { key: action, cost: 1, have, affordable: have >= 1 };
  }

  // modules/crafting-payment-classic.mjs
  var getCraftPayment = (action) => craftingPayment(game, action);
  safeExposeGlobals({ getCraftPayment });
})();
