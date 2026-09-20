#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_behavior.mjs — חמישה מסלולים נמדדים בהתנהגות (סבב 141)

   **מה נאכף:** ⛔ חמישה מסלולים נמדדים **בדפדפן אמיתי** ⛔ ולא בטקסט — ⚠️ הדף
   נטען בלי שגיאת קונסולה · לחיצה על כפתור כתיבה מדליקה ומכבה את
   ההשבתה · `Enter` בשדה עריכה שומר · `Escape` אינו מוחק את מיכל
   המודאל · ⭐ והטוסט עומד ב-4.5 בשני המצבים ובשני הסיווגים.

   **הנימוק המדוד:** ⚠️ 188 שורות הטבלה בודקות **טקסט**, ⛔ ואפס בודקות
   **התנהגות**: ⭐ ושלושה באגים חיים נמצאו רק מפני שהמנהל פתח את
   האפליקציה — ⛔ `swVer` שהחזיר ריק · `order` על עמודה שאינה קיימת ·
   ⚠️ ו-`Enter` שלא עבד בגיוס חמישה סבבים. ⭐ שלושתם עברו כל שער.

   **מה יישבר בלעדיו:** ⛔ מסלול שנשבר בדפדפן וכל הטקסט סביבו נשאר תקין — ⚠️ הוא עובר
   את כל 188 השורות, ⭐ ומגיע למשתמש: ⛔ בדיוק שלושת הבאגים שלמעלה.

   **מה אינו נאכף כאן:** ⚠️ **נכונות הנתונים** — ⛔ הרשת נענית מקומית, ⭐ ומה שנמדד
   הוא המסלול ⛔ ולא התוכן · ⚠️ ומסך שדורש כניסה אינו נפתח כאן,
   ⛔ והמסלולים נמדדים במה שהדף פותח בו.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ נתיב הדפדפן — ⚠️ ניתן לדריסה ב-`BEHAVIOR_CHROME`, ⭐ והיעדרו
   *  **מדווח ואינו מדלג בשתיקה**: ⛔ שער שמדלג כשאין דפדפן אינו יכול להיכשל. */
  chrome: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  /* ⚠️ ההיקף שבו נמדד `Enter` — הטופס הראשון שנפתח בדף */
  ksaveSel: '.ksave',
  /*  ⚠️ הפותח של אותו היקף — ⛔ ריק כשהטופס כבר על המסך הראשון:
   *  ⭐ שדה חסר נקרא «לא נשאל», וריק נקרא «נמדד ואין». */
  ksaveOpen: '',
  /*  ⛔ המסך הראשון בהתקנה טרייה — ⚠️ **מה נכנס**: הבורר של האלמנט
   *  שנושא את תוכן המסך הראשון ⟵ מה הוא, ולמה הוא מעיד; ⛔ **ומה מפיל**:
   *  בורר שאין לו אלמנט, ⛔ ואלמנט שטקסטו ריק. ⭐ **ולמה המבנה קיים**:
   *  הריצה כאן היא מול לקוח שמחזיר אפס שורות ואחסון שנוקה — ⚠️ כלומר
   *  התקנה טרייה מול סכימה ריקה בדיוק, ⛔ ומה שדורש זריעה ידנית נופל כאן.
   */
  fresh: { sel: '#auth-btn',
    why: 'כפתור הכניסה שבמסך הראשון — ⛔ ובהתקנה טרייה אין משתמש במסד: ⚠️ ומה שנמדד הוא שהמסך נפתח ושמיש, ⭐ ולא שהכניסה מצליחה' },
  /*  ⛔ **מה נכנס**: שם ⟵ ביטוי שנמדד בדף ⟵ הערך שנמסר בכתב;
   *  ⛔ **ומה מפיל**: ערך שנמדד ואינו זה שנמסר, ⚠️ והיעדר נימוק לריק.
   *  ⭐ **ולמה המבנה קיים**: מה שחי באפליקציה אחת אין ממה לסטות,
   *  ⛔ ולכן אין לו שער — ⚠️ והוא נמדד כאן בהתנהגות. */
  accept: { expose: [], setup: '', cases: [], why: '⛔ אין כאן חשבון שחי באפליקציה אחת — ⚠️ הפריסה והיתרה נגזרות מהסולם המשותף' },
  /*  ⛔ ידיות הגרירה — ⚠️ **מה נכנס**: כל בורר שנושא `touch-action:none`
   *  ⟵ למה הוא ידית; ⛔ **ומה מפיל**: בורר שאינו כאן, ⭐ והכרזה שאין
   *  לה כלל. */
  dragHandles: [],
  drag: null,
  dragWhy: 'אין כאן רשימה שסדרה נקבע ביד — ⚠️ התלמידים והתנועות ממוינים במיון האחד, ⭐ והסעיפים נערכים ברשימה: ⛔ ואין מסלול גרירה למדוד',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [25, 36, 91, 230];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה שאין לה מה למדוד בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בכולן. */
const FLOOR = { shared: 10, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  if (PRE_MUT === 0 && process.env.GATE_MUT !== '1') {
    console.log(`⏭ ${GATE_ID}: כל גופו רץ ברמה המלאה — לא נמדד כאן`);
    return;
  }
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/*  ⛔ הדפדפן נמצא בנתיב מוצהר — ⚠️ **מה נכנס**: מסלול הבינארי;
 *  ⛔ **ומה מפיל**: היעדרו — ⭐ והשער **מדווח ואינו מדלג בשתיקה**:
 *  ⚠️ שער שמדלג כשאין דפדפן הוא שער שאינו יכול להיכשל. */
const CHROME = process.env.BEHAVIOR_CHROME || APP.chrome;

/*  ⛔ המתנה לתנאי ⛔ ולא לשעון — ⚠️ שינה בגודל קבוע נגמרת על מכונה עמוסה
 *  לפני שהשרשרת הא-סינכרונית סיימה: ⭐ התקרה קיימת כדי להיכשל ברעש
 *  ⛔ ולא כדי לתזמן. */
async function waitFor(fn, ms, step) {
  const end = Date.now() + (ms || 8000);
  while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step || 40)); }
  return false;
}

