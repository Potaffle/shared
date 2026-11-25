// Finance calculations (Yazeed, 2026-11-20). Tables: backend migration 20261120100000_finance.
// Pure functions, no I/O: the apps load rows and call these, so every screen computes costs the same way.
//
// Item cost:  batch cost = sum of recipe lines; cost per portion = batch / portions;
//             with waste = per portion x (1 + waste%); recommended price = with waste x multiplier, rounded up.
// Sizes (2026-11-23): 1 ml counts as 1 g. A recipe's size is the sum of its lines in grams. The user types either the
//             portions (yield) or one portion's size (portion_size, portion_unit) and the other follows; the one typed
//             last is stored and stays fixed: with a portion size stored, portions = size / portion size, else yield. A sub-recipe used by weight or volume costs
//             that share of its size (with its waste); used in portions, portions x its cost with waste.
// Supplies (2026-11-23): cones, boxes, cups, oil, gas: not part of any recipe; their cost goes straight onto menu items
//             and options (supplyCostFor), with no waste added.
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
  /** Bought by the piece: how big one piece is (needed for the recipe size and to use it by weight or volume). */
  piece_size?: number | null;
  piece_unit?: Unit | null;
  active?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  /** @deprecated 2026-11-26: use MenuRecipe (menu_recipes). */
  menu_item_id: string | null;
  /** @deprecated 2026-11-26: use MenuRecipe (menu_recipes). */
  menu_option_id: string | null;
  yield: number;
  waste_pct: number;
  multiplier: number;
  /** One portion's size; with it, portions = recipe size / portion size (yield is the fallback). */
  portion_size?: number | null;
  portion_unit?: Unit | null;
  /** How the recipe size is shown (g, kg, ml, l); display only. */
  size_unit?: Unit | null;
}

/** A supply (cone, waffle box, sauce cup, oil, gas): bought as pack_qty of unit for price. */
export interface Supply {
  id: string;
  name: string;
  pack_qty: number;
  unit: Unit;
  price: number;
  active?: boolean;
}

/** How much of a supply one unit of a menu item or option takes. */
export interface SupplyUse {
  id: string;
  supply_id: string;
  menu_item_id: string | null;
  menu_option_id: string | null;
  qty: number;
  unit: Unit;
}

/**
 * Which recipe a menu item or option uses (backend 20261126100000, Yazeed 2026-11-26): one recipe per item or option,
 * a recipe may serve several (Small = 1 portion, Medium = 2 portions of the same fries recipe). Replaces the deprecated
 * Recipe.menu_item_id / menu_option_id.
 */
export interface MenuRecipe {
  id: string;
  recipe_id: string;
  menu_item_id: string | null;
  menu_option_id: string | null;
  /** How many of the recipe's portions one unit sold takes. */
  portions: number;
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
  /** How often `amount` is paid (backend 20261126140000); missing = month. */
  period?: CostPeriod;
}

/** How often a running or fixed cost is paid. */
export type CostPeriod = 'week' | 'month' | 'year';
const PER_YEAR: Record<CostPeriod, number> = { week: 52, month: 12, year: 1 };

/**
 * Days open a year (Yazeed, 2026-11-26): a year counts as 52 weeks of `daysOpenWeek` days (finance_settings.days_open_week,
 * 6), not the cash days, which have too little data yet.
 */
export const openDaysPerYear = (daysOpenWeek: number) => daysOpenWeek * 52;

/** A cost paid every `period`, spread over the open days of a year: amount x periods a year / open days a year. */
export function costPerOpenDay(amount: number, period: CostPeriod, daysOpenWeek: number): number {
  const days = openDaysPerYear(daysOpenWeek);
  return days > 0 ? (amount * PER_YEAR[period]) / days : 0;
}

/** A cost as a monthly amount (for showing the list's total): amount x periods a year / 12. */
export const costPerMonth = (amount: number, period: CostPeriod) => (amount * PER_YEAR[period]) / 12;

/**
 * Daily gross profit target (Yazeed, 2026-11-26): the gross profit an open day needs so the fixed costs are covered.
 * Sum of every active fixed cost per open day. Example: rent 700 a month + salaries 900 a month + gas 8 a week
 * = (700 x 12 + 900 x 12 + 8 x 52) / (6 x 52) = 19,616 / 312 = 62.872 a day.
 */
