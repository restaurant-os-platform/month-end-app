import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
const source=readFileSync(new URL('../../public/legacy/js/dashboard.js',import.meta.url),'utf8');
function model(state: object, allowed: (page: string) => boolean = () => true) {
  const ctx = { input: state, allowed, result: null };
  runInNewContext(source+';result=dashboardModel(input,new Date("2026-09-06T12:00:00Z"),allowed);',ctx);
  return ctx.result as unknown as {count: {id: string}|null; recounts: unknown[];value: number;unpriced:number;low:unknown[];usage:{id:string}|null;variance:number|null;review:unknown[];features:unknown[];activity:{name:string}[]};
}
describe('manager brief',()=>{
  it('sorts main counts by date, excluding re-counts and archived records',()=>{
    const m=model({inventories:[{id:'recount',date:'2026-09-05',parentCountId:'main',items:{p:1}},{id:'old',date:'2026-08-01'},{id:'main',date:'2026-09-01',items:{p:10}},{id:'archived',date:'2026-09-06',archived:true}],products:[{id:'p',cost:5}]});
    expect(m.count?.id).toBe('main');expect(m.value).toBe(50);expect(m.recounts).toHaveLength(1);
  });
  it('distinguishes missing quantities and prices from zero',()=>{
    const m=model({inventories:[{id:'c',date:'2026-09-01',items:{zero:0,free:2,unknown:3}}],products:[{id:'zero',par:2,cost:4},{id:'missing',par:4,cost:4},{id:'free',cost:0},{id:'archived',archived:true,par:5}]});
    expect(m.low).toHaveLength(1);expect(m.unpriced).toBe(2);
  });
  it('chooses reporting period over import date',()=>{
    const m=model({usageLogs:[{id:'old',periodEnd:'2026-06-28',createdAt:'2026-09-06'},{id:'new',periodEnd:'2026-08-31',createdAt:'2026-09-01'},{id:'archived',periodEnd:'2026-09-05',archived:true}]});
    expect(m.usage?.id).toBe('new');
  });
  it('uses only explicit reviewed monetary variances and flags unmatched rows',()=>{
    const m=model({products:[{id:'p'}],usageLogs:[{id:'u',periodEnd:'2026-08-31',rows:[{productId:'p',matched:true,estimatedCostVariance:20},{productId:'p',matched:true,estimatedCostVariance:-5},{productId:'p',matched:true,estimatedCostVariance:100,needsReview:true},{productId:'p',matched:true,estimatedCostVariance:''},{matched:false,estimatedCostVariance:200}]}]});
    expect(m.variance).toBe(15);expect(m.review).toHaveLength(2);
  });
  it('shows unavailable variance instead of inventing zero',()=>expect(model({usageLogs:[{id:'u',rows:[]}]}).variance).toBeNull());
  it('groups the current collection across departments',()=>{
    const m=model({menus:[{id:'a',name:'Fall',departmentId:'bar',importedAt:'2026-09-01'},{id:'b',name:'Fall',departmentId:'kitchen',importedAt:'2026-09-01'},{id:'draft',name:'Winter',importedAt:'2026-09-06',active:false}]});expect(m.features).toHaveLength(2);
  });
  it('does not fabricate recipe edit dates',()=>{
    const m=model({menus:[{id:'a',name:'Menu',items:[{id:'old',name:'Old recipe'},{id:'new',name:'Changed recipe',updatedAt:'2026-09-05'}]}]});expect(m.activity.map(a=>a.name)).toEqual(['Changed recipe']);
  });
  it('hides restricted summaries and activity',()=>{
    const m=model({inventories:[{id:'c',date:'2026-09-01'}],usageLogs:[{id:'u',createdAt:'2026-09-01'}],menus:[{id:'m',importedAt:'2026-09-01'}],products:[{id:'p',createdAt:'2026-09-01'}]},()=>false);
    expect(m.count).toBeNull();expect(m.usage).toBeNull();expect(m.features).toEqual([]);expect(m.activity).toEqual([]);
  });
});