/*  ⛔ המקור מוגש מהזיכרון — ⚠️ **מה נכנס**: גוף `index.html` שהמוטציה
 *  קובעת; ⛔ **ומה מפיל**: כלום — הוא אינו כותב לעץ. ⭐ **ולמה המבנה
 *  קיים**: מוטציה היא **טעינה מחדש** ⛔ ולא הפעלת דפדפן נוספת —
 *  ⚠️ הפעלה לכל מוטציה הייתה חוצה את תקציב הזמן פי כמה. */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
               '.css': 'text/css; charset=utf-8',
               '.json': 'application/json', '.png': 'image/png',
               '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let SERVED = null;                    /* גוף ה-HTML שמוגש כרגע */

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => {
      let p = decodeURIComponent(String(req.url).split('?')[0]);
      if (p === '/') p = '/index.html';
      if (p === '/index.html') {
        rep.writeHead(200, { 'Content-Type': MIME['.html'] });
        rep.end(SERVED); return;
      }
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
        rep.writeHead(404); rep.end(''); return;
      }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      rep.end(fs.readFileSync(f));
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });
}

/*  ⛔ הדפדפן עולה **פעם אחת** — ⚠️ וכל מוטציה היא טעינה מחדש: ⭐ זה מה
 *  שמחזיק את השער בתוך תקציב הזמן. */
function launch(profile) {
  return new Promise((res, rej) => {
    const p = cp.spawn(CHROME, ['--headless=new', '--remote-debugging-port=0',
      '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-extensions', '--no-first-run', '--user-data-dir=' + profile],
      { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const t = setTimeout(() => rej(new Error('הדפדפן לא פרסם כתובת ניפוי בתוך התקרה')), 20000);
    p.on('error', (e) => { clearTimeout(t); rej(e); });
    p.stderr.on('data', (d) => {
      buf += d;
      const m = /ws:\/\/[^\s]+/.exec(buf);
      if (m) { clearTimeout(t); res({ proc: p, ws: m[0] }); }
    });
  });
}

/*  ⛔ לקוח CDP קטן ⛔ ובלי תלות חיצונית — ⚠️ `WebSocket` הוא גלובלי
 *  ב-Node, ⭐ וספרייה חיצונית כאן הייתה תלות שאין לשאר השערים. */
async function connect(ws) {
  const sock = new WebSocket(ws);
  await new Promise((r, j) => { sock.addEventListener('open', r); sock.addEventListener('error', j); });
  let id = 0; const waiting = new Map(); const events = [];
  const handlers = [];
  sock.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); return; }
    if (m.method) { events.push(m); for (const h of handlers) h(m); }
  });
  const send = (method, params, sid) => new Promise((r) => {
    const i = ++id; waiting.set(i, r);
    sock.send(JSON.stringify({ id: i, method, params: params || {}, ...(sid ? { sessionId: sid } : {}) }));
  });
  return { sock, send, events, on: (h) => handlers.push(h) };
}

/*  ⛔ מרשם הדפוסים והמוטציות — ⚠️ **מה נכנס**: שם כל דפוס שהשער מכריז,
 *  ⛔ ושם כל דפוס שיש לו מוטציה; ⛔ **ומה מפיל**: דפוס בלי מוטציה,
 *  ומוטציה בלי דפוס. ⭐ **ולמה המבנה קיים**: הוא מה שמאפשר להצליב
 *  את השער מבחוץ — ⛔ דפוס בלי מוטציה נשחק בשקט. */
export const PATTERNS = ['load', 'fresh', 'enter', 'busy', 'escape', 'contrast'];
export const MUTS = ['load', 'fresh', 'enter', 'busy', 'escape', 'contrast'];

/*  ⛔ כל בקשה חיצונית נענית מקומית — ⚠️ **מה נכנס**: כתובת שאינה
 *  `127.0.0.1`; ⛔ **ומה מפיל**: כלום — ⭐ **ולמה המבנה קיים**: גיליון
 *  סגנון חיצוני חוסם את הרינדור, ⛔ ובלי מענה מקומי הדף נשאר «loading»
 *  לנצח: ⚠️ הנימוק המדוד — שלוש מהאפליקציות לא סיימו לעלות כלל,
 *  ⭐ ואפס שגיאות קונסולה דווחו. ⛔ ושער שנשען על רשת חיצונית אינו הרמטי. */
const SB_STUB = `(function () {
  function mk() {
    var target = function () { return mk(); };
    return new Proxy(target, {
      get: function (t, k) {
        if (k === 'then') return function (res) { return Promise.resolve({ data: [], error: null, count: 0 }).then(res); };
        if (k === 'catch' || k === 'finally') return function () { return mk(); };
        if (k === 'data') return [];
        if (k === 'error') return null;
        if (k === Symbol.toPrimitive || k === 'toString') return function () { return ''; };
        return mk();
      },
      apply: function () { return mk(); },
    });
  }
  window.supabase = { createClient: function () { return mk(); } };
})();`;

/*  ⛔ יחס הניגודיות בנוסחת WCAG — ⚠️ הערכים נקראים מהדפדפן אחרי
 *  שהערכה נפתרה, ⭐ ולא מהטקסט שבקובץ: ⛔ אסימון שמצביע על אסימון
 *  נראה תקין בטקסט, ⚠️ והדפדפן הוא מי שיודע מה יצא בסוף. */
function lum(rgb) {
  const c = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
const rgbOf = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); return m ? m[1].split(',').slice(0, 3).map((x) => parseFloat(x)) : null; };

/*  ⛔ חמשת המסלולים — ⚠️ **מה נכנס**: דף שנטען בדפדפן אמיתי;
 *  ⛔ **ומה מפיל**: מסלול שלא התקיים. ⭐ **ולמה המבנה קיים**: אלה
 *  בדיוק חמשת המסלולים שנשברו — ⚠️ כולם עברו כל שער טקסטואלי,
 *  ⛔ והמשתמש הוא שגילה אותם. */
