const CACHE='synapse-v2.0.0';
const CORE=['./','./index.html','./app.js','./core.js','./styles.css','./manifest.webmanifest','./assets/synapse.svg','./assets/synapse-maskable.svg','./adhd.html'];
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
