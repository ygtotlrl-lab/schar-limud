#!/usr/bin/env node
/*  test_users_patch.mjs — נתיב עדכון חלקי למראת המשתמשים.
 *
 *  **מה נאכף:** ⛔ עדכון חלקי אינו מכניס את הסוד — ⚠️ לא למראה שבזיכרון
 *  ולא לדיסק · ⛔ שאר המשתמשים במראה נשארים שלמים · ⛔ הנתיב המלא עובר
 *  באותו מסנן · ⛔ וכל אתר כתיבה למראת המשתמשים יושב בפונקציה מוצהרת.
 *
 *  **הנימוק המדוד:** ⛔ מסנן שיושב בנתיב אחד בלבד ⛔ ונתיב שני שעוקף אותו —
 *  ⚠️ זו הנקודה שנשברה בשתי אפליקציות, בשני סבבים נפרדים; ⭐ ושלוש
 *  האפליקציות שיש בהן כניסה מחזיקות את אותו מנגנון בשלושה שמות.
 *
 *  **מה יישבר בלעדיו:** ⛔ סיסמה גלויה שנכתבת לאחסון המקומי, ⚠️ באותו
 *  origin שבו חיות עוד שלוש אפליקציות; ⛔ ועדכון שמחליף שורה במקום למזג
 *  שדות מוחק טביעה קיימת ⛔ ונועל משתמש בחוץ.
 *
 *  **מה אינו נאכף כאן:** ⛔ הכתיבה לענן — ⚠️ היא דורשת רשת ונבדקת בשער
 *  הסיסמאות, ⭐ וכאן נמדד **מה יורד לדיסק**; ⛔ והכניסה האופליין עצמה,
 *  שנמדדת בשער הכניסה האופליין.
 *
 *  ⚠️ הבדיקה רצה על הקוד האמיתי המחולץ מ-`index.html`, ⛔ לא על העתק.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ טבלת המשתמשים במראה, והקבוע שנושא את שמה — ⚠️ המפתח נגזר ממנו
   *  בשכבת המראה, ⛔ ושם שנכתב פעמיים מייצר מפתח שאיש אינו מחפש. */
  usersTable: 'sl_users',
  tableConst: 'SL_USERS_TABLE',
  idKey: 'client_id',
  /*  ⛔ עמודת הסוד שלעולם אינה יורדת לדיסק — ⚠️ היא נגרעה מהמסד,
   *  ⭐ והטענה היא שגם אם תחזור, היא אינה עוברת את רשימת-ההיתר. */
  secretCol: 'password',
  fns: { slim: 'slUserPub', saveOne: 'slUsersSaveOne',
         saveAll: 'slUsersSaveAll', fp: 'slMakePassFp' },
  /*  ⛔ אין כאן עוזר ביניים — ⚠️ שני הנתיבים קוראים למסנן ישירות,
   *  ⭐ ורשימה ריקה היא «נמדד ואין» ⛔ ולא «לא נשאל». */
  slimVia: [],
  saveFn: 'mirrorSave',
  /*  ⛔ עוזר מוצהר שדרכו הנתיב מגיע לשמירה — ⚠️ רשימה ריקה היא
   *  «נמדד ואין» ⛔ ולא «לא נשאל». */
  saveVia: ['slUsersSave'],
  writeFns: ['slUsersSave', 'slUsersSaveOne', 'slUsersSaveAll'],
  partialMerges: false,
  partialWhy: 'המראה נבנית מרשימת-היתר, ⛔ והמסנן מעתיק את העמודות ' +
    'שהוגדרו בלבד — ⚠️ הקוראים מוסרים את שורת הענן כפי שחזרה',
  deps: {
    vars: ['MIRROR_CFG', 'MIRROR', 'SL_USERS_TABLE', 'SL_USER_COLS',
           'SL_PASS_ITER_USER', 'SL_PASS_CTX'],
    fns: ['mirrorKey', 'mirrorSave', 'slSanitizeRows', 'slUserPub',
          'slUsersSave', 'slUsersSaveOne', 'slUsersSaveAll',
          'slRandSalt', 'slPassFp', 'slMakePassFp'],
  },
  slimMut: {
    identity: "function slUserPub(r) { return r && typeof r === 'object' ? r : {}; }",
    anti: 'function slUserPub(r) {\n' +
      '  var o = {};\n' +
      "  if (!r || typeof r !== 'object') return o;\n" +
      '  SL_USER_COLS.forEach(function (c) { if (r[c] !== undefined && r[c] !== null) o[c] = r[c]; });\n' +
      '  o._nc = 1;\n  return o;\n}',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passN = 0, failN = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בשלוש שיש
 *  בהן כניסה, ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת
 *  שנבדלת ביניהן, פרטית בלי נימוק, וסכום אפס. */
const FLOOR = { shared: 20, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
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
const ok = (m, c) => { RAN++; if (c) { passN++; console.log('  ok   ' + m); }
                       else { failN++; console.error('  FAIL ' + m); } };
const eq = (m, got, want) => ok(`${m} — נמדד «${got}» מול הצפוי «${want}»`, got === want);
const sect = (t) => console.log('\n' + t);

/*  חילוץ מהמקור ────────────────────────────────────────────────────────── */
/*  ⛔ הגוף נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים — ⚠️ פונקציה ארוכה
 *  מהחלון הייתה נחתכת באמצע, ⭐ והרתמה הייתה טוענת חצי פונקציה. */
function fnOf(src, name) {
  const m = new RegExp('^(?:async )?function ' + name + '\\s*\\(', 'm').exec(src);
  if (!m) throw new Error('לא נמצאה הפונקציה ' + name + ' ב-index.html');
  const at = src.indexOf('{', m.index);
  let depth = 0, j = at;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) break; }
  }
  return src.slice(m.index, j + 1);
}
function declOf(src, name) {
  const m = new RegExp('^var ' + name + '\\s*=', 'm').exec(src);
  if (!m) throw new Error('לא נמצאה ההצהרה ' + name + ' ב-index.html');
  let depth = 0;
  for (let j = m.index; j < src.length; j++) {
    const c = src[j];
    if ('{(['.includes(c)) depth++;
    else if ('})]'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return src.slice(m.index, j + 1);
  }
  throw new Error('הצהרה לא נסגרה: ' + name);
}
const F = APP.fns;
const T = APP.usersTable;

/*  ⛔ ההודעות הן קבועים ⛔ ואינן ליטרל באתר התצוגה — ⚠️ הרתמה טוענת את
 *  הצהרותיהן, ⭐ שאם לא כן מטפל שמציג הודעה זורק `ReferenceError`. */
function harnessSrc(src) {
  const msgs = (src.match(/^var MSG_[A-Z_0-9]* = '(?:[^'\\]|\\.)*';$/gm) || []).join('\n');
  return msgs + '\n' + APP.deps.vars.map((v) => declOf(src, v)).join('\n') +
         '\n' + APP.deps.fns.map((f) => fnOf(src, f)).join('\n');
}

/* ── הרתמה ─────────────────────────────────────────────────────────────── */
function makeCtx(src) {
  const store = Object.create(null);
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    TextEncoder,
    crypto: webcrypto,
    navigator: { onLine: true },
    /*  ⭐ שער הדיסק של החלון החם עוטף את כתיבות המראה — ⚠️ כאן שקוף
     *  בכוונה, ⛔ ובדיקות החלון עצמו יושבות בשער החלון החם. */
    hwDiskFilter(k, rows) { return rows; },
    hwNoteCloud() {},
    lsSetArray(key, arr) { store[key] = JSON.stringify(arr); return true; },
    lsSet(key, v) { store[key] = String(v); return true; },
    lsGet(key) { return store[key]; },
    toast() {}, busy() {},
    Promise, Object, Array, String, JSON, Date, Uint8Array, isFinite, Boolean, Number,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(harnessSrc(src), ctx);
  return { ctx, store };
}

/*  ⛔ הסריקה שמגדירה את האינווריאנטה — ⚠️ הערך עצמו **וגם** שם העמודה,
 *  בכל מפתח אחסון שהרתמה ראתה: ⭐ חיפוש הערך לבדו מפספס עמודה שנכתבה
 *  ריקה, ⛔ וחיפוש השם לבדו מפספס ערך שנכתב תחת שם אחר. */
function diskHas(store, needle) {
  return Object.keys(store).some((k) => String(store[k]).includes(needle));
}
const rowsOf = (h) => h.ctx.MIRROR[T] || [];
const byId = (h, id) => rowsOf(h).filter((u) => String(u[APP.idKey]) === String(id))[0];

const PASS_A = '111111', PASS_B = '222222';
const SECRET = 'סיסמה-גלויה-222222';

/*  ⛔ הזריעה עוברת בפונקציית הטביעה האמיתית ⛔ ולא בערך קבוע — ⚠️ מלח
 *  וטביעה שנכתבו ביד אינם מה שהאפליקציה מייצרת. */
async function seed(h) {
  const a = await h.ctx[F.fp](PASS_A);
  const b = await h.ctx[F.fp](PASS_B);
  const mk = (id, name, fp) => {
    const o = { client_id: id, username: name, full_name: name, role: 'manager',
                active: true, pass_salt: fp.salt, pass_fp: fp.fp };
    return o;
  };
  h.ctx.MIRROR[T] = [mk('aaa', 'user_a', a), mk('bbb', 'user_b', b)];
  h.ctx[F.saveAll](h.ctx.MIRROR[T]);
  return { a, b };
}
const cloudRow = (over) => Object.assign(
  { client_id: 'bbb', username: 'user_b', full_name: 'user_b', role: 'manager',
    active: true }, over || {});

/* ══════════════════════════════════════════════════════════════════════════
   א · ⛔ עדכון חלקי — עמודת הסוד אינה נכנסת
   ══════════════════════════════════════════════════════════════════════════ */
async function partialLeak(src) {
  const h = makeCtx(src);
  const s = await seed(h);
  h.ctx[F.saveOne](cloudRow({ [APP.secretCol]: SECRET,
                              pass_salt: s.b.salt, pass_fp: s.b.fp }));
  const row = byId(h, 'bbb');
  return { h, row,
           inMem: !!row && (APP.secretCol in row),
           onDiskVal: diskHas(h.store, SECRET),
           onDiskCol: diskHas(h.store, APP.secretCol) };
}

async function secA() {
  sect('א. ⛔ עדכון חלקי — עמודת הסוד אינה נכנסת');
  const r = await partialLeak(SRC);
  ok('העדכון נכנס למראה', !!r.row);
  ok('⛔ אין עמודת הסוד ברשומה שבזיכרון', r.inMem === false);
  ok('⛔ ערך הסוד אינו על הדיסק', r.onDiskVal === false);
  ok('⛔ שם עמודת הסוד אינו על הדיסק', r.onDiskCol === false);
}

/* ══════════════════════════════════════════════════════════════════════════
   ב · שאר המשתמשים נשארים שלמים
   ══════════════════════════════════════════════════════════════════════════ */
async function secB() {
  sect('ב. עדכון חלקי אינו נוגע בשאר המראה');
  const h = makeCtx(SRC);
  const s = await seed(h);
  h.ctx[F.saveOne](cloudRow({ role: 'admin', pass_salt: s.b.salt, pass_fp: s.b.fp }));
  eq('עדיין שני משתמשים', rowsOf(h).length, 2);
  /*  ⚠️ `|| {}` בכוונה: מוטציה שמוחקת משתמש מהמראה חייבת להפיל **טענה**,
   *  ⛔ ולא לזרוק — אחרת הריצה נעצרת והפרקים שאחריה אינם נבדקים כלל. */
  const A = byId(h, 'aaa') || {};
  const B = byId(h, 'bbb') || {};
  eq('משתמש א — המלח שלו לא נגע', A.pass_salt, s.a.salt);
  eq('משתמש א — הטביעה שלו לא נגעה', A.pass_fp, s.a.fp);
  eq('⭐ משתמש ב — השדה שהשתנה אכן התעדכן', B.role, 'admin');
}

/* ══════════════════════════════════════════════════════════════════════════
   ג · מה שהעדכון אינו נושא — ⛔ וההצהרה נמדדת משני צדדיה
   ══════════════════════════════════════════════════════════════════════════
   ⚠️ עדכון שנושא את הטביעה חייב לשמר אותה בשלוש. ⛔ ועדכון שאינו נושא
   אותה — ⭐ יש שממזג ויש שמחליף שורה: ⚠️ ההבדל הוא **חוזה הקורא**,
   ⛔ והוא מוצהר ונמדד ⛔ ולא נקרא כתקלה. */
async function secC() {
  sect('ג. עדכון חלקי — מה שהוא נושא, ומה שאינו');
  const h = makeCtx(SRC);
  const s = await seed(h);
  h.ctx[F.saveOne](cloudRow({ full_name: 'שם חדש', pass_salt: s.b.salt, pass_fp: s.b.fp }));
  eq('⭐ עדכון שנושא את הטביעה משמר אותה', (byId(h, 'bbb') || {}).pass_fp, s.b.fp);

  const h2 = makeCtx(SRC);
  const s2 = await seed(h2);
  h2.ctx[F.saveOne](cloudRow({ full_name: 'שם חדש' }));
  const kept = (byId(h2, 'bbb') || {}).pass_fp === s2.b.fp;
  ok(`⛔ עדכון בלי טביעה — נמדד ${kept ? 'ממזג' : 'מחליף שורה'} מול המוצהר ` +
     `${APP.partialMerges ? 'ממזג' : 'מחליף שורה'}: ${APP.partialWhy}`,
     kept === APP.partialMerges);
}

/* ══════════════════════════════════════════════════════════════════════════
   ד · ⛔ הנתיב המלא עובר דרך אותו מסנן — ⚠️ מסנן שיושב בנתיב אחד בלבד
   ══════════════════════════════════════════════════════════════════════════ */
async function secD() {
  sect('ד. ⛔ הנתיב המלא עובר דרך אותו מסנן');
  const h = makeCtx(SRC);
  const s = await seed(h);
  h.ctx[F.saveAll]([
    cloudRow({ client_id: 'aaa', username: 'user_a', [APP.secretCol]: 'סוד-א',
               pass_salt: s.a.salt, pass_fp: s.a.fp }),
    cloudRow({ [APP.secretCol]: 'סוד-ב', pass_salt: s.b.salt, pass_fp: s.b.fp }),
  ]);
  eq('שני המשתמשים נשמרו', rowsOf(h).length, 2);
  ok('⛔ אין עמודת הסוד באף רשומה בזיכרון',
     rowsOf(h).length > 0 && rowsOf(h).every((u) => !(APP.secretCol in u)));
  ok('⛔ אף ערך סוד אינו על הדיסק',
     !diskHas(h.store, 'סוד-א') && !diskHas(h.store, 'סוד-ב'));
  ok('⛔ שם עמודת הסוד אינו על הדיסק', !diskHas(h.store, APP.secretCol));
}

/* ══════════════════════════════════════════════════════════════════════════
   ה · שני הנתיבים נשענים על אותו מסנן — במקור
   ══════════════════════════════════════════════════════════════════════════ */
function secE() {
  sect('ה. שני הנתיבים נשענים על אותו מסנן');
  const one = fnOf(SRC, F.saveOne), all = fnOf(SRC, F.saveAll);
  /*  ⛔ ההגעה למסנן נמדדת גם דרך עוזר מוצהר — ⚠️ נתיב שקורא לעוזר
   *  שעובר במסנן אינו נתיב שני, ⭐ והעוזר מוצהר בשמו. */
  const reach = (b) => b.includes(F.slim) ||
    APP.slimVia.some((v) => b.includes(v) && fnOf(SRC, v).includes(F.slim));
  ok(`⭐ ${F.saveOne} עובר ב-${F.slim}`, reach(one));
  ok(`⭐ ${F.saveAll} עובר ב-${F.slim}`, reach(all));
  /*  ⛔ השמירה נמדדת גם דרך עוזר מוצהר — ⚠️ נתיב שקורא לעוזר שנשמר
   *  אינו נתיב שני, ⭐ והעוזר מוצהר בשמו. */
  const hit = (b, n) => new RegExp('\\b' + n + '\\s*\\(').test(b);
  const saved = (b) => hit(b, APP.saveFn) ||
    APP.saveVia.some((v) => hit(b, v) && hit(fnOf(SRC, v), APP.saveFn));
  ok(`⛔ שני הנתיבים נשמרים דרך ${APP.saveFn}`, saved(one) && saved(all));
}

/* ══════════════════════════════════════════════════════════════════════════
   ו · ⛔ אין נתיב שלישי — כל אתר כתיבה יושב בפונקציה מוצהרת
   ══════════════════════════════════════════════════════════════════════════
   ⛔ אתר שכותב ל-`MIRROR[<טבלת המשתמשים>]` ואינו באחת מהן הוא בדיוק
   הנתיב שעוקף את המסנן — ⚠️ וזו הנקודה שנשברה פעמיים. */
function mirrorWriteSites(src) {
  const re = new RegExp('MIRROR\\[\\s*' + APP.tableConst + '\\s*\\]\\s*=|MIRROR\\.' + T + '\\s*=', 'g');
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const head = src.slice(0, m.index);
    const f = [...head.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)].pop();
    out.push(f ? f[1] : '(ברמת המודול)');
  }
  return out;
}
function secF() {
  sect('ו. ⛔ אין נתיב שלישי');
  const sites = mirrorWriteSites(SRC);
  const stray = sites.filter((f) => !APP.writeFns.includes(f));
  ok(`⛔ ${sites.length} אתרי כתיבה למראת המשתמשים, וכולם בפונקציה מוצהרת — ` +
     `נמדדו ${stray.length} חורגים (${stray.join(', ') || 'אין'}) והצפוי אפס`,
     sites.length > 0 && stray.length === 0);
  const unused = APP.writeFns.filter((f) => !sites.includes(f));
  ok(`⛔ וכל פונקציה מוצהרת אכן כותבת — נמדדו ${unused.length} הכרזות בלי אתר ` +
     `(${unused.join(', ') || 'אין'}) והצפוי אפס`, unused.length === 0);
  const cfg = declOf(SRC, 'MIRROR_CFG');
  const inPush = new RegExp('PUSH_TABLES\\s*=\\s*\\[[^\\]]*' + T).test(SRC);
  const declared = new RegExp("t:\\s*'" + T + "'[^}]*via:\\s*'writeUser'").test(cfg);
  ok(`⛔ טבלת המשתמשים אינה ב-PUSH_TABLES ומוכרזת ב-noPush עם \`writeUser\` — ` +
     `נמדד ${inPush ? 'נדחפת' : 'אינה נדחפת'} ו${declared ? 'מוכרזת' : 'אינה מוכרזת'}`,
     !inPush && declared);
}

