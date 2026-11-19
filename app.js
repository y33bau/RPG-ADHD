import * as C from './core.js';
import * as X from './extras-ui.js';
const KEY='synapse_v2', $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storageFailed=false,loadFailed=false,notice='',state,tab='today',sub={today:'plan',tasks:'list',world:'trip',base:'base',history:'overview'},filter='today',selected=null,toastTimer,installPrompt=null,lastTrigger=null,ringed=null;
try{
 const raw=localStorage.getItem(KEY);
 if(raw)state=C.validate(JSON.parse(raw));
 else{
  const oldAgent=localStorage.getItem('adhd_agent'),oldTasks=localStorage.getItem('adhd_quests');
  state=(oldAgent||oldTasks)?C.migrate(oldAgent?JSON.parse(oldAgent):null,oldTasks?JSON.parse(oldTasks):null):C.fresh();
  if(!(oldAgent||oldTasks))state.settings.surprises=true;
  if(oldAgent||oldTasks)notice='Ta-dam! Twoje zadania i dostępny dorobek z poprzedniej wersji są tutaj. Stary zapis pozostaje nietknięty.';
  localStorage.setItem(KEY,JSON.stringify(state));
 }
}catch(e){state=C.fresh();loadFailed=true;notice='Nie udało się odczytać zapisu. Nie nadpisujemy go. W ustawieniach możesz pobrać oryginalne dane lub wczytać kopię.';}
const today=()=>C.dayKey();
function save(){
 if(loadFailed){toast('Zapis wstrzymany. Najpierw odzyskaj dane w ustawieniach.');return false;}
 try{const serialized=JSON.stringify(state);if(localStorage.getItem(KEY)!==serialized)localStorage.setItem(KEY,serialized);storageFailed=false;if(typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('app-progress'));return true;}
 catch(e){storageFailed=true;toast('Brak zapisu na urządzeniu. Pobierz kopię danych w ustawieniach.');return false;}
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function applySettings(){document.body.classList.toggle('calm',state.settings.calm);}
function celebrate(earned,finds=[]){
 if(state.settings.haptics)navigator.vibrate?.(30);
 if(state.settings.sound)try{
 const Audio=window.AudioContext||window.webkitAudioContext,ctx=new Audio();
 [523,659,784].forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=hz;g.gain.setValueAtTime(0,ctx.currentTime+i*.09);g.gain.linearRampToValueAtTime(.055,ctx.currentTime+i*.09+.015);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.09+.18);o.start(ctx.currentTime+i*.09);o.stop(ctx.currentTime+i*.09+.2);});setTimeout(()=>ctx.close(),1000);
 }catch{}
 if(!state.settings.calm&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const root=$('#celebration');root.replaceChildren();
 for(let i=0;i<18;i++){const p=document.createElement('i');p.className='confetti';p.style.cssText='--dx:'+(Math.random()-.5)*430+'px;--dy:'+(Math.random()-.55)*360+'px;--rotation:'+Math.random()*600+'deg;background:'+['#b4efd9','#bbabff','#f3d49b'][i%3];root.append(p);}
 setTimeout(()=>root.replaceChildren(),1000);
 }
 toast((earned?'Mały krok, realny postęp. +'+earned.xp+' XP · +'+earned.coins+' monet':'Pięknie. Kolejny kawałek Twojej bazy gotowy.')+(finds.length?' ✧ Znalezisko: '+finds.map(f=>f.title).join(', ')+'!':''));
}
function finds(before){return state.ledger.slice(before).filter(e=>e.kind==='bonus');}
function act(fn){try{fn();}catch(e){toast(e.message||'Nie udało się wykonać tej akcji.');}}
function b(){return C.balance(state);}
function ready(){return state.tasks.filter(t=>C.eligible(t,today())&&!C.completion(state,t,today()));}
function choose(){const tasks=ready();return tasks.find(t=>t.id===selected)||[...tasks].sort((a,b)=>state.energy==='low'||state.minimum?(Object.keys(C.TIERS).indexOf(a.tier)-Object.keys(C.TIERS).indexOf(b.tier)):(a.date.localeCompare(b.date)||a.createdAt-b.createdAt))[0];}
function rewardLabel(t){const r=C.TIERS[t.tier];return '<div class="reward-label"><span>✧ '+r.xp+' XP</span><span>◈ '+r.coins+' monet</span><span>◇ '+(t.tier==='big'?6:t.tier==='normal'?3:1)+' mat.</span></div>';}
function heading(title,sub,button=true,eyebrow='TWÓJ OSOBISTY MAŁY ŚWIAT'){return '<div class="page-heading"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+title+'</h1><p class="subtext">'+sub+'</p></div>'+(button?'<button class="btn primary" data-action="add">＋ Dodaj zadanie</button>':'')+'</div>';}
function taskCard(t,expanded=false){
 const done=!!C.completion(state,t,today()),steps=C.progress(state,t,today()),future=t.date>today();
 return '<article data-task="'+esc(t.id)+'" class="task '+(done?'done':'')+'"><button class="check" data-action="'+(done?'undo':'complete')+'" data-id="'+esc(t.id)+'" aria-label="'+esc((done?'Cofnij wykonanie: ':'Ukończ: ')+t.title)+'" '+(future||t.archived?'disabled':'')+'>'+(done?'✓':'')+'</button><div class="task-body"><button class="task-name" data-action="edit" data-id="'+esc(t.id)+'">'+esc(t.title)+'</button><div class="task-meta"><span class="tag">'+({life:'Życie',work:'Praca',self:'Dla siebie'}[t.category])+'</span><span>✧ '+C.TIERS[t.tier].xp+' XP · ◈ '+C.TIERS[t.tier].coins+'</span>'+(t.repeat!=='none'?'<span>↻ '+({daily:'Codziennie',weekdays:'Dni robocze',weekly:'Co tydzień'}[t.repeat])+'</span>':'')+(t.date!==today()&&t.repeat==='none'?'<span>'+esc(t.date)+'</span>':'')+(t.steps.length?'<span>'+steps.length+'/'+t.steps.length+' kroków</span>':'')+'</div>'+
 (expanded&&t.steps.length?'<div class="steps">'+t.steps.map((s,i)=>'<label class="step"><input type="checkbox" data-step="'+i+'" data-id="'+esc(t.id)+'" '+(steps.includes(i)||done?'checked disabled':'')+' '+(future||t.archived?'disabled':'')+'><span>'+esc(s)+'</span></label>').join('')+'</div>':'')+
 '</div><button class="icon-button" data-action="'+(t.archived?'restore':'edit')+'" data-id="'+esc(t.id)+'" aria-label="'+(t.archived?'Przywróć':'Edytuj')+' zadanie">'+(t.archived?'↶':'⋯')+'</button></article>';
}
function scene(){
 const built=Object.values(state.rooms).reduce((n,x)=>n+x,0);
 return '<svg class="scene" viewBox="0 0 320 170" role="img" aria-label="Twoja wyspa: '+built+' z 9 ulepszeń"><defs><linearGradient id="island" x2="0" y2="1"><stop stop-color="#626784"/><stop offset="1" stop-color="#262d48"/></linearGradient><linearGradient id="roof" x2="1" y2="1"><stop stop-color="#9e8bba"/><stop offset="1" stop-color="#514862"/></linearGradient></defs><g fill="#c7c0e8"><circle cx="38" cy="29" r="1"/><circle cx="267" cy="20" r="1.6"/><circle cx="233" cy="48" r="1"/><circle cx="89" cy="17" r="1"/><path d="M276 54h8m-4-4v8" stroke="#c6b5f5" stroke-width="1"/></g><ellipse cx="159" cy="151" rx="104" ry="10" fill="#0e1325" opacity=".4"/><path d="m46 108 110-41 116 42-112 47z" fill="url(#island)"/><path d="m46 108 114 36 112-35-12 17-99 34-104-35z" fill="#333b57"/><path d="m93 104 65-22 73 24-72 25z" fill="#788476" opacity=".5"/><path d="m119 80 40 13v38l-40-14z" fill="#686781"/><path d="m159 93 39-14v39l-39 13z" fill="#444b67"/><path d="m109 82 50-39 49 38-49 16z" fill="url(#roof)"/><path d="m159 43 49 38-49 16z" fill="#665a80"/><path d="m143 101 10 4v15l-10-4z" fill="#f2d5a0" opacity=".85"/><path d="m171 101 12-4v18l-12 4z" fill="#b4efd9" opacity="'+(built?'.9':'.25')+'"/><path d="m137 102 2 1v13l-2-1z" fill="#3d455e"/>'+
 (state.rooms.garden?'<path d="m82 109 11-37 12 37z" fill="#88b7a3"/><path d="m87 114 7-24 9 22z" fill="#638f82"/><path d="m223 117 8-26 9 26z" fill="#a5c1a2"/>':'<path d="m84 115 8-19 8 19z" fill="#535d73"/>')+
 (state.rooms.observatory?'<path d="m202 85 13-6 14 6v29l-13 5-14-5z" fill="#5d6585"/><path d="m199 85 16-24 17 24-17 7z" fill="#b3a2d7"/><circle cx="215" cy="78" r="3" fill="#f3d49b"/>':'')+
 (state.rooms.workshop?'<path d="m97 109 15 5v12l-15-5z" fill="#9c91b2"/><path d="m94 108 10-14 12 14-7 8z" fill="#b5a0cd"/>':'')+
 '<path d="m161 133 12 3-15 7-14-4z" fill="#a6a6bc" opacity=".6"/></svg>';
}
function waterCard(){
 const w=C.hydration(state),ready=w.ml>=w.goal;
 return '<section class="panel water-panel"><div class="water-heading"><div class="water-droplet">◒</div><div><div class="eyebrow">MAŁY RYTUAŁ · DUŻA RÓŻNICA</div><h2>Woda na dziś</h2></div><span class="water-goal">'+(ready?'✓ Cel osiągnięty':'CEL 2 L')+'</span></div><div class="water-main"><strong>'+(w.ml/1000).toLocaleString('pl-PL',{maximumFractionDigits:1})+'<small> / 2 l</small></strong><span class="tiny muted">'+w.count+' × 200 ml</span></div><div class="water-portions" role="img" aria-label="'+w.ml+' z 2000 mililitrów">'+Array.from({length:10},(_,i)=>'<span class="water-portion '+(i<w.count?'filled':'')+'"></span>').join('')+'</div><div class="row between"><button class="btn small" data-action="water-undo" '+(w.count===0?'disabled':'')+' aria-label="Cofnij porcję wody">− 200 ml</button><button class="btn water-add" data-action="water" '+(ready?'disabled':'')+'>'+(ready?'Dobra robota!':'＋ Wypiłem 200 ml')+'</button></div><p class="water-footnote">10 porcji po 200 ml. Nowy dzień, świeży licznik.</p></section>';
}
function profile(){
 const bal=b(),level=C.levelInfo(bal.xp);
 return '<section class="panel"><div class="profile-top"><div class="level-emblem">✳</div><div><div class="eyebrow">POZIOM '+level.level+' · '+(level.level<3?'Odkrywca':level.level<7?'Budowniczy':'Architekt')+'</div><div class="profile-name">'+esc(state.settings.name||'Twój profil')+'</div></div></div><div class="progress-label"><span>Kolejny poziom</span><span>'+level.xp+' / '+level.needed+' XP</span></div><div class="track" role="progressbar" aria-label="Do kolejnego poziomu" aria-valuenow="'+level.xp+'" aria-valuemin="0" aria-valuemax="'+level.needed+'"><div class="fill" style="width:'+(level.xp/level.needed*100)+'%"></div></div><div class="stats"><div class="stat"><strong>'+bal.coins+'</strong><small>◈ monety</small></div><div class="stat"><strong>'+bal.materials+'</strong><small>◇ materiały</small></div><div class="stat"><strong>'+C.activeDays(state)+'/7</strong><small>aktywne dni</small></div></div></section>';
}
function week(){
 const dates=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(d);}
 const active=new Set(state.ledger.filter(e=>['step','focus'].includes(e.kind)).map(e=>e.day));
 return '<section class="panel"><div class="section-line"><h3>W Twoim rytmie</h3><span class="tiny muted">Ostatnie 7 dni</span></div><div class="week">'+dates.map(d=>'<div class="week-day"><span>'+esc(d.toLocaleDateString('pl-PL',{weekday:'short'}).replace('.',''))+'</span><span class="week-dot '+(active.has(C.dayKey(d))?'on':'')+'" aria-label="'+C.dayKey(d)+(active.has(C.dayKey(d))?': aktywny':': odpoczynek')+'">'+(active.has(C.dayKey(d))?'✓':'·')+'</span></div>').join('')+'</div><p class="subtext tiny">Przerwa nie kasuje Twojego postępu.</p></section>';
}
function planBody(){
 const t=choose(),limit=state.minimum?1:3,list=ready().slice(0,limit),completeCount=state.ledger.filter(e=>e.kind==='complete'&&e.day===today()).length;
 const steps=t?C.progress(state,t,today()):[],first=t?.steps.find((_,i)=>!steps.includes(i));
 return X.nowCard(state)+X.thoughtCard()+X.guardCard(state)+'<div class="energy-row"><div class="row"><span class="tiny muted">Twoja energia</span><div class="segmented" aria-label="Poziom energii">'+[['low','Niska'],['medium','W sam raz'],['high','Mam moc']].map(([v,l])=>'<button data-energy="'+v+'" class="'+(state.energy===v?'selected':'')+'" aria-pressed="'+(state.energy===v)+'">'+l+'</button>').join('')+'</div></div><button class="minimum '+(state.minimum?'selected':'')+'" data-action="minimum" aria-pressed="'+state.minimum+'">☾ Dzisiaj minimum</button></div>'+
 '<div class="dashboard"><div class="stack">'+(t?'<section class="panel next-step"><div><h2>'+esc(t.title)+'</h2>'+(first?'<p class="subtext">'+esc(first)+'</p>':'')+'</div><div class="row wrap"><button class="btn primary" data-action="focus-5" data-id="'+esc(t.id)+'">▷ Skupienie 5 min</button><button class="btn link" data-action="focus" data-id="'+esc(t.id)+'">Inny czas</button><button class="btn link" data-action="help" data-id="'+esc(t.id)+'">Nie mogę ruszyć</button></div></section>':'')+
 '<div class="quick-row"><button class="quick-card" data-action="already"><span class="quick-symbol">✓</span><span><strong>Już coś zrobiłem</strong><small>Dopisz małe zwycięstwo</small></span></button><button class="quick-card" data-action="water"><span class="quick-symbol">♧</span><span><strong>Chwila dla siebie</strong><small>Woda: '+(C.hydration(state).ml/1000).toLocaleString('pl-PL')+' / 2 l</small></span></button></div>'+
 '<section class="panel"><div class="section-line"><h2>'+(state.minimum?'Minimum na dziś':'Mały plan na dziś')+'</h2><span class="tiny muted">'+completeCount+' ukończone</span></div><div class="task-list">'+(list.length?list.map(t=>taskCard(t,true)).join(''):'<div class="empty"><div class="empty-symbol">✧</div><h3>Masz wolną przestrzeń.</h3><p>Możesz odpocząć albo wybrać kolejny mały cel.</p><button class="btn purple" data-action="add">Dodaj zadanie</button></div>')+'</div><button class="btn link" data-tab="tasks" style="margin-top:13px">Wszystkie zadania ('+ready().length+') →</button></section>'+
 '</div>'+
 '<div class="stack">'+profile()+X.captureCard()+'<section class="panel base-preview"><div class="section-line"><h3>Twoja mała przystań</h3><span class="tiny muted">'+Object.values(state.rooms).reduce((n,x)=>n+x,0)+'/9</span></div>'+scene()+'<p class="base-caption">Z codziennych kroków powstaje coś Twojego.</p><button class="btn purple" data-tab="base">Zajrzyj do swojej bazy ↗</button></section></div></div>';
}
function meBody(){return '<div class="dashboard"><div class="stack">'+X.moodCard()+X.habitsCard()+'</div><div class="stack">'+waterCard()+week()+'</div></div>';}
function subBody(name,map){const cur=X.currentSub(name,sub[name],!!state.settings.minimal);return (map[cur]||Object.values(map)[0])();}
function todayView(){
 return '<div class="page-heading"><h1>Dzisiaj</h1><button class="btn primary" data-action="add">＋ Dodaj zadanie</button></div>'+
  '<div data-life-slot id="slot-weather"></div>'+
  (notice?'<p class="return-note">'+esc(notice)+'</p>':'')+
  X.subnav('today',sub.today,!!state.settings.minimal)+subBody('today',{plan:planBody,planner:()=>X.plannerView(state),focus:()=>X.focusView(state),me:meBody});

}
function taskList(){
 let tasks=state.tasks.filter(t=>filter==='archived'?t.archived:!t.archived);
 if(filter==='today')tasks=tasks.filter(t=>C.eligible(t,today())&&!C.completion(state,t,today()));
 if(filter==='upcoming')tasks=tasks.filter(t=>t.date>today());
 if(filter==='done')tasks=tasks.filter(t=>C.completion(state,t,today()));
 return '<div class="filter-row">'+[['today','Na dzisiaj'],['all','Wszystkie'],['upcoming','Później'],['done','Ukończone'],['archived','Archiwum']].map(([v,l])=>'<button class="filter '+(filter===v?'selected':'')+'" data-filter="'+v+'">'+l+'</button>').join('')+'</div><section class="panel"><div class="task-list">'+(tasks.length?tasks.map(t=>taskCard(t,true)).join(''):'<div class="empty"><div class="empty-symbol">☷</div><h3>Tutaj na razie jest spokojnie.</h3><p>Nowy cel możesz dodać jednym przyciskiem.</p></div>')+'</div></section>';
}
function tasksView(){
 return heading('Przestrzeń na Twoje sprawy.','Zapisz myśl. Wybierz pierwszy krok. Resztę zostaw na później.',true,'ZADANIA')+X.subnav('tasks',sub.tasks,!!state.settings.minimal)+subBody('tasks',{list:taskList,quick:()=>X.quickView(state),generator:()=>X.generatorView(state),dump:()=>X.dumpView(),routines:()=>X.routinesView()});
}
function baseBody(){return '<div class="row between panel" style="margin-bottom:22px"><div><div class="eyebrow">TWÓJ DOROBEK</div><h2>◇ '+b().materials+' materiałów</h2><p class="subtext">Trzy miejsca. Dziewięć małych przemian.</p></div><div style="width:220px;max-width:45%">'+scene()+'</div></div><div class="room-grid">'+C.ROOMS.map(r=>{const level=state.rooms[r.id],cost=C.roomCost(state,r.id);return '<section class="panel room-card" data-level="'+level+'"><div class="eyebrow">'+['DO ODKRYCIA','PIERWSZE ŚWIATŁO','CORAZ BLIŻEJ','TWOJE MIEJSCE'][level]+'</div><div class="room-symbol">'+r.symbol+'</div><h2>'+r.name+'</h2><div class="room-level" aria-label="Poziom '+level+' z 3">'+[1,2,3].map(i=>'<span class="'+(level>=i?'on':'')+'"></span>').join('')+'</div><p>'+r.description+'</p><button class="btn '+(level<3?'purple':'')+'" data-action="upgrade" data-id="'+r.id+'" '+(level===3||b().materials<cost?'disabled':'')+'>'+(level===3?'✓ W pełni rozbudowane':(level?'Ulepsz':'Odbuduj')+' · ◇ '+cost)+'</button></section>';}).join('')+'</div><div data-co-slot id="slot-garden"></div>';}
function baseView(){
 return heading('Przystań, którą budujesz.','Każde wykonane zadanie daje materiały. Baza zostaje z Tobą.',false,'BAZA')+X.subnav('base',sub.base,!!state.settings.minimal)+subBody('base',{base:baseBody,bosses:()=>X.bossesView(state),rewards:()=>rewardsBody()+X.rewardIdeas(state)});
}
function rewardsView(){return heading('Coś miłego po drodze.','Twoje monety, Twoje nagrody. Zwykły odpoczynek zawsze jest za darmo.',false,'NAGRODY')+rewardsBody();}
function worldView(){
 const slots={
  trip:()=>'<div class="x-slots"><div data-life-slot id="slot-place"></div><div data-co-slot id="slot-visits"></div></div>',
  calendar:()=>'<div class="x-slots"><div data-life-slot id="slot-calendar"></div></div>',
  facts:()=>X.factsView(),
  diy:()=>X.diyView(),
  settings:()=>'<section class="panel"><h2>Ustawienia</h2><div id="app-update-slot"></div><p id="connection" class="subtext">● Zapis na urządzeniu</p><div class="x-note-actions"><button class="btn primary" data-action="settings">Ustawienia i kopie danych</button><button class="btn" data-action="x-minimal" aria-pressed="'+!!state.settings.minimal+'">Tryb minimalny: '+(state.settings.minimal?'włączony':'wyłączony')+'</button></div><p class="subtext tiny">Tryb minimalny ukrywa dodatki i zostawia plan, skupienie, zadania, bazę i nagrody.</p></section>'+X.namesCard()
 };
 return '<div class="page-heading"><h1>Więcej</h1></div>'+X.subnav('world',sub.world,!!state.settings.minimal)+subBody('world',slots);
}
function rewardsBody(){return '<div class="row between" style="margin-bottom:23px"><span class="btn purple">◈ '+b().coins+' monet</span><button class="btn primary" data-action="reward-add">＋ Własna nagroda</button></div><div class="reward-grid">'+state.rewards.filter(r=>!r.archived).map((r,i)=>'<section class="panel reward-card"><button class="icon-button" data-action="reward-edit" data-id="'+esc(r.id)+'" aria-label="Edytuj nagrodę">⋯</button><div class="reward-art">'+['✧','☾','◇'][i%3]+'</div><h3>'+esc(r.title)+'</h3><div class="row between"><span class="tiny" style="color:var(--gold)">◈ '+r.cost+' monet</span><button class="btn small purple" data-action="redeem" data-id="'+esc(r.id)+'" '+(b().coins<r.cost?'disabled':'')+'>Odbierz ↗</button></div></section>').join('')+'</div>';}
function historyView(){
 const history=state.ledger.filter(e=>e.kind!=='step'||!state.ledger.some(x=>x.kind==='complete'&&x.taskId===e.taskId&&x.occurrence===e.occurrence)).slice().reverse().slice(0,120);
 const log=()=>'<section class="panel"><div class="section-line"><h2>Twoje ostatnie zwycięstwa</h2><span class="tiny muted">Do 120 wpisów</span></div>'+
 (history.length?history.map(e=>'<div class="history-item"><span class="history-symbol">'+({complete:'✓',step:'↗',purchase:'✧',upgrade:'⌂',focus:'◷',legacy:'◇',bonus:'❖',boss:'♞'}[e.kind])+'</span><div style="min-width:0"><strong>'+esc(e.title)+'</strong><small>'+esc(new Date(e.time).toLocaleString('pl-PL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))+' · '+({complete:'Zadanie wykonane',step:'Mały krok',purchase:'Odebrana nagroda',upgrade:'Baza rośnie',focus:e.minutes+' min skupienia',legacy:'Poprzednia wersja',bonus:'Niespodzianka',boss:'Wyprawa'}[e.kind])+'</small></div><span class="history-points">'+(e.kind==='complete'?'✓':e.coins?((e.coins>0?'+':'')+e.coins+' ◈'):e.materials?e.materials+' ◇':'')+'</span></div>').join(''):'<div class="empty"><div class="empty-symbol">↗</div><h3>To dopiero początek Twojej historii.</h3><p>Wykonaj pierwszy krok, a pojawi się tutaj.</p></div>')+'</section>';
 return heading('Widać, ile już za Tobą.','Małe rzeczy też są osiągnięciami. Tutaj mają swoje miejsce.',false,'POSTĘP')+X.subnav('history',sub.history,!!state.settings.minimal)+subBody('history',{overview:()=>'<div class="dashboard"><div class="stack">'+profile()+week()+'</div><div class="stack">'+X.attributesCard(state)+'</div></div>',badges:()=>X.badgesView(state),rhythm:()=>X.rhythmView(state),log});
}
function render(){
 if(state.water.day!==today())state.water={day:today(),count:0};
 applySettings();

 if(tab==='rewards'){tab='base';sub.base='rewards';}
 $('#main').innerHTML=({today:todayView,tasks:tasksView,world:worldView,base:baseView,history:historyView}[tab]||todayView)();
 if(tab==='world'&&sub.world==='settings'){$('#connection').textContent=loadFailed?'● Zapis wstrzymany':storageFailed?'● Błąd zapisu':navigator.onLine?'● Zapis na urządzeniu':'● Działasz offline';}
 document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===tab);if(el.closest('nav')){if(el.dataset.tab===tab)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');}});
 renderFocus();state.lastVisit=today();save();
 const earnedNow=X.checkBadges(state);if(earnedNow.length)toast('Nowa odznaka: '+earnedNow.join(', ')+' ✦');
}
function modal(title,body){
 lastTrigger=document.activeElement;
 $('#modal-body').innerHTML='<div class="modal-heading"><h2 id="modal-title">'+esc(title)+'</h2><button class="icon-button" data-action="close" aria-label="Zamknij">×</button></div>'+body;
 if(!$('#modal').open)$('#modal').showModal();
}
function close(){if($('#modal').open)$('#modal').close();lastTrigger?.isConnected&&lastTrigger.focus();}
function taskForm(id=null,already=false){
 const t=state.tasks.find(t=>t.id===id),locked=t&&state.ledger.some(e=>e.taskId===id&&['step','complete'].includes(e.kind));
 modal(already?'Małe zwycięstwo':t?'Twoje zadanie':'Zrób miejsce na nowy cel',
 '<form id="task-form" data-id="'+esc(id||'')+'" data-already="'+already+'"><label class="field">Co chcesz '+(already?'zapisać':'zrobić')+'?<input name="title" required maxlength="160" value="'+esc(t?.title||'')+'" placeholder="Np. wybrać zdjęcia do oferty" autofocus></label><div class="form-grid"><label class="field">Wielkość kroku<select name="tier" '+(locked?'disabled':'')+'>'+Object.entries(C.TIERS).map(([v,x])=>'<option value="'+v+'" '+(t?.tier===v||!t&&v==='normal'?'selected':'')+'>'+x.label+' · '+x.xp+' XP / '+x.coins+' ◈</option>').join('')+'</select></label><label class="field">Obszar<select name="category">'+[['life','Życie'],['work','Praca'],['self','Dla siebie']].filter(([v])=>v!=='work'||t?.category==='work').map(([v,l])=>'<option value="'+v+'" '+(t?.category===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><div class="form-grid"><label class="field">Kiedy?<input name="date" type="date" required value="'+esc(t?.date||today())+'" '+(locked||already?'disabled':'')+'></label><label class="field">Powtarzanie<select name="repeat" '+(locked||already?'disabled':'')+'>'+[['none','Jednorazowo'],['daily','Codziennie'],['weekdays','Dni robocze'],['weekly','Co tydzień']].map(([v,l])=>'<option value="'+v+'" '+(t?.repeat===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label></div><label class="field">Małe kroki <span class="muted">(opcjonalne)</span><textarea name="steps" maxlength="2000" placeholder="Wybrać 5 zdjęć&#10;Napisać krótki opis&#10;Opublikować ofertę" '+(locked?'disabled':'')+'>'+esc(t?.steps.join('\n')||'')+'</textarea><small>'+ (locked?'Po rozpoczęciu nagrody, kroki i cykl pozostają stałe. Możesz zmienić opis lub utworzyć nowe zadanie.':'Jeden krok w wierszu, do 12. Nagroda dzieli się między kroki.')+'</small></label><div class="form-actions">'+(t?'<button type="button" class="btn danger" data-action="archive" data-id="'+esc(t.id)+'">'+(t.archived?'Przywróć zadanie':'Archiwizuj')+'</button>':'')+'<button type="button" class="btn" data-action="close">Anuluj</button><button class="btn primary" type="submit">'+(already?'Zapisz i odbierz nagrodę':t?'Zapisz zmiany':'Dodaj zadanie')+'</button></div></form>');
}
function rewardForm(id=null){
 const r=state.rewards.find(r=>r.id===id);
 modal(r?'Twoja nagroda':'Na co zbierasz?',
 '<form id="reward-form" data-id="'+esc(id||'')+'"><label class="field">Nazwa nagrody<input name="title" required maxlength="160" value="'+esc(r?.title||'')+'" placeholder="Np. nowa książka" autofocus></label><label class="field">Koszt w monetach<input name="cost" type="number" min="1" max="100000" step="1" required value="'+(r?.cost||100)+'"><small>Małe zadanie daje 10 monet, zwykłe 25, wyzwanie 50.</small></label><p class="subtext">To dodatkowa przyjemność. Nie musisz zasługiwać na odpoczynek ani podstawowe potrzeby.</p><div class="form-actions">'+(r?'<button class="btn danger" type="button" data-action="reward-delete" data-id="'+esc(r.id)+'">Usuń z oferty</button>':'')+'<button class="btn primary" type="submit">Zapisz nagrodę</button></div></form>');
}
function settings(){
 modal('Po Twojemu',
 '<form id="settings-form"><label class="field">Jak mamy się do Ciebie zwracać?<input name="name" maxlength="40" value="'+esc(state.settings.name)+'"></label>'+[['sound','Dźwięk po wykonaniu'],['haptics','Delikatna wibracja (jeśli dostępna)'],['calm','Spokojny wygląd, bez efektów'],['surprises','Niespodzianki: czasem mały bonus za krok'],['minimal','Tryb minimalny: tylko to, co najważniejsze']].map(([k,l])=>'<label class="setting-line">'+l+'<input type="checkbox" name="'+k+'" '+(state.settings[k]?'checked':'')+'></label>').join('')+'<div class="form-actions"><button class="btn primary" type="submit">Zapisz ustawienia</button></div></form><hr style="border:0;border-top:1px solid var(--line);margin:23px 0"><button class="btn purple" data-action="notifications" style="width:100%;margin-bottom:20px">♧ Powiadomienia i przypomnienia</button><h3>Twoje dane</h3><p class="subtext">Zapis jest lokalny w tej przeglądarce. Kopia pozwala przenieść postęp na inne urządzenie. Synchronizację między urządzeniami włączysz powyżej za pomocą kodu parowania.</p><div class="row wrap" style="margin-top:17px"><button class="btn" data-action="export">↓ Pobierz kopię</button><button class="btn" data-action="import">↑ Wczytaj kopię</button>'+(loadFailed?'<button class="btn danger" data-action="raw-export">Pobierz oryginalny zapis</button>':'')+'</div><input type="file" id="import-file" accept=".json,application/json" hidden><p class="subtext tiny">Na iPhonie: Udostępnij → Do ekranu początkowego. Pierwsze otwarcie wymaga internetu; aplikacja potwierdzi gotowość offline.</p>'+(installPrompt?'<button class="btn purple" data-action="install" style="margin-top:12px">Zainstaluj SYNAPSE</button>':'')+
 '<p class="subtext tiny">Tryb skupienia nie blokuje innych aplikacji. Energia to Twoja deklaracja, nie pomiar medyczny.</p>');
}
function renderFocus(){
 const f=state.focus,bar=$('#focus-bar');bar.hidden=!f;document.body.classList.toggle('focusing',!!f);if(!f)return;
 const left=C.remaining(f),seconds=Math.ceil(left/1000),time=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const t=state.tasks.find(t=>t.id===f.taskId);
 document.title=left===0?'Gotowe! — SYNAPSE':time+' — SYNAPSE';
 const signature=[f.id,f.paused,left===0,t?.title].join('|');
 if(bar.dataset.signature===signature&&bar.querySelector('.focus-time')){bar.querySelector('.focus-time').textContent=time;return;}
 bar.dataset.signature=signature;
 bar.innerHTML='<span class="focus-time" role="timer" aria-label="Pozostały czas">'+time+'</span><div class="focus-info"><strong>'+esc(t?.title||'Chwila skupienia')+'</strong><small>'+(left===0?'Dobra robota. Zapisz sesję.':f.paused?'Pauza. Bez pośpiechu.':'Teraz tylko ten mały krok.')+'</small></div>'+(left===0?'<button class="btn primary small" data-action="focus-finish">Zapisz sesję ✓</button>':'<button class="btn small" data-action="focus-pause">'+(f.paused?'Wznów':'Pauza')+'</button>')+'<button class="icon-button" data-action="focus-stop" aria-label="Zakończ sesję bez zapisu">×</button>';
 document.title=left===0?'Gotowe! — SYNAPSE':time+' — SYNAPSE';
 if(left===0&&ringed!==f.id){ringed=f.id;toast('Czas minął. Zapisz sesję, a potem zdecyduj o kolejnym kroku.');if(state.settings.haptics)navigator.vibrate?.([70,50,70]);}
}
function begin(id,minutes){C.startFocus(state,id,minutes);save();close();renderFocus();toast(minutes+' minut. Tylko tyle na początek.');}
function help(id){
 modal('Zejdźmy o jeden stopień niżej.',
 '<p class="subtext" style="margin-bottom:18px">Nie musisz kończyć całości. Wybierz najłatwiejszy początek.</p><div class="help-options"><button class="help-option" data-action="help-split" data-id="'+esc(id)+'"><strong>↳ Podziel na małe kroki</strong><small>Co można zrobić jako pierwsze, bez przygotowań?</small></button><button class="help-option" data-action="focus-2" data-id="'+esc(id)+'"><strong>▷ Spróbuj tylko przez 2 minuty</strong><small>Po sygnale możesz skończyć. To też się liczy.</small></button><button class="help-option" data-action="easier" data-id="'+esc(id)+'"><strong>◇ Wybierz coś łatwiejszego</strong><small>Zbuduj rozpęd innym, mniejszym zadaniem.</small></button></div>');
}
function download(content,name){
 const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 act(()=>{
 if(button.dataset.sub){sub[tab]=button.dataset.sub;render();return;}
 if(button.dataset.go){const [t,v]=button.dataset.go.split(':');tab=t;sub[t]=v;render();$('#main').focus();window.scrollTo({top:0,behavior:'instant'});return;}
 if(button.dataset.tab){tab=button.dataset.tab;render();$('#main').focus();window.scrollTo({top:0,behavior:'instant'});return;}
 if(button.dataset.filter){filter=button.dataset.filter;render();return;}
 if(button.dataset.energy){state.energy=button.dataset.energy;render();return;}
 const action=button.dataset.action,id=button.dataset.id,t=state.tasks.find(t=>t.id===id);
 switch(action){
 case 'add':taskForm();break;
 case 'already':taskForm(null,true);break;
 case 'edit':taskForm(id);break;
 case 'close':close();break;
 case 'minimum':state.minimum=!state.minimum;render();break;
 case 'help':help(id);break;
 case 'help-split':taskForm(id);break;
 case 'easier':{const alternative=ready().filter(x=>x.id!==id).sort((a,b)=>C.TIERS[a.tier].xp-C.TIERS[b.tier].xp)[0];if(alternative){selected=alternative.id;close();render();toast('Dziś możesz zacząć od: '+alternative.title);}else taskForm();break;}
 case 'complete':{const before=state.ledger.length,earned=C.completeTask(state,id);if(earned){save();render();celebrate(earned,finds(before));}break;}
 case 'undo':if(C.undoTask(state,id)){save();render();toast('Cofnięto wykonanie i przyznaną nagrodę.');}break;
 case 'archive':if(t){t.archived=!t.archived;save();close();render();toast(t.archived?'Zadanie w archiwum. Możesz je przywrócić.':'Zadanie przywrócone.');}break;
 case 'restore':if(t){t.archived=false;render();toast('Zadanie przywrócone.');}break;
 case 'water':{const w=C.logWater(state);save();render();toast(w.ml>=2000?'Cel 2 l osiągnięty. Dobra robota!':'Zapisano 200 ml · '+w.count+'/10 porcji.');break;}
 case 'water-undo':C.logWater(state,-1);save();render();toast('Cofnięto ostatnią porcję 200 ml.');break;
 case 'focus':if(state.focus){toast('Masz już uruchomioną sesję. Timer jest na dole.');return;}modal('Ile przestrzeni potrzebujesz?','<p class="subtext" style="margin-bottom:20px">'+esc(t?.title||'Wybierz krótki blok skupienia.')+'</p><div class="help-options">'+[5,15,25].map(n=>'<button class="help-option" data-action="focus-'+n+'" data-id="'+esc(id||'')+'"><strong>▷ '+n+' minut</strong><small>'+(n===5?'Lekki start. Możesz skończyć po sygnale.':n===15?'Jeden konkretny etap.':'Trochę więcej miejsca na pracę.')+'</small></button>').join('')+'</div>');break;
 case 'focus-2':case 'focus-5':case 'focus-15':case 'focus-25':begin(id||null,Number(action.split('-')[1]));break;
 case 'focus-pause':C.togglePause(state);save();renderFocus();break;
 case 'focus-stop':modal('Zakończyć tę sesję?','<p class="subtext">Przerwana sesja nie daje punktów i nie odbiera postępu w zadaniu.</p><div class="form-actions"><button class="btn" data-action="close">Wróć do sesji</button><button class="btn purple" data-action="focus-discard">Zakończ</button></div>');break;
 case 'focus-discard':state.focus=null;save();close();$('#focus-bar').hidden=true;document.body.classList.remove('focusing');document.title='SYNAPSE — małe kroki, własny rytm';break;
 case 'focus-finish':{const taskId=state.focus?.taskId;if(C.finishFocus(state)){save();render();document.title='SYNAPSE — małe kroki, własny rytm';modal('Dobra robota. Byłeś przy zadaniu.','<p class="subtext">Sesja jest w historii. Punkty przyznajemy za wykonane kroki — sam timer nie oznacza ukończenia zadania.</p><div class="form-actions"><button class="btn" data-action="close">Tyle na teraz</button>'+(state.tasks.some(t=>t.id===taskId&&!t.archived)&&!C.completion(state,state.tasks.find(t=>t.id===taskId),today())?'<button class="btn primary" data-action="focus-task" data-id="'+esc(taskId)+'">Zobacz moje kroki</button>':'')+'</div>');}break;}
 case 'focus-task':close();tab='tasks';sub.tasks='list';filter='today';render();{const card=document.querySelector('[data-task="'+CSS.escape(id)+'"]');card?.scrollIntoView({block:'center'});card?.querySelector('button')?.focus();}break;
 case 'upgrade':C.upgrade(state,id);save();render();celebrate();break;
 case 'reward-add':rewardForm();break;
 case 'reward-edit':rewardForm(id);break;
 case 'reward-delete':state.rewards.find(r=>r.id===id).archived=true;save();close();render();break;
 case 'redeem':{const r=state.rewards.find(r=>r.id===id);modal('Chwila przyjemności.','<p class="subtext">'+esc(r.title)+' · '+r.cost+' monet</p><p class="subtext">Odebrać nagrodę i zapisać ją w historii?</p><div class="form-actions"><button class="btn" data-action="close">Jeszcze zbieram</button><button class="btn primary" data-action="redeem-confirm" data-id="'+esc(id)+'">Odbieram ✧</button></div>');break;}
 case 'redeem-confirm':{const e=C.redeem(state,id);save();close();render();toast('Twoja nagroda: '+e.title+'. Miłej chwili!');break;}
 case 'settings':settings();break;
 case 'export':download(JSON.stringify(state,null,2),'synapse-'+today()+'.json');break;
 case 'raw-export':download(localStorage.getItem(KEY)||'{}','synapse-oryginalny-zapis.json');break;
 case 'import':$('#import-file').click();break;
 case 'install':installPrompt?.prompt();installPrompt=null;break;
 }
 });
});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-step]'))act(()=>{const before=state.ledger.length,earned=C.completeTask(state,e.target.dataset.id,today(),Date.now(),Number(e.target.dataset.step));if(earned){save();render();celebrate(earned,finds(before));}});
 if(e.target.id==='import-file'){
 const file=e.target.files[0];if(!file)return;
 if(file.size>15000000){toast('Kopia jest za duża (maks. 15 MB).');return;}
 file.text().then(text=>act(()=>{
 const imported=C.validate(JSON.parse(text));
 storePendingImport=imported;
 modal('Wczytać tę kopię?','<p class="subtext">Kopia zawiera '+imported.tasks.length+' zadań i '+imported.ledger.length+' wpisów. Zastąpi obecny postęp. Najpierw pobierzemy aktualny zapis jako kopię bezpieczeństwa.</p><div class="form-actions"><button class="btn" data-action="close">Anuluj</button><button class="btn primary" id="confirm-import">Wczytaj kopię</button></div>');
 })).catch(()=>toast('Nie udało się odczytać pliku.'));
 }
});
let storePendingImport=null;
document.addEventListener('click',e=>{
 if(!e.target.closest('#confirm-import')||!storePendingImport)return;
 act(()=>{
 const old=localStorage.getItem(KEY);
 download(old||JSON.stringify(state,null,2),'synapse-przed-importem-'+today()+'.json');
 localStorage.setItem(KEY,JSON.stringify(storePendingImport));
 state=storePendingImport;storePendingImport=null;loadFailed=false;storageFailed=false;selected=null;notice='Kopia wczytana. Wszystko na swoim miejscu.';close();render();toast('Postęp wczytany.');
 });
});
document.addEventListener('submit',e=>{
 if(!['task-form','reward-form','settings-form'].includes(e.target.id))return;e.preventDefault();
 act(()=>{
 const form=e.target,data=new FormData(form);
 if(form.id==='task-form'){
 const old=state.tasks.find(t=>t.id===form.dataset.id),locked=old&&state.ledger.some(x=>x.taskId===old.id&&['step','complete'].includes(x.kind));
 const input={title:data.get('title'),tier:locked?old.tier:data.get('tier'),category:data.get('category'),date:locked?old.date:data.get('date')||today(),repeat:locked?old.repeat:data.get('repeat')||'none',steps:locked?old.steps:String(data.get('steps')||'').split('\n')};
 const task=C.makeTask(input);if(!/^\d{4}-\d{2}-\d{2}$/.test(task.date))throw Error('Wybierz prawidłową datę.');
 if(old)Object.assign(old,task,{id:old.id,createdAt:old.createdAt,archived:old.archived});else state.tasks.push(task);
 const before=state.ledger.length,earned=form.dataset.already==='true'?C.completeTask(state,task.id):null;
 save();close();render();if(earned)celebrate(earned,finds(before));else toast(old?'Zmiany zapisane.':'Nowy krok jest na liście.');
 }
 if(form.id==='reward-form'){
 const title=String(data.get('title')).trim(),cost=Number(data.get('cost'));if(!title||!Number.isSafeInteger(cost)||cost<1||cost>100000)throw Error('Wpisz nazwę i koszt od 1 do 100 000.');
 const r=state.rewards.find(r=>r.id===form.dataset.id);if(r)Object.assign(r,{title,cost});else state.rewards.push({id:C.uid(),title,cost,archived:false});
 save();close();render();toast('Nagroda zapisana.');
 }
 if(form.id==='settings-form'){state.settings={name:String(data.get('name')).trim().slice(0,40),sound:data.has('sound'),haptics:data.has('haptics'),calm:data.has('calm'),surprises:data.has('surprises'),minimal:data.has('minimal')};save();close();render();toast('Teraz jeszcze bardziej po Twojemu.');}
 });
});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('online',render);window.addEventListener('offline',render);
window.addEventListener('storage',e=>{if(e.key===KEY){try{const newer=C.validate(JSON.parse(e.newValue));state=newer;close();render();toast('Postęp odświeżony z drugiej karty.');}catch{toast('Zapis zmienił się w innej karcie. Odśwież aplikację.');}}});
let lastDay=today();
setInterval(()=>{renderFocus();X.tick(state,document);if(lastDay!==today()){lastDay=today();render();}},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderFocus();if(lastDay!==today()){lastDay=today();render();}}});
X.init({state:()=>state,save,render,toast,modal,close,celebrate,today},document);
render();
try{
 const q=new URLSearchParams(location.search||''),go=q.get('action');
 if(go==='add')taskForm();
 if(go==='dump'){tab='tasks';sub.tasks='dump';render();}
 if(go==='focus'){tab='today';sub.today='focus';render();}
 if(go&&typeof history!=='undefined')history.replaceState(null,'',location.pathname);
}catch{}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 navigator.serviceWorker.register('./sw.js').then(reg=>{
 if(navigator.serviceWorker.controller)return;
 const ready=()=>toast('SYNAPSE jest gotowe do pracy offline.');
 if(reg.active)ready();else reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',e=>{if(e.target.state==='activated')ready();}));
 }).catch(()=>toast('Tryb offline jest chwilowo niedostępny. Zadania nadal zapisują się na urządzeniu.'));
}

// Shared add-ons use the existing validator and persistence path.
document.addEventListener('companion-state',e=>{const q=e.detail;if(q.action==='read'){q.result=structuredClone(state);return;}try{if(loadFailed)throw Error('Najpierw odzyskaj oryginalny zapis w ustawieniach.');const before=state,next=structuredClone(state);q.update(next);C.validate(next);state=next;if(!save()){state=before;throw Error('Nie udało się zapisać zmiany.');}render();q.result=true;}catch(err){q.error=err.message;}});
