#!/usr/bin/env node
/*  test_swcore.mjs — ליבת ה-service worker וקו הבסיס ההתנהגותי (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) קו הבסיס ההתנהגותי — ה-`sw.js` **האמיתי** רץ ברתמת
 *  `vm` (עם `caches`/`fetch`/`Response` מזויפים), וארבעה-עשר תרחישים
 *  נועלים את מה שחוזר ל-`respondWith` ואת מה שנכנס למטמון; (ב) חתימת
 *  הליבה המשותפת ומספר שורותיה; (ג) ידיות `SW_CFG`; (ד) ושלוש מוטציות
 *  התנהגותיות שחייבות להפיל את קו הבסיס.
 *
 *  **הנימוק המדוד:** הרתמה חיה בקובץ אחד **בלי מוטציה**, והמוטציות
 *  בקובץ שני **בלי רתמה** — ⛔ כל אחד מהם לבדו הוא חצי שער, והשני שילם
 *  תהליך נוסף על כל מוטציה כדי להגיע לראשון.
 *
 *  **מה יישבר בלעדיו:** `sw.js` הוא מה שהמשתמש רואה כשאין רשת —
 *  המסוכן ביותר אחרי `index.html`. ⛔ בלי הרתמה, «הליבה המאוחדת מתנהגת
 *  כמו הישנה» היא הצהרה; ⛔ ובלי המוטציות, הרתמה עצמה היא הצהרה.
 *
 *  **מה אינו נאכף כאן:** ⛔ הרתמה **מתעדת את ההווה ואינה שופטת אותו**
 *  (סבב 42) — ערך שנראה שגוי נרשם כפי שהוא ומסומן `defect: true`.
 *  ⚠️ תא בלי `defect` חייב להישאר זהה: הפרש בו הוא ⛔ עצור ודווח,
 *  ⛔ ולא «עדכן את הציפייה». ⛔ הרצה עם `SW_RECORD=1` מדפיסה במקום להשוות.
 *
 *  ⛔ `SW_HARNESS_ONLY=1` מריץ את קו הבסיס בלבד (סבב 72) — ⚠️ המוטציות
 *  מריצות את הקובץ הזה על עותק, ובלי הדגל הן היו מריצות שם גם את עצמן.
 *
 *  ⛔ המוטציות רצות על **עותק** בתיקייה זמנית ולא על העץ (סבב 42ג) —
 *  מוטציה שנכתבת לקובץ האמיתי ומוחזרת ב-`finally` מותירה את הריפו שבור
 *  אם התהליך נהרג באמצע.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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
    /* ⭐ תוקן בסבב 42ג (שלב א2): ה-handler הישן היה
       `fetch(...).catch(() => caches.match(e.request))`, ו-`caches.match`
       מחזירה **undefined** כשאין התאמה — respondWith על Promise<undefined>
       זורק TypeError, כלומר כל בקשה שנכשלת ברשת ואינה במטמון נכשלה
       פעמיים. הליבה המשותפת מחזירה תמיד תשובה תקפה, ולכן ניווט בלי עותק
       מקבל מעכשיו את **דף האופליין** — שנוצר כאן לראשונה. */
    'nav-offline-empty':     'body:html|status:503',
    /* ⭐ תוקן בסבב 42ג: ניווט עם '?apk=1' נפל לאותו undefined. מעכשיו הוא
       מחפש התאמה מדויקת (⛔ `navIgnoreSearch: false` — התנהגות שנמדדה
       ונשמרה), ובהיעדרה נופל לקליפה. */
    'nav-offline-query':     'body:CORE-INDEX|status:200',
    'sub-cached-online':     'body:NET-OK|status:200',
    'sub-cached-offline':    'body:CORE-ASSET|status:200',
    /* ⭐ תוקן בסבב 42ג: תת-משאב חסר החזיר undefined; מעכשיו שגיאת רשת
       אמיתית, ⛔ לעולם לא HTML בגוף תשובה של סקריפט — זו שגיאת תחביר
       בדף, לא הודעה למשתמש. */
    'sub-missing-offline':   'network-error',
    'sub-404':               'body:NET-404|status:404',
    /* ⭐ תוקן בסבב 42ג: לא הייתה כאן בדיקת `r.ok` ולא בדיקת opaque, ולכן
       תשובת 404 של GitHub Pages נכנסה למטמון תחת מפתח הבקשה והוגשה ממנו
       אופליין. `swStore` שבליבה שומרת ⛔ אך ורק תשובה שאומתה — `ok`
       ו-200 ולא-opaque. */
    'sub-404-stored':        'not-stored',
    'supabase':              'passthrough',
    'cdn-cached-online':     'body:NET-OK|status:200',
    'version-probe':         'body:NET-OK|status:200',
    'non-get':               'passthrough',
    'sweep-scope':           '%CACHE%,sister-app-v9',
  },
  defectCount: 0,
  /*  ⚠️ ידיות המדיניות **נמדדו בסבב 40 ונשמרו** — ⛔ אינן ברירת מחדל
   *  שנפלה מאליה, ואין לשנות אף אחת מהן «לשם אחידות» (סבב 42ג).
   *  ⭐ דף האופליין כאן **נוצר בסבב 42ג** — עד אז לא היה כזה כלל. */
  cfg: {
    prefix: "'schar-limud-'",
    scoped: 'false',
    navFallback: "'request'",
    navIgnoreSearch: 'false',
    subStrategy: "'network-first'",
    subMiss: "'error'",
    offlineStatus: '503',
    skipWaiting: 'true',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ החתימה נקראת מ-`check-capabilities` ⛔ ואינה מוקלדת כאן (סבב 96ד) —
 *  ⚠️ ערך שמוצהר בשני מקומות מתיישן באחד מהם, ⭐ והשער השני מאשר בשקט את
 *  מה שכבר אינו: ⛔ המרשם שם הוא המקור, וכאן קוראים ממנו לפי סמן הפתיחה. */
function capsBlock(startMark) {
  const caps = fs.readFileSync(new URL('./check-capabilities.mjs', import.meta.url), 'utf8');
  const re = /block:\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(caps)) !== null) {
    const s = /start:\s*'([^']*)'/.exec(m[1]);
    if (!s || s[1] !== startMark) continue;
    return { sha: (/sha:\s*'([0-9a-f]{16})'/.exec(m[1]) || [])[1] || '',
             lines: Number((/lines:\s*(\d+)/.exec(m[1]) || [])[1]) || 0 };
  }
  return { sha: '', lines: 0 };
}
/*  ⭐ הסמנים זהים בארבעת הריפו — ⛔ והחתימה ומספר השורות נקראים מהמרשם
 *  ולא מוקלדים כאן, ⚠️ שערך שמוצהר פעמיים מתיישן באחד משני המקומות. */
