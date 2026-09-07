// Manager brief. Derive summaries without changing the selected report or workspace.
function dashboardTime(value){
  if(!value)return 0;
  const time=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value);
  return Number.isFinite(time)?time:0;
}
function dashboardNumber(value){return value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null;}
function dashboardLatest(items,date){return [...items].sort((a,b)=>dashboardTime(date(b))-dashboardTime(date(a))||dashboardTime(b.updatedAt||b.createdAt)-dashboardTime(a.updatedAt||a.createdAt))[0]||null;}
function dashboardModel(workspace,now=new Date(),canAccess=()=>true){
  const products=(workspace.products||[]).filter(p=>!p.archived&&p.status!=='delisted');
  const productMap=new Map((workspace.products||[]).map(p=>[p.id,p]));
  const counts=canAccess('inventory')?(workspace.inventories||[]).filter(c=>!c.archived):[];
  // A partial re-count is never a whole-workspace inventory valuation.
  const count=dashboardLatest(counts.filter(c=>!c.parentCountId&&c.recordType!=='recount'),c=>c.date);
  const recounts=count?counts.filter(c=>c.parentCountId===count.id):[];
  const countItems=Object.entries(count?.items||{}).filter(([,q])=>dashboardNumber(q)!==null);
  let value=0,unpriced=0;
  const categories=new Map();
  countItems.forEach(([id,qty])=>{
    const p=productMap.get(id),cost=dashboardNumber(p?.cost);
    if(qty>0&&(!p||cost===null||cost<=0))unpriced++;
    const amount=(cost||0)*Number(qty);value+=amount;
    const category=p?.category||'Other';categories.set(category,(categories.get(category)||0)+amount);
  });
  const low=count?products.filter(p=>Number(p.par)>0&&dashboardNumber(count.items?.[p.id])!==null&&Number(count.items[p.id])<=Number(p.par)):[];
  const logs=canAccess('usage')?(workspace.usageLogs||[]).filter(l=>!l.archived):[];
  // Reporting period, not upload time, determines which report is current.
  const usage=dashboardLatest(logs,l=>l.periodEnd||(l.rows||[]).find(r=>r.periodEnd)?.periodEnd||l.createdAt);
  const rows=usage?.rows||[];
  const matched=rows.filter(r=>r.matched&&productMap.has(r.productId));
  const review=rows.filter(r=>!r.matched||!productMap.has(r.productId)||r.needsReview);
  // Only compare explicit monetary variances. Do not sum bottles, cases and food units.
  const variances=matched.filter(r=>!r.needsReview&&dashboardNumber(r.estimatedCostVariance)!==null);
  const variance=variances.length?variances.reduce((sum,r)=>sum+Number(r.estimatedCostVariance),0):null;
  const leaders=[...variances].filter(r=>Number(r.estimatedCostVariance)>0).sort((a,b)=>Number(b.estimatedCostVariance)-Number(a.estimatedCostVariance)).slice(0,3);
  const menus=canAccess('menu')?(workspace.menus||[]).filter(m=>!m.archived&&m.active!==false):[];
  const seasonalMenus=menus.filter(menu=>/features?|seasonal/i.test(menu.name||''));
  const newestMenu=dashboardLatest(seasonalMenus.length?seasonalMenus:menus,m=>m.importedAt||m.createdAt);
  const features=newestMenu?menus.filter(m=>m.name===newestMenu.name):[];
  const activity=[];
  menus.forEach(menu=>{
    const imported=menu.importedAt||menu.createdAt;
    if(dashboardTime(imported))activity.push({kind:'menu',id:menu.id,name:menu.name,detail:`${(menu.items||[]).length} recipes · Menu added`,date:imported});
    (menu.items||[]).forEach(item=>{
      if(dashboardTime(item.updatedAt))activity.push({kind:'recipe',id:item.id,menuId:menu.id,name:item.name,detail:`${menu.name} · Recipe ${item.createdAt===item.updatedAt?'added':'updated'}`,date:item.updatedAt});
    });
  });
  if(canAccess('products'))products.filter(p=>dashboardTime(p.createdAt)).forEach(p=>activity.push({kind:'product',id:p.id,name:p.name,detail:'Product added',date:p.createdAt}));
  logs.filter(l=>dashboardTime(l.createdAt)).forEach(l=>activity.push({kind:'usage',id:l.id,name:l.fileName||'Usage report',detail:'Report uploaded',date:l.createdAt}));
  activity.sort((a,b)=>dashboardTime(b.date)-dashboardTime(a.date));
  const dayAge=value=>dashboardTime(value)?Math.max(0,Math.floor((now.getTime()-dashboardTime(value))/86400000)):null;
  return{count,recounts,value,unpriced,counted:countItems.length,low,categories:[...categories].sort((a,b)=>b[1]-a[1]),usage,rows,matched,review,variance,leaders,features,activity:activity.slice(0,6),countAge:dayAge(count?.date),usageAge:dayAge(usage?.periodEnd),canAccess};
}
function dashboardCan(page){return typeof profileCanAccessPage!=='function'||profileCanAccessPage(currentProfile(),page);}
function dashboardDate(value,options={month:'short',day:'numeric'}){return dashboardTime(value)?new Date(dashboardTime(value)).toLocaleDateString('en-CA',options):'Date not recorded';}
function dashboardAge(days){return days===null?'Date not recorded':days===0?'Today':days===1?'1 day ago':`${days} days ago`;}
function dashboardAction(kind,id='',menuId=''){
  const page={count:'inventory',usage:'usage',menu:'menu',recipe:'menu',product:'products'}[kind]||kind;
  if(!dashboardCan(page)){toast('You do not have access to that area.',true);return;}
  if(kind==='menu'||kind==='recipe'){
    const menu=(state.menus||[]).find(m=>m.id===(menuId||id));
    if(menu){menuPageDepartment=menu.departmentId||'all';menuPageMenuId=menu.id;}
  }
  showPage(page);
  if(kind==='count'&&id)viewInventory(id);
  if(kind==='usage'&&id)openUsageLogView(id);
  if(kind==='recipe'&&id)openMenuItemView(id);
  if(kind==='product'&&id)openProductView(id);
}
function openDashboardCount(id){dashboardAction('count',id);}
function dashboardIcon(name){
  const paths={count:'M7 4h10v17H5V4h2M9 2h6v4H9zM8 11l2 2 5-5M8 17h8',usage:'M3 20h18M5 16l4-5 4 3 6-8M15 6h4v4',menu:'M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM14 7a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2',recipe:'M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM14 7a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2',product:'m3 7 9-4 9 4-9 4-9-4M3 7v10l9 4 9-4V7M12 11v10',arrow:'M4 12h16m-6-6 6 6-6 6',alert:'M12 3 2 21h20L12 3ZM12 9v5m0 3v1',check:'m5 12 4 4L19 6'};
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;
}
function dashboardButton(label,kind,id='',menuId='',className='brief-link'){
  return `<button type="button" class="${className}" data-brief-action="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-menu-id="${escapeHtml(menuId)}">${escapeHtml(label)}${dashboardIcon('arrow')}</button>`;
}
function dashboardEmpty(title,copy,action=''){return `<div class="brief-empty"><strong>${title}</strong><p>${copy}</p>${action}</div>`;}
function renderDashboard(){
  const root=document.getElementById('manager-dashboard');if(!root)return;
  renderDashboardOnboarding();
  const m=dashboardModel(state,new Date(),dashboardCan),e=escapeHtml;
  const pending=typeof _pendingCloudPayload!=='undefined'&&!!_pendingCloudPayload;
  const local=typeof localOnlyMode!=='undefined'&&localOnlyMode;
  const syncLabel=local?'Saved on this device':pending?'Changes waiting to sync':typeof cloudUpdatedAt!=='undefined'&&cloudUpdatedAt?`Cloud snapshot · ${dashboardDate(cloudUpdatedAt)}`:'Workspace overview';
  const c=m.count,u=m.usage;
  const finalised=c&&(c.finalised||c.status==='finalised');
  const countCard=!dashboardCan('inventory')?dashboardEmpty('Counts are restricted','Your account does not have access to inventory counts.'):!c?dashboardEmpty('Your first count starts here','A main count gives your team a shared stock baseline.',dashboardButton('Go to counts','inventory')):`
    <div class="brief-card-top"><span class="brief-eyebrow">${dashboardIcon('count')} Latest main count</span><span class="brief-pill ${finalised?'good':'amber'}">${finalised?'Finalised':c.draft?'Draft':'Not finalised'}</span></div>
    <h3>${e(c.label||'Inventory count')}</h3><p class="brief-meta">${dashboardDate(c.date,{month:'long',day:'numeric',year:'numeric'})} <span>· ${dashboardAge(m.countAge)}</span></p>
    <div class="brief-number">${m.counted?fmt(m.value):'—'}<span>Counted stock value</span></div>
    <div class="brief-count-strip"><div><b>${m.counted}</b><span>products counted</span></div><div><b>${m.low.length}</b><span>at / below par</span></div><div><b>${m.recounts.length}</b><span>linked re-counts</span></div></div>
    <div class="brief-value-bar" aria-label="Value by category">${m.categories.filter(([,v])=>v>0).slice(0,4).map(([name,val],i)=>`<span class="brief-color-${i}" style="flex:${Math.max(val,.01)}" title="${e(name)}: ${fmt(val)}"></span>`).join('')}</div>
    <div class="brief-legend">${m.categories.filter(([,v])=>v>0).slice(0,4).map(([name,val],i)=>`<span><i class="brief-color-${i}"></i>${e(name)} <b>${fmt(val)}</b></span>`).join('')}</div>
    <div class="brief-card-footer"><small>At current unit costs.${m.unpriced?` ${m.unpriced} products have no cost.`:''} Re-counts excluded.</small>${dashboardButton('Review count','count',c.id)}</div>`;
  const start=u?.periodStart||(u?.rows||[]).find(r=>r.periodStart)?.periodStart;
  const end=u?.periodEnd||(u?.rows||[]).find(r=>r.periodEnd)?.periodEnd;
  const usageCard=!dashboardCan('usage')?dashboardEmpty('Usage is restricted','Your account does not have access to usage reports.'):!u?dashboardEmpty('Bring your usage into focus','Upload a report to compare actual and ideal usage.',dashboardButton('Go to usage','usage')):`
    <div class="brief-card-top"><span class="brief-eyebrow">${dashboardIcon('usage')} Latest usage period</span><span class="brief-pill ${m.review.length?'amber':'good'}">${m.review.length?`${m.review.length} to review`:'All rows linked'}</span></div>
    <h3>${start&&end?`${dashboardDate(start)} – ${dashboardDate(end,{month:'short',day:'numeric',year:'numeric'})}`:'Reporting dates unavailable'}</h3><p class="brief-meta brief-truncate" title="${e(u.fileName||'')}">${e(u.fileName||'Usage report')}</p>
    <div class="brief-number ${m.variance>0?'brief-unfavorable':''}">${m.variance===null?'—':`${m.variance>0?'+':''}${fmt(m.variance)}`}<span>Reported cost variance${m.variance===null?' unavailable':m.variance>0?' · above ideal':m.variance<0?' · below ideal':''}</span></div>
    <div class="brief-usage-detail"><div><span>Product matching</span><b>${m.matched.length} / ${m.rows.length} rows</b></div><progress value="${m.matched.length}" max="${m.rows.length||1}" aria-label="Usage rows linked to products"></progress><small>From ${m.rows.filter(r=>r.matched&&!r.needsReview&&dashboardNumber(r.estimatedCostVariance)!==null).length} linked, reviewed rows with reported costs.</small></div>
    <div class="brief-card-footer"><small>Uploaded ${dashboardDate(u.createdAt)}. Period ended ${dashboardAge(m.usageAge).toLowerCase()}.</small>${dashboardButton('Open report','usage',u.id)}</div>`;
  const alerts=[];
  if(pending||local)alerts.push({title:pending?'Cloud save is pending':'You are working locally',copy:pending?'Keep this tab open until your latest changes finish syncing.':'Changes on this device are not confirmed in the shared workspace.',kind:'',tone:'amber'});
  if(c&&!finalised)alerts.push({title:'Finish the latest count',copy:`${c.label||'Latest count'} is ${c.draft?'a draft':'saved but not finalised'}.`,kind:'count',id:c.id,tone:'amber'});
  if(m.review.length)alerts.push({title:`Review ${m.review.length} usage rows`,copy:'Unlinked or flagged rows can make the report incomplete.',kind:'usage',id:u.id,tone:'amber'});
  if(m.usageAge>35)alerts.push({title:'Usage covers an older period',copy:`The latest period ended ${dashboardDate(end)} (${m.usageAge} days ago).`,kind:'usage',id:u.id,tone:'neutral'});
  if(m.low.length)alerts.push({title:`${m.low.length} product${m.low.length===1?'':'s'} at or below par`,copy:'Based on the latest main count, before subsequent deliveries or usage.',kind:'count',id:c.id,tone:'amber'});
  const attention=alerts.length?alerts.map(a=>`<div class="brief-attention-row"><span class="brief-alert-icon ${a.tone}">${dashboardIcon('alert')}</span><div><strong>${e(a.title)}</strong><p>${e(a.copy)}</p></div>${a.kind?dashboardButton('Review',a.kind,a.id):''}</div>`).join(''):dashboardEmpty('Nothing flagged in this snapshot','No count, usage or sync issues were identified from the available data.');
  const featureItems=m.features.flatMap(menu=>(menu.items||[]).filter(item=>!item.archived).map(item=>({menu,item}))).slice(0,3);
  const featureTitle=m.features[0]?.name||'Your menu, ready for service';
  const featureCopy=m.features.length?`${m.features.reduce((n,menu)=>n+(menu.items||[]).length,0)} recipes across ${[...new Set(m.features.flatMap(menu=>menu.departmentIds||[menu.departmentId]))].map(x=>x==='bar'?'Bar':x==='kitchen'?'Kitchen':x).join(' & ')}. Open a recipe before the pre-shift briefing.`:'Active menus and their recipes will appear here.';
  root.innerHTML=`<header class="brief-header"><div><div class="brief-eyebrow">${dashboardDate(new Date().toISOString(),{weekday:'long',month:'long',day:'numeric'})} <span class="brief-header-dot">/</span> Manager’s brief</div><h2>Your operation, at a glance<span>.</span></h2><p>The latest numbers. The next decisions. One place.</p></div><div class="brief-header-actions"><span class="brief-sync ${pending||local?'amber':''}"><i></i>${e(syncLabel)}</span><button class="brief-export" type="button" onclick="xlDashboard()">Export brief ↓</button></div></header>
    <div class="brief-grid"><section class="brief-panel brief-count" aria-label="Latest count">${countCard}</section><section class="brief-panel brief-usage" aria-label="Latest usage report">${usageCard}</section></div>
    <div class="brief-middle"><section class="brief-panel brief-attention" aria-labelledby="brief-attention-title"><div class="brief-section-title"><div><span class="brief-eyebrow">Make the next move</span><h3 id="brief-attention-title">Needs your attention <span class="brief-counter">${alerts.length}</span></h3></div></div>${attention}</section>
    <section class="brief-panel brief-variance" aria-labelledby="brief-variance-title"><span class="brief-eyebrow">From the latest report</span><h3 id="brief-variance-title">Largest cost gaps</h3><p class="brief-meta">Reported actual cost above ideal</p>${m.leaders.length?m.leaders.map((r,i)=>`<div class="brief-gap-row"><span class="brief-rank">0${i+1}</span><div><strong>${e(r.matchedName||productName(r))}</strong><div class="brief-gap-track"><i style="width:${Math.max(4,Number(r.estimatedCostVariance)/Number(m.leaders[0].estimatedCostVariance)*100)}%"></i></div></div><b>+${fmt(Number(r.estimatedCostVariance))}</b></div>`).join(''):dashboardEmpty('No cost gaps to rank','A linked report with cost variance is needed.')}<small class="brief-footnote">${m.leaders.length?'Investigate these items first. Costs are taken from the report, not recalculated.':'Missing cost data is not treated as zero.'}</small></section></div>
    ${dashboardCan('menu')?`<section class="brief-features" aria-labelledby="brief-features-title"><div class="brief-feature-intro"><span class="brief-eyebrow">On the menu <span class="brief-pill">Current collection</span></span><h3 id="brief-features-title">${e(featureTitle)}</h3><p>${e(featureCopy)}</p>${dashboardButton('Explore menus','menu')}</div><div class="brief-feature-list">${featureItems.map(({menu,item},i)=>`<button type="button" class="brief-feature" data-brief-action="recipe" data-id="${e(item.id)}" data-menu-id="${e(menu.id)}">${item.imageUrl?`<img class="brief-feature-photo" src="${e(item.imageUrl)}" alt="${e(item.name)}" loading="lazy">`:`<span class="brief-feature-num">0${i+1}</span>`}<span><small>${e(menu.allDepartments?'ALL DEPARTMENTS':menu.departmentId==='bar'?'BAR':menu.departmentId==='kitchen'?'KITCHEN':menu.departmentId||'MENU')} · ${e(item.category||'Recipe')}</small><strong>${e(item.name)}</strong><span>${e(item.description||'View ingredients and preparation')}</span></span>${dashboardIcon('arrow')}</button>`).join('')||dashboardEmpty('No active menus yet','Activate a menu to share it with your team.')}</div></section>`:''}
    <section class="brief-panel brief-activity" aria-labelledby="brief-activity-title"><div class="brief-section-title"><div><span class="brief-eyebrow">Keep the team in the loop</span><h3 id="brief-activity-title">Latest additions & updates</h3></div><span class="brief-meta">Most recent recorded activity</span></div><div class="brief-activity-grid">${m.activity.map(a=>`<button type="button" class="brief-activity-item" data-brief-action="${a.kind}" data-id="${e(a.id)}" data-menu-id="${e(a.menuId||'')}"><span class="brief-activity-icon">${dashboardIcon(a.kind)}</span><span><small>${e(a.detail)}</small><strong>${e(a.name)}</strong><time datetime="${e(a.date)}">${dashboardDate(a.date,{month:'short',day:'numeric',year:'numeric'})}</time></span>${dashboardIcon('arrow')}</button>`).join('')||dashboardEmpty('A fresh start','New menu imports, product additions and recipe edits will appear here.')}</div><p class="brief-footnote">Older recipes without an edit date are not shown as recent updates.</p></section>`;
  root.onclick=event=>{const target=event.target.closest('[data-brief-action]');if(target)dashboardAction(target.dataset.briefAction,target.dataset.id,target.dataset.menuId);};
  function productName(row){return (state.products||[]).find(p=>p.id===row.productId)?.name||row.productName||'Unnamed product';}
}