export function dailyGrossProfitTarget(costs: readonly Pick<MonthlyCost, 'amount' | 'active' | 'period'>[], daysOpenWeek: number): number {
  return costs.filter((c) => c.active).reduce((t, c) => t + costPerOpenDay(Number(c.amount), c.period ?? 'month', daysOpenWeek), 0);
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

/** Grams, counting 1 ml as 1 g; null for pieces. */
export function toGrams(qty: number, unit: Unit | null | undefined): number | null {
  if (!unit || unit === 'piece') return null;
  return qty * BASE[unit].factor;
}

/** Grams shown in `unit` (g, kg, ml, l; 1 ml = 1 g). */
export const fromGrams = (grams: number, unit: Unit) => (unit === 'piece' ? grams : grams / BASE[unit].factor);

/** One piece of an ingredient in grams, if its piece size is set. */
export const pieceGrams = (i: Pick<Ingredient, 'piece_size' | 'piece_unit'>) => (i.piece_size && i.piece_unit ? toGrams(i.piece_size, i.piece_unit) : null);

/** Units a recipe line may use for this ingredient: its own family, g/kg/ml/l for anything weighed (1 ml = 1 g), and
 * both pieces and weight when a piece size is set. Weekly ingredients count in portions (no unit). */
export function lineUnitsFor(i: Ingredient): Unit[] {
  if (i.mode === 'weekly' || !i.unit) return [];
  const weights: Unit[] = ['g', 'kg', 'ml', 'l'];
  if (i.unit === 'piece') return pieceGrams(i) ? ['piece', ...weights] : ['piece'];
  return pieceGrams(i) ? [...weights, 'piece'] : weights;
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

/** One line of a recipe: its cost in the batch and its size in grams (null: unknown). */
export interface LineCost {
  lineId: string;
  cost: number | null;
  grams: number | null;
}

export interface RecipeCost {
  recipeId: string;
  /** Cost of the whole batch (unrounded since 2026-11-23; round only to show it). */
  batch: number;
  /** The batch size in grams (1 ml = 1 g); null when a line's size is unknown or there are no lines. */
  totalGrams: number | null;
  /** Portions: size / portion_size when a portion size is stored (and the size is known), else yield. */
  portions: number;
  /** One portion in grams (size / portions), shown live next to the portions; null without a size. */
  portionGrams: number | null;
  /** Whether portions came from the sizes (false: yield, or the size is unknown). */
  portionsFromSize: boolean;
  perPortion: number;
  withWaste: number;
  /** Cost of one gram with waste; null without a size. */
  perGramWithWaste: number | null;
  recommended: number;
  /** Each line's cost and size, for the recipe screen's chart. */
  lines: LineCost[];
  /** Lines that could not be priced (missing unit or piece size, weekly ingredient without sales or estimate,
   * sub-recipe without a size used by weight, broken link). */
  missing: string[];
  /** Lines whose size is unknown (a piece without a piece size, a weekly ingredient). */
  unsized: string[];
}

export interface CostData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  lines: RecipeLine[];
  supplies?: Supply[];
  supplyUses?: SupplyUse[];
  /** Recipe links of menu items and options; without them, the deprecated Recipe.menu_item_id / menu_option_id count as 1 portion. */
  menuRecipes?: MenuRecipe[];
  weekly?: WeeklyUnits;
  roundTo?: number;
}

/** Cost and grams of `amount` `unit` of an ingredient on a line; null parts are unknown. */
export function ingredientLine(i: Ingredient, amount: number, unit: Unit | null, weekly: WeeklyUnits = {}): { cost: number | null; grams: number | null } {
  if (i.mode === 'weekly') {
    const unitCost = ingredientUnitCost(i, weekly);
    return { cost: unitCost === null ? null : unitCost * amount, grams: null };
  }
  if (!i.pack_qty || !i.unit || !unit) return { cost: null, grams: null };
  const piece = pieceGrams(i);
  const grams = unit === 'piece' ? (piece === null ? null : amount * piece) : toGrams(amount, unit);
  if (i.unit === 'piece') {
    const perPiece = i.price / i.pack_qty;
    if (unit === 'piece') return { cost: perPiece * amount, grams };
    return { cost: piece && grams !== null ? perPiece * (grams / piece) : null, grams };
  }
  const packGrams = toGrams(i.pack_qty, i.unit);
  return { cost: packGrams && grams !== null ? (i.price / packGrams) * grams : null, grams };
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
    if (!r || visiting.has(id)) {
      return { recipeId: id, batch: 0, totalGrams: null, portions: 1, portionGrams: null, portionsFromSize: false, perPortion: 0, withWaste: 0, perGramWithWaste: null, recommended: 0, lines: [], missing: [id], unsized: [id] };
    }
    visiting.add(id);
    let batch = 0;
    let grams: number | null = 0;
    const missing: string[] = [];
    const unsized: string[] = [];
    const lineCosts: LineCost[] = [];
    const own = linesOf.get(id) ?? [];
    for (const l of own) {
      let c: { cost: number | null; grams: number | null } = { cost: null, grams: null };
      if (l.ingredient_id) {
        const i = ing.get(l.ingredient_id);
        if (i) c = ingredientLine(i, l.amount, l.unit, data.weekly);
      } else if (l.sub_recipe_id) {
        const sub = cost(l.sub_recipe_id);
        const broken = sub.missing.length > 0;
        if (!l.unit) {
          // Portions of the sub-recipe.
          const portionGrams = sub.totalGrams !== null && sub.portions > 0 ? sub.totalGrams / sub.portions : null;
          c = { cost: broken ? null : sub.withWaste * l.amount, grams: portionGrams === null ? null : portionGrams * l.amount };
        } else {
          // An amount by weight or volume: that share of the sub-recipe's size.
          const g = toGrams(l.amount, l.unit);
          c = { cost: broken || g === null || sub.perGramWithWaste === null ? null : sub.perGramWithWaste * g, grams: g };
        }
      }
      if (c.cost === null) missing.push(l.id);
      else batch += c.cost;
      if (c.grams === null) unsized.push(l.id);
      else if (grams !== null) grams += c.grams;
      lineCosts.push({ lineId: l.id, cost: c.cost, grams: c.grams });
    }
    visiting.delete(id);
    const totalGrams = own.length && unsized.length === 0 ? grams : null;
    const portionGrams = r.portion_size && r.portion_unit ? toGrams(r.portion_size, r.portion_unit) : null;
    const portionsFromSize = totalGrams !== null && totalGrams > 0 && portionGrams !== null && portionGrams > 0;
    const portions = portionsFromSize ? totalGrams! / portionGrams! : r.yield > 0 ? r.yield : 1;
    const perPortion = batch / portions;
    const factor = 1 + r.waste_pct / 100;
    const withWaste = perPortion * factor;
    const result: RecipeCost = {
      recipeId: id,
      batch,
      totalGrams,
      portions,
      portionGrams: totalGrams !== null && portions > 0 ? totalGrams / portions : null,
      portionsFromSize,
      perPortion,
      withWaste,
      perGramWithWaste: totalGrams !== null && totalGrams > 0 ? (batch * factor) / totalGrams : null,
      recommended: roundUp(withWaste * r.multiplier, data.roundTo ?? 0.05),
      lines: lineCosts,
      missing,
      unsized,
    };
    out.set(id, result);
    return result;
  };

  for (const r of data.recipes) cost(r.id);
  return out;
}

