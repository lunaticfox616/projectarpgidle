import { craftingPayment } from './domain/crafting-payment.mjs';

const getCraftPayment = action => craftingPayment(game, action);
safeExposeGlobals({ getCraftPayment });
