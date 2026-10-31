/**
 * Option groups, offers with presets, and the pricing rule. Mirrors the tables menu_option_groups,
 * menu_options and menu_item_components (preset, locked_groups) and is the single implementation of the
 * pricing: the create-order Edge Function runs a verbatim copy of this file (supabase/functions/create-order/
 * pricing.ts); the apps use it for cart previews. Keep it dependency-free so the copy stays byte-identical.
 */

export type PickMode = 'one' | 'many';
export type PriceMode = 'add' | 'replace';

export interface OptionGroup {
  id: string;
  item_id: string;
  name: string;
  translations?: Record<string, unknown> | null;
  pick: PickMode;
  required: boolean;
  /** 0 = no limit. */
  max_picks: number;
  /** replace: the chosen option's price becomes the item price (Size). add: picks add to it (Sauces). */
  price_mode: PriceMode;
  free_count: number;
  /** Group whose chosen option carries the free count (Sauces by Size), or null. */
  free_count_by_group: string | null;
  extra_price: number;
  /** Set on a follow-up group asked once per pick of the parent (Placement for Sauces). */
  parent_group_id: string | null;
  active: boolean;
  sort: number;
  options: MenuOption[];
}

export interface MenuOption {
  id: string;
  group_id: string;
  name: string;
  translations?: Record<string, unknown> | null;
  /** add groups: price beyond the free picks, null = group extra_price. replace groups: the item price. */
  price: number | null;
  /** Sauces included per unit (Small 1, Medium 2); also read when another group's free count varies by this option. */
  free_count: number | null;
  stock_key: string | null;
  exclusive: boolean;
  is_default: boolean;
  active: boolean;
  sort: number;
}

/** A customer's pick as sent to create-order: ids or names. A group is only needed when names are ambiguous. */
export interface Pick {
  group?: string;
  option: string;
  /** Follow-up answer (placement) by id or name; the follow-up group's default applies when omitted. */
  followup?: string;
}

/** A preset pick of an offer component (menu_item_components.preset). */
export interface PresetPick {
  group_id: string;
  option_id: string;
  followup_option_id?: string;
}

/** A pick as snapshotted on order_lines.selections, with the price charged for it. */
export interface Selection {
  group_id: string;
  group: string;
  option_id: string;
  option: string;
  /** Charged for this pick: 0 when free, included in an offer, or a replace-price pick of a plain item. */
  price: number;
  /** Part of the offer's preset. */
  included?: boolean;
  /** Replace-price group pick (the item price came from it). */
  replaces?: boolean;
  /** Offer lines: the component the pick belongs to. */
  component_id?: string;
  component?: string;
  /** Sauces one unit of the line includes because of this pick (Small 1, Medium 2). See allocateSauces. */
  free_sauces?: number;
  followup?: { group_id: string; group: string; option_id: string; option: string; price: number };
}

export class PricingError extends Error {
  constructor(
    public code:
      | 'unknown_group'
      | 'unknown_option'
      | 'missing_pick'
      | 'missing_followup'
      | 'too_many_picks'
      | 'exclusive_option'
      | 'locked_group'
      | 'out_of_stock',
    message: string,
  ) {
    super(message);
  }
}

export interface PriceItemOptions {
  /** Offer component: picks included in the offer price. */
  preset?: PresetPick[];
  /** Offer component: group ids the customer may not change. */
  locked?: string[];
  /** Stock lookup; omitted = nothing is out. */
  isOut?: (stockKey: string) => boolean;
  /** Name used in mods and error messages (line name of the item). */
  itemName?: string;
  /** Offer lines: the component's id and line name, copied onto each selection. */
  component?: { id: string; name: string };
}

export interface PricedItem {
  /** Standalone price of the item with these picks (base after replace plus the add charges). */
  unit: number;
  /** Sum of the selection prices: what an offer charges on top of its price for this component. */
  extras: number;
  selections: Selection[];
  /** Display text per pick: "Ketchup · on fries", "Nutella", "Large". */
  mods: string[];
}

