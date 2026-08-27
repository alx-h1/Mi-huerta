const CACHE='mi-huerta-v5';
const ASSETS=['./','./index.html','./styles.css','./app.js','./recommendations.js','./daily.js','./manifest.webmanifest','./auth-paste.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const isDocument=e.request.mode==='navigate';
  e.respondWith(fetch(e.request).then(async r=>{
    let response=r;
    if(isDocument&&r.ok&&r.headers.get('content-type')?.includes('text/html')){
      const html=await r.text();
      const injected=html.includes('auth-paste.js')?html:html.replace('</body>','<script src="./auth-paste.js"></script></body>');
      response=new Response(injected,{status:r.status,statusText:r.statusText,headers:r.headers});
    }
    const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return response;
  }).catch(async()=>{
    const cached=await caches.match(e.request);if(!cached)return cached;
    if(isDocument&&cached.headers.get('content-type')?.includes('text/html')){
      const html=await cached.text();
      const injected=html.includes('auth-paste.js')?html:html.replace('</body>','<script src="./auth-paste.js"></script></body>');
      return new Response(injected,{status:cached.status,statusText:cached.statusText,headers:cached.headers});
    }
    return cached;
  }))
});