const colors = ['yellow','orange','pink','violet','blue','cyan','indigo','lime','mint'];
const state = {cards:[],query:'',kind:'全部分类',type:'全部属性',series:'全部系列',rarity:'全部稀有度',language:'全部语言',market:'全部数据',artist:'',sort:'relevance',view:'grid',limit:48,watchlist:[],selected:null};
const $ = (selector) => document.querySelector(selector);
const safe = (value='') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const money = (value) => `¥${value.toLocaleString('zh-CN')}`;
const normalize = (value='') => String(value).toLowerCase().replace(/[\s·・]/g,'');
let marketMap = new Map();

function expand(raw){
  const displayTitle=(raw.w||'').replace(/（[^（）]+）$/,'');
  const card = {
    id:raw.i,name:displayTitle||raw.n||raw.w||'未命名卡牌',nameEn:raw.e||'',title:raw.w||raw.n||'',kind:raw.k||'其他',subtype:raw.st||'',
    type:raw.t||'',hp:raw.h||'',stage:raw.g||'',set:raw.s||'',setCode:raw.sc||'',series:raw.se||'',number:raw.no||'',rarity:raw.r||'',
    artist:raw.a||'',language:raw.l||'',releaseDate:raw.d||'',sets:raw.ss||[],setCodes:raw.scs||[],numbers:raw.nos||[],rarities:raw.rs||[],
    artists:raw.as||[],languages:raw.ls||[],printCount:raw.pc||0,source:raw.u||''
  };
  const marketNames=[card.name,raw.n,(raw.w||'').replace(/（[^（）]+）$/,'')].filter(Boolean);
  const marketCodes=[card.setCode,...card.setCodes].filter(Boolean);
  let market;
  for(const name of marketNames){
    for(const setCode of marketCodes){
      market=marketMap.get(window.MarketDataAdapter.keyOf({name,setCode}));
      if(market) break;
    }
    if(market) break;
  }
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
  const items=state.cards.filter((card)=>(!keyword||card.search.includes(keyword))
    &&(state.kind==='全部分类'||card.kind===state.kind)
    &&(state.type==='全部属性'||card.type===state.type)
    &&(state.series==='全部系列'||card.series===state.series)
    &&(state.rarity==='全部稀有度'||card.rarities.includes(state.rarity)||card.rarity===state.rarity)
    &&(state.language==='全部语言'||card.languages.includes(state.language)||card.language===state.language)
    &&(state.market==='全部数据'||(state.market==='有成交价'&&Number.isFinite(card.price))||(state.market==='待补充'&&!Number.isFinite(card.price)))
    &&(!artist||card.artists.some((value)=>value.toLowerCase().includes(artist))||card.artist.toLowerCase().includes(artist)));
  if(state.sort==='name') items.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  else if(state.sort==='set') items.sort((a,b)=>(a.set||'末').localeCompare(b.set||'末','zh-CN')||a.name.localeCompare(b.name,'zh-CN'));
  else if(state.sort==='date') items.sort((a,b)=>(b.releaseDate||'').localeCompare(a.releaseDate||''));
  else if(state.sort==='price-high') items.sort((a,b)=>(b.price??-1)-(a.price??-1));
  else if(state.sort==='price-low') items.sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));
  else if(state.sort==='deals') items.sort((a,b)=>(b.deals||0)-(a.deals||0));
  else items.sort((a,b)=>Number(Boolean(b.price))-Number(Boolean(a.price))||b.printCount-a.printCount||a.name.localeCompare(b.name,'zh-CN'));
  return items;
}

