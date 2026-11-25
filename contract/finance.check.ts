// Worked examples for finance.ts (2026-11-22/23, checked by hand). Run after any change to the cost rules:
//   node --experimental-strip-types --no-warnings shared/contract/finance.check.ts
// Not imported by the apps; no build, no dependencies.
import { dynamicSupplyCosts, soldKey, costPerOpenDay, costPerMonth, dailyGrossProfitTarget, openDaysPerYear, costAll, costDataOn, menuRecipeCost, menuRecipesOf, unknownSauceCost, type MenuRecipe, costHistory, supplyCostFor, supplyUseCost, ingredientLine, lineUnitsFor, fromGrams, type Ingredient, type Recipe, type RecipeLine, type Supply, type SupplyUse, type CostVersion } from './finance.ts';
let fails = 0;
const eq = (n: string, a: any, b: any) => { const ok = a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9); if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', n, a, ok ? '' : `(want ${b})`); };
const ing = (id: string, pack_qty: number, unit: any, price: number, extra: Partial<Ingredient> = {}): Ingredient => ({ id, name: id, mode: 'pack', pack_qty, unit, price, weekly_item_id: null, weekly_units_estimate: null, ...extra });
const rec = (id: string, extra: Partial<Recipe> = {}): Recipe => ({ id, name: id, menu_item_id: null, menu_option_id: null, yield: 1, waste_pct: 0, multiplier: 3, ...extra });
let n = 0; const line = (recipe_id: string, x: Partial<RecipeLine>): RecipeLine => ({ id: `l${++n}`, recipe_id, ingredient_id: null, sub_recipe_id: null, amount: 1, unit: null, ...x });

