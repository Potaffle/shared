// Loyalty points and the customer keypad (backend migration 20261105200000_loyalty_points_keypad).
//
// Points come from the menu: menu_items.points plus menu_options.points of the options picked on the item itself
// (fries 1, waffle 2, offers 0; divided by 100 on 2026-11-08). The database snapshots them on every order line (order_lines.points per unit),
// for create-order and for line edits alike, so apps never write points. A customer's points are counted from their
// approved and completed orders: today's are pending, usable from the next business day (05:00 Amman).
//
// Rewards: an item with menu_items.reward_cost is free for that many usable points per unit (fries 10, waffle 20).
// The free part is the item's base price; extras are paid. Any number of rewards, any qty per line, any day, as long
// as the usable points cover them (since 2026-11-08: 40 points buy 4 fries, or 2 fries and a waffle).
// create-order takes `reward: true` on a line; a line edit sets order_lines.reward_cost (any positive number, the
// trigger replaces it with the menu's). Refusals are errors whose message starts with reward_points,
// reward_no_customer, reward_not_allowed or reward_customer (phone change on an order with a reward).

/**
 * keypad_celebrate(): call once after the number is confirmed on the keypad. Returns the reward item slugs ('waffle',
 * 'fries') whose cost the customer's USABLE points reached for the first time, most expensive first, and marks them;
 * play the party for the first one. Taking a reward unmarks it, so it celebrates again once earned again.
 */
/** customer_points(phone) and keypad_points() / keypad_phone(phone). */
export interface Points {
  phone: string | null;
  /** Usable now. */
  available: number;
  /** Earned today, usable from the next business day. */
  pending: number;
  /** A reward was already taken today. Informational only since 2026-11-08: rewards have no daily limit. */
  rewardToday: boolean;
}

export const NO_POINTS: Points = { phone: null, available: 0, pending: 0, rewardToday: false };

/** Points one unit of a line earns before the database snapshots it (preview only). */
export const previewPoints = (itemPoints: number, pickedOptionPoints: number[] = []) =>
  itemPoints + pickedOptionPoints.reduce((s, p) => s + p, 0);

/**
 * Rewards the customer can still take, cheapest first: cost <= the points left. Pass the points already used by
 * the cart's reward lines as `spent` (CounterScreenCart.spend) so the list shrinks as rewards are added.
 */
export const takeableRewards = <T extends { reward_cost: number | null }>(items: T[], points: Points, spent = 0): T[] =>
  items.filter((i) => i.reward_cost !== null && i.reward_cost <= points.available - spent).sort((a, b) => a.reward_cost! - b.reward_cost!);

// ---- Counter screen: the row the Counter writes and the keypad watches (table counter_screen, id 'main') ----

/**
 * idle: no order open, the keypad shows its welcome screen.
 * open: an order is being made or edited; the keypad takes a number.
 * done: order_id was just saved; the keypad shows the points animation, then the Counter sets idle.
 */
export type CounterScreenState = 'idle' | 'open' | 'done';

/** One line of the preview. Names in both languages; the keypad shows Arabic first. */
export interface CounterScreenLine {
  name: string;
  nameAr: string | null;
  qty: number;
  mods: string[];
  modsAr: string[] | null;
  /** Unit price as the Counter shows it (preview only; the order's real price is the server's). */
  unit: number;
  /** Points per unit (preview). 0 on a reward line. */
  points: number;
  /** Free for points. */
  reward?: boolean;
  /** Free by the cashier (unit 0, points 0). */
  gift?: boolean;
}

/** counter_screen.cart, written by the Counter. */
export interface CounterScreenCart {
  /** The order's number: the real one when editing, next_order_num() for a new order (a preview). */
  num?: number | null;
  lines?: CounterScreenLine[];
  total?: number;
  /** Points this order adds (preview). */
  points?: number;
  /** Points the order's free-for-points lines will use (sum of their reward costs); the keypad shows them leaving the bar. */
  spend?: number;
}
