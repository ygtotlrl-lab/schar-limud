#!/usr/bin/env node
/*  test_origin.mjs — מה שכל האפליקציות חולקות ב-origin אחד: האחסון המקומי.
 *
 *  **מה נאכף:** מכסת האחסון היא המספר שנמדד בכרומיום, ⛔ והספים נגזרים
 *  ממנה באחוזים · ⚠️ `LS_APPS` מוצלבת מול כל הריפו האחיות · ⛔ כל טבלת
 *  מראה בפינוי, או מוצהרת קבועה בגודלה עם נימוקה · ⭐ רשומת בן יורדת עם
 *  אביה, ברתמה שמריצה את המודול · ⚠️ `wholeKeys` אינה מחזיקה מראה שהמסך
 *  צריך · ⛔ ושמות הרשימות לפי תפקיד, בלי «tier» ובלי «שלב א/ב» ·
 *  ⚠️ חלון הפינוי נגזר מסוג האפליקציה, ⛔ ואין מספר ימים באף רשומה ·
 *  ⭐ כל טבלת מראה בדיוק באחת משלוש — בפינוי, נדרשת במלואה, או קבועה ·
 *  ⛔ וכל חישוב שקורא טבלה שגדלה רץ בארגז לפני פינוי מלא ואחריו, ⚠️ והתוצאות זהות.
 *
 *  **הנימוק המדוד:** המד הראה יותר ממאה אחוז מהמכסה ⛔ בזמן שהאפליקציות
 *  עדיין כתבו; ⭐ טבלת הסימונים תפסה את רוב האחסון ⛔ ולא הייתה בפינוי;
 *  ⚠️ ומפתחות `k_` נספרו כ«אחר», ⛔ שהקופה נולדה אחרי הרשימה.
 *
 *  **מה יישבר בלעדיו:** ⛔ טבלה אחת שגדלה ממלאת את האחסון **המשותף** —
 *  ⚠️ וחונקת את כל האפליקציות, ⭐ לא רק את עצמה: ⛔ והמד שאמור להתריע
 *  מתריע על מצב שאינו קיים.
 *
 *  **מה אינו נאכף כאן:** ⛔ דפדפן אחר עם מכסה אחרת — ⚠️ המספר נמדד
 *  בכרומיום בלבד · ⭐ וטבלה «קבועה» שבכל זאת גדלה — ⛔ ההצהרה נמדדת,
 *  ⚠️ והגודל בפועל אינו נמדד בשער · ⛔ חישוב שאינו נראה כסיכום —
 *  ⚠️ הסורק מחפש `reduce` · `sum` · `+=` מספרי, ⭐ ומה שנשען על ספירה או
 *  על סדר נמדד רק כשהוא מוצהר בארגז · ⛔ ושנת לימודים קודמת — ⚠️ היא יוצאת
 *  מהחלון במהלך השנה, ⭐ ונקראת מהענן כשיש רשת.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { appSrc } from './appsrc.mjs';
import { PEERS } from './peers.mjs';
import { appFacts, FACTS } from './app-facts.mjs';
import { whitenJs } from './whiten.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⭐ המרשמים שמחזיקים את טבלאות המראה — ⛔ **אינו נגזר**: ⚠️ `MIRROR_CFG.tables`
   *  היא פונקציה שאינה נקראת בלי הרצת הדף, ⭐ וכל אפליקציה מחזיקה את הרשימה במרשם בשם אחר */
  mirrorList: ['PUSH_TABLES', 'SL_USERS_TABLE'],
  /*  ⭐ ארגז החישובים — ⚠️ **מה נכנס**: החישובים שקוראים טבלה שגדלה, נתוני
   *  דוגמה שחוצים את החלון, והטעינה מהדיסק; ⛔ **ומה מפיל**: חישוב שהשתנה
   *  אחרי פינוי מלא. ⭐ **ולמה כאן**: כל אפליקציה קוראת את הדיסק בדרך משלה,
   *  ⛔ והשמות אינם נגזרים מהעץ. */
  evictCalc: {
    seeds: ['calcDistribution', 'renderScAnnual', 'mirrorLoad', 'slApplyMirror', 'acadYearOf', 'todayStr', 'SC_STUDENT_ID'],
    /*  ⛔ הקוראים — ⚠️ פונקציה שנוקבת באחד מהם ומסכמת נמדדת, ⭐ או נכשלת. */
    readers: ['TRANSACTIONS'],
    seed: `(function () {
  var DAY = 86400000, now = Date.now(), iso = function (t) { return new Date(t).toISOString().slice(0, 10); };
  var row = function (id, d, o) { o.client_id = id; o.updated_at = now - d * DAY; o.deleted = false; return o; };
  var txns = [row('t0b', 0, { student_client_id: 's1', amount: 120, date: iso(now), method: 'מזומן' })];
  for (var d = 800; d >= 0; d -= 20) txns.push(row('t' + d, d, { student_client_id: 's1', amount: 450 + (d % 90), date: iso(now - d * DAY), method: 'מזומן' }));
  localStorage.setItem('sl_mirror_students', JSON.stringify([row('s1', 900, { name: 'א', card_settings: { monthly_tuition: 500 } })]));
  localStorage.setItem('sl_mirror_transactions', JSON.stringify(txns));
  localStorage.setItem('sl_mirror_settings', JSON.stringify([{ key: 'default_tuition', value: '500', updated_at: now - 900 * DAY }]));
})();`,
    load: "mirrorLoad(); slApplyMirror(); SC_STUDENT_ID = 's1'; SC_YEAR = acadYearOf(todayStr());",
    calls: {
      /*  ⚠️ שנת הלימודים הנוכחית — ⭐ היא תמיד בתוך החלון: ⛔ שנה קודמת
       *  נקראת מהענן כשיש רשת. */
      calcDistribution: "calcDistribution('s1', SC_YEAR)",
      renderScAnnual: "(renderScAnnual(), ['sc-annual-tbody', 'sc-annual-tfoot', 'sc-credit', 'sc-txn-list'].map(function (id) { return document.getElementById(id).innerHTML; }))",
    },
  },
  /*  ⛔ מוטציות פרטיות לאפליקציה — ⚠️ **מה נכנס**: `[מחט, תחליף, טענה,
   *  הודעה]`; ⛔ **ומה מפיל**: מוטציה שאינה מפילה את הטענה שהיא נוקבת בה.
   *  ⭐ **ולמה היא קיימת**: ההגדרות נכתבות מקומית-תחילה, ⛔ ופינויין כמפתח שלם חייב ליפול. */
  mutations: [
    ['function slTs(r) {', 'function slTs(r) { return 1;',
     '[evict-calc-stable]', 'חותמת שמגיעה לכל תנועה מפנה את השנה הנוכחית'],
    ["  wholeKeys: [],", "  wholeKeys: [{ key: mirrorKey(KV_TABLE), syncedThrough: function () { return 0; } }],",
     '[mirror-screen-whole]', 'ההגדרות חזרו לפינוי כמפתח שלם'],
  ],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [99, 124];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ הן רצות ברמה המלאה (`--full`), ⭐ בסוף
 *  הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⭐ המכסה שנמדדה בכרומיום — ⚠️ כתיבה עד `QuotaExceededError` ב-origin
 *  בדיקה, ⛔ במדידת `lsEntryBytes` (תווים × 2): ⭐ זו העובדה שהקוד נמדד מולה,
 *  ⛔ ולא ערך שהקוד מצהיר. */
