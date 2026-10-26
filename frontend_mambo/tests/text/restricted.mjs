export const RESTRICTED = [
  'at the cost of', "be awarded to player's accounts", 'be awarded to players accounts', "bet", 'bets', 'betting', 'bonus buy', 'bought', 'buy', 'buy bonus', 'cash',
  'cost of', 'credit', 'currency', 'deposit', 'fund', 'win feature', 'gamble', 'money', 'paid', 'paid out', 'pay', 'pay out', 'payer', 'pays', 'pays out',
  'place your bets', 'purchase', 'rebet', 'stake', 'total bet', 'wager', 'withdraw', 'pay table', 'paytable',
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
export const RESTRICTED_RES = RESTRICTED.map((w) => ({ w, re: new RegExp(`(^|[^A-Za-z0-9])${esc(w)}(?![A-Za-z0-9])`, 'i') }));
export function findRestricted(text) {
  const plain = String(text).replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ');
  return RESTRICTED_RES.filter(({ re }) => re.test(plain)).map((x) => x.w);
}
