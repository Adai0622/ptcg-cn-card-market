const marketCards = [
  {name:'皮卡丘 ex',setCode:'SV8',price:428,change:12.6,high:468,low:356,deals:86,history:[352,368,361,389,402,397,415,421,418,428]},
  {name:'喷火龙 ex',setCode:'SV4a',price:1280,change:-3.2,high:1460,low:1198,deals:34,history:[1380,1420,1360,1348,1390,1322,1310,1298,1320,1280]},
  {name:'莉莉艾的皮皮 ex',setCode:'SV9',price:760,change:8.4,high:820,low:648,deals:57,history:[654,670,688,702,690,718,735,728,744,760]},
  {name:'月亮伊布 VMAX',setCode:'S6a',price:6950,change:4.8,high:7280,low:6380,deals:12,history:[6400,6510,6480,6650,6720,6840,6770,6880,7020,6950]},
  {name:'美纳斯 ex',setCode:'SV8',price:239,change:18.3,high:258,low:182,deals:102,history:[184,190,198,207,204,216,222,228,234,239]},
  {name:'梦幻 ex',setCode:'SV4a',price:698,change:-1.7,high:746,low:650,deals:48,history:[720,708,716,730,710,702,715,706,700,698]},
  {name:'奈克洛兹玛 ex',setCode:'SV11B',price:318,change:6.7,high:349,low:276,deals:65,history:[280,286,294,290,301,306,300,312,315,318]},
  {name:'捷拉奥拉 ex',setCode:'SV11B',price:189,change:-5.5,high:228,low:176,deals:73,history:[214,220,209,204,208,198,202,195,192,189]},
  {name:'沙奈朵 ex',setCode:'SV4a',price:365,change:2.9,high:392,low:330,deals:41,history:[338,346,351,348,357,360,356,362,368,365]}
];

const colors = ['yellow','orange','pink','violet','blue','cyan','indigo','lime','mint'];
const state = {cards:[],query:'',kind:'全部分类',type:'全部属性',rarity:'全部稀有度',artist:'',sort:'relevance',limit:48,watchlist:[],selected:null};
const $ = (selector) => document.querySelector(selector);
const safe = (value='') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const money = (value) => `¥${value.toLocaleString('zh-CN')}`;
const normalize = (value='') => String(value).toLowerCase().replace(/[\s·・]/g,'');
const marketKey = (name,setCode) => `${normalize(name)}|${normalize(setCode)}`;
const marketMap = new Map(marketCards.map((card) => [marketKey(card.name,card.setCode),card]));

function expand(raw){
  const displayTitle=(raw.w||'').replace(/（[^（）]+）$/,'');
  const card = {
    id:raw.i,name:displayTitle||raw.n||raw.w||'未命名卡牌',nameEn:raw.e||'',title:raw.w||raw.n||'',kind:raw.k||'其他',subtype:raw.st||'',
    type:raw.t||'',hp:raw.h||'',stage:raw.g||'',set:raw.s||'',setCode:raw.sc||'',series:raw.se||'',number:raw.no||'',rarity:raw.r||'',
    artist:raw.a||'',language:raw.l||'',releaseDate:raw.d||'',sets:raw.ss||[],setCodes:raw.scs||[],numbers:raw.nos||[],rarities:raw.rs||[],
    artists:raw.as||[],languages:raw.ls||[],printCount:raw.pc||0,source:raw.u||''
  };
  const market = marketMap.get(marketKey(card.name,card.setCode));
  if(market) Object.assign(card,market);
  card.color = colors[Math.abs(card.id||0)%colors.length];
  card.search = [card.name,card.nameEn,card.title,card.kind,card.subtype,card.type,card.set,card.setCode,card.series,card.number,card.rarity,card.artist,...card.sets,...card.setCodes,...card.numbers,...card.rarities,...card.artists].join(' ').toLowerCase();
  return card;
}

function unique(values){ return [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'zh-CN')); }
function optionList(label,values){ return [`<option>${label}</option>`,...values.map((value)=>`<option>${safe(value)}</option>`)].join(''); }

function artwork(card,large=false){
  const displayName=card.name.replace(/\s*(ex|VMAX|VSTAR|GX)$/i,'');
  return `<div class="card-art art-${card.color}${large?' art-large':''}" aria-label="${safe(card.name)}卡面资料示意"><div class="art-glow"></div><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><span class="art-type">${safe(card.type||card.kind.slice(0,1))}</span><div class="art-name">${safe(displayName)}</div><div class="art-set">${safe(card.setCode||card.kind)} · ${safe(card.rarity||card.language||'资料')}</div></div>`;
}

