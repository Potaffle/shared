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
  /**
   * What one unit of the line makes, kind -> quantity, snapshotted by the server at order time:
   * { fries: 1 } for fries, { waffle: 1 } for a Student Offer, { fries: 1, waffle: 1 } for a combo.
   * Absent only on mock data; countKinds() then falls back to the line's kind.
   */
  components?: Record<string, number>;
}

export interface Order {
  /** Database id (uuid). The key for every lookup and update; num is only for display. */
  id: string;
  /** Number shown to customers and staff. Restarts at 1 every business day, so it is NOT unique over time. */
  num: number;
  /** Permanent running number, never reset (receipts, history). */
  seq: number;
  /** Business day the order belongs to, YYYY-MM-DD, stamped by the database at creation. */
  dayKey: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp of payment (approval at the counter, or creation for counter orders); null while pending or cancelled. */
  paidAt: string | null;
  lines: OrderLine[];
  phone: string | null;
  pay: Payment;
  status: OrderStatus;
  /** Where the order came from: created by staff at the counter, or by a customer through the QR app. */
  source: 'counter' | 'qr';
}

export const lineTotal = (l: OrderLine) => l.qty * l.unit;
export const orderTotal = (o: { lines: OrderLine[] }) => o.lines.reduce((s, l) => s + lineTotal(l), 0);
/** Units of the given kinds that one unit of the line makes (from its components snapshot, else its kind). */
export const lineMakes = (l: Pick<OrderLine, 'kind' | 'components'>, kinds: ItemKind[]) =>
  l.components ? kinds.reduce((s, k) => s + (l.components?.[k] ?? 0), 0) : kinds.includes(l.kind) ? 1 : 0;
export const countKinds = (o: Pick<Order, 'lines'>, kinds: ItemKind[]) =>
  o.lines.reduce((s, l) => s + l.qty * lineMakes(l, kinds), 0);
export const countFries = (o: Order) => countKinds(o, FRIES_KINDS);
export const countWaffles = (o: Order) => countKinds(o, WAFFLE_KINDS);

/** Orders that count as sold: paid and not cancelled. */
export const isSold = (o: Order) => o.status === 'approved' || o.status === 'completed';
/** Sold orders whose payment came in at or after `since` (ISO): the cash taken during the current business day. */
export const isSoldSince = (o: Order, since: string) => isSold(o) && o.paidAt !== null && o.paidAt >= since;

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

/** Mock stores only: the database assigns num, seq and dayKey. */
export const nextOrderNum = (orders: Order[]) => (orders.length ? Math.max(...orders.map((o) => o.num)) + 1 : 1);

/**
 * Business day rule, mirrored from public.business_day in the database: a day runs from `start` to the same
 * time next day in `tz`. Defaults match the settings rows `business_day_start` and `timezone`; read those
 * from the `settings` table when available so a changed setting applies everywhere.
 */
export const BUSINESS_DAY_START = '05:00';
export const BUSINESS_TIMEZONE = 'Asia/Amman';

/** Business day (YYYY-MM-DD) an instant belongs to. */
export function businessDay(at: string | Date, start = BUSINESS_DAY_START, tz = BUSINESS_TIMEZONE): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const [sh, sm] = start.split(':').map(Number);
  const localMinutes = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - (sh * 60 + sm) * 60_000;
  return new Date(localMinutes).toISOString().slice(0, 10);
}
/**
 * Instant at which a business day starts: `dayKey` at `start` o'clock in `tz`. Found by taking the UTC guess
 * and correcting it by the zone's offset at that moment (DST-safe for any zone Intl knows).
 */
export function businessDayStart(dayKey: string, start = BUSINESS_DAY_START, tz = BUSINESS_TIMEZONE): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [hh, mm] = start.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess - (localAsUtc - guess));
}
/** Today's business day. */
export const todayBusinessDay = (start?: string, tz?: string) => businessDay(new Date(), start, tz);
/** Orders belonging to the current business day. */
export const isToday = (o: Pick<Order, 'dayKey'>, start?: string, tz?: string) => o.dayKey === todayBusinessDay(start, tz);

export const PHONE_PREFIX = '+962';
const digitsOnly = (v: string) => v.replace(/\D/g, '');

/** Local part of a Jordanian mobile: 7 followed by 7, 8 or 9, then 7 digits (accepts a leading 0 or the +962 prefix). */
export const normaliseLocalPhone = (v: string): string => {
  let d = digitsOnly(v);
  if (d.startsWith('962')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
};
export const isValidJordanMobile = (local: string) => /^7[789]\d{7}$/.test(local);

/** Stored form: E.164 without spaces, e.g. +962791234567. Empty input gives null. */
export const toPhone = (local: string): string | null => {
  const d = normaliseLocalPhone(local);
  return d ? `${PHONE_PREFIX}${d}` : null;
};
/** Local digits for editing (no prefix). Accepts stored values with or without spaces. */
export const fromPhone = (phone: string | null) => (phone ? normaliseLocalPhone(phone) : '');
/** Display form: +962 79 123 4567. */
export const fmtPhone = (phone: string) => {
  const d = normaliseLocalPhone(phone);
  return d.length === 9 ? `${PHONE_PREFIX} ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : phone;
};