/** Cost of one use of a supply: qty in the use's unit against the pack (pieces with pieces, weights with weights,
 * 1 ml = 1 g); null when the units don't fit. */
export function supplyUseCost(s: Supply, u: Pick<SupplyUse, 'qty' | 'unit'>): number | null {
  if (!(s.pack_qty > 0)) return null;
  if (s.unit === 'piece' || u.unit === 'piece') return s.unit === u.unit ? (s.price / s.pack_qty) * u.qty : null;
  const pack = toGrams(s.pack_qty, s.unit);
  const used = toGrams(u.qty, u.unit);
  return pack && used !== null ? (s.price / pack) * used : null;
}

/** Supplies on one menu item or option: their total cost per unit sold, and whether one could not be priced. */
export function supplyCostFor(target: { itemId?: string | null; optionId?: string | null }, supplies: readonly Supply[] = [], uses: readonly SupplyUse[] = []): { cost: number; count: number; missing: boolean } {
  const byId = new Map(supplies.map((s) => [s.id, s]));
  let cost = 0;
  let count = 0;
  let missing = false;
  for (const u of uses) {
    const hit = (target.itemId && u.menu_item_id === target.itemId) || (target.optionId && u.menu_option_id === target.optionId);
    if (!hit) continue;
    const s = byId.get(u.supply_id);
    const c = s ? supplyUseCost(s, u) : null;
    count++;
    if (c === null) missing = true;
    else cost += c;
  }
  return { cost, count, missing };
}

