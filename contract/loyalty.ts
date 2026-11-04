// Loyalty points and the customer keypad (backend migration 20261105200000_loyalty_points_keypad).
//
// Points come from the menu: menu_items.points plus menu_options.points of the options picked on the item itself
// (fries 100, waffle 200, offers 0). The database snapshots them on every order line (order_lines.points per unit),
// for create-order and for line edits alike, so apps never write points. A customer's points are counted from their
// approved and completed orders: today's are pending, usable from the next business day (05:00 Amman).
//
// Rewards: an item with menu_items.reward_cost is free for that many usable points (fries 1000, waffle 2000). The
// free part is the item's base price; extras are paid. One reward per customer per business day, qty 1 per line.
// create-order takes `reward: true` on a line; a line edit sets order_lines.reward_cost (any positive number, the
// trigger replaces it with the menu's). Refusals are errors whose message starts with reward_today, reward_points,
// reward_no_customer, reward_not_allowed, reward_qty or reward_customer (phone change on an order with a reward).

/** customer_points(phone) and keypad_points() / keypad_phone(phone). */
export interface Points {
  phone: string | null;
  /** Usable now. */
  available: number;
  /** Earned today, usable from the next business day. */
  pending: number;
  /** A reward was already taken today: no other one until tomorrow. */
  rewardToday: boolean;
}

export const NO_POINTS: Points = { phone: null, available: 0, pending: 0, rewardToday: false };

/** Points one unit of a line earns before the database snapshots it (preview only). */
export const previewPoints = (itemPoints: number, pickedOptionPoints: number[] = []) =>
  itemPoints + pickedOptionPoints.reduce((s, p) => s + p, 0);

/** Rewards the customer can take now, cheapest first: cost <= available and none taken today. */
export const takeableRewards = <T extends { reward_cost: number | null }>(items: T[], points: Points): T[] =>
  points.rewardToday
    ? []
    : items.filter((i) => i.reward_cost !== null && i.reward_cost <= points.available).sort((a, b) => a.reward_cost! - b.reward_cost!);

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
}

/** counter_screen.cart, written by the Counter. */
export interface CounterScreenCart {
  num?: number | null;
  lines?: CounterScreenLine[];
  total?: number;
  /** Points this order adds (preview). */
  points?: number;
}
