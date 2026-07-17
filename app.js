const colors = ['yellow','orange','pink','violet','blue','cyan','indigo','lime','mint'];
const state = {cards:[],query:'',kind:'全部分类',type:'全部属性',series:'全部系列',rarity:'全部稀有度',language:'全部语言',market:'全部数据',artist:'',sort:'relevance',view:'grid',limit:48,watchlist:[],selected:null,marketSelected:'index',marketRange:'1m',modalRange:'1m'};
const $ = (selector) => document.querySelector(selector);
const safe = (value='') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const money = (value) => `¥${value.toLocaleString('zh-CN')}`;
const normalize = (value='') => String(value).toLowerCase().replace(/[\s·・]/g,'');
let marketMap = new Map();
let marketRecords = [];
const marketRanges = [{key:'1w',label:'1周',points:7},{key:'1m',label:'1个月',points:30},{key:'3m',label:'3个月',points:90},{key:'6m',label:'6个月',points:180},{key:'1y',label:'1年',points:365},{key:'all',label:'全部',points:720}];

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

function marketSeed(value=''){
  return [...String(value)].reduce((total,char)=>total+char.charCodeAt(0),17);
}

function expandHistory(history,length,seed=1){
  const source=history?.length>1?history:[100,101];
  return Array.from({length},(_,index)=>{
    const position=(index/(Math.max(1,length-1)))*(source.length-1);
    const left=Math.floor(position);
    const right=Math.min(source.length-1,left+1);
    const mix=position-left;
    const base=source[left]+(source[right]-source[left])*mix;
    const envelope=Math.sin(Math.PI*index/Math.max(1,length-1));
    const texture=(Math.sin(index*.73+seed)+Math.sin(index*.19+seed*.3)*.6)*base*.007*envelope;
    return Number((base+texture).toFixed(2));
  });
}

function indexHistory(){
  const usable=marketRecords.filter((record)=>record.history?.length>1);
  if(!usable.length) return [1000,1000];
  const count=Math.max(...usable.map((record)=>record.history.length));
  return Array.from({length:count},(_,index)=>{
    const values=usable.map((record)=>{
      const position=(index/(Math.max(1,count-1)))*(record.history.length-1);
      const left=Math.floor(position);
      const right=Math.min(record.history.length-1,left+1);
      const value=record.history[left]+(record.history[right]-record.history[left])*(position-left);
      return value/record.history[0];
    });
    return Number((values.reduce((sum,value)=>sum+value,0)/values.length*1000).toFixed(2));
  });
}

function marketModel(key=state.marketSelected){
  if(key==='index'){
    const history=indexHistory();
    return {key:'index',name:'简中卡牌综合指数',symbol:'PTCG-CN',subtitle:'中国区 · CNY',history,price:history.at(-1),deals:marketRecords.reduce((sum,record)=>sum+record.deals,0),sample:marketRecords.length,index:true};
  }
  const record=marketRecords.find((item)=>`${item.name}|${item.setCode}`===key)||marketRecords[0];
  if(!record) return marketModel('index');
  return {...record,key:`${record.name}|${record.setCode}`,symbol:record.setCode||'PTCG',subtitle:`${record.setCode||'单卡'} · 中国区`,sample:1,index:false};
}

function seriesFor(model,rangeKey){
  const range=marketRanges.find((item)=>item.key===rangeKey)||marketRanges[1];
  return expandHistory(model.history,range.points,marketSeed(model.key)+range.points);
}

function priceText(model,value){
  return model.index?Number(value).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}):money(Number(value));
}

function dateLabel(index,total,rangeKey){
  const range=marketRanges.find((item)=>item.key===rangeKey)||marketRanges[1];
  const days=Math.round((range.points-1)*(index/Math.max(1,total-1)));
  const date=new Date('2026-07-17T12:00:00+08:00');
  date.setDate(date.getDate()-(range.points-1-days));
  if(rangeKey==='1w') return `${date.getMonth()+1}/${date.getDate()}`;
  if(rangeKey==='1m'||rangeKey==='3m') return `${date.getMonth()+1}月${date.getDate()}日`;
  return `${date.getFullYear()}/${date.getMonth()+1}`;
}