const MEASURED_QUOTA = 10485756;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = join(ROOT, '..');
const SRC = appSrc(ROOT);

let failed = 0;
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 19, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok = (m) => (RAN++, console.log('  ok   ' + m));
const bad = (m) => { RAN++; failed++; console.error('  FAIL ' + m); };
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/* ── חילוץ ─────────────────────────────────────────────────────────────── */
const START = '/* ═══ עמידות אחסון מקומי — מודול משותף';
const END = '/* ═══════════════ סוף המודול המשותף';
function storageBlock(src) {
  const a = src.indexOf(START);
  if (a < 0) return '';
  const b = src.indexOf(END, a);
  return b < 0 ? '' : src.slice(a, src.indexOf('\n', b));
}
/*  ⛔ הסוגר נסגר בהתאמה ⛔ ולא בחלון תווים — ⚠️ מחרוזת עם סוגר אינה סוגר. */
function matchClose(s, i, open, close) {
  let d = 0, q = '';
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === open) d++;
    else if (c === close) { d--; if (!d) return j; }
  }
  return -1;
}
function objectAfter(src, head) {
  const i = src.indexOf(head);
  if (i < 0) return '';
  const o = src.indexOf('{', i);
  const e = matchClose(src, o, '{', '}');
  return e < 0 ? '' : src.slice(o, e + 1);
}
/*  ⚠️ המדיניות היא `LS_CFG` **וגם** `lsRebuildPolicy()` — ⭐ ביומן היא
 *  נבנית בזמן ריצה, ⛔ והמפתחות נושאים סיומת מוסד. */
