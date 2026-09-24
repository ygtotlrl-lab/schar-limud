/*  ⛔ ה-service worker של האפליקציה — הגרסה והרשימות בלבד: ⚠️ הלוגיקה
 *  ב-`core/sw.js`, ⭐ וערכי האפליקציה ב-`app.config.js`, שנטען ראשון. */
importScripts('./app.config.js');
/*  ⛔ מכאן נגזרת גרסת האפליקציה — ⚠️ ואין לה ליטרל שני ב-`index.html`. */
var CACHE_NAME = self.APP.id + '-v180';

// קליפת האפליקציה — חייבת להיות במטמון כדי שהאפליקציה תעבוד אופליין.
var CORE = [
  './',
  './index.html',
  './app.config.js',
  './core/sw.js',
  './core/ui.css',
  './core/chart.css',
  './app.css',
  './core/util.js',
  './core/sync.js',
  './core/storage.js',
  './core/mirror.js',
  './core/backup.js',
  './core/auth.js',
  './core/ui.js',
  './core/chart.js',
  './manifest.json',
  './icons/icon-192.af5952e2.png',
  './icons/icon-512.6e7eb2aa.png'
];

// ⚠️ גרסאות נעוצות במדויק — ⛔ לעולם לא major צף —
// שחרור מצד הספק היה שובר את האפליקציה בלי שום שינוי קוד כאן.
var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/dist/umd/supabase.js'
];

importScripts('./core/sw.js');
