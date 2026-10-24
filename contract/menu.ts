/** Menu, pricing and stock keys. Single source of truth for what can be ordered. */

export type Category = 'main' | 'offers' | 'sauces' | 'drinks';
export const CATEGORIES: Category[] = ['main', 'offers', 'sauces', 'drinks'];

export type ItemKind = 'fries' | 'waffle' | 'student' | 'sauce' | 'water' | 'cola' | 'sprite' | 'fanta';

export interface CatalogItem {
  kind: ItemKind;
  name: string;
  /** Secondary line shown under the name (and copied into the order line as a modifier). */
  sub?: string;
  price: number;
  /** Items that open a configurator before being added. */
  cfg?: 'sauces' | 'tops';
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
  offers: [{ kind: 'student', name: 'Student Offer', sub: 'Classic waffle', price: 1.5, cfg: 'tops' }],
  sauces: SAUCES.map((s) => ({ kind: 'sauce' as const, name: s, sub: 'Separate container', price: SAUCE_EXTRA })),
  drinks: [
    { kind: 'water', name: 'Water', price: 0.25 },
    { kind: 'cola', name: 'Cola', price: 0.5 },
    { kind: 'sprite', name: 'Sprite', price: 0.5 },
    { kind: 'fanta', name: 'Fanta', price: 0.5 },
  ],
};

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

/** Whether a catalog item can currently be ordered. */
export function isItemOut(out: Stock, item: CatalogItem): boolean {
  if (isOut(out, item.kind)) return true;
  if (item.kind === 'sauce' && isOut(out, sauceKey(item.name))) return true;
  if (item.kind === 'student' && isOut(out, 'waffle')) return true;
  return false;
}
