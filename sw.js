// ⚠️ מוסכמות משותפות לשלושת הפרויקטים (סבב 8): שם קבוע הגרסה הוא CACHE_NAME,
// מערך הליבה נקרא CORE ומשתמש בנתיבים יחסיים, וסדר המאזינים הוא
// install → activate → fetch → message. אין לשנות שם/סדר בפרויקט אחד בלבד.
var CACHE_NAME = 'schar-limud-v38';

// קבצים מקומיים. נתיבים יחסיים — נפתרים מול מיקומו של sw.js עצמו
// (‎/schar-limud/sw.js‎), ולכן './' הוא ‎/schar-limud/‎ בדיוק כמו הנתיב המוחלט שהיה כאן.
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// סקריפטי CDN — מטמון-מראש בתבנית של שלוש האחיות (סבב 35): האפליקציה לא
// רצה בלי supabase-js, והדשבורד לא מצויר בלי chart.js. נמשכים ב-mode:'cors'
// דווקא — תגובת no-cors היא opaque עם status 0 ו-cache.put דוחה אותה, ולכן
// עד היום הם נשמרו רק אם ה-fetch handler הספיק לתפוס תגובה שקופה בזמן-ריצה.
var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1'
];

// בקשות ל-Supabase לא עוברות דרך ה-SW בכלל: לא מיירטים, לא שומרים, לא מגישים
// מהמטמון. תשובת PostgREST שנשמרת היא נתון כספי ישן שמוגש כאילו הוא טרי —
// יתרה שכבר שולמה, תנועה שנמחקה. באופליין עדיף שהבקשה תיכשל באמת, כך
// ש-syncAll מזהה שגיאה ומציג טוסט במקום להציג מספרים ישנים כאמיתיים.
// (זהה לתיקון שהוכח ב-hanhala-ruchanit v17.)
function isSupabaseRequest(url) {
  return url.indexOf('.supabase.co') !== -1;
}

function cachePut(cache, url, opts) {
  return fetch(url, opts).then(resp => {
    if (!resp || !resp.ok) throw new Error('HTTP ' + (resp ? resp.status : '?'));
    if (resp.type === 'opaque') throw new Error('opaque response');
    return cache.put(url, resp);
  });
}

// ריפוי עצמי של מטמון ה-CDN — הדפוס של hanhala-ruchanit/yoman (סבב 35):
// סקריפט CDN שחסר במטמון מושלם בכל עליית SW וב-activate, כשל בו שקט.
function ensureCdnCached() {
  return caches.open(CACHE_NAME).then(cache =>
    Promise.all(CDN_ASSETS.map(url =>
      cache.match(url).then(hit => {
        if (hit) return;
        return cachePut(cache, url, {mode: 'cors', credentials: 'omit'})
          .then(() => { console.log('[SW] healed cdn:', url.slice(0, 60)); });
      }).catch(() => {})
    ))
  ).catch(() => {});
}
ensureCdnCached(); // קוד עליון = רץ פעם אחת בכל עליית SW

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => {
    // כשל CDN בודד לא מפיל את ההתקנה — הריפוי העצמי ישלים אותו אחר-כך
    var jobs = CORE.map(url => c.add(url).catch(() => {}))
      .concat(CDN_ASSETS.map(url => cachePut(c, url, {mode: 'cors', credentials: 'omit'}).catch(() => {})));
    return Promise.all(jobs);
  }).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // ⚠️ שלוש האפליקציות חיות על אותו origin (ygtotlrl-lab.github.io) וחולקות
  // CacheStorage אחד. מוחקים אך ורק מטמונים של האפליקציה הזו (קידומת
  // 'schar-limud-') — מחיקת "כל מה שאינו CACHE_NAME" השמידה את המטמונים של
  // hanhala-ruchanit ו-yoman-avoda ושברה להן את האופליין. אין להסיר את הסינון.
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('schar-limud-') && k !== CACHE_NAME).map(k => caches.delete(k)))
  ).then(() => ensureCdnCached()));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (isSupabaseRequest(e.request.url)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
