export function defaultReminders(app){return {enabled:false,water:app==='adhd',work:true,start:9,end:19,waterEvery:60,workEvery:180,weekdays:app==='agent',times:[],zone:'Europe/Warsaw',last:{},backend:'',token:'',push:false,deviceId:''};}
export function localClock(now=Date.now(),zone='Europe/Warsaw'){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,minute:Number(p.hour)*60+Number(p.minute),weekend:['Sat','Sun'].includes(p.weekday)};
}
export function dueReminders(config,now=Date.now(),hydrationDone=false){
 const clock=localClock(now,config.zone);
 if(!config.enabled||config.weekdays&&clock.weekend)return [];
 const out=[];
 for(const kind of ['water','work']){
 if(!config[kind]||kind==='water'&&hydrationDone)continue;
 const every=kind==='water'?config.waterEvery:config.workEvery;
 if(![30,60,90,120,180,240].includes(every))continue;
 for(let minute=config.start*60;minute<config.end*60;minute+=every){
 if(clock.minute>=minute&&clock.minute<minute+5){
 const key=clock.day+':'+kind+':'+minute;if(!config.last?.[key])out.push({kind,key,day:clock.day,minute});
 }
 }
 }
 // Fixed times ("o 9:00 i 20:00"): one reminder per chosen time, within a 5-minute window.
 for(const time of config.times||[]){
 const minute=toMinute(time);if(minute===null)continue;
 if(clock.minute>=minute&&clock.minute<minute+5){const key=clock.day+':time:'+minute;if(!config.last?.[key])out.push({kind:minute<720?'morning':'evening',key,day:clock.day,minute});}
 }
 return out;
}
/** 'HH:MM' → minutes after midnight, or null. */
export function toMinute(time){const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time));return m?Number(m[1])*60+Number(m[2]):null;}
export function validateReminders(raw,app){
 const base=defaultReminders(app),v={...base,...raw};
 for(const k of ['enabled','water','work','weekdays','push'])if(typeof v[k]!=='boolean')throw Error('Nieprawidłowe ustawienia przypomnień.');
 if(!Number.isInteger(v.start)||!Number.isInteger(v.end)||v.start<0||v.end>24||v.start>=v.end)throw Error('Początek przypomnień musi być przed końcem.');
 for(const k of ['waterEvery','workEvery'])if(![30,60,90,120,180,240].includes(v[k]))throw Error('Wybierz odstęp z listy.');
 if(!Array.isArray(v.times)||v.times.length>4||v.times.some(t=>toMinute(t)===null))throw Error('Podaj do 4 godzin w formacie GG:MM.');v.times=[...new Set(v.times)].sort();
 localClock(Date.now(),v.zone);v.last=typeof v.last==='object'&&v.last?v.last:{};
 return v;
}
export function reminderMessage(app,kind){
 if(kind==='morning')return app==='agent'?{title:'AGENT EMPIRE · plan dnia',body:'Jeden najważniejszy kontakt na dziś. Od czego zaczynasz?',tag:'agent-time'}:{title:'SYNAPSE · plan dnia',body:'Wybierz jedną rzecz na dziś. Tylko jedną.',tag:'synapse-time'};
 if(kind==='evening')return app==='agent'?{title:'AGENT EMPIRE · domknięcie dnia',body:'Zapisz, co zostało na jutro, i odpocznij.',tag:'agent-time'}:{title:'SYNAPSE · wieczorne wyciszenie',body:'Zrzut z głowy i rzeczy na jutro. Kilka minut i spokój.',tag:'synapse-time'};
 if(kind==='water')return {title:'SYNAPSE · porcja wody',body:'Czas na 200 ml. Jeden mały rytuał w stronę celu 2 l.',tag:'synapse-water'};
 return app==='agent'?{title:'AGENT EMPIRE · następny ruch',body:'Jeden kontakt. Jeden konkretny następny krok. Wracamy do gry?',tag:'agent-work'}:{title:'SYNAPSE · mały krok',body:'Wybierz jedną rzecz. Spróbuj przez 5 minut — reszta może poczekać.',tag:'synapse-work'};
}