/*  ⛔ הגשר נכתב לעותק שמוגש ⛔ ולא לעץ — ⚠️ השמות חיים בהיקף המודול,
 *  ⭐ ומבחן הקבלה מריץ את **בייטי האפליקציה עצמם**: ⛔ עותק שני שנכתב
 *  לצידם היה נסחף, ⚠️ והבדיקה הייתה מודדת אותו ⛔ ולא את מה שרץ. */
function withBridge(src, names) {
  if (!names.length) return src;
  const i = src.lastIndexOf('</script>');
  if (i < 0) return src;
  /*  ⛔ הגשר נכנס **בתוך** גוף המודול — ⚠️ יש מקור שכל גופו עטוף
   *  ב-`(function () { … })();`, ⭐ והשמות חיים בסגור שלו: ⛔ שורה
   *  שנכתבת אחריו אינה רואה אותם, ⚠️ והגשר נשאר `undefined`. */
  const j = src.lastIndexOf('})();', i);
  const at = (j > 0 && i - j < 24) ? j : i;
  return src.slice(0, at) + '\nwindow.__acc = { ' + names.join(', ') + ' };\n' + src.slice(at);
}

/*  ⛔ **מה נכנס**: ההצהרה הפר-אפליקציתית ⟵ הביטוי שנמדד בדף ⟵ הערך
 *  שנמסר; ⛔ **ומה מפיל**: ערך שנמדד ואינו הערך שנמסר, ⚠️ והפרש של
 *  אגורה מותר — ⭐ השוואת שוויון בין צפים מפילה על ייצוג ⛔ ולא על חשבון.
 *  ⭐ **ולמה המבנה קיים**: זה מה שתופס לוגיקה שחיה באפליקציה אחת,
 *  ⛔ ואין לה ממה לסטות — ⚠️ ולכן אין לה שער. */