const START = '/* ═══ מודול ה-service worker — מודול משותף (סבב 42ג)';
const END = '/* ═══════════════ סוף מודול ה-service worker';
const CORE_SHA = capsBlock(START).sha;
const CORE_LINES = capsBlock(START).lines;

const SELF = fileURLToPath(import.meta.url);
const SELF_NAME = basename(SELF);
const ROOT = join(dirname(SELF), '..');
const SW_PATH = join(ROOT, 'sw.js');
const SRC = fs.readFileSync(SW_PATH, 'utf8');
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
console.log(`\n──────── ${APP.app}: קו הבסיס ההתנהגותי של sw.js (סבב 42) ──`);

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
  /* ⭐ סבב 65 — `%CACHE%` במקום מספר הגרסה: ⛔ ערך שקיים בקוד אינו מוצהר
   *  בשער. קיבוע `yoman-avoda-v44` כאן הפך כל קידום
   *  `CACHE_NAME` — שהוא **חובה** בכל שינוי קוד — לשער אדום. */
  const want = typeof spec.be === 'string' ? spec.be.split('%CACHE%').join(CACHE_NAME) : spec.be;
  const mark = spec.defect ? '⛔ התנהגות פגומה — מתוקנת בשלב א3: ' : '';
  is(got === want, `${mark}${title} → ${got}${got === want ? '' : `  (צפוי: ${want})`}`);
}

if (RECORD) { console.log('\n(SW_RECORD — לא הושוותה שום ציפייה)'); process.exit(0); }

/* ── שלוש הטענות המסומנות נספרות במפורש ────────────────────────────────── */
const defects = Object.entries(APP.expects).filter(([, v]) => v && v.defect);
console.log('  — ליקויים מתועדים —');
for (const [k, v] of defects) ok(`⛔ ${k}: ${v.why}`);
is(defects.length === APP.defectCount,
   `⛔ ${APP.defectCount} ליקויים מתועדים בקו הבסיס — ⛔ כל היפוך שלהם הוא שינוי מכוון (שלב א3)`);

