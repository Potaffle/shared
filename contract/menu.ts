/** Menu, pricing and stock keys. Single source of truth for what can be ordered. */

/* ---------- Languages and menu translations ---------- */

/** UI languages of the apps. */
export type Lang = 'EN' | 'AR' | 'DE';
export const LANGS: Lang[] = ['EN', 'AR', 'DE'];
export const isRtl = (lang: Lang) => lang === 'AR';
/** Key used in the database's `translations` jsonb: lowercase language code; English has no key (it is the canonical column). */
export const langKey = (lang: Lang) => lang.toLowerCase();

/** Fields a menu row can translate. Items have all four; modifiers and categories only `name`. */
export type TranslatedField = 'name' | 'line_name' | 'description' | 'blurb';
/**
 * Shape of the `translations` column on menu_items, menu_modifiers and menu_categories:
 * `{ ar: { name, line_name?, description?, blurb? }, de: { ... } }`. Every key is optional and a missing
 * one means "show the English". Keyed by an open string so a new language needs no schema change.
 */
export type Translations = Record<string, Partial<Record<TranslatedField, string>> | undefined>;

/**
 * Display text of a menu row in a language: the translation when present and non-empty, else the English
 * `fallback` (the row's own column). English order-line snapshots stay the keys for everything.
 */
export function tr(translations: Translations | null | undefined, lang: Lang, field: TranslatedField, fallback: string): string;
export function tr(translations: Translations | null | undefined, lang: Lang, field: TranslatedField, fallback: string | null): string | null;
export function tr(translations: Translations | null | undefined, lang: Lang, field: TranslatedField, fallback: string | null): string | null {
  if (lang === 'EN' || !translations) return fallback;
  const v = translations[langKey(lang)]?.[field];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

/* ---------- Catalog ---------- */

export type Category = 'main' | 'offers' | 'sauces' | 'drinks';
export const CATEGORIES: Category[] = ['main', 'offers', 'sauces', 'drinks'];

export type KnownKind = 'fries' | 'waffle' | 'student' | 'sauce' | 'water' | 'cola' | 'sprite' | 'fanta';
/**
 * The known kinds plus any the owner creates later: an offer added through the owner app gets its slug as
 * its kind ('combo'), so treat kind as an open string and never as a closed list.
 */
export type ItemKind = KnownKind | (string & {});

export type ItemConfig = 'sauces' | 'tops';

/**
 * A base item an offer is made of (menu_item_components in the database). An offer is out of stock when
 * any component is out, counts as its components on the dashboard (a Student Offer is one waffle) and
 * takes the modifiers of its components (sauces for a fries component, toppings for a waffle component).
 */
export interface Component {
  kind: ItemKind;
  /** Stock key of the component ('fries', 'waffle', 'sauce:<name>'). */
  stockKey: string;
  /** How many of the component one offer contains. */
  qty: number;
  /** The component's own configurator, if any. */
  cfg?: ItemConfig;
}

export interface CatalogItem {
  kind: ItemKind;
  name: string;
  /** Secondary line shown under the name (and copied into the order line as a modifier). */
  sub?: string;
  price: number;
  /** Items that open a configurator before being added. Use itemConfigs(): an offer adds its components' configurators. */
  cfg?: ItemConfig;
  /** Base items this offer is made of; absent for a base item. */
  components?: Component[];
}

/** Configurators an item needs: its own plus its components'. A fries + waffle combo gives ['sauces', 'tops']. */
export function itemConfigs(item: Pick<CatalogItem, 'cfg' | 'components'>): ItemConfig[] {
  const out: ItemConfig[] = [];
  for (const c of [item.cfg, ...(item.components ?? []).map((x) => x.cfg)]) if (c && !out.includes(c)) out.push(c);
  return out;
}

export const SAUCES = ['Potaffle Sauce', 'Golden Onion Sauce', 'Spicy Ninja Sauce', 'Ketchup', 'Mayonnaise', 'Mustard'];
/** Price of each sauce beyond the first free one, and of a sauce in a separate container. */
export const SAUCE_EXTRA = 0.25;

export const CLASSIC = 'Classic';
export const TOPPINGS: { name: string; price: number }[] = [
  { name: CLASSIC, price: 0 },
  { name: 'Nutella', price: 0.5 },
  { name: 'Lotus', price: 0.5 },
  { name: 'Strawberries', price: 0.5 },
  { name: 'Banana', price: 0.25 },
  { name: 'Whipped cream', price: 0.25 },
];

export const CATALOG: Record<Category, CatalogItem[]> = {
  main: [
    { kind: 'fries', name: 'Belgian Fries', price: 1, cfg: 'sauces' },
    { kind: 'waffle', name: 'Belgian Waffle', price: 2, cfg: 'tops' },
  ],
  offers: [
    {
      kind: 'student',
      name: 'Student Offer',
      sub: 'Classic waffle',
      price: 1.5,
      cfg: 'tops',
      components: [{ kind: 'waffle', stockKey: 'waffle', qty: 1, cfg: 'tops' }],
    },
  ],
  sauces: SAUCES.map((s) => ({ kind: 'sauce' as const, name: s, sub: 'Separate container', price: SAUCE_EXTRA })),
  drinks: [
    { kind: 'water', name: 'Water', price: 0.25 },
    { kind: 'cola', name: 'Cola', price: 0.5 },
    { kind: 'sprite', name: 'Sprite', price: 0.5 },
    { kind: 'fanta', name: 'Fanta', price: 0.5 },
  ],
};

/**
 * Kinds counted as fries / waffles. Order lines carry a `components` snapshot ({ waffle: 1 } for a Student
 * Offer) and countKinds() uses it; these lists only matter for lines without one (mock data), where
 * 'student' still has to count as a waffle.
 */
export const FRIES_KINDS: ItemKind[] = ['fries'];
export const WAFFLE_KINDS: ItemKind[] = ['waffle', 'student'];

/**
 * Stock map: key -> true when out of stock / disabled.
 * Keys: an ItemKind for whole items ('fries', 'waffle', 'student', 'water', ...),
 * 'sauce:<name>' for a sauce, 'top:<name>' for a topping.
 */
export type Stock = Record<string, boolean>;
export const sauceKey = (name: string) => `sauce:${name}`;
export const topKey = (name: string) => `top:${name}`;
export const isOut = (out: Stock, key: string) => !!out[key];

/** Stock key of a catalog item: its kind, or 'sauce:<name>' for a separate-container sauce. */
export const itemStockKey = (item: Pick<CatalogItem, 'kind' | 'name'>) => (item.kind === 'sauce' ? sauceKey(item.name) : item.kind);

/**
 * Whether a catalog item can currently be ordered: its own stock key is in, and so is every component's
 * (the database's menu_availability view applies the same rule). The old hard-coded "student needs waffle"
 * rule is now the Student Offer's component.
 */
export function isItemOut(out: Stock, item: Pick<CatalogItem, 'kind' | 'name' | 'components'>): boolean {
  if (isOut(out, itemStockKey(item))) return true;
  return (item.components ?? []).some((c) => isOut(out, c.stockKey));
}

/** Names of the components that put an item out of stock (for a "disabled: fries out" hint). */
export const outComponents = (out: Stock, item: Pick<CatalogItem, 'components'>) =>
  (item.components ?? []).filter((c) => isOut(out, c.stockKey)).map((c) => c.kind);
