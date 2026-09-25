/* ═══ core/sw.js — ליבת ה-service worker ════════════════════════════════
   ⭐ ההתקנה, הניקוי, הניווט והמטמון — ⛔ ו-`sw.js` של האפליקציה נושא רק את
      `CACHE_NAME`, `CORE` ו-`CDN_ASSETS`, ⚠️ וטוען קודם את `app.config.js`.
   ⛔ סדר המאזינים install → activate → fetch → message.
   ⚠️ `SW_CFG` — כל ידית כאן היא התנהגות **שנמדדה**, ⛔ ולא ברירת מחדל
      שנפלה מאליה: ⭐ הקידומת נגזרת משם האפליקציה, ומארחי ה-CDN מהרשימה.
   ════════════════════════════════════════════════════════════════════ */
var SW_CFG = {
  prefix: self.APP.id + '-',
  cdnHosts: CDN_ASSETS.map(function (u) { return new URL(u).hostname; })
    .filter(function (h, i, a) { return a.indexOf(h) === i; }),
  scoped: true,
  navFallback: 'shell',
  navIgnoreSearch: true,
  subStrategy: 'cache-first',
  subMiss: '504',
  offlineStatus: 200,
  skipWaiting: true,
  cdnTimeoutMs: 10000
};

/*  ⛔ דף האופליין — HTML אמיתי ⛔ ולא מחרוזת 'Offline' — ⚠️ והצבעים, הסמל
 *  והשם מהתצורה, ⭐ בבהיר ובכהה: ⛔ דף בהיר במכשיר כהה מסנוור ברגע שבו
 *  המשתמש כבר מתוסכל. ⛔ ואין בו מטפל מוטבע — ⭐ הקישור לשורש ה-scope טוען מחדש. */
/*  ⛔ `esc` של הדף אינו זמין כאן — ⚠️ ה-worker סקריפט קלאסי ואינו מייבא
 *  מודול: ⭐ ולכן בריחה משלו, באותם חמישה תווים. */
function swEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
var SW_OFFLINE_HTML =
  '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="color-scheme" content="light dark">' +
  '<title>אין חיבור — ' + swEsc(self.APP.name) + '</title><style>' +
  'html,body{margin:0;height:100%}' +
  'body{display:flex;align-items:center;justify-content:center;padding:24px;' +
  'font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;' +
  'background:' + swEsc(self.APP.offline.light.bg) + ';color:' + swEsc(self.APP.offline.light.ink) + '}' +
  '@media (prefers-color-scheme:dark){body{background:' + swEsc(self.APP.offline.dark.bg) +
  ';color:' + swEsc(self.APP.offline.dark.ink) + '}}' +
  '.box{max-width:340px;text-align:center}' +
  '.mark{font-size:2.4rem;margin-bottom:10px}' +
  'h1{font-size:1.15rem;margin:0 0 10px}' +
  'p{font-size:.92rem;line-height:1.6;margin:0 0 20px}' +
  'a{display:inline-block;color:inherit;border:1.5px solid currentColor;border-radius:22px;' +
  'padding:10px 26px;font-weight:700;text-decoration:none}' +
  '</style></head><body><div class="box">' +
  '<div class="mark">' + swEsc(self.APP.offline.mark) + '</div>' +
  '<h1>' + swEsc(self.APP.name) + ' — אין חיבור לאינטרנט</h1>' +
  '<p>האפליקציה עדיין לא נשמרה במלואה במכשיר.<br>' +
  'התחבר לרשת פעם אחת, ומאז היא תיפתח גם ללא חיבור.</p>' +
  '<a href="./">נסה שוב</a>' +
  '</div></body></html>';

var SW_SCOPE = new URL('./', self.location);
var SW_ROOT = SW_SCOPE.href;
var SW_SHELL = new URL('./index.html', self.location).href;

/*  ⛔ שני הנתיבים היחידים שתשובתם רשאית להפוך לקליפה שבמטמון —
 *  ר' הנימוק בכותרת המודול. */
var SW_SHELL_PATHS = [SW_SCOPE.pathname, SW_SCOPE.pathname + 'index.html'];

/*  ⚠️ שתי מפות חיפוש נפרדות, ⛔ ואין לאחד אותן: ignoreSearch
 *  מתעלם מה-query, וב-PostgREST כל הפילטרים יושבים דווקא שם. חיפוש כללי
 *  איתו גרם לכך שבקשת כניסה של משתמש אחד התאימה לתשובה שנשמרה
 *  עבור אחר — כניסה בזהות זרה. ניווט בלבד רשאי להשתמש ב-SW_NAV_OPTS. */