// 1. His size example: 40 ml + 3 g + 2 g + 400 ml of a recipe = 445 g.
{
  const I = [ing('water', 1, 'l', 1.0), ing('salt', 1000, 'g', 2.0), ing('pepper', 100, 'g', 5.0), ing('oil', 1, 'l', 2.0)];
  const R = [rec('base', { portion_size: 50, portion_unit: 'ml' }), rec('dish', { portion_size: 89, portion_unit: 'g' })];
  const L = [line('base', { ingredient_id: 'oil', amount: 500, unit: 'ml' }), // base: 500 ml oil = 1.000 JD, 500 g
             line('dish', { ingredient_id: 'water', amount: 40, unit: 'ml' }),   // 0.040
             line('dish', { ingredient_id: 'salt', amount: 3, unit: 'g' }),      // 0.006
             line('dish', { ingredient_id: 'pepper', amount: 2, unit: 'g' }),    // 0.100
             line('dish', { sub_recipe_id: 'base', amount: 400, unit: 'ml' })];  // 400/500 of 1.000 = 0.800
  const c = costAll({ ingredients: I, recipes: R, lines: L });
  const d = c.get('dish')!;
  eq('size 40ml+3g+2g+400ml', d.totalGrams, 445);
  eq('portions 445/89', d.portions, 5);
  eq('batch', d.batch, 0.04 + 0.006 + 0.1 + 0.8);
  eq('per portion', d.perPortion, 0.946 / 5);
  eq('base portions 500/50', c.get('base')!.portions, 10);
  eq('shown in kg', fromGrams(d.totalGrams!, 'kg'), 0.445);
  eq('chart: biggest line is the sub-recipe', [...d.lines].sort((a, b) => b.cost! - a.cost!)[0].cost, 0.8);
}
// 2. Mayo: 700 ml made, sold in 40 ml portions; 400 ml used in another recipe; 20% waste on mayo.
{
  const I = [ing('oil', 5, 'l', 10.0), ing('egg', 30, 'piece', 3.0, { piece_size: 50, piece_unit: 'g' })];
  const R = [rec('mayo', { portion_size: 40, portion_unit: 'ml', waste_pct: 20 }), rec('dip', {})];
  const L = [line('mayo', { ingredient_id: 'oil', amount: 600, unit: 'ml' }), // 600/5000*10 = 1.200
             line('mayo', { ingredient_id: 'egg', amount: 2, unit: 'piece' }),  // 2 x 0.100 = 0.200, 100 g
             line('dip', { sub_recipe_id: 'mayo', amount: 400, unit: 'ml' })];
  const c = costAll({ ingredients: I, recipes: R, lines: L });
  const m = c.get('mayo')!;
  eq('mayo size 600 ml + 2 eggs x 50 g', m.totalGrams, 700);
  eq('mayo portions 700/40', m.portions, 17.5);
  eq('mayo batch', m.batch, 1.4);
  eq('mayo portion with 20%', m.withWaste, (1.4 / 17.5) * 1.2);
  eq('400 ml of mayo in dip', c.get('dip')!.batch, (1.4 * 1.2) * 400 / 700);
  eq('400 ml = 10 old-style portions? no: 400/40 portions', c.get('dip')!.batch, m.withWaste * 10);
  eq('egg used by weight: 100 g = 2 eggs', ingredientLine(I[1], 100, 'g').cost, 0.2);
  eq('egg units', lineUnitsFor(I[1]).join(','), 'piece,g,kg,ml,l');
  eq('egg without piece size: pieces only', lineUnitsFor(ing('e', 30, 'piece', 3)).join(','), 'piece');
}
// 3. Sub-recipe in portions still works; a piece without size leaves size unknown and portions = yield.
{
  const I = [ing('cone', 3000, 'piece', 150), ing('potato', 1, 'kg', 0.6)];
  const R = [rec('fries', { yield: 1, waste_pct: 20, portion_size: 90, portion_unit: 'g' }), rec('combo', {})];
  const L = [line('fries', { ingredient_id: 'potato', amount: 0.09, unit: 'kg' }), line('fries', { ingredient_id: 'cone', amount: 1, unit: 'piece' }),
             line('combo', { sub_recipe_id: 'fries', amount: 2 })];
  const c = costAll({ ingredients: I, recipes: R, lines: L });
  const f = c.get('fries')!;
  eq('cone without size: size unknown', f.totalGrams, null);
  eq('falls back to yield', f.portions, 1);
  eq('fries with waste (staging today 0.125)', f.withWaste, (0.054 + 0.05) * 1.2);
  eq('2 portions in combo', c.get('combo')!.batch, f.withWaste * 2);
  eq('no missing', f.missing.length, 0);
}
// 4. Sub-recipe by weight without a known size cannot be priced (never a silent 0).
{
  const I = [ing('cone', 10, 'piece', 1)];
  const R = [rec('a'), rec('b')];
  const L = [line('a', { ingredient_id: 'cone', amount: 1, unit: 'piece' }), line('b', { sub_recipe_id: 'a', amount: 50, unit: 'g' })];
  const c = costAll({ ingredients: I, recipes: R, lines: L });
  eq('b missing', c.get('b')!.missing.length, 1);
}
// 5. Supplies: 1000 cones for 100 JD, 1 per small fries; waffle box 0.100 + recipe 0.800 = 0.900.
{
  const S: Supply[] = [{ id: 'cone', name: 'cone', pack_qty: 1000, unit: 'piece', price: 100 }, { id: 'box', name: 'box', pack_qty: 1000, unit: 'piece', price: 100 },
                       { id: 'oil', name: 'oil', pack_qty: 20, unit: 'l', price: 30 }, { id: 'gas', name: 'gas', pack_qty: 1, unit: 'piece', price: 7 }];
  const U: SupplyUse[] = [{ id: 'u1', supply_id: 'cone', menu_item_id: null, menu_option_id: 'small', qty: 1, unit: 'piece' },
                          { id: 'u2', supply_id: 'cone', menu_item_id: null, menu_option_id: 'medium', qty: 1, unit: 'piece' },
                          { id: 'u3', supply_id: 'oil', menu_item_id: null, menu_option_id: 'small', qty: 20, unit: 'ml' },
                          { id: 'u4', supply_id: 'gas', menu_item_id: null, menu_option_id: 'small', qty: 0.002, unit: 'piece' },
                          { id: 'u5', supply_id: 'box', menu_item_id: 'waffle', menu_option_id: null, qty: 1, unit: 'piece' }];
  eq('cone per small', supplyUseCost(S[0], U[0]), 0.1);
  eq('small: cone + 20 ml oil + gas', supplyCostFor({ optionId: 'small' }, S, U).cost, 0.1 + 0.03 + 0.014);
  eq('medium: cone only', supplyCostFor({ optionId: 'medium' }, S, U).cost, 0.1);
  const waffle = 0.8 + supplyCostFor({ itemId: 'waffle' }, S, U).cost;
  eq('waffle 0.800 + box 0.100', waffle, 0.9);
  eq('piece vs weight refused', supplyUseCost(S[0], { qty: 5, unit: 'g' }), null);
  eq('missing flagged', supplyCostFor({ optionId: 'x' }, S, [{ id: 'u', supply_id: 'cone', menu_item_id: null, menu_option_id: 'x', qty: 5, unit: 'g' }]).missing, true);
}
// 6. History keeps supplies per day.
{
  const v = (tbl: any, row_id: string, day: string, data: any): CostVersion => ({ tbl, row_id, day, data });
  const vs = [v('supplies', 'box', '2000-01-01', { id: 'box', pack_qty: 1000, unit: 'piece', price: 100 }),
              v('supply_uses', 'u', '2000-01-01', { id: 'u', supply_id: 'box', menu_item_id: 'waffle', menu_option_id: null, qty: 1, unit: 'piece' }),
              v('supplies', 'box', '2026-11-25', { id: 'box', pack_qty: 1000, unit: 'piece', price: 200 }),
              v('recipes', 'r', '2000-01-01', { id: 'r', menu_item_id: 'waffle', menu_option_id: null, yield: 1, waste_pct: 0, multiplier: 3, portion_size: null, portion_unit: null }),
              v('ingredients', 'i', '2000-01-01', { id: 'i', mode: 'pack', pack_qty: 1, unit: 'kg', price: 8, weekly_item_id: null, weekly_units_estimate: null, piece_size: null, piece_unit: null }),
              v('recipe_lines', 'l', '2000-01-01', { id: 'l', recipe_id: 'r', ingredient_id: 'i', sub_recipe_id: null, amount: 100, unit: 'g' })];
  const h = costHistory(vs);
  const pick = (rs: Recipe[], cs: any, d: any) => { const r = rs.find((x) => x.menu_item_id === 'waffle'); const c = r && cs.get(r.id); return c && !c.missing.length ? c.withWaste + supplyCostFor({ itemId: 'waffle' }, d.supplies, d.supplyUses).cost : null; };
  eq('waffle before box price change', h.costOn('2026-11-24', pick), 0.9);
  eq('waffle after', h.costOn('2026-11-25', pick), 1.0);
  eq('costDataOn numbers', typeof costDataOn(vs, '2026-11-24').supplies![0].price, 'number');
}
// 7. Portions as the input (Yazeed 2026-11-23): mayo 700 ml, 17.5 portions → one portion 40 ml; 10 portions → 70 ml.
{
  const I = [ing('oil', 5, 'l', 10.0), ing('egg', 30, 'piece', 3.0, { piece_size: 50, piece_unit: 'g' })];
  const L = [line('m', { ingredient_id: 'oil', amount: 600, unit: 'ml' }), line('m', { ingredient_id: 'egg', amount: 2, unit: 'piece' })];
  const a = costAll({ ingredients: I, recipes: [rec('m', { yield: 17.5, waste_pct: 20 })], lines: L }).get('m')!;
  eq('17.5 portions → 40 ml each', a.portionGrams, 40);
  eq('cost per portion', a.withWaste, 1.4 / 17.5 * 1.2);
  const b = costAll({ ingredients: I, recipes: [rec('m', { yield: 10 })], lines: L }).get('m')!;
  eq('10 portions → 70 ml each', b.portionGrams, 70);
  eq('portions not from size', b.portionsFromSize, false);
  const c = costAll({ ingredients: [ing('cone', 10, 'piece', 1)], recipes: [rec('x', { yield: 2 })], lines: [line('x', { ingredient_id: 'cone', amount: 1, unit: 'piece' })] }).get('x')!;
  eq('unknown size → no portion size', c.portionGrams, null);
}