async function acceptGaps(D, port, A) {
  const ev = async (x) => {
    const r = await D.send('Runtime.evaluate',
      { expression: x, returnByValue: true, awaitPromise: true }, D.S);
    if (r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      return { __err: String((d.exception && (d.exception.description || d.exception.value)) || d.text) };
    }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  await D.send('Page.navigate', { url: 'about:blank' }, D.S);
  await D.send('Storage.clearDataForOrigin',
    { origin: `http://127.0.0.1:${port}`,
      storageTypes: 'local_storage,cookies,indexeddb,service_workers,cache_storage' }, D.S).catch(() => {});
  /*  ⛔ עובד השירות מנוטרל לטעינה הזו — ⚠️ הוא מגיש את הקליפה מהמטמון,
   *  ⭐ והמטמון נושא את העותק שנטען לפני שהגשר נכתב: ⛔ בלי הנטרול
   *  הבדיקה הייתה מודדת דף ישן ⛔ ולא את מה שמוגש עכשיו. */
  await D.send('Network.enable', {}, D.S).catch(() => {});
  await D.send('Network.setBypassServiceWorker', { bypass: true }, D.S).catch(() => {});
  await D.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` }, D.S);
  if (!await waitFor(async () => (await ev('!!window.__acc')) === true, 9000))
    return ['⛔ הגשר לא נבנה — ' + JSON.stringify(await ev('typeof window.__acc'))];
  /*  ⛔ ההכנה רצה עד שהיא מצליחה — ⚠️ ההשתלטות הראשונה של עובד השירות
   *  מרעננת את הדף, ⭐ והגשר נבנה מחדש: ⛔ הרצה אחת הייתה נופלת על
   *  רענון שאינו כשל. */
  let ready;
  const set = await waitFor(async () => (ready = await ev(A.setup)) === true, 9000, 120);
  if (!set) return ['⛔ ההכנה לא הסתיימה — ' + JSON.stringify(ready)];
  const bad = [];
  for (const [name, expr, want] of A.cases) {
    const got = await ev(expr);
    if (typeof got !== 'number' || Math.abs(got - want) >= 0.005)
      bad.push(`${name}: נמדד ${JSON.stringify(got)} והצפוי ${want}`);
  }
  await D.send('Network.setBypassServiceWorker', { bypass: false }, D.S).catch(() => {});
  return bad;
}

/* ── הגרירה — ביטוי על המקור, והרצה בדפדפן ─────────────────────────────── */
/*  ⛔ אירועי גרירת HTML5 אינם קיימים במגע — ⚠️ **מה נכנס**: כל רישום
 *  מאזין לאחד מחמשת האירועים, וכל מאפיין `draggable`; ⛔ **ומה מפיל**: כל
 *  אתר כזה. ⭐ **ולמה המבנה קיים**: מערכת שבנויה לעכבר עובדת בעכבר,
 *  ⛔ והכותב יושב מול מחשב — ⚠️ ואיש אינו רואה שבאצבע היא אינה נורים כלל.
 *  ⛔ **והמדידה על המקור הגולמי** — ⚠️ הרישום חי כליטרל מחרוזת,
 *  ⭐ והמאפיין בתגית שנבנית ב-JS: ⛔ והלבנה היתה מוחקת בדיוק את מה שהיא סורקת. */
const DRAG_EVENTS = ['dragstart', 'dragover', 'dragleave', 'dragend', 'drop'];
export function dragApiGaps(src) {
  const out = [];
  const at = (i) => src.slice(0, i).split('\n').length;
  const re = new RegExp("addEventListener\\s*\\(\\s*['\"](" + DRAG_EVENTS.join('|') + ")['\"]", 'g');
  for (const m of src.matchAll(re))
    out.push('מאזין `' + m[1] + '` בשורה ' + at(m.index));
  for (const m of src.matchAll(/(?<![\w-])draggable\s*=/g))
    out.push('`draggable` בשורה ' + at(m.index));
  return out;
}
/*  ⛔ `touch-action:none` יושב על הידית בלבד — ⚠️ **מה נכנס**: כל כלל
 *  בגיליון שנושא אותו; ⛔ **ומה מפיל**: בורר שאינו מוכרז כידית, ⭐ וידית
 *  שהוכרזה ואין לה כלל. ⚠️ **ולמה המבנה קיים**: ביטול פעולת המגע על
 *  שורה שלמה נועל את גלילת המסך, ⭐ והדף מפסיק להיגלל בכל הרשימה. */
export function gripGaps(css, decl) {
  const out = [], hit = new Set();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  for (const m of clean.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (!/touch-action\s*:\s*none/.test(m[2])) continue;
    const sel = m[1].trim().split(/\s*,\s*/);
    for (const one of sel) {
      const d = decl.find((x) => x.sel === one);
      if (!d) out.push('`touch-action:none` על בורר שאינו ידית מוכרזת: ' + one);
      else hit.add(d.sel);
    }
  }
  for (const d of decl) {
    if (!d.why || !String(d.why).trim()) out.push('ידית מוכרזת בלי נימוק: ' + d.sel);
    if (!hit.has(d.sel)) out.push('ידית מוכרזת שאין לה כלל `touch-action:none`: ' + d.sel);
  }
  return out;
}

/*  ⛔ הגרירה נמדדת באירועים שהדפדפן משדר — ⚠️ **ולא באירוע שהמבחן
 *  בונה**: ⭐ מבחן שיוצר את האירוע בעצמו מוכיח שהמטפלים תקינים אם
 *  האירועים מגיעים, ⛔ ולא שהם מגיעים — ⚠️ וזה בדיוק מה שהסתיר את הפער.
 *  ⛔ **ושתי הדרכים נמדדות** — ⭐ עכבר ומגע: ⚠️ גרירה שעובדת בעכבר
 *  ולא במגע היא כישלון. */
async function dragMove(D, kind, from, to) {
  const steps = [];
  for (let i = 1; i <= 6; i++)
    steps.push({ x: from.x + (to.x - from.x) * i / 6, y: from.y + (to.y - from.y) * i / 6 });
  steps.push({ x: to.x, y: to.y + 6 });
  if (kind === 'mouse') {
    await D.send('Input.dispatchMouseEvent',
      { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 }, D.S);
    for (const p of steps)
      await D.send('Input.dispatchMouseEvent',
        { type: 'mouseMoved', x: p.x, y: p.y, button: 'left', buttons: 1 }, D.S);
    const last = steps[steps.length - 1];
    await D.send('Input.dispatchMouseEvent',
      { type: 'mouseReleased', x: last.x, y: last.y, button: 'left', buttons: 0, clickCount: 1 }, D.S);
    return;
  }
  await D.send('Input.dispatchTouchEvent',
    { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] }, D.S);
  for (const p of steps)
    await D.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y }] }, D.S);
  await D.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, D.S);
}

async function dragGaps(D, port, A, body) {
  const bad = [];
  const ev = async (x) => {
    const r = await D.send('Runtime.evaluate',
      { expression: x, returnByValue: true, awaitPromise: true }, D.S);
    if (r.result && r.result.exceptionDetails) {
      const d = r.result.exceptionDetails;
      return { __err: String((d.exception && (d.exception.description || d.exception.value)) || d.text) };
    }
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  const box = (sel) => ev('(function () { var e = document.querySelector(' + JSON.stringify(sel) + ');' +
    ' if (!e) return null; var r = e.getBoundingClientRect();' +
    ' return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()');
  SERVED = body;
  for (const kind of ['mouse', 'touch']) {
    await D.send('Page.navigate', { url: 'about:blank' }, D.S);
    await D.send('Storage.clearDataForOrigin',
      { origin: `http://127.0.0.1:${port}`,
        storageTypes: 'local_storage,cookies,indexeddb,service_workers,cache_storage' }, D.S).catch(() => {});
    await D.send('Network.enable', {}, D.S).catch(() => {});
    await D.send('Network.setBypassServiceWorker', { bypass: true }, D.S).catch(() => {});
    /*  ⛔ הדפדפן עובר למצב מגע לפני הריצה במגע — ⚠️ בלעדיו אירוע
     *  מגע אינו מייצר אירוע מצביע כלל, ⭐ והמדידה היתה מדווחת כישלון
     *  על מנגנון תקין. */
    await D.send('Emulation.setTouchEmulationEnabled',
      { enabled: kind === 'touch', maxTouchPoints: 1 }, D.S).catch(() => {});
    await D.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` }, D.S);
    /*  ⛔ הגשר נדרש רק למי שמבקש שמות — ⚠️ הזרעה שעוברת
     *  באחסון המקומי אינה צריכה אותו, ⭐ והמתנה לו היתה נכשלת לנצח. */
    const upOk = A.expose.length
      ? await waitFor(async () => (await ev('!!window.__acc')) === true, 9000)
      : await waitFor(async () => (await ev('document.readyState === "complete"')) === true, 9000);
    if (!upOk) { bad.push(kind + ': הדף לא עלה'); continue; }
    let ready;
    if (!await waitFor(async () => (ready = await ev(A.setup)) === true, 9000, 120)) {
      bad.push(kind + ': ההכנה לא הסתיימה — ' + JSON.stringify(ready)); continue;
    }
    const before = await ev(A.order);
    /*  ⛔ הפריט נגלל לתוך המסך לפני המדידה — ⚠️ `elementFromPoint` מחזיר
     *  `null` מחוץ לחלון הנראה, ⭐ והגרירה היתה נעצרת על גלילה ולא
     *  על מנגנון: ⛔ וכשל שמקורו במבחן נקרא ככשל במוצר. */
    await ev('(function () { var e = document.querySelector(' + JSON.stringify(A.grip) + ');' +
      ' if (e && e.scrollIntoView) e.scrollIntoView({ block: "center" }); return true; })()');
    const g = await box(A.grip), tgt = await box(A.target);
    if (!g || !tgt) { bad.push(kind + ': אין ידית או אין יעד'); continue; }
    await dragMove(D, kind, g, tgt);
    await waitFor(async () => (await ev(A.order)) !== before, 4000, 100);
    const after = await ev(A.order);
    if (after === before) bad.push(kind + ': הסדר לא השתנה — ' + JSON.stringify(before));
  }
  await D.send('Emulation.setTouchEmulationEnabled', { enabled: false, maxTouchPoints: 1 }, D.S).catch(() => {});
  await D.send('Network.setBypassServiceWorker', { bypass: false }, D.S).catch(() => {});
  SERVED = SRC;
  return bad;
}

async function paths(D, port) {
  const out = [];
  const ev = async (x) => {
    const r = await D.send('Runtime.evaluate',
      { expression: x, returnByValue: true, awaitPromise: true }, D.S);
    if (r.result && r.result.exceptionDetails) return { __err: String(r.result.exceptionDetails.text) };
    return r.result && r.result.result ? r.result.result.value : undefined;
  };
  /*  ⛔ המצב המקומי מתאפס לפני כל טעינה — ⚠️ **מה נכנס**: אחסון · עוגיות ·
   *  ועובד שירות; ⛔ **ומה מפיל**: כלום. ⭐ **ולמה המבנה קיים**: הריצה
   *  הקודמת השאירה משתמש מחובר, ⛔ ומסך הכניסה כבר לא היה בדף — ⚠️ ואז
   *  «אין שדה» נקרא «`Enter` אינו שומר»: ⭐ מוטציה נמדדה על מצב שהיא
   *  לא יצרה. */
  await D.send('Page.navigate', { url: 'about:blank' }, D.S);
  await D.send('Storage.clearDataForOrigin',
    { origin: `http://127.0.0.1:${port}`,
      storageTypes: 'local_storage,cookies,indexeddb,service_workers,cache_storage' }, D.S).catch(() => {});
  D.events.length = 0;
  await D.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` }, D.S);
  const up = await waitFor(async () => (await ev('document.readyState === "complete"')) === true, 9000);
  const rendered = await waitFor(async () => (await ev('!!document.getElementById("toasts")')) === true, 9000);

  /* 1 · הדף נטען בלי שגיאת קונסולה */
  const errs = D.events.filter((e) =>
    e.method === 'Runtime.exceptionThrown' ||
    (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') ||
    (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
    .map((e) => (e.params.entry ? e.params.entry.text
                 : (e.params.exceptionDetails || {}).text || '') || '');
  out.push({ k: 'load', ok: up && rendered && errs.length === 0,
             info: up ? (rendered ? (errs.length ? errs.slice(0, 2).join(' | ') : 'נקי') : 'לא רונדר') : 'לא נטען' });

  /* 6 · המסך הראשון בהתקנה טרייה — נושא תוכן ⛔ ואינו שלד */
  /*  ⛔ הריצה כאן היא **התקנה טרייה** — ⚠️ האחסון נוקה, ⭐ והלקוח מחזיר
   *  אפס שורות: ⛔ ולכן מסך שדורש זריעה ידנית נופל כאן ⚠️ ובו בלבד. */
  const fresh = await ev(`(function () {
    var e = document.querySelector('${APP.fresh.sel}');
    if (!e) return 'אין אלמנט';
    var s = (e.value !== undefined && e.value !== null && e.value !== '' ? e.value
             : (e.textContent || '')).trim();
    return s ? 'תוכן=' + s.slice(0, 40) : 'ריק';
  })()`);
  out.push({ k: 'fresh', ok: /^תוכן=/.test(String(fresh)), info: String(fresh) });

  /* 3 · `Enter` בשדה עריכה — שומר */
  /*  ⛔ הנמדד הוא **`preventDefault`** — ⚠️ זה בדיוק חוזה המודול: המקש
   *  נתפס, הפעולה שבמפה רצה, ⭐ ורק אז ברירת המחדל מבוטלת. ⛔ ואין
   *  למדוד כאן השבתה — ⚠️ המסלול קורא לפעולה **ישירות** ולא דרך הניתוב,
   *  ⭐ ולכן הכפתור אינו נכנס לשומר: ⛔ «לא נדלק» היה נקרא «לא שמר». */
  /*  ⛔ טופס שאינו על המסך הראשון נפתח לפני המדידה — ⚠️ **הפותח מוצהר
   *  ב-`APP.ksaveOpen`**, ⭐ וריק הוא «נמדד ואין»: ⛔ אפליקציה שהטופס
   *  היחיד שלה נפתח בלחיצה אינה אפליקציה בלי טופס, ⚠️ ומדידה על המסך
   *  הראשון בלבד הייתה מדווחת «אין היקף» על מנגנון חי. */
  /*  ⛔ ההמתנה היא על **תנאי** ⛔ ולא על שעון — ⚠️ הפותח נקרא בכל
   *  סיבוב, ⭐ והתנאי הוא שההיקף נמצא ב-DOM: ⛔ מסלול שנפתח בשני
   *  שלבים — לחיצה, ואז הכרעת דיאלוג — מגיע לשם בסיבוב השני. */
  if (APP.ksaveOpen) {
    await waitFor(async () => {
      await ev(APP.ksaveOpen);
      return (await ev(`!!document.querySelector('${APP.ksaveSel}')`)) === true;
    }, 6000);
  }
  const ent = await ev(`(function () {
    var f = document.querySelector('${APP.ksaveSel}');
    if (!f) return 'אין היקף';
    var i = f.querySelector('input'); if (!i) return 'אין שדה';
    var b = f.querySelector('[data-ksave]'); if (!b) return 'אין כפתור שמירה';
    f.querySelectorAll('input').forEach(function (x) {
      if (x.type === 'checkbox' || x.type === 'radio') return;
      x.value = x.type === 'number' ? '1' : 'בדיקה';
      x.dispatchEvent(new Event('input', { bubbles: true }));
    });
    i.focus();
    var e1 = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    i.dispatchEvent(e1);
    /*  ⛔ והצד השני — ⚠️ מקש שאינו \`Enter\` אינו נתפס: ⭐ בלעדיו
     *  «נתפס תמיד» היה עובר כ«נתפס נכון». */
    var e2 = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    i.dispatchEvent(e2);
    return 'enter=' + e1.defaultPrevented + ' other=' + e2.defaultPrevented;
  })()`);
  out.push({ k: 'enter', ok: String(ent) === 'enter=true other=false', info: String(ent) });

  /* 2 · לחיצה על כפתור כתיבה — `busy` נדלק וכבה */
  /*  ⛔ הנמדד הוא **נקודת הניתוב** ⛔ ולא מסך מסוים — ⚠️ `actRun` מקבל
   *  מטפל שמחזיר הבטחה, ⭐ והשומר מנטרל את הכפתור עד שהסתיימה: ⛔ מדידה
   *  על כפתור אמיתי תלויה במסך שנפתח, ⚠️ ובאפליקציה שהכתיבה בה מקומית
   *  אין הבטחה כלל — ⭐ ואז «לא נדלק» מודד את המסך ⛔ ולא את השומר. */
  const busy = await ev(`(function () {
    if (typeof actRun !== 'function') return 'אין נקודת ניתוב';
    var b = document.createElement('button');
    b.setAttribute('data-act', '__behavior_probe');
    document.body.appendChild(b);
    var seen = [];
    var mo = new MutationObserver(function () { seen.push(b.disabled === true); });
    mo.observe(b, { attributes: true, attributeFilter: ['disabled'] });
    actRun(b, function () { return new Promise(function (r) { setTimeout(r, 120); }); });
    return new Promise(function (r) { setTimeout(function () {
      mo.disconnect(); b.remove(); r(seen.join(',')); }, 420); });
  })()`);
  /*  ⛔ שני הכיוונים — ⚠️ נדלק **וכבה**: ⭐ כפתור שנשאר מושבת הוא מסלול
   *  שלא הסתיים, ⛔ וכפתור שלא נדלק אינו מוגן מלחיצה שנייה. */
  out.push({ k: 'busy', ok: String(busy) === 'true,false', info: String(busy) });

  /* 4 · `Escape` — מבטל ואינו סוגר את המודאל */
  const esc = await ev(`(function () {
    var m = document.getElementById('modal');
    if (!m) return 'אין מיכל';
    var parentBefore = m.parentElement && m.parentElement.tagName;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    var after = document.getElementById('modal');
    return (after ? 'קיים' : 'נעלם') + ' הורה=' +
           (after && after.parentElement ? after.parentElement.tagName : '-') +
           ' לפני=' + parentBefore;
  })()`);
  out.push({ k: 'escape', ok: /^קיים הורה=BODY/.test(String(esc)), info: String(esc) });

  /* 5 · המצב הכהה — הטוסט קריא */
  const shades = [];
  for (const mode of ['light', 'dark']) {
    await D.send('Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: mode }] }, D.S);
    for (const kind of ['bad', 'good']) {
      const pair = await ev(`(function () {
        var box = document.getElementById('toasts'); if (!box) return null;
        var d = document.createElement('div'); d.className = 'toast ${kind}';
        d.textContent = 'א'; box.appendChild(d);
        var c = getComputedStyle(d);
        var bg = c.backgroundColor, fg = c.color; d.remove();
        return bg + '@' + fg;
      })()`);
      if (!pair) { shades.push({ mode, kind, r: 0, txt: 'אין מיכל' }); continue; }
      const [bg, fg] = String(pair).split('@');
      const a = rgbOf(bg), b = rgbOf(fg);
      shades.push({ mode, kind, r: a && b ? ratio(a, b) : 0, txt: pair });
    }
  }
  await D.send('Emulation.setEmulatedMedia', { features: [] }, D.S);
  const worst = shades.reduce((m, s) => (s.r < m.r ? s : m), shades[0] || { r: 0 });
  out.push({ k: 'contrast', ok: shades.length === 4 && shades.every((s) => s.r >= 4.5),
             info: shades.map((s) => `${s.mode}/${s.kind} ${s.r.toFixed(2)}`).join(' · ') });
  return out;
}

/*  ⛔ הדפדפן עולה פעם אחת, ⛔ וכל מוטציה היא **טעינה מחדש** — ⚠️ הפעלה
 *  לכל מוטציה הייתה חוצה את תקציב הזמן, ⭐ וטעינה היא מאות מילישניות. */
const SRC = rd('index.html');
/*  ⛔ גיליון הסגנון — ⚠️ הוא המקור היחיד שבו `touch-action` נקבע,
 *  ⭐ והוא קובץ נפרד מהמסמך. */
const SHEET = rd('app.css');

/*  ⛔ מרשם המוטציות — ⚠️ **מה נכנס**: שם המסלול שייפול · והעריכה;
 *  ⛔ **ומה מפיל**: מוטציה שהפילה מסלול אחר, או שלא הפילה כלל.
 *  ⭐ **ולמה המבנה קיים**: מסלול בלי מוטציה נשחק בשקט, ⛔ והשער
 *  ממשיך לדווח «עבר» על מה שכבר אינו נמדד. */

/*  ⛔ העריכה נתלית ב-`</body>` **האחרון** — ⚠️ הנימוק המדוד: בונה הדוח
 *  נושא `'</body></html>'` בתוך מחרוזת, ⭐ וההחלפה הראשונה נכנסה לתוכה:
 *  ⛔ המוטציה לא הגיעה למסמך כלל, ⚠️ והשער דיווח «לא הפיל». */
const atEnd = (s, add) => { const i = s.lastIndexOf('</body>');
                            return i < 0 ? s : s.slice(0, i) + add + s.slice(i); };

const MUT = [
  { m: 'מ1', k: 'load', lbl: 'שגיאת קונסולה בעלייה',
    edit: (s) => atEnd(s, '<script>window.__boom.nope();</script>') },
  { m: 'מ2', k: 'busy', lbl: 'ההשבתה אינה נדלקת',
    edit: (s) => s.replace('btn.disabled = true;', 'btn.disabled = false;') },
  /*  ⛔ גם שער הכניסה של המטפל מומר — ⚠️ אפליקציה שההיקף שלה נושא גם
   *  `data-kesc` הייתה מפעילה את מסלול הביטול על `Enter`, ⭐ ומבטלת את
   *  ברירת המחדל בכל זאת: ⛔ והמוטציה הייתה «עוברת» בלי לשבור דבר. */
  { m: 'מ3', k: 'enter', lbl: '`Enter` אינו מנותב',
    edit: (s) => s.replace(/!== 'Enter'/g, "!== 'EnterZ'")
                  .replace(/key === 'Enter'/g, "key === 'EnterZ'")
                  .replace(/=== 'Enter'/g, "=== 'EnterZ'") },
  { m: 'מ4', k: 'escape', lbl: '`Escape` מוחק את מיכל המודאל',
    edit: (s) => atEnd(s, "<script>document.addEventListener('keydown',function(e){" +
      "if(e.key==='Escape'){var m=document.getElementById('modal');if(m)m.remove();}});</script>") },
  { m: 'מ5', k: 'contrast', lbl: 'הטוסט נצבע בצמד שאינו עומד ביחס',
    edit: (s) => atEnd(s, '<style>.toast{background:#8a8a8a !important;' +
      'color:#909090 !important}</style>') },
  /*  ⛔ המוטציה מרוקנת את תוכן המסך הראשון ⛔ ואינה מסירה את האלמנט —
   *  ⚠️ האלמנט נושא גם `data-ksave` בחלק מהאפליקציות, ⭐ והסרתו הייתה
   *  מפילה את מסלול ה-`Enter` יחד איתו: ⛔ ואז המוטציה מודדת שני מסלולים. */
  { m: 'מ6', k: 'fresh', lbl: 'המסך הראשון נפתח ריק',
    edit: (s) => atEnd(s, "<script>setInterval(function(){var e=document.querySelector('" +
      APP.fresh.sel + "');if(e){if(e.value!==undefined&&e.value!==null)e.value='';" +
      "if(e.textContent)e.textContent='';}},10);</script>") },
];

/*  ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות ⛔ אינו מפיל — ⚠️ הנמדד הוא
 *  **ההתנהגות** ⛔ ולא השם שהקוד נושא. */
const ANTI = { m: 'נ1', lbl: 'שם מקומי שהוחלף בעקביות',
               edit: (s) => s.split('_busyTxt').join('_busyKeep') };

async function main() {
  /* ── הגרירה — הצד הטקסטואלי ──────────────────────────────────────────── */
  {
    const g = dragApiGaps(SRC);
    t(g.length === 0, `[drag-api] אפס אירוע גרירת HTML5 ואפס מאפיין ` +
      `\`draggable\` — נמדדו ${g.length} אתרים והצפוי אפס` +
      (g.length ? ` (${g.slice(0, 3).join(' · ')})` : '') +
      '. ממירים אותם ל-`pointerdown`/`pointermove`/`pointerup`');
    const h = gripGaps(SHEET, APP.dragHandles);
    t(h.length === 0, `[drag-grip] \`touch-action:none\` על הידית בלבד — ` +
      `${APP.dragHandles.length} ידיות מוכרזות, נמדדו ${h.length} פערים והצפוי אפס` +
      (h.length ? ` (${h.join(' · ')})` : '') +
      '. מציבים את הביטול על הידית, או מכריזים אותה עם נימוקה');
  }
  if (!fs.existsSync(CHROME)) {
    t(false, `מסלולי ההתנהגות: אין דפדפן בנתיב המוצהר — נמדד «${CHROME}» ולא ` +
             'קיים והצפוי בינארי. מתקינים את הדפדפן, או מצהירים נתיב ' +
             'ב-`BEHAVIOR_CHROME` — ⛔ ואין מדלגים בשתיקה');
    return;
  }
  const { s, port } = await serve();
  /*  ⛔ כותב על עותק — פרופיל הדפדפן חייב תיקייה שלו, ⚠️ והיא נוצרת
   *  ב-`tmpdir` **מחוץ לעץ** ⛔ ונמחקת בסוף: ⭐ אין דרך להריץ דפדפן
   *  בלי פרופיל, ⛔ ופרופיל משותף היה נושא מצב מהרצה קודמת. */
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), APP.app + '-beh-'));
  let br = null;
  try {
    br = await launch(profile);
    const D = await connect(br.ws);
    const { result: { targetId } } = await D.send('Target.createTarget', { url: 'about:blank' });
    const { result: { sessionId } } = await D.send('Target.attachToTarget', { targetId, flatten: true });
    D.S = sessionId;
    await D.send('Runtime.enable', {}, D.S);
    await D.send('Page.enable', {}, D.S);
    await D.send('Log.enable', {}, D.S);
    await D.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, D.S);
    D.on(async (m) => {
      if (m.method !== 'Fetch.requestPaused') return;
      const u = m.params.request.url;
      const H = [{ name: 'Access-Control-Allow-Origin', value: '*' }];
      const ff = (ct, b) => D.send('Fetch.fulfillRequest',
        { requestId: m.params.requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: ct }, ...H],
          body: Buffer.from(b).toString('base64') }, D.S).catch(() => {});
      if (/^http:\/\/127\.0\.0\.1/.test(u))
        return void D.send('Fetch.continueRequest', { requestId: m.params.requestId }, D.S).catch(() => {});
      if (/\.css|fonts\.googleapis/.test(u)) return void ff('text/css', '');
      if (/fonts\.gstatic|\.woff|\.ttf/.test(u)) return void ff('font/woff2', '');
      if (/\.js(\?|$)|cdn\.|cdnjs|unpkg/.test(u)) return void ff('text/javascript', SB_STUB);
      return void ff('application/json', '[]');
    });

    /* ── קו הבסיס — חמשת המסלולים על המקור עצמו ────────────────────────── */
    SERVED = SRC;
    const base = await paths(D, port);
    for (const r of base)
      t(r.ok, `מסלול «${r.k}» — ${r.info}`);

