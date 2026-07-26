const CACHE_NAME = 'juice-menu-v3';
const ASSETS = [
    '/Salamat.jucei/',
    '/Salamat.jucei/index.html',
    '/Salamat.jucei/style.css',
    '/Salamat.jucei/script.js',
    '/Salamat.jucei/data.json',
    '/Salamat.jucei/manifest.json',
    '/Salamat.jucei/logo.png.jpg',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(ASSETS.map(url => 
                cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
            ));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('google.com/maps') || 
        event.request.url.includes('api.github.com') ||
        event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