// 8. History (2026-11-22): potatoes 0.6 → 0.2; recipe edits and deletes; a late recipe fills the gap once.
{
  const I2='i1',R2='r1',L2='l1';
  const ingv=(price:number)=>({id:I2,mode:'pack',pack_qty:1,unit:'kg',price,weekly_item_id:null,weekly_units_estimate:null});
  const recv=(waste=0)=>({id:R2,menu_item_id:'m',menu_option_id:null,yield:1,waste_pct:waste,multiplier:3});
  const linev={id:L2,recipe_id:R2,ingredient_id:I2,sub_recipe_id:null,amount:100,unit:'g'};
  const v=(tbl:any,row_id:string,day:string,data:any):CostVersion=>({tbl,row_id,day,data});
  const pick=(rs:any[],cs:any)=>{const r=rs.find((x:any)=>x.menu_item_id==='m');const c=r&&cs.get(r.id);return c&&!c.missing.length?c.withWaste:null;};
  const base=[v('ingredients',I2,'2000-01-01',ingv(0.6)),v('recipes',R2,'2000-01-01',recv()),v('recipe_lines',L2,'2000-01-01',linev)];
  const h=costHistory([...base,v('ingredients',I2,'2026-11-25',ingv(0.2))]);
  eq('before price drop',h.costOn('2026-11-24',pick),0.06);
  eq('day of drop',h.costOn('2026-11-25',pick),0.02);
  const h2=costHistory([...base,v('recipes',R2,'2026-11-25',recv(50)),v('recipe_lines',L2,'2026-11-26',null),v('recipes',R2,'2026-11-26',null)]);
  eq('recipe edit keeps past',h2.costOn('2026-11-24',pick),0.06);
  eq('recipe edit new',h2.costOn('2026-11-25',pick),0.09);
  eq('deleted later',h2.costOn('2026-11-27',pick),null);
  const late=costHistory([v('ingredients',I2,'2000-01-01',ingv(0.6)),v('recipes',R2,'2026-11-25',recv()),v('recipe_lines',L2,'2026-11-26',linev),v('ingredients',I2,'2026-11-28',ingv(0.2))]);
  eq('late recipe fills gap once',late.costOn('2026-11-20',pick),0.06);
  eq('empty recipe is not 0',late.costOn('2026-11-25',pick),0.06);
  eq('no versions',costHistory([]).costOn('2026-11-20',pick),null);
}
// 9. Portions or portion size, whichever was typed last, stays fixed (mayo 700 ml, then +100 ml).
{
  const oil=[ing('oil',1,'l',2)];
  const lines=(extra:boolean):RecipeLine[]=>[{id:'a',recipe_id:'p',ingredient_id:'oil',sub_recipe_id:null,amount:700,unit:'ml'},...(extra?[{id:'b',recipe_id:'p',ingredient_id:'oil',sub_recipe_id:null,amount:100,unit:'ml'} as RecipeLine]:[])];
  const c=(r:Recipe,extra:boolean)=>costAll({ingredients:oil,recipes:[r],lines:lines(extra)}).get('p')!;
  eq('typed 40 ml → 17.5 portions',c(rec('p',{portion_size:40,portion_unit:'ml',yield:17.5}),false).portions,17.5);
  eq('typed 10 portions → 70 ml',c(rec('p',{yield:10}),false).portionGrams,70);
  eq('40 ml kept after +100 ml → 20 portions',c(rec('p',{portion_size:40,portion_unit:'ml',yield:17.5}),true).portions,20);
  eq('10 portions kept after +100 ml → 80 ml',c(rec('p',{yield:10}),true).portionGrams,80);
}