/* ── הרצה ──────────────────────────────────────────────────────────────── */
async function run() {
  console.log(`\n═══ נתיב עדכון חלקי למראת המשתמשים (${APP.app}) ═══`);
  await secA();
  await secB();
  await secC();
  await secD();
  secE();
  secF();

  /*  ⛔ מכאן ולמטה מוטציות (סבב 92) — ⚠️ הן רצות ברמה המלאה בלבד. */
  mutStage();
  if (!RUN_MUT) {
    console.log('\n⏭ test_users_patch: המוטציות רצות ברמה המלאה (--full)');
    console.log(`\n[${APP.app}] ${passN} עברו, ${failN} נכשלו`);
    process.exit(failN ? 1 : 0);
  }
  sect('מוטציות');
  const slimSrc = fnOf(SRC, F.slim);
  const mut = SRC.replace(slimSrc, APP.slimMut.identity);
  ok('⛔ המוטציה אכן החליפה את גוף המסנן', mut !== SRC);
  const rm = await partialLeak(mut);
  ok('⛔ מוטציה: מסנן זהות מפיל את «אין עמודת הסוד ברשומה שבזיכרון» — ' +
     `נמדד ${rm.inMem ? 'הסוד נכנס' : 'הסוד לא נכנס'} והצפוי «הסוד נכנס»`, rm.inMem === true);
  const anti = SRC.replace(slimSrc, APP.slimMut.anti);
  ok('⭐ מוטציית-הנגד אכן שינתה את הגוף', anti !== SRC);
  const ra = await partialLeak(anti);
  ok('⭐ מוטציית-נגד: שדה שאינו סוד ⛔ אינו מפיל — נמדד המסנן, ולא הצורה',
     ra.inMem === false && ra.onDiskVal === false);

  console.log('\n' + (failN ? '❌' : '✅') + `  [${APP.app}] ${passN} עברו, ${failN} נכשלו`);
  process.exit(failN ? 1 : 0);
}

run().catch((e) => { console.error('💥 ' + ((e && e.stack) || e)); process.exit(1); });
