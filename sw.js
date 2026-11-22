/* Deutsch A2 offline: keeps the app on the phone so it opens without internet, and replaces it when a new version is published. */
const V = 'deutsch-a2-2b4b763a6f3c';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const ACK = new Set();
self.addEventListener('install', e => { e.waitUntil((async () => {
  const c = await caches.open(V);
  /* fetch every file past the browser and CDN caches, and refuse a page that does not belong to this version */
  await Promise.all(FILES.filter(f => f !== 'index.html').map(async f => {
    const u = new URL(f, self.location); const key = u.href; u.searchParams.set('v', V);
    const r = await fetch(u.href, {cache: 'reload'}); if (!r.ok) throw new Error(f + ' ' + r.status);
    if (f === './') { /* the page: must belong to this version; one download serves both of its addresses */
      const t = await r.clone().text(); if (t.indexOf(V) < 0) throw new Error('page of another version');
      await c.put(new URL('index.html', self.location).href, r.clone());
    }
    await c.put(key, r);
  }));
  await self.skipWaiting();
})()); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const ks = await caches.keys(); await Promise.all(ks.filter(k => k.indexOf('deutsch-a2-') === 0 && k !== V).map(k => caches.delete(k)));
  await self.clients.claim();
  const cs = await self.clients.matchAll({type: 'window'});
  cs.forEach(c => c.postMessage({a2: 'update', v: V}));
  /* give the open pages up to 1.5 s to answer */
  for (const t0 = Date.now(); Date.now() - t0 < 1500 && cs.some(c => !ACK.has(c.id));) await new Promise(r => setTimeout(r, 50));
  /* Pages that did not answer come from an older version without update handling: load this version into them.
     The changed address forces a real page load (the same address with a #part would not reload anything).
     Not awaited: that page load can only finish once this worker is active, so waiting for it here would block forever. */
  cs.filter(c => !ACK.has(c.id)).forEach(c => { try { const u = new URL(c.url); u.searchParams.set('u', V.slice(-6)); c.navigate(u.href).catch(() => {}); } catch (x) { /* */ } });
})()); });
self.addEventListener('message', e => { const d = e.data || {}; if (d.a2 === 'ack' && e.source) ACK.add(e.source.id); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(c => c.match(r.mode === 'navigate' ? './' : r, {ignoreSearch: true}).then(hit => hit || fetch(r))));
});