/*  ⛔ בריצה מתוך מוטציה — עוצרים כאן (סבב 72) — ⚠️ המוטציה מודדת את קו
 *  הבסיס בלבד, וסעיפים ב–ה שמתחת היו מריצים אותה שוב על עצמה. */
if (process.env.SW_HARNESS_ONLY) {
  console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                  : `\n✓ קו הבסיס ההתנהגותי של sw.js — ${n} טענות עברו`);
  process.exit(bad ? 1 : 0);
}

/* ── ב. הליבה ──────────────────────────────────────────────────────────── */
function core(src) {
  const i = src.indexOf(START);
  if (i < 0) return null;
  const j = src.indexOf(END, i);
  if (j < 0) return null;
  const k = src.indexOf('*/', j);
  if (k < 0) return null;
  return src.slice(i, k + 2);
}
const CORE = core(SRC);
is(!!CORE, 'הבלוק המשותף נמצא ב-sw.js (סמן פתיחה וסגירה)');
const sha = CORE ? crypto.createHash('sha256').update(CORE).digest('hex').slice(0, 16) : '—';
is(sha === CORE_SHA, `הליבה זהה לחתימה הקנונית (${CORE_SHA}) — נמדד ${sha}`);
is(CORE ? CORE.split('\n').length === CORE_LINES : false,
   `הליבה בת ${CORE_LINES} שורות`);

/*  ⛔ מוטציה 1 — בית אחד בליבה מזיז את החתימה. זה מה שהופך את
 *  `check-capabilities.mjs` לשער אמיתי ולא להצהרה. */
is(CORE
   ? crypto.createHash('sha256').update(CORE.replace('swStore', 'swStorX'))
       .digest('hex').slice(0, 16) !== CORE_SHA
   : false,
   '⛔ מוטציה: שינוי בית אחד בליבה מזיז את החתימה — check-capabilities היה נכשל');

/* ── ג. הפרמטרים ───────────────────────────────────────────────────────── */
const cfgAt = SRC.indexOf('var SW_CFG = {');
is(cfgAt >= 0, 'SW_CFG מוגדר ב-sw.js');
is(cfgAt >= 0 && CORE ? cfgAt < SRC.indexOf(START) : false,
   '⛔ SW_CFG יושב **מעל** הליבה — ליבה בלי פרמטרים אינה מודול');
const cfgBlock = cfgAt >= 0 ? SRC.slice(cfgAt, SRC.indexOf('};', cfgAt) + 2) : '';
for (const [k, v] of Object.entries(APP.cfg)) {
  const m = new RegExp(`\\b${k}\\s*:\\s*([^,\\n]+)`).exec(cfgBlock);
  const got = m ? m[1].trim() : '—';
  is(got === v, `SW_CFG.${k} = ${v} (נמדד ${got})`);
}

/* ── ד. שלושת הליקויים — הצד הסטטי ─────────────────────────────────────── */
is(/if \(!res \|\| !res\.ok \|\| res\.status !== 200 \|\| res\.type === 'opaque'\) return;/
   .test(CORE || ''),
   '⛔ swStore שומרת אך ורק תשובה שאומתה (ok · 200 · לא opaque)');
is(/return first\.then\(function \(hit\) \{ return hit \|\| swOfflinePage\(\); \}\);/
   .test(CORE || ''),
   '⛔ מסלול הניווט האופליין מסתיים תמיד בתשובה תקפה — לעולם לא undefined');
is(/text\/html; charset=utf-8/.test(SRC),
   'דף האופליין מוגש עם Content-Type מפורש — בארבעתן, גם ב-schar');