// Shared recipes with portions (2026-11-26): one fries recipe, Small = 1 portion, Medium = 2 portions.
{
  const I = [ing('potato', 1, 'kg', 0.8)];
  const R = [rec('fries', { waste_pct: 20 })];
  const L = [line('fries', { ingredient_id: 'potato', amount: 180, unit: 'g' })]; // 0.144, with 20 % waste 0.1728
  const M: MenuRecipe[] = [{ id: 'm1', recipe_id: 'fries', menu_item_id: null, menu_option_id: 'small', portions: 1 },
                           { id: 'm2', recipe_id: 'fries', menu_item_id: null, menu_option_id: 'medium', portions: 2 }];
  const c = costAll({ ingredients: I, recipes: R, lines: L });
  eq('small = 1 portion', menuRecipeCost({ optionId: 'small' }, M, c)!.cost, 0.1728);
  eq('medium = 2 portions', menuRecipeCost({ optionId: 'medium' }, M, c)!.cost, 0.3456);
  eq('no link → null', menuRecipeCost({ optionId: 'large' }, M, c), null);
  eq('legacy column as 1 portion', menuRecipesOf({ recipes: [rec('x', { menu_item_id: 'cola' })] })[0].portions, 1);
  eq('unknown sauce = average', unknownSauceCost(['a', 'b'], [{ id: 'm', recipe_id: 'fries', menu_item_id: 'a', menu_option_id: null, portions: 1 }, { id: 'n', recipe_id: 'fries', menu_item_id: 'b', menu_option_id: null, portions: 2 }], c)!.cost, 0.2592);
  const v = (tbl: any, row_id: string, day: string, data: any): CostVersion => ({ tbl, row_id, day, data });
  const H = [v('menu_recipes', 'm2', '2000-01-01', { id: 'm2', recipe_id: 'fries', menu_item_id: null, menu_option_id: 'medium', portions: '1.000' }),
             v('menu_recipes', 'm2', '2026-11-26', { id: 'm2', recipe_id: 'fries', menu_item_id: null, menu_option_id: 'medium', portions: '2.000' })];
  eq('history: 1 portion before', costDataOn(H, '2026-11-25').menuRecipes![0].portions, 1);
  eq('history: 2 portions after', costDataOn(H, '2026-11-26').menuRecipes![0].portions, 2);
  eq('no link versions → legacy', costDataOn([], '2026-11-26').menuRecipes, undefined);
}