function filteredCards(){
  const keyword=state.query.trim().toLowerCase();
  const artist=state.artist.trim().toLowerCase();
  const items=state.cards.filter((card)=>(!keyword||card.search.includes(keyword))&&(state.kind==='全部分类'||card.kind===state.kind)&&(state.type==='全部属性'||card.type===state.type)&&(state.rarity==='全部稀有度'||card.rarities.includes(state.rarity)||card.rarity===state.rarity)&&(!artist||card.artists.some((value)=>value.toLowerCase().includes(artist))||card.artist.toLowerCase().includes(artist)));
  if(state.sort==='name') items.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  else if(state.sort==='set') items.sort((a,b)=>(a.set||'末').localeCompare(b.set||'末','zh-CN')||a.name.localeCompare(b.name,'zh-CN'));
  else if(state.sort==='date') items.sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
  else items.sort((a,b)=>Number(Boolean(b.price))-Number(Boolean(a.price))||b.printCount-a.printCount||a.name.localeCompare(b.name,'zh-CN'));
  return items;
}

function cardTemplate(card){
  const watched=state.watchlist.includes(card.id);
  const priced=Number.isFinite(card.price);
  const priceBlock=priced?`<div class="price-row"><div><span>最新成交</span><strong>${money(card.price)}</strong></div><div class="change ${card.change>=0?'positive':'negative'}">${card.change>=0?'↑':'↓'} ${Math.abs(card.change)}%</div></div><div class="range-row"><span>¥${card.low}</span><div><i style="left:${Math.max(8,Math.min(92,((card.price-card.low)/(card.high-card.low))*100))}%"></i></div><span>¥${card.high}</span></div>`:`<div class="price-row"><div><span>卡牌资料</span><strong class="catalog-value">${safe(card.hp?`HP ${card.hp}`:(card.subtype||card.kind))}</strong></div><span class="source-badge">${card.printCount||1} 个发行记录</span></div>`;
  return `<article class="price-card" data-card-id="${card.id}"><button class="watch${watched?' watched':''}" data-action="watch" aria-label="${watched?'取消关注':'关注'}${safe(card.name)}">☆</button><button class="card-main" data-action="detail" aria-label="查看${safe(card.name)}卡牌详情">${artwork(card)}<div class="card-copy"><span class="rarity">${safe(card.rarity||card.kind)}</span><h3>${safe(card.name)}</h3><p>${safe(card.nameEn||card.title)}</p><dl><div><dt>编号</dt><dd>${safe(card.number||'—')}</dd></div><div><dt>系列</dt><dd>${safe(card.set||card.series||'—')} ${safe(card.setCode)}</dd></div><div><dt>画师</dt><dd>${safe(card.artist||'—')}</dd></div></dl></div></button>${priceBlock}<button class="detail-link" data-action="detail">查看卡牌资料${priced?`与 ${card.deals} 笔成交记录`:''}<span>→</span></button></article>`;
}

function render(){
  const results=filteredCards();
  const visible=results.slice(0,state.limit);
  $('#result-count').textContent=results.length.toLocaleString('zh-CN');
  $('#visible-count').textContent=visible.length.toLocaleString('zh-CN');
  $('#card-grid').innerHTML=visible.map(cardTemplate).join('');
  $('#card-grid').hidden=!visible.length;
  $('#empty-state').hidden=Boolean(visible.length)||!state.cards.length;
  $('#load-more').hidden=visible.length>=results.length;
  $('#load-more').textContent=`加载更多卡牌（剩余 ${(results.length-visible.length).toLocaleString('zh-CN')} 张）`;
  $('#watch-count').textContent=state.watchlist.length;
  const watched=state.cards.filter((card)=>state.watchlist.includes(card.id)).slice(0,3);
  $('#watch-stack').innerHTML=watched.length?watched.map((card,index)=>`<div style="--i:${index}"><b>${safe(card.name)}</b><span>${card.price?money(card.price):safe(card.setCode||card.kind)}</span></div>`).join(''):'<div class="no-watch">还没有关注的卡牌</div>';
}

function resetFilters(){
  Object.assign(state,{query:'',kind:'全部分类',type:'全部属性',rarity:'全部稀有度',artist:'',sort:'relevance',limit:48});
  $('#search-input').value=''; $('#kind-filter').value=state.kind; $('#type-filter').value=state.type; $('#rarity-filter').value=state.rarity; $('#artist-filter').value=''; $('#sort-filter').value=state.sort; $('#clear-search').hidden=true; render();
}

function openModal(card){
  state.selected=card;
  const priced=Number.isFinite(card.price);
  const priceSection=priced?`<div class="modal-price"><span>最新成交价</span><strong>${money(card.price)}</strong><em class="${card.change>=0?'positive':'negative'}">${card.change>=0?'+':''}${card.change}%</em></div>`:`<div class="database-summary">当前仅收录卡牌资料，暂无可信的中国区成交价格。你可以通过下方来源链接查看完整的百科页面。</div>`;
  $('#modal-content').innerHTML=`<div class="modal-top">${artwork(card,true)}<div><span class="rarity">${safe(card.rarity||card.kind)} · ${safe(card.setCode||card.language||'资料库')}</span><h2 id="detail-title">${safe(card.name)}</h2><p>${safe(card.nameEn||card.title)} · ${safe(card.number||'暂无编号')}</p>${priceSection}<button class="modal-watch${state.watchlist.includes(card.id)?' active':''}" id="modal-watch">${state.watchlist.includes(card.id)?'★ 已关注':'☆ 加入关注'}</button></div></div><div class="modal-meta"><div><span>分类 / 属性</span><b>${safe([card.kind,card.subtype||card.type].filter(Boolean).join(' · ')||'—')}</b></div><div><span>系列</span><b>${safe(card.set||card.series||'—')}</b></div><div><span>发行语言</span><b>${safe(card.languages.join('、')||card.language||'—')}</b></div><div><span>画师</span><b>${safe(card.artists.join('、')||card.artist||'—')}</b></div><div><span>编号</span><b>${safe(card.numbers.join('、')||card.number||'—')}</b></div><div><span>发行记录</span><b>${card.printCount||1} 个</b></div></div><a class="modal-source" href="${safe(card.source)}" target="_blank" rel="noreferrer">在 52Poké 查看完整资料 →</a>`;
  $('#modal-backdrop').hidden=false; document.body.style.overflow='hidden';
}