var SW_NAV_OPTS = { ignoreVary: true, ignoreSearch: true };
var SW_SUB_OPTS = { ignoreVary: true };

function swSkip(url) {
  if (url.indexOf('http') !== 0) return true;
  if (url.indexOf('.supabase.co') !== -1) return true;
  return false;
}

function swIsCdn(u) {
  return CDN_ASSETS.indexOf(u.href) !== -1 || SW_CFG.cdnHosts.indexOf(u.hostname) !== -1;
}

function swInScope(u) {
  return u.origin === SW_SCOPE.origin && u.pathname.indexOf(SW_SCOPE.pathname) === 0;
}

/*  ⛔ קובצי הקליפה — `CORE` — נגזרים מהרשימה ⛔ ואינם מוקלדים שוב. */
var SW_CORE_URLS = CORE.map(function (x) { return new URL(x, self.location).href; });
function swInCore(u) {
  return SW_CORE_URLS.indexOf(u.origin + u.pathname) !== -1;
}

function swIsShellPath(u) {
  return SW_SHELL_PATHS.indexOf(u.pathname) !== -1;
}

/*  דף אופליין — HTML אמיתי עם Content-Type מפורש, ⛔ לא מחרוזת 'Offline'
 *  שנראית כמסך שחור עם טקסט זעיר בפינה. */
function swOfflinePage() {
  return new Response(SW_OFFLINE_HTML, {
    status: SW_CFG.offlineStatus,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

/*  תת-משאב שאין לו עותק ואין רשת. ⛔ לעולם לא HTML — ר' כותרת
 *  המודול. `Response.error()` הוא שגיאת הרשת האמיתית; 504 ריק הוא הווריאנט
 *  שנמדד ונשמר כידית. */
function swSubMiss() {
  if (SW_CFG.subMiss === '504') return new Response('', { status: 504, statusText: 'Offline' });
  try { return Response.error(); }
  catch (e) { return new Response('', { status: 504, statusText: 'Offline' }); }
}

/*  ⛔ ממדי ההצהרה נקראים משם הקובץ — ⚠️ המספר שבשם הוא הצלע,
 *  ⭐ ואייקון אייפון בצלע הקבועה של אפל; ⛔ ושם בלי טביעה אינו נבדק. */
function swImgSize(url) {
  var m = /\/([a-z-]+?)(?:-(\d+))?\.[0-9a-f]{8}\.png$/.exec(new URL(url, self.location.href).pathname);
  if (!m) return 0;
  return m[2] ? Number(m[2]) : (m[1] === 'apple-touch-icon' ? 180 : 0);
}

/*  ⛔ כל כתיבה למטמון עוברת כאן — ⚠️ מסנן שהחליף אייקון בתמונה
 *  אחרת היה ננעל במטמון לנצח: ⭐ תמונה שאינה בממדי ההצהרה אינה נכנסת. */
function swPut(cache, key, res) {
  var want = swImgSize(typeof key === 'string' ? key : key.url);
  if (!want || typeof createImageBitmap !== 'function') return cache.put(key, res);
  return res.clone().blob().then(createImageBitmap).then(function (bmp) {
    var ok = bmp.width === want && bmp.height === want;
    if (bmp.close) bmp.close();
    if (!ok) throw new Error('image ' + bmp.width + 'x' + bmp.height + ' != ' + want);
    return cache.put(key, res);
  });
}

/*  ⛔ רק תשובה שאומתה נשמרת — ר' כותרת המודול. */
function swStore(key, res) {
  if (!res || !res.ok || res.status !== 200 || res.type === 'opaque') return;
  var clone = res.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    return swPut(cache, key, clone);
  }).catch(function () {});
}

/*  ⛔ חיפוש במטמון של האפליקציה בלבד — ⚠️ ה-origin משותף לכל
 *  האפליקציות, ⭐ ו-`caches.match()` הגלובלי סורק את כולם והישן ראשון:
 *  ⛔ מטמון בשם שננטש הגיש אייקון של אחות. */
function swMatch(request, opts) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request, opts);
  });
}

/*  ⛔ המטמון שלנו לפי תוכנו ⛔ ולא לפי שמו — ⚠️ כל מפתח בתוך ה-scope או
 *  נכס CDN, ⭐ ולפחות אחד בתוך ה-scope: ⛔ קידומת שהשתנתה השאירה מטמון
 *  שאיש אינו מוחק, ⚠️ ומטמון של אחות נושא מפתח מחוץ ל-scope ונשאר. */
