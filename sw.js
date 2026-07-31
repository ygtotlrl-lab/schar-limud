const CACHE = 'schar-limud-v7';
const ASSETS = [
  '/schar-limud/',
  '/schar-limud/index.html',
  '/schar-limud/manifest.json',
  '/schar-limud/icons/icon-192.png',
  '/schar-limud/icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
// בקשות ל-Supabase לא עוברות דרך ה-SW בכלל: לא מיירטים, לא שומרים, לא מגישים
// מהמטמון. תשובת PostgREST שנשמרת היא נתון כספי ישן שמוגש כאילו הוא טרי —
// יתרה שכבר שולמה, תנועה שנמחקה. באופליין עדיף שהבקשה תיכשל באמת, כך
// ש-syncAll מזהה שגיאה ומציג טוסט במקום להציג מספרים ישנים כאמיתיים.
// (זהה לתיקון שהוכח ב-hanhala-ruchanit v17.)
function isSupabaseRequest(url) {
  return url.indexOf('.supabase.co') !== -1;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (isSupabaseRequest(e.request.url)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
