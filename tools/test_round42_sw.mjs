#!/usr/bin/env node
/*  קו הבסיס ההתנהגותי של ה-service worker — סבב 42, שלב א1.
 *
 *  ⚠️ **למה הרתמה הזו נכתבה לפני שנגעו בשורה אחת:** `sw.js` הוא הקובץ
 *  שקובע מה המשתמש רואה כשאין רשת — המסוכן ביותר אחרי `index.html`.
 *  סבב 40 מדד את ארבעת המימושים ותיעד אותם, ⛔ אך לא איחד: הסשן כתב
 *  ליבה, ראה שהשער נופל, והחזיר הכול לאחור. זה היה נכון — לא הייתה
 *  שום רתמת התנהגות למדוד מולה, ולכן לא הייתה דרך לדעת אם הליבה
 *  החדשה מתנהגת כמו הישנה או רק «נראית נכון».
 *
 *  הרתמה מריצה את `sw.js` **האמיתי** ברתמת `vm` — `caches`/`fetch`/
 *  `Response` מזויפים — ומנעלת את ההתנהגות **הנצפית**: מה חוזר
 *  ל-`respondWith` בכל תרחיש, ומה נכנס למטמון.
 *
 *  ⛔ **הרתמה מתעדת את ההווה ואינה שופטת אותו** (סבב 42) — ערך שנראה
 *  שגוי נרשם כפי שהוא, ומסומן `defect: true` עם הסבר. היפוך של תא כזה
 *  הוא **שינוי מכוון** שנעשה בשלב א3, ולא «תיקון הבדיקה».
 *
 *  ⚠️ כל תא שאינו מסומן `defect` חייב להישאר זהה בדיוק אחרי האיחוד.
 *  הפרש בתא כזה = ⛔ עצור ודווח, ⛔ אל תעדכן את הציפייה.
 *
 *  הרצה עם `SW_RECORD=1` מדפיסה את הנמדד במקום להשוות — כך נבנתה
 *  הטבלה שב-APP מלכתחילה.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  origin: 'https://ygtotlrl-lab.github.io',
  scope: '/schar-limud/',
  prefix: 'schar-limud-',
  /* ⚠️ הנכס הראשון ב-CDN_ASSETS — משותף לארבעתן, ולכן התרחיש משווה כמו מול כמו. */
  cdn: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/dist/umd/supabase.js',
  /*  ⚠️ הטבלה **נמדדה** מהקוד ב-SW_RECORD ולא הוצהרה (סבב 42).
      ⛔ תא בלי `defect` חייב להישאר זהה אחרי האיחוד — הפרש הוא עצירה. */
  expects: {
    'nav-online':            'body:NET-OK|status:200',
    'nav-offline-cached':    'body:CORE-ROOT|status:200',
    /* ⛔ ה-handler הוא `fetch(...).catch(() => caches.match(e.request))`,
       ו-`caches.match` מחזירה **undefined** כשאין התאמה. respondWith על
       Promise<undefined> זורק TypeError — כלומר כל בקשה שנכשלת ברשת
       ואינה במטמון נכשלת פעמיים. מתוקן בשלב א3. */
    'nav-offline-empty':   { be: 'undefined', defect: true,
      why: 'schar: respondWith(undefined) בניווט בלי עותק — TypeError במקום דף אופליין' },
    /* ⛔ אין ignoreSearch בניווט, ולכן ה-APK עם '?apk=1' אינו מוצא את './'
       ונופל לאותו undefined. אותו שורש בדיוק. מתוקן בשלב א3. */
    'nav-offline-query':   { be: 'undefined', defect: true,
      why: "schar: ניווט עם '?apk=1' אינו מוצא את הקליפה ונופל ל-undefined" },
    'sub-cached-online':     'body:NET-OK|status:200',
    'sub-cached-offline':    'body:CORE-ASSET|status:200',
    'sub-missing-offline': { be: 'undefined', defect: true,
      why: 'schar: respondWith(undefined) לתת-משאב חסר — TypeError במקום שגיאת רשת' },
    'sub-404':               'body:NET-404|status:404',
    /* ⛔ אין בדיקת `r.ok` ואין בדיקת opaque: תשובת 404 של GitHub Pages
       נכנסת למטמון תחת מפתח הבקשה ומוגשת ממנו אופליין. שלוש האחיות
       בודקות סטטוס לפני שמירה. מתוקן בשלב א3. */
    'sub-404-stored':      { be: 'stored', defect: true,
      why: 'schar: תשובת 404 נשמרת במטמון ומוגשת ממנו אופליין' },
    'supabase':              'passthrough',
    'cdn-cached-online':     'body:NET-OK|status:200',
    'version-probe':         'body:NET-OK|status:200',
    'non-get':               'passthrough',
    'sweep-scope':           'schar-limud-v38,sister-app-v9',
  },
  defectCount: 4,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(join(ROOT, 'sw.js'), 'utf8');