const policyText = (src) => objectAfter(src, 'var LS_CFG = {') + objectAfter(src, 'function lsRebuildPolicy(');
function arraysNamed(text, name) {
  const out = [];
  const re = new RegExp('\\b' + name + '\\s*[:=]\\s*\\[', 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    const o = m.index + m[0].length - 1;
    const e = matchClose(text, o, '[', ']');
    if (e > o) out.push(text.slice(o + 1, e));
  }
  return out;
}
/*  ⛔ שם קבוע נפתר לערכו — ⚠️ `KV_TABLE` הוא שם הטבלה, ⭐ ולא הטבלה. */
function resolveName(src, tok) {
  const t = tok.trim();
  const q = /^'([^']*)'$/.exec(t);
  if (q) return q[1];
  const v = new RegExp('\\bvar\\s+' + t + "\\s*=\\s*'([^']*)'").exec(src);
  return v ? v[1] : null;
}
/*  ⭐ מפתח אחסון ⟵ שם הטבלה: `mirrorKey('x')` · `mirrorKey(IDENT)` · `'x' + LS` · `'x'`. */
function keyTable(src, keyExpr) {
  const e = keyExpr.trim();
  const mk = /^mirrorKey\(\s*([^)]+?)\s*\)$/.exec(e);
  if (mk) return resolveName(src, mk[1]);
  const suf = /^'([^']+)'\s*\+\s*\w+$/.exec(e);
  if (suf) return suf[1];
  return resolveName(src, e);
}
function specKeys(src, body) {
  const out = [];
  for (const m of body.matchAll(/\bkey\s*:\s*((?:mirrorKey\([^)]*\))|(?:'[^']*'(?:\s*\+\s*\w+)?)|\w+)/g)) {
    out.push(keyTable(src, m[1]));
  }
  return out;
}
function mirrorTables(src) {
  const out = [];
  for (const name of APP.mirrorList) {
    const arrs = arraysNamed(src, name);
    if (arrs.length) {
      /*  ⚠️ רשימת אובייקטים נושאת את הטבלה ב-`t:` בלבד — ⛔ ושאר מחרוזותיה הן עמודות. */
      const re = arrs[0].includes('{') ? /\bt\s*:\s*('[^']*'|\w+)/g
        : /('[^']*')|\b([A-Z][A-Z0-9_]+)\b/g;
      for (const m of arrs[0].matchAll(re)) {
        const tok = m[1] || m[2];
        const v = resolveName(src, tok);
        if (v && !out.includes(v)) out.push(v);
      }
    } else {
      const v = resolveName(src, name);
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out;
}
function fixedDecl(src, pol) {
  const out = [];
  for (const body of arraysNamed(pol, 'fixedSize')) {
    for (const m of body.matchAll(/\{\s*t\s*:\s*('[^']*'|\w+)\s*,\s*why\s*:\s*'([^']*)'\s*\}/g)) {
      out.push({ t: resolveName(src, m[1]), why: m[2] });
    }
  }
  return out;
}

/* ── הטענות ────────────────────────────────────────────────────────────── */
/*  ⛔ [ls-quota-derived] — כל סף בבתים נגזר מהמכסה. */
function quotaDerivedGaps(src) {
  const blk = storageBlock(src);
  const out = [];
  for (const m of blk.matchAll(/\bvar\s+(LS_\w+_BYTES)\s*=\s*([^;\n]+)/g)) {
    if (m[1] === 'LS_QUOTA_BYTES') continue;
    if (!/\bLS_QUOTA_BYTES\b/.test(m[2])) out.push(m[1]);
  }
  for (const m of blk.matchAll(/\bvar\s+(LS_\w+_PCT|LS_SWEEP_TO)\s*=\s*([\d.]+)/g)) {
    const v = Number(m[2]);
    if (!(v > 0 && v <= 1)) out.push(m[1]);
  }
  return out;
}
/*  ⛔ [ls-quota-measured] — המכסה היא המספר שנמדד, ⚠️ ולא פחות ממנו: ⭐ מד
 *  שמחלק במכסה קטנה מדווח יותר ממאה אחוז בזמן שהכתיבה מצליחה. */
function quotaValue(src) {
  const m = /\bvar\s+LS_QUOTA_BYTES\s*=\s*([^;\n]+)/.exec(storageBlock(src));
  if (!m || !/^[\d\s*+]+$/.test(m[1].trim())) return NaN;
  return Function('return (' + m[1] + ');')();
}
const quotaOk = (q) => q >= MEASURED_QUOTA && q <= MEASURED_QUOTA * 1.01;
/*  ⛔ [ls-apps-peers] — כל אחות על הדיסק ברשימה, ⚠️ וכל ערך ברשימה אחות. */
function lsApps(src) {
  const arr = arraysNamed(storageBlock(src), 'LS_APPS')[0] || '';
  return [...arr.matchAll(/\{\s*id\s*:\s*'([^']*)'\s*,\s*name\s*:\s*'([^']*)'\s*,\s*pre\s*:\s*\[([^\]]*)\]\s*\}/g)]
    .map((m) => ({ id: m[1], name: m[2], pre: [...m[3].matchAll(/'([^']*)'/g)].map((x) => x[1]) }));
}
function peerFacts() {
  const out = [], missing = [];
  for (const slug of PEERS) {
    const root = slug === FACTS.slug ? ROOT : join(SIBS, slug);
    const per = join(root, 'tools', 'test_period.mjs');
    if (!existsSync(per) || !existsSync(join(root, 'manifest.json'))) { missing.push(slug); continue; }
    const pre = (/tablePrefix:\s*'([^']+)'/.exec(readFileSync(per, 'utf8')) || [])[1];
    out.push({ slug, pre, name: appFacts(root).title });
  }
  return { peers: out, missing };
}
/*  ⚠️ אחות שאינה על הדיסק אינה נמדדת — ⛔ ערך שאינו תואם אחות נמדדת נספר
 *  בלי ריפו רק כשאין אחות חסרה שהוא יכול להיות שלה. */
function appsGaps(apps, peers, missing = 0) {
  const out = [];
  for (const p of peers) {
    const hit = apps.find((a) => a.pre.includes(p.pre));
    if (!hit) out.push(`${p.slug}: התחילית ${p.pre} אינה ב-LS_APPS`);
    else if (hit.name !== p.name) out.push(`${p.slug}: השם «${hit.name}» ולא «${p.name}»`);
  }
  const orphan = apps.filter((a) => !peers.some((p) => a.pre.includes(p.pre)));
  if (orphan.length > missing) for (const a of orphan) out.push(`${a.id}: ערך בלי ריפו`);
  return out;
}
function fullDecl(src, pol) {
  const out = [];
  for (const body of arraysNamed(pol, 'fullHistory')) {
    for (const m of body.matchAll(/\{\s*t\s*:\s*('[^']*'|\w+)\s*,\s*calc\s*:\s*'([^']*)'\s*\}/g)) {
      out.push({ t: resolveName(src, m[1]), calc: m[2] });
    }
  }
  return out;
}
/*  ⛔ [mirror-evict] — כל טבלת מראה בדיוק באחת משלוש: ⚠️ בפינוי · נדרשת
 *  במלואה · או קבועה בגודלה; ⛔ והצהרה בלי טבלה, או בלי נימוק, מפילה אף היא. */
function evictGaps(src) {
  const pol = policyText(src);
  const tables = mirrorTables(src);
  const evict = new Set();
  for (const b of arraysNamed(pol, 'oldRecords')) for (const t of specKeys(src, b)) evict.add(t);
  const fixed = fixedDecl(src, pol);
  const full = fullDecl(src, pol);
  const out = [];
  if (!tables.length) out.push('אין טבלאות מראה במרשם המוצהר');
  for (const t of tables) {
    const n = (evict.has(t) ? 1 : 0) + fixed.filter((f) => f.t === t).length + full.filter((f) => f.t === t).length;
    if (n === 0) out.push(`${t}: אינה בפינוי, אינה נדרשת במלואה ואינה קבועה`);
    else if (n > 1) out.push(`${t}: ב-${n} קטגוריות והצפוי אחת`);
  }
  for (const f of fixed) {
    if (!tables.includes(f.t)) out.push(`${f.t}: הצהרה בלי טבלת מראה`);
    if (f.why.length < 12) out.push(`${f.t}: הצהרה בלי נימוק`);
  }
  for (const f of full) if (!tables.includes(f.t)) out.push(`${f.t}: הצהרת היסטוריה מלאה בלי טבלת מראה`);
  return out;
}
/*  ⛔ [full-history-calc] — טבלה שנדרשת במלואה נוקבת בחישוב שנשען עליה,
 *  ⚠️ והחישוב מוגדר במקור: ⭐ שם שאינו פונקציה הוא נימוק שאין מאחוריו דבר. */
const defines = (src, n) => new RegExp('(?:\\bfunction\\s+' + n + '\\s*\\(|\\b(?:var|let|const)\\s+' + n +
  '\\s*=\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|\\w+\\s*=>)|\\bwindow\\.' + n + '\\s*=\\s*(?:async\\s+)?function\\b)').test(src);
function calcGaps(src) {
  return fullDecl(src, policyText(src)).filter((f) => !/^[A-Za-z_$][\w$]*$/.test(f.calc) || !defines(src, f.calc))
    .map((f) => `${f.t}: החישוב «${f.calc}» אינו מוגדר`);
}
/* ── חלון הפינוי — נגזר מסוג האפליקציה ─────────────────────────────────── */
function appTypes(src) {
  const m = /\bvar\s+LS_APP_TYPES\s*=\s*\{([^}]*)\}/.exec(storageBlock(src));
  const out = {};
  if (m) for (const e of m[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) out[e[1]] = Number(e[2]);
  return out;
}
function appTypeDecl(src) {
  const m = /\bappType\s*:\s*\{\s*type\s*:\s*'([^']*)'\s*,\s*why\s*:\s*'([^']*)'\s*\}/.exec(policyText(src));
  return m ? { type: m[1], why: m[2] } : null;
}
/*  ⛔ [ls-window-derived] — אין מספר ימים באף רשומה: ⚠️ `minAgeMs` · קבוע
 *  `*_EVICT_MS` · ו-`N * 86400000` בקוד הפינוי מפילים, ⭐ ושני המסלולים
 *  גוזרים את החלון מ-`lsWindowMs()`. */
function windowGaps(src) {
  const blk = storageBlock(src), pol = policyText(src);
  const out = [];
  for (const m of pol.matchAll(/\bminAgeMs\s*:/g)) out.push('minAgeMs ברשומה');
  for (const m of src.matchAll(/\b[A-Z][A-Z0-9]*_EVICT_MS\b/g)) out.push(m[0]);
  for (const m of (blk + '\n' + pol).matchAll(/\b\d+\s*\*\s*(?:86400000|LS_DAY_MS|DAY\w*)\b/g)) out.push(m[0]);
  for (const fn of ['lsPruneKey', 'lsPruneKeyVerified']) {
    /*  ⚠️ הגוף נחתך עד הסוגר שבתחילת שורה — ⛔ גרש בהערה אינו מחרוזת. */
    const at = blk.indexOf('function ' + fn + '(');
    const body = at < 0 ? '' : blk.slice(at, blk.indexOf('\n}', at));
    if (!/\blsWindowMs\(\)/.test(body)) out.push(fn + ' אינו גוזר את החלון');
  }
  return out;
}
/*  ⛔ [ls-app-type] — האפליקציה מצהירה את סוגה, ⚠️ הסוג במפה, ⭐ ויש נימוק. */
function typeGaps(src) {
  const d = appTypeDecl(src), map = appTypes(src);
  if (!d) return ['אין הצהרת appType'];
  const out = [];
  if (!Object.prototype.hasOwnProperty.call(map, d.type)) out.push(`הסוג «${d.type}» אינו במפה`);
  if (d.why.length < 12) out.push('הצהרה בלי נימוק');
  return out;
}
/*  ⛔ [ls-app-type-used] — כל סוג במפה משמש לפחות אפליקציה אחת: ⚠️ סוג
 *  שאיש אינו נושא הוא חלון שאיש אינו נמדד מולו. */
function peerTypes() {
  const out = [], missing = [];
  for (const slug of PEERS) {
    const root = slug === FACTS.slug ? ROOT : join(SIBS, slug);
    if (!existsSync(join(root, 'index.html'))) { missing.push(slug); continue; }
    const d = slug === FACTS.slug ? appTypeDecl(SRC) : appTypeDecl(appSrc(root));
    out.push({ slug, type: d ? d.type : null });
  }
  return { types: out, missing };
}
/*  ⚠️ אחות שאינה על הדיסק עשויה לשאת את הסוג — ⛔ ואז «בלי אפליקציה» אינו נקבע. */
function typeUseGaps(src, types, missing) {
  if (missing) return [];
  return Object.keys(appTypes(src)).filter((t) => !types.some((p) => p.type === t)).map((t) => `הסוג «${t}» בלי אפליקציה`);
}
/*  ⛔ [mirror-screen-whole] — מראה אינה נמחקת שלמה. */
function wholeGaps(src) {
  const pol = policyText(src);
  const tables = mirrorTables(src);
  const out = [];
  for (const b of arraysNamed(pol, 'wholeKeys')) {
    for (const t of specKeys(src, b)) if (tables.includes(t)) out.push(`${t}: מראה ב-wholeKeys`);
  }
  return out;
}
/*  ⛔ [ls-role-names] — שם לפי תפקיד: ⚠️ «tier» ו«שלב א/ב» אומרים מתי, ⛔ ולא מה. */
const ROLE_BAD = /\btier\d?\b|שלב [אב](?![א-ת])/g;
function roleGaps(src) {
  const scope = storageBlock(src) + '\n' + policyText(src);
  return (scope.match(ROLE_BAD) || []);
}

/* ── רתמה: המודול רץ בארגז חול ─────────────────────────────────────────── */
function memLS(init) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
const DAY = 86400000;
function cascade(mod, childWitness) {
  const now = Date.now();
  const p = [{ id: 's1', ts: now - 800 * DAY }, { id: 's2', ts: now - 600 * DAY }, { id: 's3', ts: now }];
  const c = p.map((r) => ({ id: r.id + ':a', sid: r.id, ts: r.ts }));
  const ls = memLS({ p: JSON.stringify(p), c: JSON.stringify(c) });
  const cfg = {
    logKey: 't_log', hzPrefix: 't_hz_', pending: () => false, syncedThrough: () => 0,
    wholeKeys: [], appType: { type: 'annual' },
    oldRecords: [
      { key: 'p', ts: (r) => r.ts, idOf: (r) => r.id, syncedThrough: () => now },
      { key: 'c', ts: (r) => r.ts, parent: 'p', parentOf: (r) => r.sid,
        idOf: (r) => r.id, syncedThrough: () => childWitness(now) },
    ],
  };
  const box = { localStorage: ls, LS_CFG: cfg, console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {}, window: {} };
  vm.createContext(box);
  vm.runInContext(mod, box);
  box.lsSweep('t', 1e9);
  const ids = (k) => JSON.parse(ls.getItem(k) || '[]').map((r) => r.id).join(',');
  return { p: ids('p'), c: ids('c') };
}
const cascadeOk = (mod) => {
  const a = cascade(mod, (now) => now);
  const b = cascade(mod, () => 0);
  return a.p === 's3' && a.c === 's3:a' && b.c === 's1:a,s2:a,s3:a';
};
/*  ⭐ החלון נמדד בהרצה — ⚠️ רשומות בנות 800 · 300 · 60 יום, ⛔ וסוג
 *  האפליקציה הוא הקלט היחיד שמשתנה. */
function windowRun(mod, type) {
  const now = Date.now();
  const rows = [800, 300, 60].map((d) => ({ id: 'd' + d, ts: now - d * DAY }));
  const ls = memLS({ w: JSON.stringify(rows) });
  const cfg = { logKey: 't_log', hzPrefix: 't_hz_', pending: () => false, syncedThrough: () => 0,
    wholeKeys: [], appType: type ? { type } : undefined,
    oldRecords: [{ key: 'w', ts: (r) => r.ts, idOf: (r) => r.id, syncedThrough: () => now }] };
  const box = { localStorage: ls, LS_CFG: cfg, console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {}, window: {} };
  vm.createContext(box);
  vm.runInContext(mod, box);
  box.lsSweep('t', 1e9);
  return JSON.parse(ls.getItem('w') || '[]').map((r) => r.id).join(',');
}
const windowOk = (mod) => windowRun(mod, 'annual') === 'd300,d60' && windowRun(mod, 'daily') === 'd60' &&
  windowRun(mod, null) === 'd800,d300,d60';

/* ── ארגז חול: כל חישוב רץ לפני הפינוי ואחריו ──────────────────────────── */
/*  ⭐ שמות רמת-המודול של כל סקריפט — ⚠️ מודול שעטוף כולו ב-IIFE: גופו הוא
 *  הרמה העליונה, ⛔ ו-IIFE פנימי אינו עוטף. */
function poolOf(text) {
  const out = new Map(); let order = 0;
  for (const m of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(m[0].slice(0, m[0].indexOf('>')))) continue;
    const raw = m[1], w = whitenJs(raw), n = w.length;
    let d = 0, i = 0;
    let iife = /(^|\n)\s*\(\s*function\s*\(\s*\)\s*\{/.exec(w);
    if (iife && !/^(?:\s|import\b[^;]*;)*$/.test(w.slice(0, iife.index))) iife = null;
    if (iife) i = iife.index + iife[0].length;
    const put = (name, a, b, group) => { if (!out.has(name)) out.set(name, { text: raw.slice(a, b), w: w.slice(a, b), order: order++, group }); };
    while (i < n) {
      const c = w[i], lead = i === 0 || /[\s;}]/.test(w[i - 1]);
      if (d === 0 && lead) {
        const rest = w.slice(i, i + 80);
        let f = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(rest);
        if (f) {
          const o = w.indexOf('{', i + f[0].length + w.slice(i + f[0].length).indexOf(')') + 1);
          let k = o, dd = 0;
          for (; k < n; k++) { if (w[k] === '{') dd++; else if (w[k] === '}') { dd--; if (!dd) break; } }
          put(f[1], i + (f[0].startsWith('export') ? f[0].search(/(async\s+)?function/) : 0), k + 1);
          i = k + 1; continue;
        }
        const v = /^(?:export\s+)?(var|let|const)\s+([A-Za-z_$][\w$]*)/.exec(rest) || /^window\.([A-Za-z_$][\w$]*)\s*=(?!=)/.exec(rest);
        if (v) {
          const win = rest.startsWith('window.');
          let k = i, dd = 0;
          for (; k < n; k++) {
            const ch = w[k];
            if ('{(['.includes(ch)) dd++;
            else if ('})]'.includes(ch)) dd--;
            else if (dd === 0 && ch === ';') break;
            else if (dd === 0 && ch === '\n') {
              const nx = w.slice(k + 1).match(/^\s*(\S+)/);
              const prev = w.slice(i, k).replace(/\s+$/, '').slice(-1);
              if (nx && !/^[.,?:+\-*/&|=)\]}]/.test(nx[1]) && !/[,=+\-*/&|?:({[]/.test(prev)) break;
            }
          }
          const a = v[0].startsWith('export') ? i + 7 : i;
          const names = [win ? v[1] : v[2]];
          if (!win) {
            const seg = w.slice(i, k);
            for (let q = 0, dep = 0; q < seg.length; q++) {
              const ch = seg[q];
              if ('{(['.includes(ch)) dep++; else if ('})]'.includes(ch)) dep--;
              else if (dep === 0 && ch === ',') { const mm = /^,\s*([A-Za-z_$][\w$]*)\s*=/.exec(seg.slice(q)); if (mm) names.push(mm[1]); }
            }
          }
          for (const nm of names) put(nm, a, k + 1, names[0]);
          i = k + 1; continue;
        }
      }
      if ('{(['.includes(c)) d++; else if ('})]'.includes(c)) d--;
      i++;
    }
  }
  return out;
}
function closureOf(P, seeds) {
  const need = new Set(), stack = [...seeds];
  while (stack.length) {
    const nm = stack.pop();
    if (need.has(nm) || !P.has(nm)) continue;
    need.add(nm);
    for (const id of P.get(nm).w.match(/[A-Za-z_$][\w$]*/g) || []) if (P.has(id) && !need.has(id)) stack.push(id);
  }
  return need;
}
/*  ⚠️ DOM סלחני — ⭐ כל אלמנט נוצר בשאלה ושומר את מה שנכתב בו, ⛔ ואין רשת:
 *  כל שרשרת של הלקוח מסתיימת בכישלון, כמו מכשיר בלי רשת. */
function domStub() {
  const els = new Map();
  const mk = (tag, id) => {
    const el = { tagName: String(tag || 'div').toUpperCase(), id: id || '', children: [], style: {}, dataset: {},
      _html: '', _text: '', value: '', src: '', className: '',
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
      appendChild(c) { this.children.push(c); return c; }, append() {}, prepend() {}, remove() {},
      insertBefore(c) { return c; }, replaceChildren() {}, addEventListener() {}, removeEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; },
      getBoundingClientRect() { return { width: 0, height: 0, x: 0, y: 0, top: 0, left: 0 }; },
      focus() {}, blur() {}, click() {}, scrollIntoView() {} };
    Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(x) { this._html = String(x); } });
    Object.defineProperty(el, 'textContent', { get() { return this._text; }, set(x) { this._text = String(x); } });
    return el;
  };
  return { body: mk('body'), documentElement: mk('html'), head: mk('head'),
    getElementById(id) { if (!els.has(id)) els.set(id, mk('div', id)); return els.get(id); },
    createElement(t) { return mk(t); }, createTextNode(t) { return { textContent: t }; },
    createDocumentFragment() { return mk('frag'); }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}, hidden: false, visibilityState: 'visible' };
}
function offlineClient() {
  const fail = () => Promise.resolve({ data: null, error: { message: 'offline' } });
  const q = new Proxy(function () {}, {
    get: (t, k) => (k === 'then' ? (res, rej) => fail().then(res, rej) : () => q),
    apply: () => q,
  });
  return q;
}
/*  ⛔ הסגור נגזר מהחישוב ⛔ ואינו רשימה — ⚠️ שם שחסר בהרצה נוסף לסגור,
 *  ⭐ והארגז נבנה מחדש עד שהוא עולה. */
function boxOf(P, seeds, code) {
  let need = closureOf(P, seeds);
  for (let tries = 0; tries < 60; tries++) {
    const ls = memLS({}); const mute = { log() {}, warn() {}, error() {}, info() {} };
    const box = { localStorage: ls, sessionStorage: memLS({}), document: domStub(), console: mute,
      navigator: { onLine: false, userAgent: 'node' }, location: { href: 'http://x/', pathname: '/', search: '', hash: '' },
      setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
      requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false, addEventListener() {} }),
      getComputedStyle: () => ({ getPropertyValue: () => '' }), fetch: () => Promise.reject(new Error('offline')),
      supabase: { createClient: () => offlineClient() }, crypto: globalThis.crypto };
    box.window = box; box.self = box; box.globalThis = box;
    vm.createContext(box);
    const code0 = [...need].map((nm) => P.get(nm)).sort((a, b) => a.order - b.order)
      .filter((p, ix, arr) => !p.group || arr.findIndex((q) => q.text === p.text) === ix).map((p) => p.text).join('\n');
    try { vm.runInContext(code0 + '\n;' + code, box, { timeout: 5000 }); return { box, ls }; }
    catch (e) {
      const m = /([A-Za-z_$][\w$]*) is not defined/.exec(String(e && e.message));
      if (m && P.has(m[1]) && !need.has(m[1])) { need = new Set([...need, ...closureOf(P, [m[1]])]); continue; }
      return { err: String(e && e.message) };
    }
  }
  return { err: 'הסגור לא התכנס' };
}
const EC = APP.evictCalc;
const run = (box, code) => vm.runInContext(code, box, { timeout: 5000 });
async function callAll(box) {
  const out = {};
  for (const [name, expr] of Object.entries(EC.calls)) {
    try { out[name] = JSON.stringify(await run(box, expr)); } catch (e) { out[name] = '!' + String(e && e.message); }
  }
  return out;
}
/*  ⭐ הפינוי המלא — ⚠️ כל עֵד מכסה עד עכשיו ⛔ ואין תור: ⭐ זה המצב שבו
 *  הפינוי מגיע הכי רחוק, ⛔ והחלון הוא הגבול היחיד. */
const SWEEP = "LS_CFG.pending = function () { return false; }; (LS_CFG.oldRecords || []).forEach(function (s) { s.syncedThrough = function () { return Date.now(); }; }); lsSweep('probe', 1e12);";
const ROWS_OF = "JSON.stringify((LS_CFG.oldRecords || []).map(function (s) { try { return JSON.parse(localStorage.getItem(s.key) || '[]').length; } catch (e) { return 0; } }))";
async function evictCalcRun(src) {
  const P = poolOf(src);
  const b = boxOf(P, EC.seeds.concat(['LS_CFG', 'lsSweep']), EC.seed + '\n' + EC.load);
  if (b.err) return { err: b.err, diff: [], calls: 0, evicted: 0, specs: 0 };
  const A = await callAll(b.box);
  const r0 = JSON.parse(run(b.box, ROWS_OF));
  run(b.box, SWEEP);
  const r1 = JSON.parse(run(b.box, ROWS_OF));
  run(b.box, EC.load);
  const B = await callAll(b.box);
  const names = Object.keys(A);
  const diff = names.filter((nm) => A[nm] !== B[nm] || A[nm].startsWith('!'));
  return { diff, calls: names.length, specs: r0.length, evicted: r0.reduce((a, x, i) => a + x - r1[i], 0) };
}
/*  ⛔ חישוב שקורא טבלה שגדלה ומסכם — ⚠️ **מה נכנס**: פונקציה ברמת המודול
 *  שנוקבת בקורא מוצהר ⛔ ומסכמת (`reduce` · `sum` · `+=` מספרי); ⛔ **ומה
 *  מפיל**: פונקציה כזו שאינה בחישובים הנמדדים ⛔ ואינה נקובה בהיסטוריה המלאה. */
const COMPUTES = /\.reduce\s*\(|\bsum\s*\(|\+=\s*(?:parseFloat|parseInt|Number|num)\s*\(/;
function undeclaredCalcs(src) {
  const P = poolOf(src);
  const decl = new Set(Object.keys(EC.calls).map((nm) => nm.split('/')[0]).concat(fullDecl(src, policyText(src)).map((f) => f.calc)));
  const rd = new RegExp('(?:^|[^\\w$.])(?:' + EC.readers.map((x) => x.replace(/[.$]/g, '\\$&')).join('|') + ')(?![\\w$])');
  const out = [];
  for (const [nm, p] of P) {
    if (!/^\s*(?:async\s+)?function\b|=\s*(?:async\s+)?function\b|=>/.test(p.w)) continue;
    if (rd.test(p.w) && COMPUTES.test(p.w) && !decl.has(nm)) out.push(nm);
  }
  return out;
}

/* ── הרצה ──────────────────────────────────────────────────────────────── */
const MOD = storageBlock(SRC);
assert(MOD.length > 0, 'מודול האחסון נמצא — ' + `נמדדו ${MOD.split('\n').length} שורות`);
{
  const g = quotaDerivedGaps(SRC);
  assert(g.length === 0, '[ls-quota-derived] כל סף בבתים נגזר מהמכסה באחוזים — ' +
    `נמדדו ${g.length} ספים מוקלדים והצפוי 0` + (g.length ? ': ' + g.join(', ') : ''));
}
{
  const q = quotaValue(SRC);
  assert(quotaOk(q), '[ls-quota-measured] המכסה היא המספר שנמדד בכרומיום — ' +
    `נמדדו ${q} והצפוי ${MEASURED_QUOTA} עד אחוז מעליו`);
}
const PF = peerFacts();
if (PF.missing.length) console.log('  ⏭ אחיות שאינן על הדיסק — שמן ותחיליתן לא נמדדו מול `LS_APPS`: ' + PF.missing.join(', '));
{
  const g = appsGaps(lsApps(SRC), PF.peers, PF.missing.length);
  assert(PF.peers.length > 0 && g.length === 0, '[ls-apps-peers] LS_APPS מול כל הריפו — ' +
    `נמדדו ${g.length} פערים מול ${PF.peers.length} ריפו והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
}
{
  const t = mirrorTables(SRC);
  assert(t.length > 0, 'טבלאות המראה נגזרות מהמרשם המוצהר — ' + `נמדדו ${t.length}: ${t.join(', ')}`);
  const g = evictGaps(SRC);
  assert(g.length === 0, '[mirror-evict] כל טבלת מראה בדיוק באחת משלוש — ' +
    `נמדדו ${g.length} פערים והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
  const c = calcGaps(SRC), f = fullDecl(SRC, policyText(SRC));
  assert(c.length === 0, '[full-history-calc] כל טבלה שנדרשת במלואה נוקבת בחישוב מוגדר — ' +
    `נמדדו ${c.length} פערים מתוך ${f.length} הצהרות והצפוי 0` + (c.length ? ': ' + c.join(' · ') : ''));
}
{
  const g = windowGaps(SRC);
  assert(g.length === 0, '[ls-window-derived] אין מספר ימים באף רשומה — ' +
    `נמדדו ${g.length} והצפוי 0` + (g.length ? ': ' + g.join(', ') : ''));
  const r = [windowRun(MOD, 'annual'), windowRun(MOD, 'daily'), windowRun(MOD, null)];
  assert(windowOk(MOD), '[ls-window-derived] החלון נגזר מהסוג ברתמה — ' +
    `נמדדו «${r.join(' | ')}» והצפוי «d300,d60 | d60 | d800,d300,d60»`);
  const t = typeGaps(SRC), d = appTypeDecl(SRC);
  assert(t.length === 0, '[ls-app-type] האפליקציה מצהירה את סוגה עם נימוק — ' +
    `נמדד «${d ? d.type : '—'}» ו-${t.length} פערים והצפוי 0` + (t.length ? ': ' + t.join(' · ') : ''));
  const PT = peerTypes();
  if (PT.missing.length) console.log('  ⏭ אחיות שאינן על הדיסק — סוגן לא נמדד מול המפה: ' + PT.missing.join(', '));
  const u = typeUseGaps(SRC, PT.types, PT.missing.length);
  assert(PT.types.length > 0 && u.length === 0, '[ls-app-type-used] כל סוג במפה משמש אפליקציה — ' +
    `נמדדו ${u.length} סוגים בלי אפליקציה מול ${PT.types.length} ריפו והצפוי 0` + (u.length ? ': ' + u.join(' · ') : ''));
}
{
  const g = wholeGaps(SRC);
  assert(g.length === 0, '[mirror-screen-whole] אין מראה ב-wholeKeys — ' +
    `נמדדו ${g.length} והצפוי 0` + (g.length ? ': ' + g.join(' · ') : ''));
}
{
  const pol = policyText(SRC);
  const kids = [...pol.matchAll(/\bparent\s*:\s*(mirrorKey\([^)]*\)|'[^']*')/g)].map((m) => keyTable(SRC, m[1]));
  const ev = new Set();
  for (const b of arraysNamed(pol, 'oldRecords')) for (const t of specKeys(SRC, b)) ev.add(t);
  const orphanParent = kids.filter((t) => !ev.has(t));
  assert(orphanParent.length === 0, '[child-with-parent] כל אב שמוצהר לבן נמצא בפינוי — ' +
    `נמדדו ${orphanParent.length} אבות מחוץ לפינוי והצפוי 0`);
  const a = cascade(MOD, (now) => now);
  assert(a.p === 's3' && a.c === 's3:a', '[child-with-parent] בן יורד עם אביו ברתמה — ' +
    `נמדדו אב «${a.p}» ובן «${a.c}» והצפוי «s3» ו«s3:a»`);
  const b = cascade(MOD, () => 0);
  assert(b.c === 's1:a,s2:a,s3:a', '[child-with-parent] בן בלי עֵד נשאר — ' +
    `נמדד «${b.c}» והצפוי שלושתם`);
}
{
  const g = roleGaps(SRC);
  assert(g.length === 0, '[ls-role-names] שמות הפינוי לפי תפקיד — ' +
    `נמדדו ${g.length} שמות סדר והצפוי 0` + (g.length ? ': ' + g.join(', ') : ''));
}
{
  const r = await evictCalcRun(SRC);
  const cross = r.specs === 0 || r.evicted > 0;
  assert(!r.err && r.calls > 0 && r.diff.length === 0 && cross, '[evict-calc-stable] כל חישוב זהה לפני הפינוי ואחריו — ' +
    (r.err ? `הארגז לא עלה: ${r.err}` : `נמדדו ${r.diff.length} חישובים שהשתנו מתוך ${r.calls} והצפוי 0` +
    (r.diff.length ? ': ' + r.diff.join(', ') : '') + ` · ${r.evicted} שורות פונו מ-${r.specs} רשימות`));
  const u = undeclaredCalcs(SRC), missing = Object.keys(EC.calls).map((nm) => nm.split('/')[0]).filter((nm) => !defines(SRC, nm));
  assert(u.length === 0 && missing.length === 0, '[evict-calc-stable] כל חישוב שקורא טבלה שגדלה ומסכם — נמדד — ' +
    `נמדדו ${u.length} בלי מדידה ו-${missing.length} מוצהרים בלי הגדרה והצפוי 0` +
    (u.length ? ': ' + u.join(', ') : '') + (missing.length ? ': ' + missing.join(', ') : ''));
}
/*  ⛔ פריט הוא אובייקט ברמה העליונה של הרשימה — ⚠️ אובייקט מקונן (`verify`) אינו פריט. */
function topItems(arr) {
  const out = []; let d = 0, st = -1;
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i];
    if (c === '{') { if (d === 0) st = i; d++; }
    else if (c === '}') { d--; if (d === 0 && st >= 0) { out.push(arr.slice(st, i + 1)); st = -1; } }
  }
  return out;
}
function tslessItems(src) {
  const items = arraysNamed(policyText(src), 'oldRecords').flatMap(topItems);
  return { all: items.length, bad: items.filter((it) => !/(^|[,{\s])ts\s*:/.test(it)).length };
}
{
  const r = tslessItems(SRC);
  assert(r.bad === 0, '[old-records-ts] כל פריט ב-oldRecords נושא `ts` — ' +
    `נמדדו ${r.bad} פריטים בלי \`ts\` מתוך ${r.all} והצפוי 0`);
}

mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_origin: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  process.exit(failed ? 1 : 0);
}
/* ── מוטציות ───────────────────────────────────────────────────────────── */
{
  const mut = SRC.replace(/var LS_WARN_BYTES\s*=\s*[^;\n]+;/, 'var LS_WARN_BYTES  = 3 * 1024 * 1024;');
  const n = quotaDerivedGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ1 · סף שמוקלד בבתים **מפיל** את «[ls-quota-derived]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/var LS_QUOTA_BYTES\s*=\s*[^;\n]+;/, 'var LS_QUOTA_BYTES = 5 * 1024 * 1024;');
  const q = quotaValue(mut);
  assert(mut !== SRC && !quotaOk(q), 'מ2 · מכסת 5 MiB **מפילה** את «[ls-quota-measured]» — ' + `נמדדו ${q} והצפוי כשל`);
  /*  ⭐ נ1 · אותו מספר בכתיב אחר ⛔ אינו מפיל — ⚠️ נמדד הערך, ⛔ ולא הכתיב. */
  const same = SRC.replace(/var LS_QUOTA_BYTES\s*=\s*[^;\n]+;/, 'var LS_QUOTA_BYTES = 10485760;');
  assert(quotaOk(quotaValue(same)) && quotaDerivedGaps(same).length === 0,
    'נ1 · ⭐ אותה מכסה בכתיב אחר ⛔ **אינה** מפילה את «[ls-quota-measured]» — ' + `נמדדו ${quotaValue(same)}`);
}
{
  const apps = lsApps(SRC);
  const noK = apps.filter((a) => !a.pre.includes('k_'));
  const g1 = appsGaps(noK, PF.peers).length;
  assert(noK.length < apps.length && g1 === 1, 'מ3 · הסרת הקופה **מפילה** את «[ls-apps-peers]» — ' + `נמדדו ${g1} והצפוי 1`);
  const g2 = appsGaps(apps.concat([{ id: 'zz', name: 'אין', pre: ['zz_'] }]), PF.peers).length;
  assert(g2 === 1, 'מ4 · אפליקציה בלי ריפו **מפילה** את «[ls-apps-peers]» — ' + `נמדדו ${g2} והצפוי 1`);
}
{
  const name = APP.mirrorList.find((n) => arraysNamed(SRC, n).length);
  const re = new RegExp('(\\b' + name + '\\s*=\\s*\\[)');
  const obj = arraysNamed(SRC, name)[0].includes('{');
  const mut = SRC.replace(re, obj ? "$1{ t: 'zz_mut' }, " : "$1'zz_mut', ");
  const n = evictGaps(mut).length - evictGaps(SRC).length;
  assert(mut !== SRC && n === 1, 'מ5 · טבלת מראה בלי פינוי ובלי הצהרה **מפילה** את «[mirror-evict]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = MOD.replace('    return !proven(r);', '    return true;');
  assert(mut !== MOD && !cascadeOk(mut), 'מ6 · בן שנשאר אחרי אביו **מפיל** את «[child-with-parent]» — ' +
    `נמדד ${cascadeOk(mut)} והצפוי false`);
  /*  ⭐ נ2 · שם פנימי שהוחלף בעקביות ⛔ אינו מפיל — ⚠️ נמדד המנגנון, ⛔ ולא השם. */
  const ren = MOD.replace(/\bproven\b/g, 'hasProof');
  assert(ren !== MOD && cascadeOk(ren), 'נ2 · ⭐ שם שהוחלף בעקביות ⛔ **אינו** מפיל את «[child-with-parent]» — ' +
    `נמדד ${cascadeOk(ren)}`);
}
{
  const t0 = mirrorTables(SRC)[0];
  const mut = SRC.replace(/(\bwholeKeys\s*:\s*\[)/, `$1{ key: mirrorKey('${t0}') }, `);
  const n = wholeGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ7 · מראה ב-wholeKeys **מפילה** את «[mirror-screen-whole]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/\boldRecords(\s*:)/, 'tier' + '2$1');
  const n = roleGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ8 · `tier2` שחזר **מפיל** את «[ls-role-names]» — ' + `נמדדו ${n} והצפוי 1`);
}
{
  const mut = SRC.replace(/(\boldRecords\s*:\s*\[)/, "$1{ key: 'zz_mut', idOf: String }, ");
  const r = tslessItems(mut);
  assert(mut !== SRC && r.bad === 1, 'מ10 · פריט בלי `ts` **מפיל** את «[old-records-ts]» — ' + `נמדדו ${r.bad} והצפוי 1`);
}
{
  const mut = SRC.replace('var LS_CFG = {', 'var ZZ_EVICT_MS = 400 * 86400000;\nvar LS_CFG = {');
  const n = windowGaps(mut).length;
  assert(mut !== SRC && n >= 1, 'מ11 · `*_EVICT_MS` שחזר **מפיל** את «[ls-window-derived]» — ' + `נמדדו ${n} והצפוי 1 לפחות`);
  const mech = MOD.replace('cut = Math.min(cut, Date.now() - lsWindowMs());', 'cut = Math.min(cut, Date.now());');
  assert(mech !== MOD && !windowOk(mech), 'מ12 · פינוי שאינו גוזר את החלון **מפיל** את «[ls-window-derived]» — ' +
    `נמדד «${windowRun(mech, 'annual')}» והצפוי כשל`);
  /*  ⭐ נ3 · סדר אחר במפה ⛔ אינו מפיל — ⚠️ נמדד הערך, ⛔ ולא הסדר. */
  const swap = MOD.replace(/var LS_APP_TYPES = \{ annual: 400, daily: 90 \};/, 'var LS_APP_TYPES = { daily: 90, annual: 400 };');
  assert(swap !== MOD && windowOk(swap), 'נ3 · ⭐ מפה בסדר אחר ⛔ **אינה** מפילה את «[ls-window-derived]» — ' +
    `נמדד ${windowOk(swap)}`);
}
{
  const mut = SRC.replace(/\bappType\s*:\s*\{[^}]*\},?/, '');
  const n = typeGaps(mut).length;
  assert(mut !== SRC && n === 1, 'מ13 · הסרת הצהרת הסוג **מפילה** את «[ls-app-type]» — ' + `נמדדו ${n} והצפוי 1`);
  const mut2 = SRC.replace(/var LS_APP_TYPES = \{/, 'var LS_APP_TYPES = { weekly: 7,');
  const u = typeUseGaps(mut2, peerTypes().types).length;
  assert(mut2 !== SRC && u === 1, 'מ14 · סוג שלישי במפה **מפיל** את «[ls-app-type-used]» — ' + `נמדדו ${u} והצפוי 1`);
}
{
  const t0 = mirrorTables(SRC)[0];
  const decl = `\n  fullHistory: [{ t: '${t0}', calc: 'lsSweep' }],`;
  const mut = SRC.replace('var LS_CFG = {', 'var LS_CFG = {' + decl);
  const n = evictGaps(mut).length - evictGaps(SRC).length;
  assert(mut !== SRC && n === 1, 'מ15 · טבלה בשתי קטגוריות **מפילה** את «[mirror-evict]» — ' + `נמדדו ${n} והצפוי 1`);
  const mut2 = SRC.replace('var LS_CFG = {', 'var LS_CFG = {' + decl.replace("'lsSweep'", "'zzNoSuchCalc'"));
  const c = calcGaps(mut2).length;
  assert(c === 1, 'מ16 · חישוב שאינו מוגדר **מפיל** את «[full-history-calc]» — ' + `נמדדו ${c} והצפוי 1`);
}
{
  const fn = `function zzSumAll() { return (${EC.readers[0]}).reduce(function (a) { return a + 1; }, 0); }\n`;
  const mut = SRC.replace('var LS_CFG = {', fn + 'var LS_CFG = {');
  const n = undeclaredCalcs(mut).length;
  assert(mut !== SRC && n === 1, 'מ17 · חישוב שאינו רשום וקורא טבלה שגדלה **מפיל** את «[evict-calc-stable]» — ' + `נמדדו ${n} והצפוי 1`);
  /*  ⭐ נ4 · קורא שאינו מסכם ⛔ אינו מפיל — ⚠️ נמדד החישוב, ⛔ ולא הקריאה. */
  const cnt = SRC.replace('var LS_CFG = {', `function zzCopyAll() { return (${EC.readers[0]}).slice(0); }\nvar LS_CFG = {`);
  assert(cnt !== SRC && undeclaredCalcs(cnt).length === 0, 'נ4 · ⭐ קורא שאינו מסכם ⛔ **אינו** מפיל את «[evict-calc-stable]» — ' +
    `נמדדו ${undeclaredCalcs(cnt).length}`);
}
const CLAIMS = {
  '[mirror-evict]': (s) => evictGaps(s).length,
  '[mirror-screen-whole]': (s) => wholeGaps(s).length,
  '[ls-role-names]': (s) => roleGaps(s).length,
  '[evict-calc-stable]': async (s) => (await evictCalcRun(s)).diff.length,
};
for (const [needle, repl, claim, msg] of APP.mutations) {
  if (!SRC.includes(needle)) { bad('עוגן מוטציה חסר: ' + msg); continue; }
  const n = await CLAIMS[claim](SRC.replace(needle, repl));
  assert((await CLAIMS[claim](SRC)) === 0 && n > 0, `מ9 · ${msg} **מפיל** את «${claim}» — ` + `נמדדו ${n} והצפוי יותר מ-0`);
}

if (failed) { console.error('\n' + failed + ' assertion(s) failed.'); process.exit(1); }
console.log('\ntest_origin: הכול עבר.');