function swOwnsCache(name) {
  if (name === CACHE_NAME) return Promise.resolve(false);
  return caches.open(name).then(function (cache) {
    return cache.keys();
  }).then(function (reqs) {
    var mine = 0, u;
    for (var i = 0; i < reqs.length; i++) {
      try { u = new URL(reqs[i].url); } catch (e) { return false; }
      if (swInScope(u)) mine++;
      else if (!swIsCdn(u)) return false;
    }
    return mine > 0;
  });
}

/*  הקליפה שבמטמון — index.html, ובהיעדרו שורש ה-scope. */
function swShell() {
  return swMatch(SW_SHELL, SW_NAV_OPTS).then(function (hit) {
    return hit || swMatch(SW_ROOT, SW_NAV_OPTS);
  });
}

/*  ⚠️ בקשת CDN חייבת mode:'cors' — תגובת no-cors היא opaque עם
 *  status 0, ו-cache.put דוחה אותה; כך הנכסים מעולם לא נשמרו.
 *  ⚠️ והפסק-זמן אינו קישוט: בקשת CDN שנתקעת משאירה את
 *  waitUntil של install תלוי לנצח, והעובד נשאר «installing» בלי אופליין. */
function swFetchCors(url) {
  var opts = { mode: 'cors', credentials: 'omit' };
  if (typeof AbortController !== 'function' || !SW_CFG.cdnTimeoutMs) {
    return fetch(new Request(url, opts));
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, SW_CFG.cdnTimeoutMs);
  opts.signal = ctrl.signal;
  return fetch(new Request(url, opts)).then(function (res) {
    clearTimeout(timer);
    return res;
  }, function (err) {
    clearTimeout(timer);
    throw err;
  });
}

function swFetchAsset(request, u) {
  return swIsCdn(u) ? swFetchCors(request.url) : fetch(request);
}

function swCachePut(cache, url, opts) {
  return fetch(url, opts).then(function (res) {
    if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : '?'));
    if (res.type === 'opaque') throw new Error('opaque response');
    return swPut(cache, url, res);
  });
}

/*  ריפוי עצמי של מטמון ה-CDN — סקריפט CDN
 *  שחסר במטמון לא היה מושלם לעולם: install אינו רץ שוב לאותו CACHE_NAME,
 *  ובזמן-ריצה הדף מבקש אותו כ-no-cors ⇒ opaque ⇒ לא נשמר. רץ ב-activate
 *  וגם פעם אחת בכל עליית SW, משלים רק את מה שחסר, וכשל בו שקט. */
function ensureCdnCached() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return Promise.all(CDN_ASSETS.map(function (url) {
      return cache.match(url, SW_SUB_OPTS).then(function (hit) {
        if (hit) return;
        return swFetchCors(url).then(function (res) {
          if (res && res.ok && res.type !== 'opaque') return swPut(cache, url, res);
        });
      }).catch(function () {});
    }));
  }).catch(function () {});
}
ensureCdnCached(); // קוד עליון = רץ פעם אחת בכל עליית SW

/*  ⛔ ניווט — מאותו מטמון כמו הקוד: ⚠️ דף מהרשת וקוד מהמטמון הם שתי גרסאות
 *  במסך אחד, ⭐ ו-`import` של שם שעוד אינו קיים עוצר את הדף כולו. ⛔ כשיש
 *  קליפה במטמון של ה-worker הזה — היא התשובה, ⛔ ואינה מתרעננת כאן: ⚠️ גרסה
 *  חדשה נכנסת רק בהתקנת worker חדש, ⭐ שמשתלט ומרענן — דף וקוד יחד.
 *  ⭐ בלי קליפה (כניסה ראשונה) — מהרשת; ⚠️ ותשובה שאינה תקינה (404 של נתיב
 *  עמוק) נשארת כפי שהיא, ⛔ שאין קליפה ליפול אליה. */
function swNavigate(request, u) {
  return swShell().then(function (shell) {
    if (shell) return shell;
    return fetch(request).then(function (net) {
      if (net && net.ok && swIsShellPath(u)) swStore(SW_SHELL, net);
      return net;
    }).catch(function () {
      return swNavOffline(request);
    });
  });
}