const RECORD = !!process.env.SW_RECORD;

const SW_URL = APP.origin + APP.scope + 'sw.js';
const CACHE_NAME = (SRC.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/) || [])[1];

let n = 0, bad = 0;
const ok = (m) => console.log(`  ok   ${++n} · ${m}`);
const no = (m) => { bad++; console.error(`  FAIL ${++n} · ${m}`); };
const is = (c, m) => (c ? ok(m) : no(m));

/* ══════════════════════════════════════════════════════════════════════════
   סביבת ה-service worker המזויפת
   ══════════════════════════════════════════════════════════════════════════
   ⚠️ מספיק נאמנה כדי שארבעת המימושים ירוצו בה ללא שינוי: Response עם
   `ok`/`status`/`type`/`clone`, Cache עם `ignoreSearch`, `caches.match`
   גלובלי שסורק את כל המטמונים, ו-`self.location` כ-URL אמיתי (gius
   קוראת ממנו `origin` ו-`pathname`).
   ══════════════════════════════════════════════════════════════════════════ */

class FakeResponse {
  constructor(body, init) {
    init = init || {};
    this.body = body == null ? '' : String(body);
    this.status = init.status === undefined ? 200 : init.status;
    this.statusText = init.statusText || '';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.type = init.type || 'basic';
    this.ok = this.status >= 200 && this.status < 300;
  }
  clone() {
    return new FakeResponse(this.body, {
      status: this.status, statusText: this.statusText, type: this.type,
    });
  }
  static error() {
    const r = new FakeResponse('', { status: 0 });
    r.type = 'error';
    r.ok = false;
    return r;
  }
}

class FakeRequest {
  constructor(input, init) {
    init = init || {};
    if (input && typeof input === 'object' && input.url) {
      this.url = input.url;
      this.method = init.method || input.method || 'GET';
      this.mode = init.mode || input.mode || 'no-cors';
    } else {
      this.url = new URL(String(input), SW_URL).href;
      this.method = init.method || 'GET';
      this.mode = init.mode || 'no-cors';
    }
    this.credentials = init.credentials;
    this.signal = init.signal;
  }
}

const keyOf = (r) => (typeof r === 'string' ? new URL(r, SW_URL).href : r.url);
const bare = (href) => { const u = new URL(href); u.search = ''; u.hash = ''; return u.href; };

class FakeCache {
  constructor() { this.map = new Map(); }
  put(req, res) { this.map.set(keyOf(req), res); return Promise.resolve(); }
  hit(req, opts) {
    const k = keyOf(req);
    if (this.map.has(k)) return this.map.get(k);
    if (opts && opts.ignoreSearch) {
      const b = bare(k);
      for (const [ck, cv] of this.map) if (bare(ck) === b) return cv;
    }
    return undefined;
  }
  match(req, opts) { return Promise.resolve(this.hit(req, opts)); }
  add(url) {
    return net(keyOf(url), null).then((r) => {
      if (!r || !r.ok) throw new Error('add failed');
      return this.put(url, r);
    });
  }
  addAll(urls) { return Promise.all(urls.map((u) => this.add(u))); }
  keys() { return Promise.resolve([...this.map.keys()].map((u) => new FakeRequest(u))); }
}

let store = new Map();          // שם מטמון → FakeCache
let netHandler = () => Promise.reject(new TypeError('offline'));
const net = (url, req) => {
  try { return Promise.resolve(netHandler(url, req)); }
  catch (e) { return Promise.reject(e); }
};

const caches = {
  open(name) {
    if (!store.has(name)) store.set(name, new FakeCache());
    return Promise.resolve(store.get(name));
  },
  keys() { return Promise.resolve([...store.keys()]); },
  delete(name) { return Promise.resolve(store.delete(name)); },
  has(name) { return Promise.resolve(store.has(name)); },
  match(req, opts) {
    for (const c of store.values()) { const h = c.hit(req, opts); if (h) return Promise.resolve(h); }
    return Promise.resolve(undefined);
  },
};