function cardTemplate(card){
  const watched=state.watchlist.includes(card.id);
  const priced=Number.isFinite(card.price);
  const spread=Math.max(1,(card.high||card.price)-(card.low||card.price));
  const rangeLeft=Math.max(8,Math.min(92,((card.price-(card.low||card.price))/spread)*100));
  const priceBlock=priced?`<div class="price-row"><div><span>最新成交价</span><strong>${money(card.price)}</strong></div><div class="change ${card.change>=0?'positive':'negative'}">${card.change>=0?'↑':'↓'} ${Math.abs(card.change)}%</div></div><div class="range-row"><span>¥${card.low}</span><div><i style="left:${rangeLeft}%"></i></div><span>¥${card.high}</span></div><span class="deal-count">${card.deals} 笔成交 · 演示数据</span>`:`<div class="price-row no-market"><div><span>成交价格</span><strong class="catalog-value">待补充</strong></div><span class="source-badge">${card.printCount||1} 个发行记录</span></div><span class="deal-count">已预留行情数据接入位</span>`;
  return `<article class="price-card" data-card-id="${card.id}"><button class="watch${watched?' watched':''}" data-action="watch" aria-label="${watched?'取消关注':'关注'}${safe(card.name)}">${watched?'★':'☆'}</button><button class="card-main" data-action="detail" aria-label="查看${safe(card.name)}卡牌详情">${artwork(card)}<div class="card-copy"><span class="rarity">${safe(card.rarity||card.kind)}</span><h3>${safe(card.name)}</h3><p>${safe(card.nameEn||card.title)}</p><dl><div><dt>编号</dt><dd>${safe(card.number||'—')}</dd></div><div><dt>系列</dt><dd>${safe(card.set||card.series||'—')} ${safe(card.setCode)}</dd></div><div><dt>画师</dt><dd>${safe(card.artist||'—')}</dd></div></dl></div></button><div class="market-block">${priceBlock}</div><button class="detail-link" data-action="detail">查看详情${priced?` · ${card.deals} 笔记录`:''}<span>→</span></button></article>`;
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
  const active=[state.query,state.kind!=='全部分类',state.type!=='全部属性',state.series!=='全部系列',state.rarity!=='全部稀有度',state.language!=='全部语言',state.market!=='全部数据',state.artist].filter(Boolean).length;
  $('#active-filter-count').textContent=active;
  $('#active-filter-count').hidden=!active;
  $('#card-grid').classList.toggle('list-view',state.view==='list');
  $('#grid-view').classList.toggle('active',state.view==='grid');
  $('#list-view').classList.toggle('active',state.view==='list');
  const watched=state.cards.filter((card)=>state.watchlist.includes(card.id)).slice(0,3);
  $('#watch-stack').innerHTML=watched.length?watched.map((card,index)=>`<div style="--i:${index}"><b>${safe(card.name)}</b><span>${card.price?money(card.price):safe(card.setCode||card.kind)}</span></div>`).join(''):'<div class="no-watch">还没有关注的卡牌</div>';
}

function resetFilters(){
  Object.assign(state,{query:'',kind:'全部分类',type:'全部属性',series:'全部系列',rarity:'全部稀有度',language:'全部语言',market:'全部数据',artist:'',sort:'relevance',limit:48});
  $('#search-input').value=''; ['kind','type','series','rarity','language','market','sort'].forEach((key)=>$(`#${key}-filter`).value=state[key]); $('#artist-filter').value=''; $('#clear-search').hidden=true; render();
}

function openModal(card){
  state.selected=card;
  const priced=Number.isFinite(card.price);
  const priceSection=priced?`<div class="modal-price"><span>最新成交价</span><strong>${money(card.price)}</strong><em class="${card.change>=0?'positive':'negative'}">${card.change>=0?'+':''}${card.change}%</em></div>`:`<div class="database-summary">当前仅收录卡牌资料，暂无可信的中国区成交价格。你可以通过下方来源链接查看完整的百科页面。</div>`;
  const history=priced&&card.history?.length?card.history:[];
  const historyMax=Math.max(...history,1);
  const marketPanel=history.length?`<section class="market-history"><div class="history-head"><div><span>近期成交趋势</span><b>${card.deals} 笔已归一化记录</b></div><span>数据源：${safe(card.marketSource||'market-feed')}</span></div><div class="history-bars">${history.map((value,index)=>`<i style="height:${Math.max(8,(value/historyMax)*100)}%" title="${money(value)}" class="${index===history.length-1?'latest':''}"></i>`).join('')}</div></section>`:`<section class="market-history reserved"><div><span>成交数据模块</span><b>已预留 API / 自动抓取数据位</b></div><p>接入后可展示最新成交、区间、成交量与价格趋势。</p></section>`;
  $('#modal-content').innerHTML=`<div class="modal-top">${artwork(card,true)}<div><span class="rarity">${safe(card.rarity||card.kind)} · ${safe(card.setCode||card.language||'资料库')}</span><h2 id="detail-title">${safe(card.name)}</h2><p>${safe(card.nameEn||card.title)} · ${safe(card.number||'暂无编号')}</p>${priceSection}<button class="modal-watch${state.watchlist.includes(card.id)?' active':''}" id="modal-watch">${state.watchlist.includes(card.id)?'★ 已关注':'☆ 加入关注'}</button></div></div>${marketPanel}<div class="modal-meta"><div><span>分类 / 属性</span><b>${safe([card.kind,card.subtype||card.type].filter(Boolean).join(' · ')||'—')}</b></div><div><span>系列</span><b>${safe(card.set||card.series||'—')}</b></div><div><span>发行语言</span><b>${safe(card.languages.join('、')||card.language||'—')}</b></div><div><span>画师</span><b>${safe(card.artists.join('、')||card.artist||'—')}</b></div><div><span>编号</span><b>${safe(card.numbers.join('、')||card.number||'—')}</b></div><div><span>发行记录</span><b>${card.printCount||1} 个</b></div></div><a class="modal-source" href="${safe(card.source)}" target="_blank" rel="noreferrer">在 52Poké 查看完整资料 →</a>`;
  $('#modal-backdrop').hidden=false; document.body.style.overflow='hidden';
}