if (RUN_MUT) {
/* ── ה. שלוש המוטציות ההתנהגותיות ──────────────────────────────────────── */
/*  ⚠️ כל מוטציה רצה על עותק בתיקייה זמנית, ומריצה את **רתמת קו-הבסיס
 *  האמיתית**. הצלחה = הרתמה נכשלה. ⛔ מוטציה שהרתמה עוברת עליה היא תיקון
 *  שאינו נאכף — וזו בדיוק הנקודה. */
function harnessFails(label, from, to) {
  if (!SRC.includes(from)) { is(false, `${label} — עוגן המוטציה לא נמצא ב-sw.js`); return; }
  /*  ⛔ עותק לכל מוטציה, ⛔ ובכוונה (סבב 92) — ⚠️ נמדדו **ארבעה** בהרצה
      אחת, ⭐ ושתי הרתמות מריצות שער אמיתי על עץ שסט הקבצים שלו שונה. */
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'sw42c-'));
  try {
    fs.mkdirSync(join(dir, 'tools'));
    fs.writeFileSync(join(dir, 'sw.js'), SRC.replace(from, to));
    fs.copyFileSync(SELF, join(dir, 'tools', SELF_NAME));
    /*  ⛔ המרשם נוסע עם השער (סבב 96ד) — ⚠️ החתימה נקראת ממנו, ⭐ ובלעדיו
     *  הרתמה מודדת «אין חתימה» במקום את מה שהיא באה למדוד. */
    fs.copyFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'),
                    join(dir, 'tools', 'check-capabilities.mjs'));
    const r = spawnSync(process.execPath, [join(dir, 'tools', SELF_NAME)],
                        { encoding: 'utf8',
                          env: { ...process.env, SW_HARNESS_ONLY: '1' } });
    is(r.status !== 0, label);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

harnessFails(
  '⛔ מוטציה: ניווט אופליין בלי `|| swOfflinePage()` — respondWith(undefined) חוזר, והרתמה נופלת',
  'return first.then(function (hit) { return hit || swOfflinePage(); });',
  'return first;');

harnessFails(
  '⛔ מוטציה: swStore בלי בדיקת הסטטוס — תשובת 404 נשמרת במטמון, והרתמה נופלת',
  "if (!res || !res.ok || res.status !== 200 || res.type === 'opaque') return;",
  'if (!res) return;');

/*  ⚠️ העוגן נגזר מ-`SW_CFG.subMiss` (סבב 42ג) — ב-gius הענף שרץ בפועל הוא
 *  ה-504, ומוטציה על `Response.error()` הייתה שם **no-op**: מוטציה שאינה
 *  משנה את ההתנהגות אינה מוכיחה שהתיקון נאכף, היא רק נראית כאילו. */
const M3 = APP.cfg.subMiss === "'504'"
  ? ["  if (SW_CFG.subMiss === '504') return new Response('', { status: 504, statusText: 'Offline' });",
     "  if (SW_CFG.subMiss === '504') return swOfflinePage();"]
  : ['  try { return Response.error(); }',
     '  try { return swOfflinePage(); }'];
harnessFails(
  '⛔ מוטציה: תת-משאב חסר מקבל את דף האופליין — HTML בגוף תשובה של סקריפט, והרתמה נופלת',
  M3[0], M3[1]);

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה שלוש המוטציות שלמעלה אינן מבחינות בין
 *  «רתמה שמודדת התנהגות» ל«רתמה שנופלת על כל שינוי בקובץ» (סבב 68).
 *  ⚠️ הוספת הערה אינה משנה דבר במה ש-`respondWith` מחזיר, ⛔ ולכן קו
 *  הבסיס חייב להמשיך לעבור עליה — גם כשהחתימה שבסעיף א כן זזה. */
{
  const dir = fs.mkdtempSync(join(os.tmpdir(), 'sw68-'));
  try {
    fs.mkdirSync(join(dir, 'tools'));
    fs.writeFileSync(join(dir, 'sw.js'),
      SRC.replace(/CACHE_NAME\s*=\s*'([a-z-]+)-v(\d+)'/,
                  (_, p, v) => `CACHE_NAME = '${p}-v${Number(v) + 1}'`));
    fs.copyFileSync(SELF, join(dir, 'tools', SELF_NAME));
    /*  ⛔ המרשם נוסע עם השער (סבב 96ד) — ⚠️ החתימה נקראת ממנו, ⭐ ובלעדיו
     *  הרתמה מודדת «אין חתימה» במקום את מה שהיא באה למדוד. */
    fs.copyFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'),
                    join(dir, 'tools', 'check-capabilities.mjs'));
    const r = spawnSync(process.execPath, [join(dir, 'tools', SELF_NAME)],
                        { encoding: 'utf8',
                          env: { ...process.env, SW_HARNESS_ONLY: '1' } });
    is(r.status === 0,
       '⭐ מוטציית-נגד: קידום `CACHE_NAME` ⛔ אינו משנה התנהגות — קו הבסיס עובר');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

}

console.log(`\n${bad ? '✗' : '✓'} סבב 72 (ליבת ה-service worker וקו הבסיס) — ${n - bad} טענות עברו, ${bad} נכשלו`);
process.exit(bad ? 1 : 0);
