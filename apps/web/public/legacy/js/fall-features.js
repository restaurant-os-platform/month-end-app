// Upgrade the original two imports to a single shared collection, without replacing edits.
function ensureFallFeaturesMenu(workspace){
  const ids=new Set(['menu-fall-features-2026','menu-fall-features-2026-kitchen','menu-fall-features-2026-bar']);
  const menus=workspace.menus||[];
  const sources=menus.filter(menu=>ids.has(menu.id));
  if(!sources.length)return false;
  const shared=sources.find(menu=>menu.id==='menu-fall-features-2026');
  const ordered=shared?[shared,...sources.filter(menu=>menu!==shared)]:sources;
  const items=new Map();
  ordered.forEach(menu=>(menu.items||[]).forEach(item=>{if(!items.has(item.id))items.set(item.id,item);}));
  const photos={
    'fall-2026-blackened-blue-cheese-sirloin':'blackened-blue-cheese-sirloin.jpg',
    'fall-2026-guinness-braised-lamb-shank':'guinness-braised-lamb-shank.jpg',
    'fall-2026-pumpkin-spice-sour':'pumpkin-spice-sour.jpg'
  };
  const combined={...ordered[0],id:'menu-fall-features-2026',name:'Fall Features 2026',allDepartments:true,
    departmentIds:(workspace.departments||[]).filter(d=>!d.archived).map(d=>d.id),
    description:shared?.description||'September 2026 food and cocktail features, recipes, and take-home instructions.',
    sourceFile:[...new Set(sources.flatMap(m=>String(m.sourceFile||'').split(';').map(s=>s.trim()).filter(Boolean)))].join('; '),
    items:[...items.values()].map(item=>({...item,imageUrl:item.imageUrl|| (photos[item.id]?'/month-end/legacy/assets/menu/fall-features-2026/'+photos[item.id]:'' )}))};
  const next=[];let inserted=false;
  menus.forEach(menu=>{if(!ids.has(menu.id))next.push(menu);else if(!inserted){next.push(combined);inserted=true;}});
  if(JSON.stringify(next)===JSON.stringify(menus))return false;
  workspace.menus=next;return true;
}
