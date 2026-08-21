(() => {
  const CATEGORIES = [
    ['all','הכול','🧭'],['pokemon','Pokémon / קלפים','⚡'],['hotwheels','Hot Wheels','🏎️'],['lego','LEGO','🧱'],['boardgames','משחקי קופסה','🎲'],['gaming','גיימינג','🎮'],['cameras','מצלמות','📷'],['watches','שעונים','⌚'],['vintage','וינטג׳ / צעצועים','🧸'],['comics','קומיקס','💥'],['other','אחר','📦']
  ];
  const SOURCES = ['Facebook Marketplace','יד2','eBay Auction','KSP','Mister Helium','Player1','JoyMobile','Dubi Toys','Card Master','חנות מקומית','שוק פשפשים','אחר'];
  const DEFAULT_SOURCES = [
    {id:'facebook',name:'Facebook Marketplace',icon:'f',enabled:true,mode:'assisted',note:'הדבקת קישור/טקסט + התראות שמורות'},
    {id:'yad2',name:'יד2',icon:'2',enabled:true,mode:'live',note:'מודעות חדשות ומחיר חריג'},
    {id:'ebay',name:'eBay Auctions',icon:'e',enabled:true,mode:'api',note:'מכרזים קרובים לסיום + active comps'},
    {id:'israel',name:'חנויות ישראליות',icon:'₪',enabled:true,mode:'live',note:'KSP, Mister Helium, Player1 ועוד'},
    {id:'uk',name:'UK / EU Drops',icon:'🌍',enabled:true,mode:'live',note:'רק עם מסלול משלוח לישראל'},
    {id:'digital',name:'Digital Packs',icon:'◈',enabled:true,mode:'watch',note:'מבצעים, boosted odds ופדיון פיזי'}
  ];
  const DEFAULT_KEYWORDS = ['ארגז צעצועים','אוסף ישן','לא מבין בזה','הכול ביחד','פינוי דירה','מחסן','מהדורה מוגבלת','sealed','לא נבדק','ירושה'];
  const SAMPLE_DEALS = [
    {id:'s1',demo:true,title:'Pokémon 151 Elite Trainer Box',category:'pokemon',source:'דוגמה בלבד',price:199,market:430,shipping:20,repair:0,fee:10,demand:5,rarity:4,auth:88,comps:8,interest:4,url:'',notes:'דוגמה למוצר סגור במחיר חריג',created:Date.now()-8*60000},
    {id:'s2',demo:true,title:'Hot Wheels RLC Nissan Skyline sealed',category:'hotwheels',source:'דוגמה בלבד',price:120,market:370,shipping:0,repair:0,fee:12,demand:5,rarity:5,auth:80,comps:6,interest:4,url:'',notes:'נדרש לבדוק מדבקה ומספר מהדורה',created:Date.now()-19*60000},
    {id:'s3',demo:true,title:'LEGO Haunted House 10228 — לא שלם',category:'lego',source:'דוגמה בלבד',price:250,market:850,shipping:40,repair:180,fee:10,demand:4,rarity:5,auth:75,comps:3,interest:3,url:'',notes:'סיכון גבוה בגלל חלקים חסרים',created:Date.now()-36*60000},
    {id:'s4',demo:true,title:'Catan 3D Edition sealed',category:'boardgames',source:'דוגמה בלבד',price:150,market:330,shipping:0,repair:0,fee:10,demand:3,rarity:3,auth:95,comps:4,interest:2,url:'',notes:'איסוף מקומי',created:Date.now()-52*60000}
  ];
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const money = n => `₪${Math.round(Number(n||0)).toLocaleString('he-IL')}`;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

  let state = {
    deals: load('tr_deals', SAMPLE_DEALS), inventory: load('tr_inventory', []), sold: load('tr_sold', []),
    sources: load('tr_sources', DEFAULT_SOURCES), keywords: load('tr_keywords', DEFAULT_KEYWORDS),
    settings: load('tr_settings',{backendUrl:'',jackpot:55,minProfit:60}), category:'all', sort:'score'
  };

  function analyze(d){
    const price=+d.price||0, market=+d.market||0, shipping=+d.shipping||0, repair=+d.repair||0, fee=+d.fee||0;
    const landed=price+shipping+repair;
    const sale=market;
    const fees=sale*(fee/100);
    const profit=sale-fees-landed;
    const roi=landed>0?profit/landed*100:0;
    const discount=market>0?(market-landed)/market*100:0;
    const compConfidence=clamp((+d.comps||0)/8,0,1)*20;
    const confidence=clamp((+d.auth||0)*.72+compConfidence+(+d.demand||3)*1.6,0,100);
    let score=0;
    score += clamp(discount, -20, 75)*.55;
    score += clamp(roi, -50, 180)*.15;
    score += (+d.demand||3)*3.3;
    score += (+d.rarity||3)*2.1;
    score += confidence*.12;
    if(profit<0) score-=25;
    if((+d.auth||0)<60) score-=12;
    if((+d.comps||0)<2) score-=7;
    score=Math.round(clamp(score,0,100));
    let verdict='PASS';
    if(discount>=state.settings.jackpot && profit>=150 && confidence>=68 && score>=78) verdict='JACKPOT';
    else if(score>=66 && profit>=state.settings.minProfit && roi>=25) verdict='BUY';
    else if(score>=47 || (discount>=30 && profit>0)) verdict='WATCH';
    const keepScore=Math.round(clamp((+d.interest||3)*13+(+d.rarity||3)*7+clamp(discount,0,60)*.35+(+d.auth||0)*.08,0,100));
    const targetCost = sale-fees-Math.max(state.settings.minProfit, sale*.2);
    const maxOffer = Math.max(0,Math.floor(targetCost-shipping-repair));
    return {landed,sale,fees,profit,roi,discount,confidence,score,verdict,keepScore,maxOffer};
  }
  function categoryInfo(id){return CATEGORIES.find(x=>x[0]===id)||CATEGORIES.at(-1)}
  function age(ts){const m=Math.max(1,Math.round((Date.now()-ts)/60000));return m<60?`לפני ${m} דק׳`:`לפני ${Math.round(m/60)} שע׳`}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2200)}
  function go(view){$$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));$$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.go===view));scrollTo({top:0,behavior:'smooth'});if(view==='vault')renderInventory();if(view==='flips')renderFlips();if(view==='watch')renderSources()}
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

  function renderChips(){
    $('#categoryChips').innerHTML=CATEGORIES.map(c=>`<button class="chip ${state.category===c[0]?'active':''}" data-cat="${c[0]}">${c[2]} ${c[1]}</button>`).join('');
    $$('#categoryChips [data-cat]').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderChips();renderDeals()});
  }
  function badge(verdict){const cls=verdict==='JACKPOT'?'jackpot':verdict==='BUY'?'buy':verdict==='WATCH'?'watch':'risk';return `<span class="tag ${cls}">${verdict}</span>`}
  function renderDeals(){
    let deals=[...state.deals];
    if(state.category!=='all') deals=deals.filter(d=>d.category===state.category);
    deals.sort((a,b)=>state.sort==='score'?analyze(b).score-analyze(a).score:b.created-a.created);
    $('#statDeals').textContent=state.deals.length;
    $('#statJackpots').textContent=state.deals.filter(d=>analyze(d).verdict==='JACKPOT').length;
    const liveCount=state.deals.filter(d=>!d.demo).length;
    $('#feedCaption').textContent=liveCount?`${liveCount} מציאות שלך + נתוני רדאר`:'דוגמאות מקומיות עד חיבור לסורק';
    const el=$('#dealList');
    if(!deals.length){el.innerHTML='<div class="empty"><b>אין תוצאות במסנן הזה</b>נסה קטגוריה אחרת או הוסף מציאה.</div>';return}
    el.innerHTML=deals.map(d=>{const a=analyze(d),cat=categoryInfo(d.category);return `
      <article class="deal ${a.verdict==='JACKPOT'?'hot':''}">
        <div class="score">${a.score}</div>
        <div class="deal-top"><div class="thumb">${d.image?`<img src="${esc(d.image)}" alt="">`:cat[2]}</div><div class="deal-body">
          <div class="tags">${badge(a.verdict)}<span class="tag">${esc(d.source)}</span>${d.demo?'<span class="tag risk">DEMO</span>':''}</div>
          <h4>${esc(d.title)}</h4><div class="meta"><span>${cat[1]}</span><span>•</span><span>${age(d.created||Date.now())}</span><span>•</span><span>ביטחון ${Math.round(a.confidence)}%</span></div>
        </div></div>
        <div class="price-row"><div class="ask"><small>מחיר מבוקש</small><strong>${money(d.price)}</strong></div><div class="market"><small>שוק משוער</small><b>${money(d.market)}</b><small>${a.discount>=0?Math.round(a.discount)+'% מתחת לשוק':'מעל השוק'}</small></div></div>
        <div class="deal-actions"><button class="btn small primary" data-action="details" data-id="${d.id}">פרטים</button><button class="btn small" data-action="vault" data-id="${d.id}">לכספת</button>${d.url?`<button class="btn small" data-action="open" data-id="${d.id}">מודעה</button>`:''}</div>
      </article>`}).join('');
    $$('[data-action]').forEach(b=>b.onclick=()=>dealAction(b.dataset.action,b.dataset.id));
  }
  function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
  function dealAction(action,id){const d=state.deals.find(x=>x.id===id);if(!d)return;
    if(action==='open'&&d.url) window.open(d.url,'_blank','noopener');
    if(action==='vault'){addToVault(d)}
    if(action==='details'){fillForm(d);go('analyze');setTimeout(()=>showResult(d),80)}
  }
  function fillForm(d){
    const map={aTitle:'title',aCategory:'category',aSource:'source',aPrice:'price',aMarket:'market',aShipping:'shipping',aRepair:'repair',aFee:'fee',aComps:'comps',aDemand:'demand',aRarity:'rarity',aAuth:'auth',aInterest:'interest',aUrl:'url',aNotes:'notes'};
    Object.entries(map).forEach(([id,k])=>{const e=$('#'+id);if(e)e.value=d[k]??''});
  }
  function readForm(){return {id:uid(),title:$('#aTitle').value.trim(),category:$('#aCategory').value,source:$('#aSource').value,price:+$('#aPrice').value,market:+$('#aMarket').value,shipping:+$('#aShipping').value||0,repair:+$('#aRepair').value||0,fee:+$('#aFee').value||0,comps:+$('#aComps').value||0,demand:+$('#aDemand').value,rarity:+$('#aRarity').value,auth:+$('#aAuth').value,interest:+$('#aInterest').value,url:$('#aUrl').value.trim(),notes:$('#aNotes').value.trim(),created:Date.now()}}
  $('#analyzeForm').addEventListener('submit',e=>{e.preventDefault();const d=readForm();showResult(d)});
  function showResult(d){
    const a=analyze(d), cls=a.verdict.toLowerCase(), reasons=[];
    reasons.push(`${Math.round(a.discount)}% מתחת לשווי שהוזן, אחרי משלוח ותיקון.`);
    reasons.push(`רווח משוער ${money(a.profit)} אחרי עמלה; ROI משוער ${Math.round(a.roi)}%.`);
    if(a.confidence<65) reasons.push('ביטחון נמוך יחסית — לא קונים לפני אימות מצב ומקוריות.');
    if(d.comps<3) reasons.push('מעט מכירות השוואה — שווי השוק פחות אמין.');
    if(a.maxOffer<d.price) reasons.push(`מחיר הצעה בטוח יותר: עד ${money(a.maxOffer)}.`); else reasons.push('המחיר כבר מתחת להצעת היעד; התמקחות עלולה לאבד את המציאה.');
    const r=$('#analysisResult');r.className='analysis-card show';r.innerHTML=`
      <div class="verdict-row"><div><div class="eyebrow">TREASURE SCORE</div><div class="verdict ${cls}">${a.verdict}</div></div><div class="big-score">${a.score}</div></div>
      <div class="metrics"><div class="metric"><span>עלות מלאה</span><b>${money(a.landed)}</b></div><div class="metric"><span>רווח משוער</span><b>${money(a.profit)}</b></div><div class="metric"><span>ROI</span><b>${Math.round(a.roi)}%</b></div><div class="metric"><span>הנחה מול שוק</span><b>${Math.round(a.discount)}%</b></div><div class="metric"><span>ביטחון</span><b>${Math.round(a.confidence)}%</b></div><div class="metric"><span>ציון KEEP</span><b>${a.keepScore}</b></div></div>
      <ul class="reason-list">${reasons.map(x=>`<li>${x}</li>`).join('')}</ul>
      <div class="deal-actions"><button class="btn primary" id="saveFinding">שמור ברדאר</button><button class="btn" id="buyFinding">נקנה / לכספת</button></div>`;
    $('#saveFinding').onclick=()=>{const exists=state.deals.find(x=>x.id===d.id);if(!exists){state.deals.unshift(d);save('tr_deals',state.deals)}renderDeals();toast('נשמר ברדאר')};
    $('#buyFinding').onclick=()=>addToVault(d);
  }
  function addToVault(d){if(state.inventory.some(x=>x.sourceId===d.id)){toast('כבר נמצא בכספת');return}const a=analyze(d);state.inventory.unshift({id:uid(),sourceId:d.id,title:d.title,category:d.category,purchase:+d.price+(+d.shipping||0),market:+d.market,intent:a.keepScore>=70?'keep':'sell',status:'owned',target:Math.round(+d.market*.95),date:Date.now(),notes:d.notes||''});save('tr_inventory',state.inventory);renderInventory();renderStats();toast('נוסף לכספת')}
  function renderInventory(){const el=$('#inventoryList');if(!state.inventory.length){el.innerHTML='<div class="empty"><b>הכספת עדיין ריקה</b>כשקונים מציאה, מוסיפים אותה כאן ועוקבים אחרי השווי.</div>';return}
    el.innerHTML=state.inventory.map(x=>{const cat=categoryInfo(x.category),gain=x.market-x.purchase;return `<div class="inventory-item"><div class="thumb" style="width:58px;height:58px">${cat[2]}</div><div class="inventory-info"><h4>${esc(x.title)}</h4><p>נקנה ${money(x.purchase)} · שוק ${money(x.market)} · פער ${money(gain)}</p><span class="intent ${x.intent}">${x.intent==='keep'?'KEEP':'SELL'}</span></div><div class="inventory-value"><b>${money(x.market)}</b><small>שווי</small><button class="linkbtn" data-sell="${x.id}">מכור</button></div></div>`}).join('');
    $$('[data-sell]').forEach(b=>b.onclick=()=>sellItem(b.dataset.sell));
  }
  function sellItem(id){const x=state.inventory.find(i=>i.id===id);if(!x)return;const sale=prompt(`בכמה נמכר ${x.title}?`,x.target||x.market);if(sale===null)return;const fees=prompt('עמלות ומשלוח ששילמת?',Math.round(+sale*.1));if(fees===null)return;state.sold.unshift({...x,status:'sold',sale:+sale,fees:+fees,soldAt:Date.now(),profit:+sale-(+fees)-x.purchase});state.inventory=state.inventory.filter(i=>i.id!==id);save('tr_inventory',state.inventory);save('tr_sold',state.sold);renderInventory();renderStats();toast('המכירה נרשמה')}
  function renderFlips(){const el=$('#soldList');const invested=state.sold.reduce((s,x)=>s+x.purchase,0), revenue=state.sold.reduce((s,x)=>s+x.sale,0), fees=state.sold.reduce((s,x)=>s+x.fees,0), profit=state.sold.reduce((s,x)=>s+x.profit,0), roi=invested?profit/invested*100:0;$('#profitHero').textContent=`${money(profit)} רווח ממומש`;$('#flipInvested').textContent=money(invested);$('#flipRevenue').textContent=money(revenue);$('#flipFees').textContent=money(fees);$('#flipROI').textContent=`${Math.round(roi)}%`;if(!state.sold.length){el.innerHTML='<div class="empty"><b>אין מכירות עדיין</b>כשתמכור משהו מהכספת, הרווח האמיתי יופיע כאן.</div>';return}el.innerHTML=state.sold.map(x=>`<article class="deal"><div class="deal-top"><div class="thumb">${categoryInfo(x.category)[2]}</div><div class="deal-body"><div class="tags"><span class="tag buy">SOLD</span></div><h4>${esc(x.title)}</h4><div class="meta">נמכר ${new Date(x.soldAt).toLocaleDateString('he-IL')}</div></div></div><div class="price-row"><div class="ask"><small>רווח נקי</small><strong style="color:${x.profit>=0?'var(--green)':'var(--red)'}">${money(x.profit)}</strong></div><div class="market"><small>קנייה → מכירה</small><b>${money(x.purchase)} → ${money(x.sale)}</b></div></div></article>`).join('')}
  function renderStats(){const vault=state.inventory.reduce((s,x)=>s+x.market,0),profit=state.sold.reduce((s,x)=>s+x.profit,0);$('#statVault').textContent=money(vault);$('#statProfit').textContent=money(profit)}
  function renderSources(){
    $('#sourceList').innerHTML=state.sources.map(s=>`<div class="watch-card"><div class="source-icon">${s.icon}</div><div class="watch-info"><b>${s.name}</b><small>${s.note}</small></div><button class="switch ${s.enabled?'on':''}" data-source="${s.id}"><i></i></button></div>`).join('');
    $$('[data-source]').forEach(b=>b.onclick=()=>{const s=state.sources.find(x=>x.id===b.dataset.source);s.enabled=!s.enabled;save('tr_sources',state.sources);renderSources()});
    $('#keywordChips').innerHTML=state.keywords.map((k,i)=>`<button class="chip" data-keyword="${i}">${esc(k)} ×</button>`).join('');$$('[data-keyword]').forEach(b=>b.onclick=()=>{state.keywords.splice(+b.dataset.keyword,1);save('tr_keywords',state.keywords);renderSources()});
  }
  $('#addKeyword').onclick=()=>{const k=prompt('מילת חיפוש חדשה');if(k?.trim()){state.keywords.push(k.trim());save('tr_keywords',state.keywords);renderSources()}};
  function populateSelects(){
    $('#aCategory').innerHTML=CATEGORIES.filter(x=>x[0]!=='all').map(x=>`<option value="${x[0]}">${x[2]} ${x[1]}</option>`).join('');
    $('#aSource').innerHTML=SOURCES.map(x=>`<option>${x}</option>`).join('');
  }
  $('#sortDeals').onclick=()=>{state.sort=state.sort==='score'?'new':'score';$('#sortDeals').textContent=state.sort==='score'?'מיון: ציון':'מיון: חדש';renderDeals()};
  $('#openPaste').onclick=()=>$('#pasteModal').classList.add('show');
  $('#parsePaste').onclick=()=>{const t=$('#pasteText').value.trim();if(!t)return;const prices=[...t.matchAll(/(?:₪|ש["״']?ח)?\s*([0-9][0-9,.]{1,8})\s*(?:₪|ש["״']?ח)?/g)].map(m=>+m[1].replace(/,/g,''));const lines=t.split(/\n+/).map(x=>x.trim()).filter(Boolean);$('#aTitle').value=lines[0]?.slice(0,120)||'';if(prices.length)$('#aPrice').value=prices[0];const lower=t.toLowerCase();if(lower.includes('pokemon')||lower.includes('פוקימון'))$('#aCategory').value='pokemon';else if(lower.includes('hot wheels'))$('#aCategory').value='hotwheels';else if(lower.includes('lego')||lower.includes('לגו'))$('#aCategory').value='lego';$('#aNotes').value=t.slice(0,600);$('#pasteModal').classList.remove('show');toast('חילצתי את מה שאפשר. השלם שווי שוק.')};
  $$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('show'));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('show')});
  $('#settingsBtn').onclick=()=>openSettings();$('#connectionBtn').onclick=()=>openSettings();
  function openSettings(){$('#backendUrl').value=state.settings.backendUrl||'';$('#thresholdJackpot').value=state.settings.jackpot;$('#thresholdProfit').value=state.settings.minProfit;$('#settingsModal').classList.add('show')}
  $('#saveSettings').onclick=async()=>{state.settings.backendUrl=$('#backendUrl').value.trim().replace(/\/$/,'');state.settings.jackpot=+$('#thresholdJackpot').value||55;state.settings.minProfit=+$('#thresholdProfit').value||60;save('tr_settings',state.settings);await checkBackend();$('#settingsModal').classList.remove('show');renderDeals();toast('ההגדרות נשמרו')};
  async function checkBackend(){const url=state.settings.backendUrl;if(!url){setConnection(false);return false}try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(5000)});if(!r.ok)throw 0;setConnection(true);return true}catch{setConnection(false);return false}}
  function setConnection(live){$('#connectionDot').classList.toggle('local',!live);$('#connectionText').textContent=live?'סורק מחובר':'מצב מקומי'}
  async function refreshFeed(){if(await checkBackend()){try{const r=await fetch(state.settings.backendUrl+'/api/alerts?limit=100');const data=await r.json();if(Array.isArray(data)&&data.length){const mapped=data.map(x=>({...x,id:String(x.id||uid()),created:new Date(x.created_at||Date.now()).getTime(),demo:false}));state.deals=[...mapped,...state.deals.filter(x=>x.demo||!mapped.some(m=>m.url&&m.url===x.url))];save('tr_deals',state.deals);renderDeals();toast(`נטענו ${mapped.length} התראות`);return}}catch{}}
    try{const r=await fetch('data/feed.json?x='+Date.now());if(r.ok){const data=await r.json();if(Array.isArray(data.items)&&data.items.length){const mapped=data.items.map(x=>({...x,id:String(x.id||uid()),created:new Date(x.created||Date.now()).getTime(),demo:!!x.demo}));state.deals=[...mapped,...state.deals.filter(x=>!mapped.some(m=>m.id===x.id))];save('tr_deals',state.deals);renderDeals();toast('הרדאר רוענן');return}}}catch{}
    toast('אין פיד חי כרגע')
  }
  $('#refreshFeed').onclick=refreshFeed;
  $('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`treasureradar-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
  $('#importData').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());['deals','inventory','sold','sources','keywords','settings'].forEach(k=>{if(d[k])state[k]=d[k]});save('tr_deals',state.deals);save('tr_inventory',state.inventory);save('tr_sold',state.sold);save('tr_sources',state.sources);save('tr_keywords',state.keywords);save('tr_settings',state.settings);location.reload()}catch{toast('קובץ גיבוי לא תקין')}};

  populateSelects();renderChips();renderDeals();renderInventory();renderFlips();renderSources();renderStats();checkBackend();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
