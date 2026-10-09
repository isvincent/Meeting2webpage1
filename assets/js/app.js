
const y = m => m >= 7 ? 2025 : 2026;
const toDate = s => { if(!s) return null; const [m,d]=s.split('/').map(Number); return new Date(y(m), m-1, d); };
const WK = '日一二三四五六';
const ev = D.map((r,i)=>({i, s:toDate(r[0]), e:toDate(r[1]), sRaw:r[0], eRaw:r[1], title:r[2], unit:r[3], cat:r[4], desc:r[5], src:r[6], res:r[7]||'', note:r[8]||''}))
  .sort((a,b)=> (a.s?0:1)-(b.s?0:1) || (a.s&&b.s ? a.s-b.s : 0) || a.i-b.i);

const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* 統計 */
const dated = ev.filter(e=>e.s);
$('stats').innerHTML = [
  [ev.length,'項活動'],[5,'份會議紀錄'],[new Set(ev.map(e=>e.unit)).size,'個處室'],
  ['2025/7 – 2026/2','涵蓋期間']
].map(([n,t])=>`<div class="stat"><b>${n}</b><span>${t}</span></div>`).join('');

/* 篩選器 */
const units = [...new Set(ev.map(e=>e.unit))];
$('unit').innerHTML += units.map(u=>`<option>${u}</option>`).join('');
$('src').innerHTML += Object.entries(MEET).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
const active = new Set(Object.keys(CATS));
$('cats').innerHTML = Object.entries(CATS).map(([c,v])=>`<button class="chip" type="button" aria-pressed="true" data-cat="${c}" style="--c:var(${v})"><i></i>${c}</button>`).join('')
  + `<button class="chip reset" type="button" id="allCats">全選</button>`;
$('cats').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.id==='allCats'){ Object.keys(CATS).forEach(c=>active.add(c)); }
  else{
    const c=b.dataset.cat;
    // 全部都亮時，點一下只看該類；否則切換
    if(active.size===Object.keys(CATS).length){ active.clear(); active.add(c); }
    else if(active.has(c)){ active.delete(c); if(!active.size) Object.keys(CATS).forEach(x=>active.add(x)); }
    else active.add(c);
  }
  document.querySelectorAll('#cats [data-cat]').forEach(x=>x.setAttribute('aria-pressed', active.has(x.dataset.cat)));
  render();
});
['q','unit','src'].forEach(id=>$(id).addEventListener('input', render));

function fmtDate(d){ return `${d.getMonth()+1}/${d.getDate()}`; }
function hl(text,q){ if(!q) return esc(text); const t=esc(text); const qq=esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); return t.replace(new RegExp(qq,'gi'), m=>`<mark>${m}</mark>`); }

function card(e,q){
  const v = CATS[e.cat];
  let range = '';
  if(e.e){
    const sameYear = e.s.getFullYear()===e.e.getFullYear();
    range = `<span class="tag range">${fmtDate(e.s)} – ${sameYear?'':'次年 '}${fmtDate(e.e)}</span>`;
  }
  const date = e.s ? `<div class="date"><b>${fmtDate(e.s)}</b><span>週${WK[e.s.getDay()]}</span></div>` : '<div class="date"></div>';
  return `<li class="ev" style="--c:var(${v})">${date}<div class="card">
    <h3>${hl(e.title,q)}</h3>
    <div class="meta"><span class="tag cat">${e.cat}</span><span class="tag">${e.unit}</span>${range}<span class="tag" title="出現於哪幾次會議紀錄">📄 ${e.src.map(m=>m+'月').join('、')}會報</span></div>
    ${e.desc?`<p>${hl(e.desc,q)}</p>`:''}
    ${e.res?`<div class="res">${e.cat==='競賽成果'?'🏅':'📌'} ${hl(e.res,q)}</div>`:''}
    ${e.note?`<div class="note">※ ${esc(e.note)}</div>`:''}
  </div></li>`;
}

function render(){
  const q = $('q').value.trim(), u = $('unit').value, s = $('src').value;
  const list = ev.filter(e => active.has(e.cat) && (!u || e.unit===u) && (!s || e.src.includes(+s)) &&
    (!q || (e.title+e.desc+e.res+e.unit+e.cat).toLowerCase().includes(q.toLowerCase())));
  const groups = new Map();
  list.forEach(e=>{
    const k = e.s ? `${e.s.getFullYear()}-${String(e.s.getMonth()+1).padStart(2,'0')}` : 'undated';
    if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(e);
  });
  // 月份導覽
  const allKeys = [];
  for(let d=new Date(2025,6,1); d<=new Date(2026,1,1); d.setMonth(d.getMonth()+1))
    allKeys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  allKeys.push('undated');
  $('months').innerHTML = allKeys.map(k=>{
    const n = groups.get(k)?.length||0;
    const label = k==='undated' ? '未標日期' : `${+k.slice(0,4)-1911}年${+k.slice(5)}月`;
    return `<a href="#m-${k}" class="${n?'':'empty'}">${label}<small>${n}</small></a>`;
  }).join('');
  let html='';
  for(const k of allKeys){
    const g = groups.get(k); if(!g) continue;
    const title = k==='undated' ? '未標明日期的活動' : `民國 ${+k.slice(0,4)-1911} 年 ${+k.slice(5)} 月`;
    const sub = k==='undated' ? '會議紀錄中提及但未列具體日期' : `${k.slice(0,4)} 年 ${+k.slice(5)} 月 · ${g.length} 項`;
    html += `<section class="month ${k==='undated'?'undated':''}"><h2 id="m-${k}">${title}<small>${sub}</small></h2><ol class="tl">${g.map(e=>card(e,q)).join('')}</ol></section>`;
  }
  $('main').innerHTML = html;
  $('empty').style.display = list.length ? 'none' : 'block';
}
render();

/* 深淺色切換 */
$('themeBtn').addEventListener('click',()=>{
  const root=document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try{ localStorage.setItem('theme', root.dataset.theme); }catch(_){}
});
try{ const t=localStorage.getItem('theme'); if(t) document.documentElement.dataset.theme=t; }catch(_){}