function closeModal(){ $('#modal-backdrop').hidden=true; document.body.style.overflow=''; state.selected=null; }
function saveWatchlist(){ localStorage.setItem('ptcg-watchlist',JSON.stringify(state.watchlist)); }

async function loadDatabase(){
  $('#card-grid').innerHTML='<div class="empty" style="grid-column:1/-1"><span>⌛</span><h3>正在载入全量卡牌资料</h3><p>首次加载需要数秒，请稍候。</p></div>';
  try{
    const response=await fetch('data/cards.json');
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    state.cards=payload.cards.map(expand);
    try{ state.watchlist=JSON.parse(localStorage.getItem('ptcg-watchlist')||'[]').filter((id)=>state.cards.some((card)=>card.id===id)); }catch{ state.watchlist=[]; }
    const artists=unique(state.cards.flatMap((card)=>card.artists));
    $('#kind-filter').innerHTML=optionList('全部分类',unique(state.cards.map((card)=>card.kind)));
    $('#type-filter').innerHTML=optionList('全部属性',unique(state.cards.map((card)=>card.type)));
    $('#rarity-filter').innerHTML=optionList('全部稀有度',unique(state.cards.flatMap((card)=>card.rarities)));
    $('#artist-options').innerHTML=artists.map((artist)=>`<option value="${safe(artist)}"></option>`).join('');
    $('#database-count').textContent=payload.count.toLocaleString('zh-CN');
    $('#cn-count').textContent=state.cards.filter((card)=>card.languages.includes('简中')).length.toLocaleString('zh-CN');
    $('#artist-count').textContent=artists.length.toLocaleString('zh-CN');
    $('#sync-time').textContent=new Date(payload.generatedAt).toLocaleDateString('zh-CN');
    render();
  }catch(error){
    $('#card-grid').innerHTML=`<div class="empty" style="grid-column:1/-1"><span>!</span><h3>卡牌资料载入失败</h3><p>${safe(error.message)}，请刷新页面重试。</p></div>`;
  }
}

$('#search-input').addEventListener('input',(event)=>{state.query=event.target.value;state.limit=48;$('#clear-search').hidden=!state.query;render();});
$('#clear-search').addEventListener('click',()=>{state.query='';state.limit=48;$('#search-input').value='';$('#clear-search').hidden=true;render();});
$('#search-button').addEventListener('click',()=>$('#market').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('[data-term]').forEach((button)=>button.addEventListener('click',()=>{state.query=button.dataset.term;state.limit=48;$('#search-input').value=state.query;$('#clear-search').hidden=false;render();$('#market').scrollIntoView({behavior:'smooth'});}));
['kind','type','rarity','sort'].forEach((key)=>$(`#${key}-filter`).addEventListener('change',(event)=>{state[key]=event.target.value;state.limit=48;render();}));
$('#artist-filter').addEventListener('input',(event)=>{state.artist=event.target.value;state.limit=48;render();});
$('#reset-filters').addEventListener('click',resetFilters); $('#empty-reset').addEventListener('click',resetFilters);
$('#load-more').addEventListener('click',()=>{state.limit+=48;render();});
$('#card-grid').addEventListener('click',(event)=>{const article=event.target.closest('[data-card-id]');if(!article)return;const card=state.cards.find((item)=>item.id===Number(article.dataset.cardId));const action=event.target.closest('[data-action]')?.dataset.action;if(action==='watch'){state.watchlist=state.watchlist.includes(card.id)?state.watchlist.filter((id)=>id!==card.id):[...state.watchlist,card.id];saveWatchlist();render();}else if(action==='detail'){openModal(card);}});
$('#modal-close').addEventListener('click',closeModal); $('#modal-backdrop').addEventListener('click',(event)=>{if(event.target===event.currentTarget)closeModal();});
$('#modal-content').addEventListener('click',(event)=>{if(event.target.id==='modal-watch'&&state.selected){const id=state.selected.id;state.watchlist=state.watchlist.includes(id)?state.watchlist.filter((item)=>item!==id):[...state.watchlist,id];saveWatchlist();render();openModal(state.selected);}});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!$('#modal-backdrop').hidden)closeModal();});

loadDatabase();
