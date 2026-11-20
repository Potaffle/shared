// Finance calculations (Yazeed, 2026-11-20). Tables: backend migration 20261120100000_finance.
// Pure functions, no I/O: the apps load rows and call these, so every screen computes costs the same way.
//
// Item cost:  batch cost = sum of recipe lines; cost per portion = batch / yield;
//             with waste = per portion x (1 + waste%); recommended price = with waste x multiplier, rounded up.
// Weekly ingredients (frying oil): cost per week / units of their menu item sold per week (or the estimate).
// Break-even: gross profit % = (sales - ingredient cost) / sales; daily target = monthly costs / gross % / days open.

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'piece';

export interface Ingredient {
  id: string;
  name: string;
  mode: 'pack' | 'weekly';
  pack_qty: number | null;
  unit: Unit | null;
  price: number;
  weekly_item_id: string | null;
  weekly_units_estimate: number | null;
  active?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  menu_item_id: string | null;
  menu_option_id: string | null;
  yield: number;
  waste_pct: number;
  multiplier: number;
}

export interface RecipeLine {
  id: string;
  recipe_id: string;
  ingredient_id: string | null;
  sub_recipe_id: string | null;
  amount: number;
  unit: Unit | null;
  sort?: number;
}

export interface MonthlyCost {
  id: string;
  name: string;
  kind: 'fixed' | 'purchases';
  amount: number;
  category: string | null;
  active: boolean;
}

/** expense_months rows: total per month (YYYY-MM-01) and category. */
export interface ExpenseMonth {
  month: string;
  category: string;
  amount: number;
}

const BASE: Record<Unit, { base: 'g' | 'ml' | 'piece'; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  piece: { base: 'piece', factor: 1 },
};

/** Units a line may use for an ingredient bought in `unit` (same family: g/kg, ml/l, piece). */
export const unitsLike = (unit: Unit): Unit[] => (Object.keys(BASE) as Unit[]).filter((u) => BASE[u].base === BASE[unit].base);

/** Quantity in the family's base unit (g, ml or piece); null if the units don't belong together. */
export function toBase(qty: number, unit: Unit, like?: Unit): number | null {
  if (like && BASE[unit].base !== BASE[like].base) return null;
  return qty * BASE[unit].factor;
}

export const money = (n: number) => Math.round(n * 1000) / 1000;

/** Round up to the next step (0.050 by default): prices people can pay. */
export function roundUp(n: number, step = 0.05): number {
  if (!(n > 0)) return 0;
  return money(Math.ceil(n / step - 1e-9) * step);
}

/** Units of a menu item sold per week, from item_sales over the last weeks; the estimate while there is no data. */
export type WeeklyUnits = Record<string, number | undefined>;

/** Cost of one base unit (g, ml, piece) of a pack ingredient, or of one portion of a weekly ingredient. */
export function ingredientUnitCost(ing: Ingredient, weekly: WeeklyUnits = {}): number | null {
  if (ing.mode === 'weekly') {
    const units = (ing.weekly_item_id && weekly[ing.weekly_item_id]) || ing.weekly_units_estimate || 0;
    return units > 0 ? ing.price / units : null;
  }
  if (!ing.pack_qty || !ing.unit) return null;
  const base = toBase(ing.pack_qty, ing.unit);
  return base ? ing.price / base : null;
}

export interface RecipeCost {
  recipeId: string;
  batch: number;
  perPortion: number;
  withWaste: number;
  recommended: number;
  /** Lines that could not be priced (missing unit, weekly ingredient without sales or estimate, broken link). */
  missing: string[];
}

export interface CostData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  lines: RecipeLine[];
  weekly?: WeeklyUnits;
  roundTo?: number;
}

/** Costs for every recipe. Sub-recipes count by their cost per portion including their own waste. */
export function costAll(data: CostData): Map<string, RecipeCost> {
  const ing = new Map(data.ingredients.map((i) => [i.id, i]));
  const rec = new Map(data.recipes.map((r) => [r.id, r]));
  const linesOf = new Map<string, RecipeLine[]>();
  for (const l of data.lines) linesOf.set(l.recipe_id, [...(linesOf.get(l.recipe_id) ?? []), l]);
  const out = new Map<string, RecipeCost>();
  const visiting = new Set<string>();

  const cost = (id: string): RecipeCost => {
    const done = out.get(id);
    if (done) return done;
    const r = rec.get(id);
    if (!r || visiting.has(id)) return { recipeId: id, batch: 0, perPortion: 0, withWaste: 0, recommended: 0, missing: [id] };
    visiting.add(id);
    let batch = 0;
    const missing: string[] = [];
    for (const l of linesOf.get(id) ?? []) {
      if (l.ingredient_id) {
        const i = ing.get(l.ingredient_id);
        const unitCost = i ? ingredientUnitCost(i, data.weekly) : null;
        if (!i || unitCost === null) { missing.push(l.id); continue; }
        if (i.mode === 'weekly') { batch += unitCost * l.amount; continue; }
        const qty = l.unit && i.unit ? toBase(l.amount, l.unit, i.unit) : null;
        if (qty === null) { missing.push(l.id); continue; }
        batch += unitCost * qty;
      } else if (l.sub_recipe_id) {
        const sub = cost(l.sub_recipe_id);
        if (sub.missing.length) missing.push(l.id);
        batch += sub.withWaste * l.amount;
      }
    }
    visiting.delete(id);
    const perPortion = batch / (r.yield > 0 ? r.yield : 1);
    const withWaste = perPortion * (1 + r.waste_pct / 100);
    const result = {
      recipeId: id,
      batch: money(batch),
      perPortion,
      withWaste,
      recommended: roundUp(withWaste * r.multiplier, data.roundTo ?? 0.05),
      missing,
    };
    out.set(id, result);
    return result;
  };

  for (const r of data.recipes) cost(r.id);
  return out;
}

