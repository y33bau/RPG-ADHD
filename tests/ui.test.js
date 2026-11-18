import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as C from '../core.js';
import * as X from '../extras-ui.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*$/gm,'');
function boot(initial={}){
 const items=new Map(Object.entries(initial)),nodes=new Map();
 const node=()=>({innerHTML:'',textContent:'',hidden:false,open:false,dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return null;},showModal(){this.open=true;},close(){this.open=false;},focus(){}});
 const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},querySelectorAll:()=>[],addEventListener(){},body:node(),activeElement:null,title:''};
 const localStorage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
 const context=vm.createContext({C,X,document,localStorage,navigator:{onLine:true},location:{protocol:'https:'},window:{addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:false})});
 vm.runInContext(source+'\n;globalThis.api={getState:()=>state,todayView,tasksView,baseView,rewardsView,historyView,worldView,meBody,subBody,planBody,taskForm,rewardForm,settings,help,renderFocus};',context);
 return {api:context.api,nodes,items};
}
test('fresh boot renders a useful empty state and saves it',()=>{const {nodes,items}=boot();assert.match(nodes.get('#main').innerHTML,/Dodaj zadanie/);C.validate(JSON.parse(items.get('synapse_v2')));});
test('all views render with recurring and partially completed tasks',()=>{const s=C.fresh(),t=C.makeTask({title:'Oferta ATRIA',steps:['Zdjęcia','Opis'],repeat:'daily'});s.tasks.push(t);C.completeTask(s,t.id,C.dayKey(),Date.now(),0);const {api}=boot({synapse_v2:JSON.stringify(s)});for(const name of ['todayView','tasksView','baseView','rewardsView','historyView','worldView','meBody'])assert.ok(api[name]().length>100,name);});
test('user supplied HTML is escaped in every view and task form',()=>{const s=C.fresh(),title='<img src=x onerror=alert(1)>';s.tasks.push(C.makeTask({title}));s.settings.name='<b>Adrian</b>';s.rewards[0].title=title;const {api,nodes}=boot({synapse_v2:JSON.stringify(s)});for(const name of ['todayView','tasksView','rewardsView']){assert.equal(api[name]().includes(title),false);assert.ok(api[name]().includes('&lt;'));}api.taskForm(s.tasks[0].id);assert.ok(nodes.get('#modal-body').innerHTML.includes('&lt;img'));});
test('corrupted local data is preserved, not overwritten with fresh state',()=>{const {items,nodes}=boot({synapse_v2:'not valid json'});assert.equal(items.get('synapse_v2'),'not valid json');assert.match(nodes.get('#main').innerHTML,/Nie nadpisujemy/);});
test('legacy migration keeps original storage keys untouched',()=>{const old=JSON.stringify({gold:123,xp:20});const {api,items}=boot({adhd_agent:old,adhd_quests:JSON.stringify([{title:'Stary cel',xp:15}])});assert.equal(items.get('adhd_agent'),old);assert.equal(C.balance(api.getState()).coins,123);assert.equal(api.getState().tasks[0].title,'Stary cel');});
test('active timer appears after reopening the application',()=>{const s=C.fresh();C.startFocus(s,null,5);const {nodes}=boot({synapse_v2:JSON.stringify(s)});assert.equal(nodes.get('#focus-bar').hidden,false);assert.match(nodes.get('#focus-bar').innerHTML,/Pauza/);});

test('the Me tab shows water target and portion controls',()=>{const {api}=boot();const html=api.meBody();assert.match(html,/Woda na dziś/);assert.match(html,/200 ml/);assert.match(html,/CEL 2 L/);});
test('Today is split into sub-tabs instead of one long page',()=>{const {nodes}=boot();const html=nodes.get('#main').innerHTML;assert.match(html,/x-subtabs/);for(const label of ['Plan','Skupienie','Ja'])assert.ok(html.includes('>'+label+'<'),label);assert.equal(html.includes('Woda na dziś'),false);});