function chartMarkup(model,rangeKey,chartId){
  const series=seriesFor(model,rangeKey);
  const width=1000, height=390, left=20, right=92, top=22, bottom=44;
  const low=Math.min(...series),high=Math.max(...series),span=Math.max(high-low,1);
  const paddedLow=low-span*.08,paddedHigh=high+span*.08,paddedSpan=paddedHigh-paddedLow;
  const points=series.map((value,index)=>({x:left+(index/(series.length-1))*(width-left-right),y:top+((paddedHigh-value)/paddedSpan)*(height-top-bottom),value}));
  const path=points.map((point,index)=>`${index?'L':'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const area=`${path} L${points.at(-1).x.toFixed(2)},${height-bottom} L${points[0].x.toFixed(2)},${height-bottom} Z`;
  const first=series[0],last=series.at(-1),change=(last-first)/first*100;
  const positive=change>=0;
  const yTicks=Array.from({length:5},(_,index)=>paddedHigh-(paddedSpan*index/4));
  const xTicks=Array.from({length:6},(_,index)=>index/5);
  const accent=positive?'#34c759':'#ff3b30';
  const grid=yTicks.map((value,index)=>{const y=top+((height-top-bottom)*index/4);return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"/><text x="${width-right+14}" y="${y+5}">${model.index?value.toFixed(1):Math.round(value).toLocaleString('zh-CN')}</text>`;}).join('');
  const dates=xTicks.map((ratio)=>{const index=Math.round((series.length-1)*ratio);const x=left+(width-left-right)*ratio;return `<line x1="${x}" y1="${top}" x2="${x}" y2="${height-bottom}"/><text class="date-label" x="${x}" y="${height-12}" text-anchor="${ratio===0?'start':ratio===1?'end':'middle'}">${dateLabel(index,series.length,rangeKey)}</text>`;}).join('');
  return {series,change,positive,html:`<svg class="stock-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${safe(model.name)}${safe(marketRanges.find((item)=>item.key===rangeKey)?.label||'')}价格走势"><defs><linearGradient id="${chartId}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity=".24"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs><g class="stock-grid">${dates}${grid}</g><path class="stock-area" d="${area}" fill="url(#${chartId}-fill)"/><path class="stock-line" d="${path}" style="stroke:${accent}"/><g class="stock-cursor" hidden><line x1="0" y1="${top}" x2="0" y2="${height-bottom}"/><circle cx="0" cy="0" r="6" style="fill:${accent}"/></g></svg><div class="stock-tooltip" hidden></div>`};
}

function rangeButtons(selected,scope){
  return marketRanges.map((range)=>`<button type="button" class="${range.key===selected?'active':''}" data-${scope}-range="${range.key}" aria-pressed="${range.key===selected}">${range.label}</button>`).join('');
}

function bindChartHover(container,model,rangeKey,series){
  const svg=container.querySelector('svg');
  const cursor=container.querySelector('.stock-cursor');
  const line=cursor?.querySelector('line');
  const circle=cursor?.querySelector('circle');
  const tooltip=container.querySelector('.stock-tooltip');
  if(!svg||!cursor||!tooltip) return;
  const move=(event)=>{
    const rect=container.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const index=Math.round(ratio*(series.length-1));
    const value=series[index];
    const min=Math.min(...series),max=Math.max(...series),span=Math.max(max-min,1);
    const x=20+ratio*(1000-20-92);
    const y=22+((max+span*.08-value)/(span*1.16))*(390-22-44);
    line.setAttribute('x1',x);line.setAttribute('x2',x);circle.setAttribute('cx',x);circle.setAttribute('cy',y);
    cursor.hidden=false;tooltip.hidden=false;
    tooltip.innerHTML=`<b>${priceText(model,value)}</b><span>${dateLabel(index,series.length,rangeKey)}</span>`;
    tooltip.style.left=`${Math.max(58,Math.min(rect.width-58,event.clientX-rect.left))}px`;
  };
  container.addEventListener('pointermove',move);
  container.addEventListener('pointerleave',()=>{cursor.hidden=true;tooltip.hidden=true;});
}