/**
 * Cost of the Unknown sauce (Yazeed, 2026-11-20): it is not a recipe of its own but the plain average of the named
 * sauces' cost with waste, over the sauces that have a complete recipe. null while no sauce has one.
 */
export function unknownSauceCost(sauceItemIds: string[], recipes: Recipe[], costs: Map<string, RecipeCost>): { cost: number; sauces: number } | null {
  const vals = recipes
    .filter((r) => r.menu_item_id && sauceItemIds.includes(r.menu_item_id))
    .map((r) => costs.get(r.id))
    .filter((c): c is RecipeCost => !!c && c.missing.length === 0)
    .map((c) => c.withWaste);
  return vals.length ? { cost: vals.reduce((a, b) => a + b, 0) / vals.length, sauces: vals.length } : null;
}

/** Share of the price that goes to ingredients, in percent; null without a price. */
export const foodCostPct = (cost: number, price: number | null | undefined) => (price && price > 0 ? (cost / price) * 100 : null);

/**
 * A monthly cost's value. Fixed: its amount. From purchases: the average of the last three complete months of that
 * category, where months before the first purchase use the estimate (`amount`). Returns whether it is still partly
 * an estimate.
 */
export function monthlyValue(mc: MonthlyCost, purchases: ExpenseMonth[], today = new Date()): { value: number; estimate: boolean; months: number } {
  if (mc.kind === 'fixed' || !mc.category) return { value: mc.amount, estimate: false, months: 0 };
  const rows = purchases.filter((p) => p.category === mc.category);
  if (!rows.length) return { value: mc.amount, estimate: true, months: 0 };
  const first = rows.map((p) => p.month).sort()[0];
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  let total = 0;
  let real = 0;
  for (let k = 1; k <= 3; k++) {
    const key = monthKey(new Date(today.getFullYear(), today.getMonth() - k, 1));
    if (key >= first) {
      real++;
      total += rows.filter((p) => p.month === key).reduce((s, p) => s + Number(p.amount), 0);
    } else {
      total += mc.amount;
    }
  }
  return { value: money(total / 3), estimate: real < 3, months: real };
}

export interface BreakEvenInput {
  /** Sales in the period (approved and completed orders). */
  sales: number;
  /** Ingredient cost of what was sold in the period (sum of qty x cost with waste). */
  ingredientCost: number;
  /** Sales whose items have a full recipe, to say how much of the cost is known. */
  coveredSales: number;
  /** Monthly costs per month (fixed plus averaged purchases). */
  monthlyCosts: number;
  /** Business days in the period on which the shop sold something. */
  daysOpen: number;
  /** finance_settings.days_open_month */
  daysOpenMonth: number;
}

export interface BreakEven {
  grossProfit: number;
  grossPct: number | null;
  monthlyCostsInPeriod: number;
  profit: number;
  /** Sales needed per open day to cover the monthly costs; null while there is no gross profit. */
  dailyTarget: number | null;
  dailyAverage: number | null;
  coveragePct: number | null;
}

export function breakEven(i: BreakEvenInput): BreakEven {
  const grossProfit = i.sales - i.ingredientCost;
  const grossPct = i.sales > 0 ? grossProfit / i.sales : null;
  const monthlyCostsInPeriod = i.daysOpenMonth > 0 ? (i.monthlyCosts * i.daysOpen) / i.daysOpenMonth : 0;
  return {
    grossProfit: money(grossProfit),
    grossPct,
    monthlyCostsInPeriod: money(monthlyCostsInPeriod),
    profit: money(grossProfit - monthlyCostsInPeriod),
    dailyTarget: grossPct && grossPct > 0 && i.daysOpenMonth > 0 ? money(i.monthlyCosts / grossPct / i.daysOpenMonth) : null,
    dailyAverage: i.daysOpen > 0 ? money(i.sales / i.daysOpen) : null,
    coveragePct: i.sales > 0 ? (i.coveredSales / i.sales) * 100 : null,
  };
}

/** Money out categories (cash_moves, expenses, monthly_costs). */
export const EXPENSE_CATEGORIES = ['gas', 'ingredients', 'packaging', 'cleaning', 'maintenance', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
/** Categories offered when logging money out (Yazeed, 2026-11-20: gas and other only for now). The database still
 * accepts all of EXPENSE_CATEGORIES, so older entries keep their label. */
export const MONEY_OUT_CATEGORIES: readonly ExpenseCategory[] = ['gas', 'other'];

/** close_day() result (one business day). taken_home = cash counted: nothing stays in the drawer. */
export interface CloseResult {
  id: string;
  day: string;
  orders: number;
  drawer_start: number;
  expected: number;
  actual: number;
  difference: number;
  money_out: number;
  taken_home: number;
}

/** Today's cash day for every staff screen: cash_day_state(), and the cash_state row on Realtime. */
export type CashDayState = 'not_started' | 'open' | 'closed';
export interface CashDayInfo {
  day: string;
  state: CashDayState;
  start: number | null;
  opened_at: string | null;
}
/** A cash_state row applies only to its own day; any other day means today is not started yet. */
export const stateForToday = (row: { day: string; state: 'open' | 'closed' } | null | undefined, today: string): CashDayState =>
  row && row.day === today ? row.state : 'not_started';

/** cash_days view: one row per business day. */
export type CashDayStatus = 'closed' | 'open' | 'not_started' | 'not_closed';

/** A close counts as matched when the difference is under half a fils. */
export const isMatched = (difference: number | null | undefined) => difference != null && Math.abs(difference) < 0.0005;
