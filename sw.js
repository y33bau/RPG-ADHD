const CACHE='synapse-v3.4.0';
const CORE=['./storage-guard.js','./sync-crypto.js','./polish.css','./nav.css','./layout.css','./demo.js','./share.js','./swipe.js','./ambience.js','./wisdom.js','./daily.js','./iskra.js','./island.js','./polish.js','./extras-ui.js','./planner.js','./guard.js','./generator.js','./facts.js','./diy.js','./extra-store.js','./achievements.js','./insights.js','./extras.css','./companion.js','./companion-core.js','./app-bridge.js','./sync.js','./features.js','./updates.js','./','./index.html','./app.js','./notifications.js','./notification-core.js','./core.js','./styles.css','./manifest.webmanifest','./assets/synapse.svg','./assets/synapse-maskable.svg','./adhd.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('synapse-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 // Read only this release's complete cache: never combine two app versions.
 event.respondWith((async()=>{
 const cache=await caches.open(CACHE);
 const cached=await cache.match(req);
 if(cached)return cached;
 if(req.mode==='navigate'){
 const shell=await cache.match(new URL('./index.html',self.registration.scope).href);
 if(shell)return shell;
 }
 return fetch(req);
 })());
});

self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const title=typeof data.title==='string'?data.title.slice(0,100):'Twoje przypomnienie';
 const body=typeof data.body==='string'?data.body.slice(0,300):'Czas na jeden mały krok.';
 await self.registration.showNotification(title,{body,tag:typeof data.tag==='string'?data.tag.slice(0,80):'reminder',icon:new URL('./assets/synapse.svg',self.registration.scope).href,data:{url:self.registration.scope}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const scope=self.registration.scope,windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const app=windows.find(w=>w.url.startsWith(scope));if(app){await app.focus();return;}await self.clients.openWindow(scope);})());
});