const money = (n: number) => Math.round(n * 1000) / 1000;
const sortBy = <T extends { sort: number; name: string }>(a: T[]) => [...a].sort((x, y) => x.sort - y.sort || x.name.localeCompare(y.name));
const matches = (ref: string, row: { id: string; name: string }) => row.id === ref || row.name.trim().toLowerCase() === ref.trim().toLowerCase();

interface Chosen {
  opt: MenuOption;
  fu?: MenuOption;
  included: boolean;
}

/**
 * Prices one item (or one offer component) for the given picks. Rules:
 * - a group the customer did not answer keeps the preset picks (offers) or its default option;
 *   a required group without any of those is an error;
 * - pick-one groups take one option, max_picks caps the rest, an exclusive option stands alone;
 * - replace groups set the item price; add groups charge each pick beyond the free ones (preset picks
 *   are counted first and never charged);
 * - a follow-up group (placement) is answered per pick; its default applies when omitted;
 * - locked groups of an offer must keep the preset.
 * Throws PricingError; `out_of_stock` when an option's stock key is out.
 */
export function priceItem(item: { price: number; name?: string }, groups: OptionGroup[], picks: Pick[], o: PriceItemOptions = {}): PricedItem {
  const itemName = o.itemName ?? item.name ?? 'item';
  const isOut = o.isOut ?? (() => false);
  const top = sortBy(groups.filter((g) => g.active && !g.parent_group_id));
  const childOf = (g: OptionGroup) => groups.find((x) => x.active && x.parent_group_id === g.id);
  const activeOptions = (g: OptionGroup) => sortBy(g.options.filter((x) => x.active));
  const findOption = (g: OptionGroup, ref: string) => activeOptions(g).find((x) => matches(ref, x));

  // Preset per group, in preset order.
  const presetByGroup = new Map<string, PresetPick[]>();
  for (const p of o.preset ?? []) presetByGroup.set(p.group_id, [...(presetByGroup.get(p.group_id) ?? []), p]);

  // Phase 1: resolve the customer's picks.
  const customer = new Map<string, Chosen[]>();
  for (const raw of picks) {
    let g: OptionGroup | undefined;
    let opt: MenuOption | undefined;
    if (raw.group) {
      g = top.find((x) => matches(raw.group!, x));
      if (!g) throw new PricingError('unknown_group', `${itemName} has no option group ${raw.group}`);
      opt = findOption(g, raw.option);
    } else {
      for (const cand of top) {
        opt = findOption(cand, raw.option);
        if (opt) {
          g = cand;
          break;
        }
      }
    }
    if (!g || !opt) throw new PricingError('unknown_option', `Unknown option for ${itemName}: ${raw.option}`);
    const child = childOf(g);
    let fu: MenuOption | undefined;
    if (child) {
      if (raw.followup) {
        fu = findOption(child, raw.followup);
        if (!fu) throw new PricingError('unknown_option', `Unknown ${child.name} for ${opt.name}: ${raw.followup}`);
      } else {
        fu = activeOptions(child).find((x) => x.is_default);
        if (!fu && child.required) throw new PricingError('missing_followup', `${opt.name} needs a ${child.name}`);
      }
    }
    const list = customer.get(g.id) ?? [];
    if (!list.some((c) => c.opt.id === opt!.id)) list.push({ opt, fu, included: false });
    customer.set(g.id, list);
  }

  // Phase 2: final picks per group (customer, else preset, else defaults), validated.
  const chosenByGroup = new Map<string, Chosen[]>();
  for (const g of top) {
    const child = childOf(g);
    const preset = presetByGroup.get(g.id) ?? [];
    const presetChosen: Chosen[] = [];
    for (const p of preset) {
      const opt = g.options.find((x) => x.id === p.option_id);
      if (!opt) continue;
      const fu = child ? child.options.find((x) => x.id === p.followup_option_id) ?? activeOptions(child).find((x) => x.is_default) : undefined;
      presetChosen.push({ opt, fu, included: true });
    }
    let chosen: Chosen[];
    const answered = customer.get(g.id);
    if (answered) {
      if ((o.locked ?? []).includes(g.id)) {
        const a = answered.map((c) => c.opt.id).sort().join(',');
        const b = presetChosen.map((c) => c.opt.id).sort().join(',');
        if (a !== b) throw new PricingError('locked_group', `${g.name} cannot be changed in this offer`);
      }
      // Preset picks first (they use the free picks and are never charged), then the customer's additions.
      chosen = [];
      for (const pc of presetChosen) {
        const same = answered.find((c) => c.opt.id === pc.opt.id);
        if (same) chosen.push({ opt: pc.opt, fu: same.fu ?? pc.fu, included: true });
      }
      for (const c of answered) if (!chosen.some((x) => x.opt.id === c.opt.id)) chosen.push(c);
      // An included pick keeps its preset follow-up price only when the follow-up is unchanged.
      for (const c of chosen) {
        if (!c.included) continue;
        const pc = presetChosen.find((x) => x.opt.id === c.opt.id)!;
        if (c.fu?.id !== pc.fu?.id) c.included = false;
      }
    } else if (presetChosen.length) {
      chosen = presetChosen;
    } else {
      chosen = activeOptions(g)
        .filter((x) => x.is_default)
        .map((opt) => ({ opt, fu: child ? activeOptions(child).find((x) => x.is_default) : undefined, included: false }));
      if (!chosen.length && g.required) throw new PricingError('missing_pick', `${itemName}: choose ${g.pick === 'one' ? 'a' : 'at least one'} ${g.name}`);
    }
    if (g.pick === 'one' && chosen.length > 1) throw new PricingError('too_many_picks', `${g.name}: choose one`);
    if (g.max_picks > 0 && chosen.length > g.max_picks) throw new PricingError('too_many_picks', `${g.name}: at most ${g.max_picks}`);
    if (chosen.length > 1 && chosen.some((c) => c.opt.exclusive)) {
      const ex = chosen.find((c) => c.opt.exclusive)!.opt.name;
      throw new PricingError('exclusive_option', `${ex} cannot be combined with other ${g.name.toLowerCase()}`);
    }
    for (const c of chosen) {
      if (c.opt.stock_key && isOut(c.opt.stock_key)) throw new PricingError('out_of_stock', `${c.opt.name} is out of stock`);
      if (c.fu?.stock_key && isOut(c.fu.stock_key)) throw new PricingError('out_of_stock', `${c.fu.name} is out of stock`);
    }
    chosenByGroup.set(g.id, chosen);
  }

  // Phase 3: prices.
  let base = Number(item.price);
  let extras = 0;
  const selections: Selection[] = [];
  const mods: string[] = [];
  const tag = o.component ? { component_id: o.component.id, component: o.component.name } : {};
  for (const g of top) {
    const chosen = chosenByGroup.get(g.id) ?? [];
    const child = childOf(g);
    let free = g.free_count;
    if (g.free_count_by_group) {
      const by = chosenByGroup.get(g.free_count_by_group)?.[0];
      if (by && by.opt.free_count !== null) free = by.opt.free_count;
    }
    chosen.forEach((c, i) => {
      let price = 0;
      let replaces: true | undefined;
      if (g.price_mode === 'replace') {
        replaces = true;
        const newBase = c.opt.price ?? Number(item.price);
        if (o.preset) {
          // Offer: the customer pays the difference when choosing a dearer option than the preset.
          const presetOpt = presetByGroup.get(g.id)?.[0];
          const presetPrice = presetOpt ? g.options.find((x) => x.id === presetOpt.option_id)?.price ?? Number(item.price) : Number(item.price);
          price = c.included ? 0 : Math.max(0, newBase - Number(presetPrice));
        }
        base = newBase;
      } else {
        price = c.included || i < free ? 0 : Number(c.opt.price ?? g.extra_price);
      }
      let followup: Selection['followup'];
      if (child && c.fu) {
        const fuPrice = c.included ? 0 : Number(c.fu.price ?? child.extra_price);
        followup = { group_id: child.id, group: child.name, option_id: c.fu.id, option: c.fu.name, price: money(fuPrice) };
      }
      const sel: Selection = { group_id: g.id, group: g.name, option_id: c.opt.id, option: c.opt.name, price: money(price), ...tag };
      if (c.included) sel.included = true;
      if (replaces) sel.replaces = true;
      if (c.opt.free_count) sel.free_sauces = c.opt.free_count;
      if (followup) sel.followup = followup;
      selections.push(sel);
      extras += sel.price + (followup?.price ?? 0);
      mods.push(c.fu ? `${c.opt.name} · ${c.fu.name}` : c.opt.name);
    });
  }
  const addCharges = selections.filter((s) => !s.replaces).reduce((s, x) => s + x.price + (x.followup?.price ?? 0), 0);
  return { unit: money(base + addCharges), extras: money(extras), selections, mods };
}

