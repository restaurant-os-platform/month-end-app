import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
const source=readFileSync(new URL('../../public/legacy/js/fall-features.js',import.meta.url),'utf8');
function migrate(workspace: Record<string,unknown>) {
 const context={workspace,changed:false};
 runInNewContext(source+';changed=ensureFallFeaturesMenu(workspace);',context);
 return context;
}
describe('shared Fall Features menu',()=>{
 it('combines the imports, preserves recipes, attaches photos and covers all active departments',()=>{
  const workspace={departments:[{id:'bar'},{id:'kitchen'},{id:'host'},{id:'old',archived:true}],menus:[{id:'other',items:[]},{id:'menu-fall-features-2026-kitchen',items:[{id:'fall-2026-blackened-blue-cheese-sirloin',name:'Sirloin',kitchenNotes:'Take-home'}]},{id:'menu-fall-features-2026-bar',items:[{id:'fall-2026-pumpkin-spice-sour',description:'Shake hard'}]}]};
  const first=migrate(workspace);expect(first.changed).toBe(true);
  const menu=workspace.menus[1] as unknown as {allDepartments:boolean;departmentIds:string[];items:{imageUrl:string;description?:string;kitchenNotes?:string}[]};
  expect(workspace.menus).toHaveLength(2);expect(menu.allDepartments).toBe(true);expect(menu.departmentIds).toEqual(['bar','kitchen','host']);expect(menu.items[0].kitchenNotes).toBe('Take-home');expect(menu.items[1].description).toBe('Shake hard');expect(menu.items.every(i=>i.imageUrl.endsWith('.jpg'))).toBe(true);expect(migrate(workspace).changed).toBe(false);
 });
 it('keeps newer edits and custom photos on an existing shared menu',()=>{
  const workspace={departments:[{id:'bar'}],menus:[{id:'menu-fall-features-2026-bar',items:[{id:'fall-2026-pumpkin-spice-sour',name:'Old'}]},{id:'menu-fall-features-2026',items:[{id:'fall-2026-pumpkin-spice-sour',name:'Edited',imageUrl:'/custom.jpg'}]}]};
  migrate(workspace);expect(workspace.menus[0].items[0].name).toBe('Edited');expect((workspace.menus[0].items[0] as {imageUrl?:string}).imageUrl).toBe('/custom.jpg');
 });
 it('does not add a menu to unrelated workspaces',()=>expect(migrate({menus:[]}).changed).toBe(false));
});