/** The recipe links to use: `menuRecipes` when given, else the deprecated recipe columns as 1 portion each. */
export function menuRecipesOf(data: Pick<CostData, 'recipes' | 'menuRecipes'>): MenuRecipe[] {
  if (data.menuRecipes) return data.menuRecipes;
  return data.recipes
    .filter((r) => r.menu_item_id || r.menu_option_id)
    .map((r) => ({ id: `legacy:${r.id}`, recipe_id: r.id, menu_item_id: r.menu_item_id, menu_option_id: r.menu_option_id, portions: 1 }));
}

/** The recipe link of one menu item or option, or null. */
export function menuRecipeFor(target: { itemId?: string | null; optionId?: string | null }, links: readonly MenuRecipe[]): MenuRecipe | null {
  return links.find((m) => (target.itemId && m.menu_item_id === target.itemId) || (target.optionId && m.menu_option_id === target.optionId)) ?? null;
}

/**
 * Recipe cost of one unit sold of a menu item or option: the recipe's cost per portion with waste x the link's portions.
 * null without a link or without a complete recipe cost.
 */
export function menuRecipeCost(target: { itemId?: string | null; optionId?: string | null }, links: readonly MenuRecipe[], costs: Map<string, RecipeCost>): { cost: number; recipeId: string; portions: number } | null {
  const link = menuRecipeFor(target, links);
  if (!link) return null;
  const c = costs.get(link.recipe_id);
  if (!c || c.missing.length) return null;
  return { cost: c.withWaste * link.portions, recipeId: link.recipe_id, portions: link.portions };
}

/**
 * Cost history (Yazeed, 2026-11-22): past days keep the costs they had. `cost_history` (backend 20261122180000) has one
 * version of every ingredient, recipe and recipe line per business day of a change (no names; data null = deleted).
 */
export interface CostVersion {
  tbl: 'ingredients' | 'recipes' | 'recipe_lines' | 'supplies' | 'supply_uses' | 'menu_recipes';
  row_id: string;
  /** Business day of the change; 2000-01-01 is the baseline. */
  day: string;
  data: Record<string, unknown> | null;
}

/** The ingredients, recipes and lines as they stood at the end of business day `day` (YYYY-MM-DD). Names are empty. */
export function costDataOn(versions: readonly CostVersion[], day: string): CostData {
  const last = new Map<string, CostVersion>();
  for (const v of versions) {
    if (v.day > day) continue;
    const key = `${v.tbl}:${v.row_id}`;
    const have = last.get(key);
    if (!have || have.day < v.day) last.set(key, v);
  }
  const out: CostData = { ingredients: [], recipes: [], lines: [], supplies: [], supplyUses: [] };
  const links: MenuRecipe[] = [];
  let sawLinks = false;
  const num = (x: unknown) => (x == null ? null : Number(x));
  for (const v of last.values()) {
    const d = v.data;
    if (!d) continue;
    if (v.tbl === 'ingredients') {
      out.ingredients.push({ ...(d as unknown as Ingredient), name: '', price: Number(d.price), pack_qty: num(d.pack_qty), weekly_units_estimate: num(d.weekly_units_estimate), piece_size: num(d.piece_size) });
    } else if (v.tbl === 'recipes') {
      out.recipes.push({ ...(d as unknown as Recipe), name: '', yield: Number(d.yield), waste_pct: Number(d.waste_pct), multiplier: Number(d.multiplier), portion_size: num(d.portion_size) });
    } else if (v.tbl === 'recipe_lines') {
      out.lines.push({ ...(d as unknown as RecipeLine), amount: Number(d.amount) });
    } else if (v.tbl === 'supplies') {
      out.supplies!.push({ ...(d as unknown as Supply), name: '', price: Number(d.price), pack_qty: Number(d.pack_qty) });
    } else if (v.tbl === 'supply_uses') {
      out.supplyUses!.push({ ...(d as unknown as SupplyUse), qty: Number(d.qty) });
    } else if (v.tbl === 'menu_recipes') {
      links.push({ ...(d as unknown as MenuRecipe), portions: Number(d.portions) });
    }
  }
  // Days before menu_recipes existed have no link versions: the deprecated recipe columns stand in (menuRecipesOf).
  for (const v of versions) if (v.tbl === 'menu_recipes') { sawLinks = true; break; }
  if (sawLinks) out.menuRecipes = links;
  return out;
}