/*  ⛔ מבחן הקבלה הפר-אפליקציתי — ⚠️ הוא שתופס את מה שחי באפליקציה אחת:
     *  ⭐ שער תופס סחף **בין** אפליקציות, ⛔ ולוגיקה שחיה באחת אין ממה לסטות. */
    {
      const A = APP.accept;
      if (!A.cases.length) {
        t(!!A.why, `[accept] אפס מקרי קבלה — ${A.why || '⛔ בלי נימוק'}`);
      } else {
        SERVED = withBridge(SRC, A.expose);
        const gaps = await acceptGaps(D, port, A);
        t(gaps.length === 0, `[accept] ${A.cases.length} מקרי קבלה נמדדו בדפדפן, ` +
          `${gaps.length} נבדלים` + (gaps.length
            ? ' — ' + gaps.join(' · ') +
              '. מיישרים את הנוסחה בקוד האפליקציה, ⛔ ולא את המספר שנמסר' : ''));
        SERVED = SRC;
      }
    }


    /*  ⛔ הגרירה בדפדפן — ⚠️ בעכבר ובמגע, ⭐ והאירועים מגיעים
     *  מהדפדפן ⛔ ולא נבנים במבחן. */
    {
      const A = APP.drag;
      if (!A) {
        t(!!APP.dragWhy, `[drag] אפס מסלולי גרירה — ${APP.dragWhy || '⛔ בלי נימוק'}`);
      } else {
        const gaps = await dragGaps(D, port, A, withBridge(SRC, A.expose));
        t(gaps.length === 0, `[drag] הגרירה נמדדה בדפדפן בעכבר ובמגע — ` +
          `${gaps.length} נבדלים והצפוי אפס` +
          (gaps.length ? ' — ' + gaps.join(' · ') +
            '. מתקנים את מסלול הגרירה, ⛔ ולא את המבחן' : ''));
      }
    }

    mutStage();
    if (RUN_MUT) {
      /* ── הגרירה — ארבע מוטציות ומוטציית-נגד ──────────────────────────── */
      {
        const m1 = dragApiGaps(SRC.replace('<body', '<div draggable="true"></div><body'));
        t(m1.length > 0, `מ6 · ⛔ מוטציה: \`draggable="true"\` מפיל את «[drag-api]» — ` +
          `נמדדו ${m1.length} אתרים והצפוי לפחות אחד`);
        const m2 = dragApiGaps(SRC.replace('<body',
          "<script>document.addEventListener('dragstart', function () {});</script><body"));
        t(m2.length > 0, `מ7 · ⛔ מוטציה: מאזין \`dragstart\` מפיל את «[drag-api]» — ` +
          `נמדדו ${m2.length} אתרים והצפוי לפחות אחד`);
        const m3 = gripGaps(SHEET + '\n.zz-row{touch-action:none}\n', APP.dragHandles);
        t(m3.length > 0, `מ8 · ⛔ מוטציה: \`touch-action:none\` על שורה שלמה מפיל ` +
          `את «[drag-grip]» — נמדדו ${m3.length} פערים והצפוי לפחות אחד`);
        /*  ⛔ הרביעית שוברת את גזירת הסדר מה-DOM — ⚠️ והיא רצה בדפדפן:
         *  ⭐ זה הצד שאין לו ביטוי על המקור. */
        if (APP.drag) {
          const bent = withBridge(SRC.replace(APP.drag.mut[0], APP.drag.mut[1]), APP.drag.expose);
          const g4 = bent === withBridge(SRC, APP.drag.expose) ? ['העריכה לא מצאה אתר']
            : await dragGaps(D, port, APP.drag, bent);
          t(g4.length > 0, `מ9 · ⛔ מוטציה: סדר שנגזר מצמד ולא מה-DOM מפיל ` +
            `את «[drag]» — נמדדו ${g4.length} נבדלים והצפוי לפחות אחד`);
        } else {
          t(!!APP.dragWhy, `מ9 · ⛔ אין מסלול גרירה למוטט — ${APP.dragWhy || '⛔ בלי נימוק'}`);
        }
        /*  ⭐ מוטציית-נגד: `pointerdown` על ידית ⛔ אינו מפיל —
         *  הוא המנגנון עצמו, ⚠️ ושער שהיה נופל עליו אוסר את מה שהוא דורש. */
        const n2 = dragApiGaps(SRC.replace('<body',
          "<script>document.addEventListener('pointerdown', function () {});</script><body"));
        t(n2.length === 0, `נ2 · ⭐ מוטציית-נגד: מאזין \`pointerdown\` ⛔ אינו מפיל ` +
          `את «[drag-api]» — נמדדו ${n2.length} אתרים והצפוי אפס`);
      }

      /* ── כל מוטציה מפילה את המסלול שלה, ⛔ ואותו בלבד ─────────────────── */
      for (const r of MUT) {
        const body = r.edit(SRC);
        if (body === SRC) { t(false, `${r.m} · ${r.lbl} — ⛔ העריכה לא מצאה אתר במקור`); continue; }
        SERVED = body;
        const res = await paths(D, port);
        const mine = res.find((x) => x.k === r.k);
        const others = res.filter((x) => x.k !== r.k && x.k !== 'load');
        t(mine && !mine.ok, `${r.m} · מוטציה: ${r.lbl} **מפילה** את «${r.k}» — ${mine ? mine.info : '?'}`);
        t(r.k === 'load' || (others.length > 0 && others.every((x) => x.ok)),
          `${r.m} · ⛔ ואינו מפיל מסלול אחר — ${others.filter((x) => !x.ok).map((x) => x.k).join(',') || 'אפס'}`);
      }
      /* ⭐ מוטציית-נגד — ⛔ אסור לה להפיל */
      SERVED = ANTI.edit(SRC);
      const anti = await paths(D, port);
      t(anti.length > 0 && anti.every((x) => x.ok),
        `${ANTI.m} · מוטציית-נגד: ${ANTI.lbl} — ⛔ אינו מפיל: ${anti.filter((x) => !x.ok).map((x) => x.k).join(',') || 'אפס'}`);
    }
    try { D.sock.close(); } catch (e) {}
  } finally {
    if (br) try { br.proc.kill(); } catch (e) {}
    s.close();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  }
}

await main();

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