function closeModal(){ $('#modal-backdrop').hidden=true; document.body.style.overflow=''; state.selected=null; }
function saveWatchlist(){ localStorage.setItem('ptcg-watchlist',JSON.stringify(state.watchlist)); }

async function loadDatabase(){
  $('#card-grid').innerHTML='<div class="empty" style="grid-column:1/-1"><span>⌛</span><h3>正在载入全量卡牌资料</h3><p>首次加载需要数秒，请稍候。</p></div>';
  try{
    const [response,marketFeed]=await Promise.all([fetch('data/cards.json'),window.MarketDataAdapter.load()]);
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    marketMap=window.MarketDataAdapter.createIndex(marketFeed.records);
    state.cards=payload.cards.map(expand);
    try{ state.watchlist=JSON.parse(localStorage.getItem('ptcg-watchlist')||'[]').filter((id)=>state.cards.some((card)=>card.id===id)); }catch{ state.watchlist=[]; }
    const artists=unique(state.cards.flatMap((card)=>card.artists));
    $('#kind-filter').innerHTML=optionList('全部分类',unique(state.cards.map((card)=>card.kind)));
    $('#type-filter').innerHTML=optionList('全部属性',unique(state.cards.map((card)=>card.type)));
    $('#series-filter').innerHTML=optionList('全部系列',unique(state.cards.map((card)=>card.series)));
    $('#rarity-filter').innerHTML=optionList('全部稀有度',unique(state.cards.flatMap((card)=>card.rarities)));
    $('#language-filter').innerHTML=optionList('全部语言',unique(state.cards.flatMap((card)=>card.languages)));
    $('#artist-options').innerHTML=artists.map((artist)=>`<option value="${safe(artist)}"></option>`).join('');
    $('#database-count').textContent=payload.count.toLocaleString('zh-CN');
    $('#cn-count').textContent=state.cards.filter((card)=>card.languages.includes('简中')).length.toLocaleString('zh-CN');
    $('#artist-count').textContent=artists.length.toLocaleString('zh-CN');
    $('#sync-time').textContent=new Date(payload.generatedAt).toLocaleDateString('zh-CN');
    $('#market-status').textContent=marketFeed.label;
    document.querySelector('.data-status').dataset.state=marketFeed.status;
    render();
  }catch(error){
    $('#card-grid').innerHTML=`<div class="empty" style="grid-column:1/-1"><span>!</span><h3>卡牌资料载入失败</h3><p>${safe(error.message)}，请刷新页面重试。</p></div>`;
  }
}

$('#search-input').addEventListener('input',(event)=>{state.query=event.target.value;state.limit=48;$('#clear-search').hidden=!state.query;render();});
$('#clear-search').addEventListener('click',()=>{state.query='';state.limit=48;$('#search-input').value='';$('#clear-search').hidden=true;render();});
$('#search-button').addEventListener('click',()=>$('#market').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('[data-term]').forEach((button)=>button.addEventListener('click',()=>{state.query=button.dataset.term;state.limit=48;$('#search-input').value=state.query;$('#clear-search').hidden=false;render();$('#market').scrollIntoView({behavior:'smooth'});}));
['kind','type','series','rarity','language','market','sort'].forEach((key)=>$(`#${key}-filter`).addEventListener('change',(event)=>{state[key]=event.target.value;state.limit=48;render();}));
$('#artist-filter').addEventListener('input',(event)=>{state.artist=event.target.value;state.limit=48;render();});
$('#reset-filters').addEventListener('click',resetFilters); $('#empty-reset').addEventListener('click',resetFilters);
$('#load-more').addEventListener('click',()=>{state.limit+=48;render();});
$('#grid-view').addEventListener('click',()=>{state.view='grid';localStorage.setItem('ptcg-view','grid');render();});
$('#list-view').addEventListener('click',()=>{state.view='list';localStorage.setItem('ptcg-view','list');render();});
$('#card-grid').addEventListener('click',(event)=>{const article=event.target.closest('[data-card-id]');if(!article)return;const card=state.cards.find((item)=>item.id===Number(article.dataset.cardId));const action=event.target.closest('[data-action]')?.dataset.action;if(action==='watch'){state.watchlist=state.watchlist.includes(card.id)?state.watchlist.filter((id)=>id!==card.id):[...state.watchlist,card.id];saveWatchlist();render();}else if(action==='detail'){openModal(card);}});
$('#modal-close').addEventListener('click',closeModal); $('#modal-backdrop').addEventListener('click',(event)=>{if(event.target===event.currentTarget)closeModal();});
$('#modal-content').addEventListener('click',(event)=>{if(event.target.id==='modal-watch'&&state.selected){const id=state.selected.id;state.watchlist=state.watchlist.includes(id)?state.watchlist.filter((item)=>item!==id):[...state.watchlist,id];saveWatchlist();render();openModal(state.selected);}});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!$('#modal-backdrop').hidden)closeModal();});

state.view=localStorage.getItem('ptcg-view')==='list'?'list':'grid';
loadDatabase();