/**
 * Looks a cost up as it was on a past day. `pick` reads one cost from a day's recipes and costs (null: no complete
 * recipe). An item that had no cost yet on `day` takes the first one it got later, so a recipe entered late fills the
 * gap once; after that the past does not move. Edits made today count for today and later only.
 */
export function costHistory(versions: readonly CostVersion[], weekly: WeeklyUnits = {}) {
  const days = [...new Set(versions.map((v) => v.day))].sort();
  const cache = new Map<string, { recipes: Recipe[]; costs: Map<string, RecipeCost>; data: CostData }>();
  const at = (day: string) => {
    let c = cache.get(day);
    if (!c) {
      const data = costDataOn(versions, day);
      const withLines = new Set(data.lines.map((l) => l.recipe_id));
      // A recipe without lines has no cost yet (not a cost of 0).
      c = { recipes: data.recipes.filter((r) => withLines.has(r.id)), costs: costAll({ ...data, weekly }), data };
      cache.set(day, c);
    }
    return c;
  };
  return {
    /** `data` has that day's supplies and uses too (supplyCostFor). */
    costOn(day: string, pick: (recipes: Recipe[], costs: Map<string, RecipeCost>, data: CostData) => number | null): number | null {
      let from = -1;
      for (let i = 0; i < days.length && days[i] <= day; i++) from = i;
      for (let i = Math.max(from, 0); i < days.length; i++) {
        const c = at(days[i]);
        const v = pick(c.recipes, c.costs, c.data);
        if (v !== null) return v;
      }
      return null;
    },
  };
}

/**
 * Cost of the Unknown sauce (Yazeed, 2026-11-20): it is not a recipe of its own but the plain average of the named
 * sauces' cost with waste, over the sauces that have a complete recipe. null while no sauce has one.
 */
export function unknownSauceCost(sauceItemIds: string[], links: readonly MenuRecipe[], costs: Map<string, RecipeCost>): { cost: number; sauces: number } | null {
  const vals = sauceItemIds
    .map((id) => menuRecipeCost({ itemId: id }, links, costs))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => c.cost);
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

/** Today's cash day for every staff screen: cash_day_state(), and the cash_state row on Realtime.
 * not_tracked: before cash_state.tracking_from (the day after the cash day reached the project); every screen works
 * as it did before the cash day existed. */
export type CashDayState = 'not_tracked' | 'not_started' | 'open' | 'closed';
export interface CashDayInfo {
  day: string;
  state: CashDayState;
  tracking_from: string;
  start: number | null;
  opened_at: string | null;
}
export interface CashStateRow {
  day: string | null;
  state: 'open' | 'closed' | null;
  tracking_from: string | null;
}
/** Today's state from the cash_state row. A row for another day means no cash day today: not started, or not
 * tracked yet before tracking_from. Missing row: not tracked (the backend has not set a date yet). */
export function stateForToday(row: CashStateRow | null | undefined, today: string): CashDayState {
  if (row && row.day === today && row.state) return row.state;
  if (!row || !row.tracking_from || today < row.tracking_from) return 'not_tracked';
  return 'not_started';
}
/** The dashboard, the kitchen board and the keypad work normally in these states. */
export const cashDayAllowsWork = (s: CashDayState) => s === 'open' || s === 'not_tracked';

/** cash_days view: one row per business day. */
export type CashDayStatus = 'closed' | 'open' | 'not_started' | 'not_closed' | 'not_tracked';

/** A close counts as matched when the difference is under half a fils. */
export const isMatched = (difference: number | null | undefined) => difference != null && Math.abs(difference) < 0.0005;