const listeners = { install: [], activate: [], fetch: [], message: [] };
const pending = [];
const self_ = {
  location: new URL(SW_URL),
  addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
  skipWaiting() { return Promise.resolve(); },
  clients: { claim() { return Promise.resolve(); } },
  registration: {},
};

const sandbox = {
  self: self_, caches, console: { log() {}, warn() {}, error() {} },
  Response: FakeResponse, Request: FakeRequest, URL, Headers: Map,
  AbortController, setTimeout, clearTimeout, Promise, Set, Map, JSON,
  fetch(input, init) {
    const req = (input && typeof input === 'object' && input.url) ? input : new FakeRequest(input, init);
    return net(req.url, req);
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox, { filename: 'sw.js' });

/* ── עזרי הרצה ─────────────────────────────────────────────────────────── */
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };

function fireFetch(request) {
  let answered;
  let called = false;
  const ev = {
    request,
    respondWith(p) { called = true; answered = Promise.resolve(p).catch(() => '__THREW__'); },
    waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})); },
  };
  for (const fn of listeners.fetch) fn(ev);
  return called ? answered : '__PASSTHROUGH__';
}

function fireLifecycle(type) {
  const jobs = [];
  const ev = { waitUntil(p) { jobs.push(Promise.resolve(p).catch(() => {})); } };
  for (const fn of listeners[type]) fn(ev);
  return Promise.all(jobs);
}

/*  ⚠️ מתאר את **התוצאה הנצפית** ולא את המימוש: מה חוזר, באיזה סטטוס.
    גוף התשובה מסווג לסימן הפיקסטורה שלו, ל-`html` (דף אופליין) או
    ל-`empty` — כדי שהתיאור יהיה זהה בין ארבעת המימושים כשההתנהגות זהה. */
function describe(res) {
  if (res === '__PASSTHROUGH__') return 'passthrough';
  if (res === '__THREW__') return 'threw';
  if (res === undefined || res === null) return 'undefined';
  if (res.type === 'error') return 'network-error';
  const b = String(res.body);
  let mark;
  if (/^[A-Z0-9-]+$/.test(b)) mark = b;
  else if (b === '') mark = 'empty';
  else if (/^\s*<!doctype/i.test(b)) mark = 'html';
  else mark = 'other';
  return `body:${mark}|status:${res.status}`;
}

/*  פיקסטורה — מטמון מלא בשמות מזוהים, כדי שכל תשובה תספר מאיפה באה. */
const F = {
  root:   APP.origin + APP.scope,
  index:  APP.origin + APP.scope + 'index.html',
  asset:  APP.origin + APP.scope + 'manifest.json',
  absent: APP.origin + APP.scope + 'icons/never-cached.png',
  cdn:    APP.cdn,
  sb:     'https://kxbtskqobynewvnckaaz.supabase.co/rest/v1/kv?select=*',
  raw:    'https://raw.githubusercontent.com/ygtotlrl-lab/x/main/index.html',
};

function seed(entries) {
  store = new Map();
  const c = new FakeCache();
  for (const [url, mark] of entries) c.map.set(url, new FakeResponse(mark, { status: 200 }));
  store.set(CACHE_NAME, c);
  return c;
}
const FULL = () => seed([
  [F.root, 'CORE-ROOT'], [F.index, 'CORE-INDEX'],
  [F.asset, 'CORE-ASSET'], [F.cdn, 'CDN-0'],
]);

const online = (body, status) => () => Promise.resolve(new FakeResponse(body || 'NET-OK', { status: status || 200 }));
const offline = () => Promise.reject(new TypeError('offline'));

const nav = (url) => new FakeRequest(url, { mode: 'navigate' });
const sub = (url) => new FakeRequest(url, { mode: 'no-cors' });

/* ══════════════════════════════════════════════════════════════════════════
   התרחישים
   ══════════════════════════════════════════════════════════════════════════ */
