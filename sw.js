const CACHE='synapse-v2.1.1';
const CORE=['./','./index.html','./app.js','./notifications.js','./notification-core.js','./core.js','./styles.css','./manifest.webmanifest','./assets/synapse.svg','./assets/synapse-maskable.svg','./adhd.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
// Activate the new version only after all old tabs have closed: avoid mixing old UI and new modules.
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('synapse-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(caches.match(request).then(cached=>cached||caches.match('./index.html')).then(cached=>cached||fetch(request)));return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
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
