const cards = [
  {id:1,name:'皮卡丘 ex',nameEn:'Pikachu ex',number:'236/191',set:'超电突围',setCode:'SV8',rarity:'SAR',artist:'GIDORA',type:'雷',price:428,change:12.6,high:468,low:356,deals:86,color:'yellow',history:[352,368,361,389,402,397,415,421,418,428]},
  {id:2,name:'喷火龙 ex',nameEn:'Charizard ex',number:'349/190',set:'闪色宝藏',setCode:'SV4a',rarity:'SAR',artist:'aky CG Works',type:'火',price:1280,change:-3.2,high:1460,low:1198,deals:34,color:'orange',history:[1380,1420,1360,1348,1390,1322,1310,1298,1320,1280]},
  {id:3,name:'莉莉艾的皮皮 ex',nameEn:"Lillie's Clefairy ex",number:'126/100',set:'对战伙伴',setCode:'SV9',rarity:'SAR',artist:'Naoki Saito',type:'超',price:760,change:8.4,high:820,low:648,deals:57,color:'pink',history:[654,670,688,702,690,718,735,728,744,760]},
  {id:4,name:'月亮伊布 VMAX',nameEn:'Umbreon VMAX',number:'095/069',set:'伊布英雄',setCode:'S6a',rarity:'HR',artist:'KEIICHIRO ITO',type:'恶',price:6950,change:4.8,high:7280,low:6380,deals:12,color:'violet',history:[6400,6510,6480,6650,6720,6840,6770,6880,7020,6950]},
  {id:5,name:'美纳斯 ex',nameEn:'Milotic ex',number:'131/106',set:'超电突围',setCode:'SV8',rarity:'SAR',artist:'Jerky',type:'水',price:239,change:18.3,high:258,low:182,deals:102,color:'blue',history:[184,190,198,207,204,216,222,228,234,239]},
  {id:6,name:'梦幻 ex',nameEn:'Mew ex',number:'347/190',set:'闪色宝藏',setCode:'SV4a',rarity:'SAR',artist:'USGMEN',type:'超',price:698,change:-1.7,high:746,low:650,deals:48,color:'cyan',history:[720,708,716,730,710,702,715,706,700,698]},
  {id:7,name:'奈克洛兹玛 ex',nameEn:'Necrozma ex',number:'164/086',set:'黑色伏特',setCode:'SV11B',rarity:'SAR',artist:'AKIRA EGAWA',type:'超',price:318,change:6.7,high:349,low:276,deals:65,color:'indigo',history:[280,286,294,290,301,306,300,312,315,318]},
  {id:8,name:'捷拉奥拉 ex',nameEn:'Zeraora ex',number:'169/086',set:'黑色伏特',setCode:'SV11B',rarity:'SAR',artist:'PLANETA Mochizuki',type:'雷',price:189,change:-5.5,high:228,low:176,deals:73,color:'lime',history:[214,220,209,204,208,198,202,195,192,189]},
  {id:9,name:'沙奈朵 ex',nameEn:'Gardevoir ex',number:'348/190',set:'闪色宝藏',setCode:'SV4a',rarity:'SAR',artist:'Jiro Sasumo',type:'超',price:365,change:2.9,high:392,low:330,deals:41,color:'mint',history:[338,346,351,348,357,360,356,362,368,365]}
];

const state = { query:'', artist:'全部画师', rarity:'全部稀有度', type:'全部属性', sort:'成交热度', watchlist:[1,4], selected:null };
const $ = (selector) => document.querySelector(selector);
const money = (value) => `¥${value.toLocaleString('zh-CN')}`;
const safe = (value) => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function artwork(card, large=false){
  const displayName = card.name.replace(' ex','').replace(' VMAX','');
  return `<div class="card-art art-${card.color}${large?' art-large':''}" aria-label="${safe(card.name)}卡面示意"><div class="art-glow"></div><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><span class="art-type">${card.type}</span><div class="art-name">${safe(displayName)}</div><div class="art-set">${card.setCode} · ${card.rarity}</div></div>`;
}

function filteredCards(){
  const keyword = state.query.trim().toLowerCase();
  const items = cards.filter((card) => {
    const haystack = [card.name,card.nameEn,card.number,card.set,card.setCode,card.artist,card.rarity].join(' ').toLowerCase();
    return (!keyword || haystack.includes(keyword)) && (state.artist==='全部画师'||card.artist===state.artist) && (state.rarity==='全部稀有度'||card.rarity===state.rarity) && (state.type==='全部属性'||card.type===state.type);
  });
  return items.sort((a,b) => state.sort==='价格从高到低'?b.price-a.price:state.sort==='价格从低到高'?a.price-b.price:state.sort==='涨幅优先'?b.change-a.change:b.deals-a.deals);
}

function cardTemplate(card){
  const watched = state.watchlist.includes(card.id);
  const position = Math.max(8,Math.min(92,((card.price-card.low)/(card.high-card.low))*100));
  return `<article class="price-card" data-card-id="${card.id}">
    <button class="watch${watched?' watched':''}" data-action="watch" aria-label="${watched?'取消关注':'关注'}${safe(card.name)}">☆</button>
    <button class="card-main" data-action="detail" aria-label="查看${safe(card.name)}成交详情">${artwork(card)}<div class="card-copy"><span class="rarity">${card.rarity}</span><h3>${safe(card.name)}</h3><p>${safe(card.nameEn)}</p><dl><div><dt>编号</dt><dd>${card.number}</dd></div><div><dt>系列</dt><dd>${safe(card.set)} · ${card.setCode}</dd></div><div><dt>画师</dt><dd>${safe(card.artist)}</dd></div></dl></div></button>
    <div class="price-row"><div><span>最新成交</span><strong>${money(card.price)}</strong></div><div class="change ${card.change>=0?'positive':'negative'}">${card.change>=0?'↑':'↓'} ${Math.abs(card.change)}%</div></div>
    <div class="range-row"><span>¥${card.low}</span><div><i style="left:${position}%"></i></div><span>¥${card.high}</span></div>
    <button class="detail-link" data-action="detail">查看 ${card.deals} 笔成交记录 <span>→</span></button>
  </article>`;
}

