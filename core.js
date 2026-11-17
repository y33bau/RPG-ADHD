export const VERSION = 2;
export const TIERS = {micro:{xp:15,coins:10,label:'Mały krok'},normal:{xp:40,coins:25,label:'Zadanie'},big:{xp:80,coins:50,label:'Wyzwanie'}};
export const ROOMS = [
{id:'workshop',name:'Warsztat',description:'Miejsce, w którym pomysły nabierają kształtu.',symbol:'◇'},
{id:'garden',name:'Ogród',description:'Trochę przestrzeni na spokojny oddech.',symbol:'❋'},
{id:'observatory',name:'Obserwatorium',description:'Twoje małe zwycięstwa tworzą konstelację.',symbol:'✧'}
];
export function dayKey(time=Date.now()){const d=new Date(time);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
export function uid(){return globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);}
export function fresh(now=Date.now()){
 return {version:VERSION,createdAt:now,settings:{name:'Adrian',sound:false,haptics:true,calm:false},energy:'medium',minimum:false,
 tasks:[],ledger:[],rewards:[
 {id:'game',title:'Sesja NightBrand',cost:100,archived:false},
 {id:'movie',title:'Wieczór filmowy',cost:150,archived:false},
 {id:'small',title:'Mała przyjemność dla siebie',cost:60,archived:false}
 ],rooms:{workshop:0,garden:0,observatory:0},focus:null,water:{day:dayKey(now),count:0},lastVisit:dayKey(now)};
}
export function makeTask(input,now=Date.now()){
 const title=String(input.title||'').trim().slice(0,160);if(!title)throw Error('Wpisz nazwę zadania.');
 const steps=(input.steps||[]).map(s=>String(s).trim().slice(0,160)).filter(Boolean).slice(0,12);
 return {id:uid(),title,tier:Object.hasOwn(TIERS,input.tier)?input.tier:'normal',category:['life','work','self'].includes(input.category)?input.category:'life',
 date:input.date||dayKey(now),repeat:['none','daily','weekdays','weekly'].includes(input.repeat)?input.repeat:'none',
 steps,archived:false,createdAt:now};
}
export function occurrence(task,day){return task.repeat==='none'?'once':day;}
export function eligible(task,day){
 if(task.archived || task.date>day)return false;
 if(task.repeat==='weekdays'){const n=new Date(day+'T12:00:00').getDay();return n!==0&&n!==6;}
 if(task.repeat==='weekly')return new Date(day+'T12:00:00').getDay()===new Date(task.date+'T12:00:00').getDay();
 return true;
}
export function completion(state,task,day){const o=occurrence(task,day);return state.ledger.find(e=>e.kind==='complete'&&e.taskId===task.id&&e.occurrence===o);}
export function progress(state,task,day){
 const o=occurrence(task,day);return state.ledger.filter(e=>e.kind==='step'&&e.taskId===task.id&&e.occurrence===o).map(e=>e.step);
}
function share(total,count,index){return Math.floor(total/count)+(index<total%count?1:0);}
function rewardFor(task,index){const t=TIERS[task.tier];const n=task.steps.length||1;return {xp:share(t.xp,n,index),coins:share(t.coins,n,index),materials:share(task.tier==='big'?6:task.tier==='normal'?3:1,n,index)};}
export function completeTask(state,id,day=dayKey(),now=Date.now(),step=null){
 const task=state.tasks.find(t=>t.id===id);if(!task||!eligible(task,day)||completion(state,task,day))return null;
 const o=occurrence(task,day),done=progress(state,task,day);let earned={xp:0,coins:0,materials:0};
 const indices=task.steps.length?(step===null?task.steps.map((_,i)=>i):[step]):[0];
 for(const i of indices){
  if(!Number.isInteger(i)||i<0||i>=(task.steps.length||1)||done.includes(i))continue;
  const reward=rewardFor(task,i);Object.keys(earned).forEach(k=>earned[k]+=reward[k]);
  state.ledger.push({id:uid(),kind:'step',taskId:id,title:task.title,occurrence:o,step:i,day,time:now,...reward});
 }
 const finished=progress(state,task,day).length===(task.steps.length||1);
 if(finished)state.ledger.push({id:uid(),kind:'complete',taskId:id,title:task.title,occurrence:o,day,time:now,xp:0,coins:0,materials:0});
 return earned;
}
export function balance(state){
 return state.ledger.reduce((a,e)=>({xp:a.xp+(e.xp||0),coins:a.coins+(e.coins||0),materials:a.materials+(e.materials||0)}),{xp:0,coins:0,materials:0});
}
export function levelInfo(xp){let level=1,needed=100;while(xp>=needed){xp-=needed;level++;needed=100+(level-1)*40;}return {level,xp,needed};}
export function undoTask(state,id,day=dayKey()){
 const task=state.tasks.find(t=>t.id===id);if(!task)return false;const o=occurrence(task,day);
 const removed=state.ledger.filter(e=>e.taskId===id&&e.occurrence===o&&['step','complete'].includes(e.kind));
 if(!removed.length)return false;
 const b=balance(state);if(removed.reduce((n,e)=>n+(e.coins||0),0)>b.coins||removed.reduce((n,e)=>n+(e.materials||0),0)>b.materials)
 throw Error('Nagroda została już wydana. Cofnięcie wymaga dostępnych monet i materiałów.');
 state.ledger=state.ledger.filter(e=>!removed.includes(e));return true;
}
export function redeem(state,id,now=Date.now()){
 const r=state.rewards.find(r=>r.id===id&&!r.archived);if(!r)throw Error('Nie ma takiej nagrody.');
 if(balance(state).coins<r.cost)throw Error('Jeszcze trochę monet — jesteś coraz bliżej.');
 const e={id:uid(),kind:'purchase',title:r.title,day:dayKey(now),time:now,coins:-r.cost,xp:0,materials:0};state.ledger.push(e);return e;
}
export function roomCost(state,id){return 5+state.rooms[id]*5;}
export function upgrade(state,id,now=Date.now()){
 if(!ROOMS.some(r=>r.id===id)||state.rooms[id]>=3)throw Error('To pomieszczenie jest już gotowe.');
 const cost=roomCost(state,id);if(balance(state).materials<cost)throw Error('Zdobądź jeszcze trochę materiałów za zadania.');
 state.rooms[id]++;state.ledger.push({id:uid(),kind:'upgrade',title:ROOMS.find(r=>r.id===id).name,day:dayKey(now),time:now,xp:0,coins:0,materials:-cost});
}
export function startFocus(state,taskId,minutes,now=Date.now()){
 if(state.focus)throw Error('Najpierw zakończ obecną sesję.');
 if(![2,5,15,25].includes(minutes))throw Error('Nieprawidłowy czas.');
 state.focus={id:uid(),taskId:taskId||null,duration:minutes*60000,remaining:minutes*60000,endAt:now+minutes*60000,paused:false};
}
export function remaining(focus,now=Date.now()){return !focus?0:focus.paused?focus.remaining:Math.max(0,focus.endAt-now);}
export function togglePause(state,now=Date.now()){
 const f=state.focus;if(!f)return;if(f.paused){f.endAt=now+f.remaining;f.paused=false;}else{f.remaining=remaining(f,now);f.paused=true;}
}
export function finishFocus(state,now=Date.now()){
 const f=state.focus;if(!f||remaining(f,now)>0)return false;
 if(!state.ledger.some(e=>e.sessionId===f.id))state.ledger.push({id:uid(),sessionId:f.id,kind:'focus',title:'Sesja skupienia',minutes:f.duration/60000,taskId:f.taskId,day:dayKey(now),time:now,xp:0,coins:0,materials:0});
 state.focus=null;return true;
}
export function activeDays(state,today=dayKey()){
 const end=new Date(today+'T12:00:00');const start=new Date(end);start.setDate(start.getDate()-6);
 const min=dayKey(start);return new Set(state.ledger.filter(e=>['step','focus'].includes(e.kind)&&e.day>=min&&e.day<=today).map(e=>e.day)).size;
}
export function validate(data){
 const fail=()=>{throw Error('Ten plik nie jest poprawną kopią SYNAPSE v2.');};
 if(!data||data.version!==VERSION||!Array.isArray(data.tasks)||!Array.isArray(data.ledger)||!Array.isArray(data.rewards)||!data.rooms||!data.settings)fail();
 if(data.tasks.length>10000||data.ledger.length>100000||data.rewards.length>1000)fail();
 const str=(s,max)=>typeof s==='string'&&s.length<=max;
 const date=s=>str(s,10)&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dayKey(new Date(s+'T12:00:00'))===s;
 const ids=new Set();
 for(const t of data.tasks){
 if(!str(t.id,100)||ids.has(t.id)||!str(t.title,160)||!t.title.trim()||!Object.hasOwn(TIERS,t.tier)||!['life','work','self'].includes(t.category)||!date(t.date)||!['none','daily','weekdays','weekly'].includes(t.repeat)||typeof t.archived!=='boolean'||!Array.isArray(t.steps)||t.steps.length>12||t.steps.some(s=>!str(s,160)))fail();ids.add(t.id);
 }
 const entryIds=new Set(),unique=new Set();
 for(const e of data.ledger){
 if(!str(e.id,100)||entryIds.has(e.id)||!['step','complete','purchase','upgrade','focus','legacy'].includes(e.kind)||!str(e.title,200)||!date(e.day)||!Number.isFinite(e.time)||e.time<0)fail();
 entryIds.add(e.id);
 for(const k of ['xp','coins','materials'])if(!Number.isSafeInteger(e[k])||Math.abs(e[k])>10000000)fail();
 if(e.xp<0||(e.kind==='step'&&(e.coins<0||e.materials<0)))fail();
 if(['step','complete'].includes(e.kind)){
 if(!ids.has(e.taskId)||!(e.occurrence==='once'||date(e.occurrence)))fail();
 const key=e.taskId+':'+e.occurrence+':'+e.kind+':'+(e.kind==='step'?e.step:'');
 if(unique.has(key)||e.kind==='step'&&(!Number.isInteger(e.step)||e.step<0||e.step>11))fail();unique.add(key);
 }
 }
 const rewardIds=new Set();
 for(const r of data.rewards){if(!str(r.id,100)||rewardIds.has(r.id)||!str(r.title,160)||!r.title.trim()||!Number.isSafeInteger(r.cost)||r.cost<1||r.cost>100000||typeof r.archived!=='boolean')fail();rewardIds.add(r.id);}
 for(const r of ROOMS)if(!Number.isInteger(data.rooms[r.id])||data.rooms[r.id]<0||data.rooms[r.id]>3)fail();
 if(!['low','medium','high'].includes(data.energy)||typeof data.minimum!=='boolean'||!str(data.settings.name,40))fail();
 for(const k of ['sound','haptics','calm'])if(typeof data.settings[k]!=='boolean')fail();
 if(!data.water||!date(data.water.day)||!Number.isInteger(data.water.count)||data.water.count<0||data.water.count>20)fail();
 if(data.focus){const f=data.focus;if(!str(f.id,100)||!(f.taskId===null||ids.has(f.taskId))||![120000,300000,900000,1500000].includes(f.duration)||!Number.isFinite(f.remaining)||f.remaining<0||f.remaining>f.duration||!Number.isFinite(f.endAt)||typeof f.paused!=='boolean')fail();}
 const b=balance(data);if(Object.values(b).some(n=>!Number.isSafeInteger(n)||n<0))fail();
 return data;
}
export function migrate(oldAgent,oldTasks,now=Date.now()){
 const s=fresh(now);
 if(oldAgent&&typeof oldAgent==='object'){
 const n=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1000000,Math.floor(Number(v)))):0;
 s.ledger.push({id:uid(),kind:'legacy',title:'Dorobek z poprzedniej wersji',day:dayKey(now),time:now,xp:n(oldAgent.xp),coins:n(oldAgent.gold),materials:0});
 }
 if(Array.isArray(oldTasks))for(const old of oldTasks.slice(0,1000)){
 if(typeof old.title!=='string'||!old.title.trim())continue;
 const t=makeTask({title:old.title,tier:old.xp>=60?'big':old.xp>=25?'normal':'micro'},now);s.tasks.push(t);
 if(old.completed)s.ledger.push({id:uid(),kind:'complete',taskId:t.id,title:t.title,occurrence:'once',day:dayKey(now),time:now,xp:0,coins:0,materials:0});
 }
 return s;
}

export const WATER_PORTION=200, WATER_GOAL=2000;
export function hydration(state,now=Date.now()){
 const count=state.water.day===dayKey(now)?state.water.count:0;
 return {count,ml:count*WATER_PORTION,goal:WATER_GOAL,remaining:Math.max(0,WATER_GOAL-count*WATER_PORTION),percent:Math.min(100,count*WATER_PORTION/WATER_GOAL*100)};
}
export function logWater(state,delta=1,now=Date.now()){
 if(![1,-1].includes(delta))throw Error('Nieprawidłowa porcja wody.');
 if(state.water.day!==dayKey(now))state.water={day:dayKey(now),count:0};
 state.water.count=Math.max(0,Math.min(10,state.water.count+delta));
 return hydration(state,now);
}