/** Display text for an offer line's mods: "Fries: Small", "Fries: Ketchup · on fries". */
export const componentMods = (componentName: string, mods: string[]) => mods.map((m) => `${componentName}: ${m}`);

/* ---------- Sauces: a free allowance for the whole order ---------- */

/** Menu items of this kind share the order's free allowance. */
export const SAUCE_KIND = 'sauce';

/** The part of an order line the sauce rule reads; both OrderLine and the server's lines fit. */
export interface SauceLine {
  kind: string;
  name: string;
  qty: number;
  unit: number;
  selections?: Selection[] | null;
}

export interface SauceSummary {
  /** Sauces the order includes: three Medium and one Small make 7. */
  free: number;
  /** Sauces on the order, free and paid. */
  taken: number;
  /** Included sauces nobody chose yet (the "unknown sauces" asked at completion). */
  unknown: number;
  /** Sauces beyond the free ones. */
  paid: number;
}

export function sauceSummary(lines: readonly SauceLine[]): SauceSummary {
  const free = lines.reduce((n, l) => n + l.qty * (l.selections ?? []).reduce((m, s) => m + (s.free_sauces ?? 0), 0), 0);
  const taken = lines.reduce((n, l) => n + (l.kind === SAUCE_KIND ? l.qty : 0), 0);
  return { free, taken, unknown: Math.max(0, free - taken), paid: Math.max(0, taken - free) };
}

/**
 * Applies the allowance to an order's sauce lines: the first `free` sauces cost 0, the rest their list price.
 * Lines of one sauce are merged at the first one's place, then split into a free line and a paid line when the
 * allowance ends inside it, because a line has one unit price. Safe to run again on its own result, so call it
 * after every change to the order. `listPrice` gives a sauce's menu price (a free line's own unit is 0).
 */
export function allocateSauces<T extends SauceLine>(lines: readonly T[], listPrice: (line: T) => number): T[] {
  let left = sauceSummary(lines).free;
  const totals = new Map<string, number>();
  for (const l of lines) if (l.kind === SAUCE_KIND) totals.set(l.name, (totals.get(l.name) ?? 0) + l.qty);
  const seen = new Set<string>();
  const out: T[] = [];
  for (const l of lines) {
    if (l.kind !== SAUCE_KIND) {
      out.push(l);
      continue;
    }
    if (seen.has(l.name)) continue;
    seen.add(l.name);
    const total = totals.get(l.name) ?? 0;
    const free = Math.min(left, total);
    left -= free;
    if (free > 0) out.push({ ...l, qty: free, unit: 0 });
    if (total > free) out.push({ ...l, qty: total - free, unit: money(listPrice(l)) });
  }
  return out;
}