/*  ⚠️ `navFallback` — הידית שנמדדה: 'shell' פונה ישר לקליפה, 'request'
 *  מחפש קודם את הבקשה עצמה (ועם `navIgnoreSearch` גם '?apk=1' מוצא את
 *  './'). ⛔ שתיהן מסתיימות בדף האופליין ולעולם לא ב-undefined
 *   — respondWith על Promise<undefined> זורק TypeError, כלומר
 *  כל בקשה שנכשלת ברשת ואינה במטמון נכשלת פעמיים. */
function swNavOffline(request) {
  var first = SW_CFG.navFallback === 'shell'
    ? swShell()
    : swMatch(request, SW_CFG.navIgnoreSearch ? SW_NAV_OPTS : SW_SUB_OPTS)
        .then(function (hit) { return hit || swShell(); });
  return first.then(function (hit) { return hit || swOfflinePage(); });
}

function swNetworkFirst(request) {
  return fetch(request).then(function (res) {
    swStore(request, res);
    return res;
  }).catch(function () {
    return swMatch(request, SW_SUB_OPTS).then(function (hit) {
      return hit || swSubMiss();
    });
  });
}

/*  ⚠️ מטמון-קודם + רענון ברקע — ידית שנמדדה ונשמרה.
 *  ⛔ אין להפוך אותה ל'network-first' «לשם אחידות»: זו
 *  התנהגות שנמדדה ברתמת קו-הבסיס, והיפוכה משנה מה המשתמש רואה.
 *  ⛔ **וקובץ מהקליפה אינו מתרענן ברקע** — ⚠️ קוד חדש שנכתב למטמון הישן
 *  פוגש בטעינה הבאה את הדף הישן: ⭐ הקליפה נכנסת כולה בהתקנה, ורק שם. */
function swCacheFirst(request, u) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request, SW_SUB_OPTS).then(function (hit) {
      if (hit) { if (!swInCore(u)) swRevalidate(request, u); return hit; }
      return swFetchAsset(request, u).then(function (res) {
        swStore(request, res);
        return res;
      }).catch(function () { return swSubMiss(); });
    });
  });
}

function swRevalidate(request, u) {
  swFetchAsset(request, u).then(function (res) {
    swStore(request, res);
  }).catch(function () {});
}

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    /*  ⚠️ כשל CDN בודד לא מפיל את ההתקנה — ensureCdnCached משלים אותו
     *  ב-activate ובעליית ה-SW הבאה. */
    var jobs = CORE.map(function (url) {
      return swCachePut(cache, url, { cache: 'reload' })
        .catch(function () { return swCachePut(cache, url, {}); })
        .catch(function () {});
    }).concat(CDN_ASSETS.map(function (url) {
      return swFetchCors(url).then(function (res) {
        if (res && res.ok && res.type !== 'opaque') return swPut(cache, url, res);
      }).catch(function () {});
    }));
    return Promise.all(jobs);
  }).catch(function () {}));
  /*  ⛔ ההשתלטות מיידית בכולן — ⚠️ מסלול שמחכה ללחיצה מותיר מכשיר על
   *  קוד ישן: ⭐ הבאנר נשאר למי שיש לו הקלדה לאבד, ⛔ והוא אינו התנאי
   *  להשתלטות. */
  if (SW_CFG.skipWaiting) self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(SW_SHELL, SW_NAV_OPTS);
    }).then(function (hit) {
      /*  ⛔ אין למחוק מטמון ישן לפני שאומת שהקליפה נכנסה לחדש —
       *  ר' כותרת המודול. */
      if (!hit) return;
      return caches.keys().then(function (names) {
        return Promise.all(names.map(function (name) {
          return swOwnsCache(name).then(function (own) {
            if (own) return caches.delete(name);
          });
        }));
      });
    }).catch(function () {})
      .then(function () { return ensureCdnCached(); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (swSkip(request.url)) return;

  var u;
  try { u = new URL(request.url); } catch (e) { return; }

  if (request.mode === 'navigate') {
    event.respondWith(swNavigate(request, u));
    return;
  }
  /*  ⚠️ `scoped` — ידית שנמדדה: היא מטפלת אך ורק בנכסי ה-scope
   *  ובנכסי ה-CDN, וכל השאר עובר לדפדפן כפי שהוא. */
  if (SW_CFG.scoped && !swIsCdn(u) && !swInScope(u)) return;

  event.respondWith(SW_CFG.subStrategy === 'cache-first'
    ? swCacheFirst(request, u)
    : swNetworkFirst(request));
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