function render(){
  const results = filteredCards();
  $('#result-count').textContent = results.length;
  $('#card-grid').innerHTML = results.map(cardTemplate).join('');
  $('#card-grid').hidden = !results.length;
  $('#empty-state').hidden = Boolean(results.length);
  $('#watch-count').textContent = state.watchlist.length;
  const watchedCards = cards.filter((card)=>state.watchlist.includes(card.id)).slice(0,3);
  $('#watch-stack').innerHTML = watchedCards.length ? watchedCards.map((card,index)=>`<div style="--i:${index}"><b>${safe(card.name)}</b><span>${money(card.price)}</span></div>`).join('') : '<div class="no-watch">还没有关注的卡牌</div>';
}

function resetFilters(){
  state.query=''; state.artist='全部画师'; state.rarity='全部稀有度'; state.type='全部属性';
  $('#search-input').value=''; $('#artist-filter').value=state.artist; $('#rarity-filter').value=state.rarity; $('#type-filter').value=state.type; $('#clear-search').hidden=true; render();
}

function openModal(card){
  state.selected=card;
  const min=Math.min(...card.history)*.94, max=Math.max(...card.history)*1.02;
  const bars=card.history.map((price,index)=>{const height=((price-min)/(max-min))*72+18; return `<div><i style="height:${height}%"></i><span>${index===0?'30天前':index===card.history.length-1?'今天':''}</span></div>`}).join('');
  const watched=state.watchlist.includes(card.id);
  $('#modal-content').innerHTML=`<div class="modal-top">${artwork(card,true)}<div><span class="rarity">${card.rarity} · ${card.setCode}</span><h2 id="detail-title">${safe(card.name)}</h2><p>${safe(card.nameEn)} · ${card.number}</p><div class="modal-price"><span>最新成交价</span><strong>${money(card.price)}</strong><em class="${card.change>=0?'positive':'negative'}">${card.change>=0?'+':''}${card.change}%</em></div><button class="modal-watch${watched?' active':''}" id="modal-watch">${watched?'★ 已关注':'☆ 加入关注'}</button></div></div><div class="chart-head"><div><span>近 30 天走势</span><b>${money(card.low)} — ${money(card.high)}</b></div><span>${card.deals} 笔有效成交</span></div><div class="bar-chart" aria-label="近30天价格走势柱状图">${bars}</div><div class="modal-meta"><div><span>画师</span><b>${safe(card.artist)}</b></div><div><span>系列</span><b>${safe(card.set)}</b></div><div><span>30日成交</span><b>${card.deals} 笔</b></div></div>`;
  $('#modal-backdrop').hidden=false; document.body.style.overflow='hidden';
}

function closeModal(){ $('#modal-backdrop').hidden=true; document.body.style.overflow=''; state.selected=null; }

const artists=['全部画师',...new Set(cards.map((card)=>card.artist))];
$('#artist-filter').innerHTML=artists.map((artist)=>`<option>${safe(artist)}</option>`).join('');
$('#search-input').addEventListener('input',(event)=>{state.query=event.target.value;$('#clear-search').hidden=!state.query;render()});
$('#clear-search').addEventListener('click',()=>{state.query='';$('#search-input').value='';$('#clear-search').hidden=true;render()});
$('#search-button').addEventListener('click',()=>$('#market').scrollIntoView({behavior:'smooth'}));
document.querySelectorAll('[data-term]').forEach((button)=>button.addEventListener('click',()=>{state.query=button.dataset.term;$('#search-input').value=state.query;$('#clear-search').hidden=false;render();$('#market').scrollIntoView({behavior:'smooth'})}));
['artist','rarity','type','sort'].forEach((key)=>$(`#${key}-filter`).addEventListener('change',(event)=>{state[key]=event.target.value;render()}));
$('#reset-filters').addEventListener('click',resetFilters); $('#empty-reset').addEventListener('click',resetFilters);
$('#card-grid').addEventListener('click',(event)=>{const article=event.target.closest('[data-card-id]');if(!article)return;const card=cards.find((item)=>item.id===Number(article.dataset.cardId));const action=event.target.closest('[data-action]')?.dataset.action;if(action==='watch'){state.watchlist=state.watchlist.includes(card.id)?state.watchlist.filter((id)=>id!==card.id):[...state.watchlist,card.id];render()}else if(action==='detail'){openModal(card)}});
$('#modal-close').addEventListener('click',closeModal); $('#modal-backdrop').addEventListener('click',(event)=>{if(event.target===event.currentTarget)closeModal()});
$('#modal-content').addEventListener('click',(event)=>{if(event.target.id==='modal-watch'&&state.selected){const id=state.selected.id;state.watchlist=state.watchlist.includes(id)?state.watchlist.filter((item)=>item!==id):[...state.watchlist,id];render();openModal(state.selected)}});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!$('#modal-backdrop').hidden)closeModal()});
render();
