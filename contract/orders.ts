import { FRIES_KINDS, WAFFLE_KINDS, type ItemKind } from './menu';
import type { Selection } from './options';

export type OrderStatus = 'pending' | 'approved' | 'completed' | 'cancelled';
export const STATUSES: OrderStatus[] = ['approved', 'pending', 'completed', 'cancelled'];

/** 'Apple Pay' only comes from the customer Order app; the counter offers Cash / Card / CliQ. */
export type Payment = 'Cash' | 'Card' | 'CliQ' | 'Apple Pay';
export const COUNTER_PAYMENTS: Payment[] = ['Cash', 'Card', 'CliQ'];

export interface OrderLine {
  /** order_lines.id when the line was read from the database; absent on a line not saved yet. */
  id?: string;
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
  /**
   * Every chosen option with the price charged for it (see options.ts). Source of truth for what the
   * customer picked; `mods` is the display text built from it. Absent on mock data and on lines made
   * before 2026-10-27 that could not be mapped.
   */
  selections?: Selection[];
  /** Loyalty points earned per unit, snapshot by the database (see loyalty.ts). 0 on reward lines. */
  points?: number;
  /** Points spent on this line taken free; null or absent when it is not a reward. */
  rewardCost?: number | null;
  /**
   * Free by the cashier (order_lines.gift): no points spent, none earned. Clients set only this flag; the database
   * keeps unit at 0 and moves the price to giftUnit. Ungifting restores it. Not combined with rewardCost.
   */
  gift?: boolean;
  /** What one unit would have cost, on gift lines (order_lines.gift_unit); null otherwise. */
  giftUnit?: number | null;
  /** Base price waived per unit by the cashier, options still charged (order_lines.gift_base); null = base paid. */
  giftBase?: number | null;
  /** Units already handed to the customer, 0 to qty (order_lines.given). Clamped to qty by the database. */
  given?: number;
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
  /** ISO timestamp the order was completed; null unless status is completed. */
  completedAt?: string | null;
  /** ISO timestamp the order was cancelled; null unless status is cancelled. */
  cancelledAt?: string | null;
  lines: OrderLine[];
  phone: string | null;
  pay: Payment;
  /** Split payment: the part paid in cash, the rest is on `pay`. Absent or null when the order has one method. */
  cashPart?: number | null;
  status: OrderStatus;
  /** Where the order came from: created by staff at the counter, or by a customer through the Order app (QR code). */
  source: 'counter' | 'qr';
  /** ISO timestamp the "order ready" WhatsApp message went out (orders.ready_sent_at); null = not yet. Set by notify-ready only. */
  readySentAt?: string | null;
}

export const lineTotal = (l: OrderLine) => l.qty * l.unit;
export const orderTotal = (o: { lines: OrderLine[] }) => o.lines.reduce((s, l) => s + lineTotal(l), 0);
/** How an order was paid: its one method, or the cash part and the rest on `pay`. Cash stops at the total, since lines can change after the split. */
export const paymentParts = (o: Pick<Order, 'pay' | 'cashPart' | 'lines'>): { pay: Payment; amount: number }[] => {
  const total = orderTotal(o);
  const cash = Math.min(o.cashPart ?? 0, total);
  if (cash <= 0) return [{ pay: o.pay, amount: total }];
  const rest = Math.round((total - cash) * 1000) / 1000;
  return rest > 0 ? [{ pay: 'Cash', amount: cash }, { pay: o.pay, amount: rest }] : [{ pay: 'Cash', amount: cash }];
};
/** Units of the given kinds that one unit of the line makes (from its components snapshot, else its kind). */
export const lineMakes = (l: Pick<OrderLine, 'kind' | 'components'>, kinds: ItemKind[]) =>
  l.components ? kinds.reduce((s, k) => s + (l.components?.[k] ?? 0), 0) : kinds.includes(l.kind) ? 1 : 0;
export const countKinds = (o: Pick<Order, 'lines'>, kinds: ItemKind[]) =>
  o.lines.reduce((s, l) => s + l.qty * lineMakes(l, kinds), 0);
/** Units of the given kinds still to hand over: each line's qty minus its given count. Gift lines count like any other. */
export const countKindsToMake = (o: Pick<Order, 'lines'>, kinds: ItemKind[]) =>
  o.lines.reduce((s, l) => s + Math.max(0, l.qty - (l.given ?? 0)) * lineMakes(l, kinds), 0);
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
export const DEFAULT_CALLING_CODE = '962';
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
export const toPhone = (local: string, code = DEFAULT_CALLING_CODE): string | null => {
  const c = digitsOnly(code);
  if (c === DEFAULT_CALLING_CODE) {
    const d = normaliseLocalPhone(local);
    return d ? `${PHONE_PREFIX}${d}` : null;
  }
  const d = digitsOnly(local).replace(/^0+/, '');
  return d ? `+${c}${d}` : null;
};
/** Jordan must be a mobile; any other country a plausible E.164 number. */
export const isValidPhone = (local: string, code = DEFAULT_CALLING_CODE) => {
  if (!/^[1-9]\d{0,2}$/.test(digitsOnly(code))) return false;
  const phone = toPhone(local, code) ?? '';
  return phone.startsWith(PHONE_PREFIX) ? /^\+9627[789]\d{7}$/.test(phone) : /^\+[1-9]\d{7,14}$/.test(phone);
};
/** Calling codes are one digit (1, 7), two in the zones below, otherwise three. */
const callingCodeLength = (d: string) =>
  /^[17]/.test(d) ? 1 : /^(2[07]|3[0-469]|4[013-9]|5[1-8]|6[0-6]|8[1246]|9[0-58])/.test(d) ? 2 : 3;
/** A stored number split for editing. No number gives the default code. */
export const splitPhone = (phone: string | null) => {
  const d = digitsOnly(phone ?? '');
  if (!d) return { code: DEFAULT_CALLING_CODE, local: '' };
  const n = callingCodeLength(d);
  return { code: d.slice(0, n), local: d.slice(n) };
};
/** Local digits for editing (no prefix). Accepts stored values with or without spaces. */
export const fromPhone = (phone: string | null) => (phone ? normaliseLocalPhone(phone) : '');
/** Display form: +962 79 123 4567, or +44 7911123456 for other countries. */
export const fmtPhone = (phone: string) => {
  if (phone.trim().startsWith('+') && !digitsOnly(phone).startsWith(DEFAULT_CALLING_CODE)) {
    const { code, local } = splitPhone(phone);
    return `+${code} ${local}`;
  }
  const d = normaliseLocalPhone(phone);
  return d.length === 9 ? `${PHONE_PREFIX} ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : phone;
};
