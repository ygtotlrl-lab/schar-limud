// ⚠️ מוסכמות משותפות לשלושת הפרויקטים (סבב 8): שם קבוע הגרסה הוא CACHE_NAME,
// מערך הליבה נקרא CORE ומשתמש בנתיבים יחסיים, וסדר המאזינים הוא
// install → activate → fetch → message. אין לשנות שם/סדר בפרויקט אחד בלבד.
var CACHE_NAME = 'schar-limud-v20';

// קבצים מקומיים. נתיבים יחסיים — נפתרים מול מיקומו של sw.js עצמו
// (‎/schar-limud/sw.js‎), ולכן './' הוא ‎/schar-limud/‎ בדיוק כמו הנתיב המוחלט שהיה כאן.
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// בקשות ל-Supabase לא עוברות דרך ה-SW בכלל: לא מיירטים, לא שומרים, לא מגישים
// מהמטמון. תשובת PostgREST שנשמרת היא נתון כספי ישן שמוגש כאילו הוא טרי —
// יתרה שכבר שולמה, תנועה שנמחקה. באופליין עדיף שהבקשה תיכשל באמת, כך
// ש-syncAll מזהה שגיאה ומציג טוסט במקום להציג מספרים ישנים כאמיתיים.
// (זהה לתיקון שהוכח ב-hanhala-ruchanit v17.)
function isSupabaseRequest(url) {
  return url.indexOf('.supabase.co') !== -1;
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // ⚠️ שלוש האפליקציות חיות על אותו origin (ygtotlrl-lab.github.io) וחולקות
  // CacheStorage אחד. מוחקים אך ורק מטמונים של האפליקציה הזו (קידומת
  // 'schar-limud-') — מחיקת "כל מה שאינו CACHE_NAME" השמידה את המטמונים של
  // hanhala-ruchanit ו-yoman-avoda ושברה להן את האופליין. אין להסיר את הסינון.
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('schar-limud-') && k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
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