// Fixed costs and the daily gross profit target (2026-11-26): 52 weeks x 6 days = 312 open days a year.
{
  eq('open days a year', openDaysPerYear(6), 312);
  eq('oil 300 a month per open day', costPerOpenDay(300, 'month', 6), 3600 / 312);
  eq('gas 8 a week per open day', costPerOpenDay(8, 'week', 6), 416 / 312);
  eq('yearly licence 120', costPerOpenDay(120, 'year', 6), 120 / 312);
  eq('weekly 8 as a month', costPerMonth(8, 'week'), 416 / 12);
  const C = [{ amount: 700, active: true, period: 'month' as const }, { amount: 900, active: true }, { amount: 8, active: true, period: 'week' as const }, { amount: 999, active: false }];
  eq('daily target', dailyGrossProfitTarget(C, 6), 19616 / 312);
  eq('7 days open', dailyGrossProfitTarget([{ amount: 364, active: true, period: 'week' }], 7), 364 / 7);
}

// Dynamic supplies (2026-11-26): oil 300 a month on fries (Small 1, Medium 2), gas 8 a week on fries and waffle.
{
  const S: Supply[] = [{ id: 'oil', name: 'oil', pack_qty: 1, unit: 'piece', price: 300, kind: 'dynamic', period: 'month' },
                       { id: 'gas', name: 'gas', pack_qty: 1, unit: 'piece', price: 8, kind: 'dynamic', period: 'week' },
                       { id: 'cone', name: 'cone', pack_qty: 100, unit: 'piece', price: 5 }];
  const U: SupplyUse[] = [{ id: 'a', supply_id: 'oil', menu_item_id: null, menu_option_id: 'small', qty: 1, unit: 'piece' },
                          { id: 'b', supply_id: 'oil', menu_item_id: null, menu_option_id: 'medium', qty: 2, unit: 'piece' },
                          { id: 'c', supply_id: 'gas', menu_item_id: null, menu_option_id: 'small', qty: 1, unit: 'piece' },
                          { id: 'd', supply_id: 'gas', menu_item_id: 'waffle', menu_option_id: null, qty: 1, unit: 'piece' },
                          { id: 'e', supply_id: 'cone', menu_item_id: null, menu_option_id: 'small', qty: 1, unit: 'piece' }];
  const sold = new Map([[soldKey({ optionId: 'small' }), 100], [soldKey({ optionId: 'medium' }), 50], [soldKey({ itemId: 'waffle' }), 20]]);
  const w = dynamicSupplyCosts(S, U, sold, 6, 6);  // a week of 6 open days
  eq('week pool', w.pool, (3600 / 312 + 416 / 312) * 6);
  eq('oil per small (weight 200)', w.perUnit.get('o:small')! - (416 / 312 * 6) / 120, (3600 / 312 * 6) / 200);
  eq('oil per medium = 2 x small', w.perUnit.get('o:medium')!, (3600 / 312 * 6) * 2 / 200);
  eq('gas per waffle', w.perUnit.get('i:waffle')!, (416 / 312 * 6) / 120);
  eq('static cone not in pool', supplyCostFor({ optionId: 'small' }, S, U).cost, 0.05);
  const none = dynamicSupplyCosts(S, U, new Map(), 1, 6);
  eq('nothing sold: all unallocated', none.unallocated, none.pool);
}
console.log(fails ? `${fails} FAILED` : 'all passed');
if (fails) process.exit(1);
