const CACHE='juice-v4';
const ASSETS=['/Salamat.jucei/','/Salamat.jucei/index.html','/Salamat.jucei/style.css','/Salamat.jucei/script.js','/Salamat.jucei/data.json','/Salamat.jucei/manifest.json','/Salamat.jucei/logo.png.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(ASSETS.map(u=>c.add(u).catch(()=>{})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.url.includes('google.com/maps')||e.request.url.includes('api.github.com')||e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(c=>{const p=fetch(e.request).then(r=>{if(r&&r.status===200&&r.type==='basic'){const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}return r;}).catch(()=>c);return c||p;}));});
