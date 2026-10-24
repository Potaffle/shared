import { FRIES_KINDS, WAFFLE_KINDS, type ItemKind } from './menu';

export type OrderStatus = 'pending' | 'approved' | 'completed' | 'cancelled';
export const STATUSES: OrderStatus[] = ['approved', 'pending', 'completed', 'cancelled'];

/** 'Apple Pay' only comes from the customer QR app; the counter offers Cash / Card / CliQ. */
export type Payment = 'Cash' | 'Card' | 'CliQ' | 'Apple Pay';
export const COUNTER_PAYMENTS: Payment[] = ['Cash', 'Card', 'CliQ'];

export interface OrderLine {
  kind: ItemKind;
  name: string;
  qty: number;
  /** Human-readable modifiers: sauces, toppings, "Separate container"... */
  mods: string[];
  /** Unit price including modifiers. */
  unit: number;
}

export interface Order {
  num: number;
  /** ISO timestamp. */
  createdAt: string;
  lines: OrderLine[];
  phone: string | null;
  pay: Payment;
  status: OrderStatus;
  /** Where the order came from: created by staff at the counter, or by a customer through the QR app. */
  source: 'counter' | 'qr';
}

export const lineTotal = (l: OrderLine) => l.qty * l.unit;
export const orderTotal = (o: { lines: OrderLine[] }) => o.lines.reduce((s, l) => s + lineTotal(l), 0);
export const countKinds = (o: Order, kinds: ItemKind[]) =>
  o.lines.filter((l) => kinds.includes(l.kind)).reduce((s, l) => s + l.qty, 0);
export const countFries = (o: Order) => countKinds(o, FRIES_KINDS);
export const countWaffles = (o: Order) => countKinds(o, WAFFLE_KINDS);

/** Orders that count as sold: paid and not cancelled. */
export const isSold = (o: Order) => o.status === 'approved' || o.status === 'completed';

export const fmtJD = (n: number) => n.toFixed(3);
const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
};
export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const nextOrderNum = (orders: Order[]) => (orders.length ? Math.max(...orders.map((o) => o.num)) + 1 : 1001);

export const PHONE_PREFIX = '+962';
export const toPhone = (local: string): string | null => {
  const t = local.trim();
  return t ? `${PHONE_PREFIX} ${t}` : null;
};
export const fromPhone = (phone: string | null) => (phone ?? '').replace(PHONE_PREFIX, '').trim();