function stockDetailMarkup(model,rangeKey,scope='market'){
  const chart=chartMarkup(model,rangeKey,`${scope}-chart-gradient`);
  const first=chart.series[0],last=chart.series.at(-1),high=Math.max(...chart.series),low=Math.min(...chart.series);
  const changeValue=last-first;
  const rangeLabel=marketRanges.find((item)=>item.key===rangeKey)?.label||'1个月';
  const absoluteChange=model.index?Math.abs(changeValue).toFixed(2):`¥${Math.abs(changeValue).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
  return {series:chart.series,html:`<div class="stocks-detail-head"><div><div class="stocks-title-line"><h3>${safe(model.name)}</h3><span>${safe(model.symbol)}</span></div><p>${safe(model.subtitle)}</p></div><div class="stocks-quote"><strong>${priceText(model,last)}</strong><span class="${chart.positive?'gain':'loss'}">${chart.positive?'+':'−'}${absoluteChange} (${chart.positive?'+':''}${chart.change.toFixed(2)}%)</span></div></div><div class="stock-ranges" aria-label="选择走势图时间范围">${rangeButtons(rangeKey,scope)}</div><div class="stock-chart-surface" id="${scope}-chart">${chart.html}</div><div class="stock-stats"><div><span>${rangeLabel}开盘</span><b>${priceText(model,first)}</b></div><div><span>${rangeLabel}最高</span><b>${priceText(model,high)}</b></div><div><span>${rangeLabel}最低</span><b>${priceText(model,low)}</b></div><div><span>区间变化</span><b class="${chart.positive?'gain':'loss'}">${chart.positive?'+':''}${chart.change.toFixed(2)}%</b></div><div><span>${model.index?'指数样本':'成交记录'}</span><b>${model.index?`${model.sample} 张`:`${model.deals||0} 笔`}</b></div><div><span>行情更新</span><b>7月17日</b></div></div>`};
}

function renderMarketDashboard(){
  if(!marketRecords.length) return;
  const models=[marketModel('index'),...marketRecords.map((record)=>marketModel(`${record.name}|${record.setCode}`))];
  $('#stocks-list').innerHTML=models.map((model)=>{
    const history=seriesFor(model,'1m');
    const change=(history.at(-1)-history[0])/history[0]*100;
    const spark=chartMarkup(model,'1m',`spark-${marketSeed(model.key)}`);
    return `<button type="button" class="stock-list-item${model.key===state.marketSelected?' active':''}" data-market-key="${safe(model.key)}" aria-pressed="${model.key===state.marketSelected}"><span class="stock-list-copy"><b>${safe(model.name)}</b><small>${safe(model.symbol)}</small></span><svg viewBox="0 0 120 46" preserveAspectRatio="none" aria-hidden="true"><path d="${spark.html.match(/class="stock-line" d="([^"]+)/)?.[1]||''}" transform="scale(.12 .118)" style="stroke:${change>=0?'#34c759':'#ff3b30'}"/></svg><span class="stock-list-price"><b>${priceText(model,history.at(-1))}</b><em class="${change>=0?'gain':'loss'}">${change>=0?'+':''}${change.toFixed(2)}%</em></span></button>`;
  }).join('');
  const model=marketModel();
  const detail=stockDetailMarkup(model,state.marketRange,'market');
  $('#stocks-detail').innerHTML=detail.html;
  bindChartHover($('#market-chart'),model,state.marketRange,detail.series);
}

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
  const matchingModel=priced?marketRecords.find((record)=>record.name===card.name&&record.setCode===card.setCode):null;
  const priceSection=priced?`<div class="modal-price"><span>最新成交价</span><strong>${money(card.price)}</strong><em class="${card.change>=0?'positive':'negative'}">${card.change>=0?'+':''}${card.change}%</em></div>`:`<div class="database-summary">当前仅收录卡牌资料，暂无可信的中国区成交价格。你可以通过下方来源链接查看完整的百科页面。</div>`;
  $('#modal-content').innerHTML=`<div class="modal-top">${artwork(card,true)}<div><span class="rarity">${safe(card.rarity||card.kind)} · ${safe(card.setCode||card.language||'资料库')}</span><h2 id="detail-title">${safe(card.name)}</h2><p>${safe(card.nameEn||card.title)} · ${safe(card.number||'暂无编号')}</p>${priceSection}<button class="modal-watch${state.watchlist.includes(card.id)?' active':''}" id="modal-watch">${state.watchlist.includes(card.id)?'★ 已关注':'☆ 加入关注'}</button></div></div><div id="modal-market-panel"></div><div class="modal-meta"><div><span>分类 / 属性</span><b>${safe([card.kind,card.subtype||card.type].filter(Boolean).join(' · ')||'—')}</b></div><div><span>系列</span><b>${safe(card.set||card.series||'—')}</b></div><div><span>发行语言</span><b>${safe(card.languages.join('、')||card.language||'—')}</b></div><div><span>画师</span><b>${safe(card.artists.join('、')||card.artist||'—')}</b></div><div><span>编号</span><b>${safe(card.numbers.join('、')||card.number||'—')}</b></div><div><span>发行记录</span><b>${card.printCount||1} 个</b></div></div><a class="modal-source" href="${safe(card.source)}" target="_blank" rel="noreferrer">在 52Poké 查看完整资料 →</a>`;
  if(matchingModel){
    const model={...matchingModel,key:`${matchingModel.name}|${matchingModel.setCode}`,symbol:matchingModel.setCode,subtitle:`${matchingModel.setCode} · 中国区`,sample:1,index:false};
    const detail=stockDetailMarkup(model,state.modalRange,'modal');
    $('#modal-market-panel').innerHTML=`<section class="modal-stock-panel">${detail.html}</section>`;
    bindChartHover($('#modal-chart'),model,state.modalRange,detail.series);
  }else{
    $('#modal-market-panel').innerHTML=`<section class="market-history reserved"><div><span>成交数据模块</span><b>已预留 API / 自动抓取数据位</b></div><p>接入后可展示最新成交、区间、成交量与价格趋势。</p></section>`;
  }
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
    marketRecords=marketFeed.records;
    marketMap=window.MarketDataAdapter.createIndex(marketRecords);
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
    renderMarketDashboard();
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
$('#stocks-list').addEventListener('click',(event)=>{const item=event.target.closest('[data-market-key]');if(!item)return;state.marketSelected=item.dataset.marketKey;renderMarketDashboard();});
$('#stocks-detail').addEventListener('click',(event)=>{const button=event.target.closest('[data-market-range]');if(!button)return;state.marketRange=button.dataset.marketRange;renderMarketDashboard();});
$('#card-grid').addEventListener('click',(event)=>{const article=event.target.closest('[data-card-id]');if(!article)return;const card=state.cards.find((item)=>item.id===Number(article.dataset.cardId));const action=event.target.closest('[data-action]')?.dataset.action;if(action==='watch'){state.watchlist=state.watchlist.includes(card.id)?state.watchlist.filter((id)=>id!==card.id):[...state.watchlist,card.id];saveWatchlist();render();}else if(action==='detail'){openModal(card);}});
$('#modal-close').addEventListener('click',closeModal); $('#modal-backdrop').addEventListener('click',(event)=>{if(event.target===event.currentTarget)closeModal();});
$('#modal-content').addEventListener('click',(event)=>{if(event.target.id==='modal-watch'&&state.selected){const id=state.selected.id;state.watchlist=state.watchlist.includes(id)?state.watchlist.filter((item)=>item!==id):[...state.watchlist,id];saveWatchlist();render();openModal(state.selected);return;}const range=event.target.closest('[data-modal-range]');if(range&&state.selected){state.modalRange=range.dataset.modalRange;openModal(state.selected);}});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!$('#modal-backdrop').hidden)closeModal();});

state.view=localStorage.getItem('ptcg-view')==='list'?'list':'grid';
loadDatabase();