const SCENARIOS = [
  ['nav-online',        'ניווט עם רשת — התשובה החיה מוגשת',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(nav(F.root))); }],

  ['nav-offline-cached', 'ניווט בלי רשת, יש עותק — מוגש מהמטמון',
    async () => { FULL(); netHandler = offline; return describe(await fireFetch(nav(F.root))); }],

  ['nav-offline-empty',  'ניווט בלי רשת ובלי עותק — דף אופליין / כלום',
    async () => { seed([]); netHandler = offline; return describe(await fireFetch(nav(F.root))); }],

  ['nav-offline-query',  "ניווט בלי רשת עם '?apk=1' — האם ה-query מונע התאמה",
    async () => { FULL(); netHandler = offline; return describe(await fireFetch(nav(F.root + '?apk=1'))); }],

  ['sub-cached-online',  'תת-משאב שיש לו עותק, יש רשת — רשת-קודם או מטמון-קודם',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(sub(F.asset))); }],

  ['sub-cached-offline', 'תת-משאב שיש לו עותק, אין רשת — מוגש מהמטמון',
    async () => { FULL(); netHandler = offline; return describe(await fireFetch(sub(F.asset))); }],

  ['sub-missing-offline', 'תת-משאב בלי עותק ובלי רשת — מה מוגש לתג script',
    async () => { FULL(); netHandler = offline; return describe(await fireFetch(sub(F.absent))); }],

  ['sub-404',            'תשובת 404 מהרשת — מה מוחזר',
    async () => { FULL(); netHandler = online('NET-404', 404); return describe(await fireFetch(sub(F.absent))); }],

  ['sub-404-stored',     'תשובת 404 — האם היא נכנסת למטמון',
    async () => {
      const c = FULL(); netHandler = online('NET-404', 404);
      await fireFetch(sub(F.absent)); await flush();
      return c.map.has(F.absent) ? 'stored' : 'not-stored';
    }],

  ['supabase',           '⛔ בקשת supabase — חייבת לעקוף את ה-SW לגמרי',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(sub(F.sb))); }],

  ['cdn-cached-online',  'נכס CDN שיש לו עותק, יש רשת',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(sub(F.cdn))); }],

  ['version-probe',      'בדיקת גרסה מ-raw.githubusercontent',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(sub(F.raw))); }],

  ['non-get',            'בקשת POST — לעולם לא נתפסת',
    async () => { FULL(); netHandler = online(); return describe(await fireFetch(new FakeRequest(F.asset, { method: 'POST' }))); }],

  ['sweep-scope',        '⛔ activate מוחק אך ורק מטמונים של האפליקציה הזו',
    async () => {
      FULL();
      store.set(APP.prefix + 'v0', new FakeCache());
      store.set('sister-app-v9', new FakeCache());
      netHandler = offline;
      await fireLifecycle('activate'); await flush();
      const left = [...store.keys()].sort().join(',');
      return left;
    }],
];

/* ══════════════════════════════════════════════════════════════════════════
   הרצה
   ══════════════════════════════════════════════════════════════════════════ */
console.log(`\n── ${APP.app}: קו הבסיס ההתנהגותי של sw.js (סבב 42) ──`);

is(!!CACHE_NAME, `CACHE_NAME נקרא מהמקור — '${CACHE_NAME}'`);
is(listeners.fetch.length === 1, 'מאזין fetch יחיד נרשם');
is(listeners.install.length === 1 && listeners.activate.length === 1, 'מאזיני install ו-activate נרשמו');
is(listeners.message.length === 1, 'מאזין message נרשם (SKIP_WAITING)');

const recorded = {};
for (const [key, title, run] of SCENARIOS) {
  let got;
  try { got = await run(); } catch (e) { got = 'ERROR: ' + e.message; }
  await flush();
  recorded[key] = got;
  if (RECORD) { console.log(`    ${key.padEnd(20)} → ${got}`); continue; }
  const exp = APP.expects[key];
  const spec = exp && typeof exp === 'object' ? exp : { be: exp };
  const mark = spec.defect ? '⛔ התנהגות פגומה — מתוקנת בשלב א3: ' : '';
  is(got === spec.be, `${mark}${title} → ${got}${got === spec.be ? '' : `  (צפוי: ${spec.be})`}`);
}

if (RECORD) { console.log('\n(SW_RECORD — לא הושוותה שום ציפייה)'); process.exit(0); }

/* ── שלוש הטענות המסומנות נספרות במפורש ────────────────────────────────── */
const defects = Object.entries(APP.expects).filter(([, v]) => v && v.defect);
console.log('  — ליקויים מתועדים —');
for (const [k, v] of defects) ok(`⛔ ${k}: ${v.why}`);
is(defects.length === APP.defectCount,
   `⛔ ${APP.defectCount} ליקויים מתועדים בקו הבסיס — ⛔ כל היפוך שלהם הוא שינוי מכוון (שלב א3)`);

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ סבב 42 (קו בסיס sw.js) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);
