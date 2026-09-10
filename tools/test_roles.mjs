#!/usr/bin/env node
/*  test_roles.mjs — מודל ההרשאות: תפקיד במקום סיסמת שער.
 *
 *  **מה נאכף:** ארבע אינווריאנטות — (1) מנהל נכנס למסך ההגדרות;
 *  (2) מי שאינו מנהל נחסם **ומקבל את ההודעה הנכונה**, ⛔ שנבדלת מההודעה
 *  של «העמודה עדיין לא קיימת»; (3) ⛔ סיסמת השער הישנה אינה קיימת באף
 *  מפתח אחסון אחרי ההגירה; (4) ⛔ אף מסלול אינו משווה מול שם התפקיד
 *  כסיסמה.
 *
 *  **הנימוק המדוד:** נפילה-חזרה לשם התפקיד כסיסמה הייתה **שער שנפתח לכל
 *  מקליד** בהתקנה טרייה.
 *
 *  **מה יישבר בלעדיו:** ⛔ איחוד שתי ההודעות שולח מנהל שחסרה לו עמודה
 *  לחפש באג במקום מיגרציה, ⚠️ והוא נשאר בחוץ.
 *
 *  **מה אינו נאכף כאן:** ⛔ ההרשאות שבמסד — ⚠️ הן נאכפות בשכבת האפליקציה
 *  בהחלטה מודעת, ⭐ והכרעת מודל האבטחה היא של המנהל.
 *
 *  ⚠️ הבדיקה רצה על הקוד האמיתי המחולץ מ-`index.html`, ⛔ לא על העתק.
 *  ⚠️ **פרטי לאפליקציה הזו** — ⛔ ואין ליישר אותו.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
/*  ⛔ ארבע האינווריאנטות והרתמה יושבות במודול הטהור המשותף (סבב 114) —
 *  ⚠️ שלוש אפליקציות ⛔ ולא שלוש רתמות: ⭐ מה שנשאר כאן הוא **הפרטי** —
 *  שמות הפונקציות, ה-DOM שהמסך נשען עליו, ושרידי המעבר. */
import { reporter, extract, adminGaps, messageGaps,
         residueGaps, rolePasswordGaps } from './roles-harness.mjs';


/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SQL000 = fs.readFileSync(path.join(ROOT, 'migrations', '000_initial_schema.sql'), 'utf8');
const SQL011 = fs.readFileSync(path.join(ROOT, 'migrations', '011_users_role.sql'), 'utf8');

const REP = reporter();
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמונה נקרא מהרתמה המשותפת, ⛔ שהיא המדווחת כאן. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 0, app: 83, appWhy: 'מודל ההרשאות — קיים בשלוש שיש בהן כניסה, ובשכר גם רתמת ההרשאות המלאה' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  RAN += REP.st.pass + REP.st.fail;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
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
const { ok, eq, sect } = REP;

/* ── חילוץ מהקוד האמיתי — מהמודול הטהור המשותף ─────────────────────────── */
const { fn, decl, body, hasFn } = extract(SRC);

/*  ⛔ מראת המשתמשים היא טבלה בשכבת המראה (סבב 118) — ⚠️ השורות חיות
 *  ב-`MIRROR` בשם הטבלה, ⛔ ואין מבנה שני לצידו. */
const UROWS = (h) => h.ctx.MIRROR[h.ctx.SL_USERS_TABLE] || [];
const setU  = (h, arr) => { h.ctx.MIRROR[h.ctx.SL_USERS_TABLE] = arr; };

const NAMES_VAR = [
  'SL_USERS_TABLE', 'SL_USER_COLS', 'SL_PASS_ITER_USER', 'SL_PASS_CTX',
  'SL_NEVER_MIRROR_SETTINGS',
  '_sessUser', '_sessBooted', 'MSG_SET_DENIED', 'MSG_SET_NO_ROLE',
  'MSG_OFF_UNKNOWN', 'MSG_OFF_NO_FP', 'MSG_OFF_NO_CRYPTO', 'MSG_NO_USERS',
  /*  ⭐ סבב 113 — שם התפקיד המורשה, ⛔ במקום אחד. */
  'ROLE_ADMIN',
  'MIRROR_CFG', 'PUSH_TABLES', 'SL_STAMP_KEY', 'SL_NEVER_MIRROR_SETTINGS',
];
const NAMES_FN = [
  'slUserPub', 'slRandSalt', 'slPassFp', 'slMakePassFp',
  'slUsersLoad', 'slUsersSave', 'slUserByName', 'slPullUsers', 'slVerifyOffline',
  /*  ⛔ שכבת המראה (סבב 118) — ⚠️ מראת המשתמשים היא טבלה בתוכה, ⭐ ורתמה
   *  שאינה מחלצת את השכבה מקבלת `ReferenceError` שנבלע ב-`catch`. */
  'mirrorKey', 'mirrorTables', 'mirrorLoadOne', 'mirrorSave',
  'slSanitizeRows', 'slStripMeta', 'slAdoptLegacyId', 'slTs',
  'slSettingsAccess', 'slIsAdmin',
  /*  ⭐ סבב 113 — ההשוואה לתפקיד עברה לבלוק המשותף. ⛔ הרתמה מחלצת
   *  אותו, ⚠️ ובלעדיו `slSettingsAccess` נופלת ב-ReferenceError. */
  'isAdminOf', 'isAdmin',
  /*  ⭐ סבב 53 — המשתמש המחובר חי במודול הסשן המשותף. */
  'sessSet', 'sessGet', 'sessClear', 'sessActive', 'slResolveUser',
  'showPanel', 'renderSettingsPanel', 'refreshUI',
  'doLogin', 'doLoginOffline',
];

/* ── DOM מזויף ─────────────────────────────────────────────────────────── */
// חוזה מינימלי שמדמה בדיוק את מה שהקוד נשען עליו: `style.display`,
// `classList` עם `contains`, `innerHTML`/`textContent` ו-`value`.
function makeDom() {
  const els = Object.create(null);
  const mk = (id) => {
    const cls = new Set();
    return {
      id, style: {}, innerHTML: '', textContent: '', value: '',
      classList: {
        add: (c) => cls.add(c), remove: (c) => cls.delete(c),
        contains: (c) => cls.has(c),
      },
      _cls: cls,
    };
  };
  const get = (id) => els[id] || (els[id] = mk(id));
  // כל המזהים שהקוד נוגע בהם, מראש — כדי ש-`querySelectorAll` יראה אותם.
  ['settings-denied', 'settings-main', 'set-denied-msg', 'set-def-tuition',
   'panel-settings', 'panel-dash', 'auth-screen', 'main-app', 'nav-username',
   'auth-spinner', 'au-user', 'au-pass'].forEach(get);
  return {
    els,
    document: {
      getElementById: get,
      querySelectorAll: (sel) => (sel === '.panel'
        ? Object.keys(els).filter((k) => k.indexOf('panel-') === 0).map(get)
        : []),
    },
  };
}

/* ── הרתמה ─────────────────────────────────────────────────────────────── */
function makeCtx(opts = {}) {
  const store = Object.create(null);
  const dom = makeDom();
  const calls = { toast: [], authErr: [], sb: [], lsLog: [], enter: 0, lists: 0 };
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    TextEncoder, Promise, Object, Array, String, JSON, Date, Uint8Array, isFinite, RegExp, Math,
    crypto: opts.noCrypto ? undefined : webcrypto,
    navigator: { onLine: opts.online !== false },
    document: dom.document,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    MIRROR: {}, STUDENTS: [], TRANSACTIONS: [], SETTINGS: { default_tuition: '2500' }, LISTS: {},
    SYNC_INT: null, SC_STUDENT_ID: null,
    MSG_BAD_LOGIN: '❌ שם משתמש או סיסמה שגויים',
    lsSet(k, v) { store[k] = String(v); return true; },
    lsSetArray(k, arr) { store[k] = JSON.stringify(arr); return true; },
    // ⭐ סבב 35: שער הדיסק של החלון החם עוטף את כתיבות המראה — כאן שקוף
    //    בכוונה; בדיקות החלון עצמו יושבות ב-test_hotwin.
    hwDiskFilter(k, rows) { return rows; },
    hwNoteCloud() {},
    lsGet(k, d) { return k in store ? store[k] : d; },
    lsRemove(k) { delete store[k]; },
    lsLog(a, d) { calls.lsLog.push(a + ' | ' + d); },
    withTimeout: (p) => p,
    isNetErr: (e) => /Failed to fetch|NetworkError|network/i.test(String(e && (e.message || e))),
    showAuthErr(m) { calls.authErr.push(m); },
    startAuthLoad() {},
    enterApp() { calls.enter++; },
    /*  ⛔ שומר ההקשר — ⚠️ הוא חי בבלוק חתום אחר, ⭐ והרתמה מספקת אותו
     *  כדי שמסלולי הכניסה ייטענו לבדם: ⛔ מונה אמיתי, ⚠️ ולא ערך קבוע
     *  שאינו יכול להתחלף. */
    _ctxEpoch: 0,
    ctxEpoch() { return ctx._ctxEpoch; },
    ctxSwitch() { return ++ctx._ctxEpoch; },
    ctxStale(e) { return e !== ctx._ctxEpoch; },
    toast(m) { calls.toast.push(m); },
    // קוראים חיצוניים שאינם בתחום הסבב הזה.
    renderSettingsLists() { calls.lists++; },
    updateDropdowns() {}, renderDash() {}, renderTxnLog() {}, renderStudentCard() {},
    slApplyMirror() {},
    slEnsurePassFp: () => Promise.resolve(false),
    _slUsersPulling: false,
    refreshUI() {}, syncAll() {},
  };
  // לקוח Supabase מזויף — רושם כל שאילתה, כדי שאפשר יהיה לטעון
  // «אפס קריאות רשת» ולבדוק אילו עמודות נתבקשו.
  ctx.SB = {
    from(table) {
      const q = { table, cols: null, eqs: {}, kind: 'select' };
      const api = {
        select(cols) { q.cols = cols; calls.sb.push(q); return api; },
        update(b) { q.kind = 'update'; q.body = b; calls.sb.push(q); return api; },
        eq(c, v) { q.eqs[c] = v; return api; },
        limit(n) { q.limit = n; return api; },
        maybeSingle() { return api; },
        then(res, rej) {
          return Promise.resolve(opts.reply ? opts.reply(q) : { data: null, error: null }).then(res, rej);
        },
      };
      return api;
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(NAMES_VAR.map(decl).join('\n') + '\n' + NAMES_FN.map(fn).join('\n'), ctx);
  return { ctx, store, calls, dom };
}

/*  ⛔ ההמתנה היא **תנאי** עם תקרה ⛔ ולא שעון — ⚠️ שינה בגודל קבוע נגמרת
 *  על מכונה עמוסה לפני שהשרשרת הא-סינכרונית סיימה: ⭐ התקרה קיימת כדי
 *  להיכשל ברעש ⛔ ולא כדי לתזמן.
 *  ⚠️ **פרטי כאן** ⛔ ואינו במודול המשותף — ⭐ הוא נקרא באפליקציה הזו
 *  בלבד, ⛔ ומודול שיש בו פונקציה שאיש אינו קורא הוא בדיוק מה שהשער
 *  «פונקציה בלי קוראים» בא לסלק. */
async function waitFor(pred, label, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 5));
  }
  ok('⛔ ' + label + ' — לא קרה בתוך ' + ms + 'ms', false);
  return false;
}

/*  ⛔ שלושת מצבי ההרשאה — ⚠️ **פרטי כאן**: ⭐ מצב «העמודה אינה קיימת»
 *  קיים באפליקציה הזו בלבד, ⛔ ולשתי האחיות אין תשובה שלישית להשוות. */
function accessGaps(access) {
  const out = [];
  const say = (u) => { try { return access(u); } catch (e) { return 'threw:' + e.message; } };
  const cases = [
    ['מורשה', { role: 'admin' }, 'ok'],
    ['שאינו מורשה', { role: 'manager' }, 'denied'],
    ['תפקיד ריק', { role: '' }, 'no-role'],
    ['תפקיד חסר', {}, 'no-role'],
    ['תפקיד שהוקלד בטעות', { role: 'admn' }, 'denied'],
    ['בלי משתמש', null, 'denied'],
  ];
  for (const [label, user, want] of cases) {
    const got = say(user);
    if (got !== want) out.push(label + ': נמדד «' + got + '» והצפוי «' + want + '»');
  }
  return out;
}

const ADMIN = { id: 1, username: 'shimon', role: 'admin' };
const PLAIN = { id: 2, username: 'levi', role: 'user' };

/* ═══════════════════════════════════════════════════════════════════════ */
async function main() {

  /* ── א. ההרשאה נגזרת מהתפקיד ─────────────────────────────────────────── */
  sect('א. slSettingsAccess — שלושה מצבים, ונכשל סגור');
  {
    const h = makeCtx();
    /*  ⛔ שלושת המצבים דרך האינווריאנטה המשותפת — ⚠️ אותן שש מדידות
     *  בשלוש האפליקציות, ⭐ ומי שאין לו משתמש כלל נחסם אף הוא. */
    const gaps = accessGaps((u) => h.ctx.slSettingsAccess(u));
    ok('⭐ שלושת מצבי ההרשאה, ונכשל סגור', gaps.length === 0, gaps.join(' · '));
    eq('תפקיד עם רווח ⇒ denied', h.ctx.slSettingsAccess({ role: ' admin' }), 'denied');
    eq('תפקיד null ⇒ no-role', h.ctx.slSettingsAccess({ role: null }), 'no-role');
    const mg = messageGaps([h.ctx.MSG_SET_DENIED, h.ctx.MSG_SET_NO_ROLE]);
    ok('⭐ שתי הודעות החסימה נבדלות ואינן ריקות', mg.length === 0, mg.join(' · '));
    const ag = adminGaps((u) => h.ctx.isAdminOf(u));
    ok('⛔ ההשוואה היא ל-`admin` בדיוק, בעשרה מצבים', ag.length === 0, ag.join(' · '));
    const rp = rolePasswordGaps(SRC, ['admin', 'manager', 'junior']);
    ok('⛔ אין מסלול שמשווה סיסמה מול שם תפקיד', rp.length === 0, rp.join(' · '));

    h.ctx.sessSet({ role: 'admin' });
    ok('slIsAdmin קורא את CUR_USER כברירת מחדל', h.ctx.slIsAdmin());
    h.ctx.sessSet({ role: 'user' });
    ok('ומחזיר false ללא-admin', !h.ctx.slIsAdmin());
    h.ctx.sessSet(null);
    ok('ובלי משתמש מחובר', !h.ctx.slIsAdmin());
  }

  /* ── ב. מסך ההגדרות ──────────────────────────────────────────────────── */
  sect('ב. ⭐ admin נכנס · לא-admin נחסם עם ההודעה הנכונה');
  {
    const h = makeCtx();
    h.ctx.sessSet(Object.assign({}, ADMIN));
    h.ctx.showPanel('settings');
    eq('⭐ admin — מסך ההגדרות מוצג', h.dom.els['settings-main'].style.display, 'block');
    eq('וכרטיס החסימה מוסתר', h.dom.els['settings-denied'].style.display, 'none');
    eq('שכר הלימוד נטען לשדה', h.dom.els['set-def-tuition'].value, '2500');
    eq('הרשימות רונדרו', h.calls.lists, 1);
    eq('⛔ ואפס קריאות רשת — ההרשאה עובדת אופליין', h.calls.sb.length, 0);
  }
  {
    const h = makeCtx();
    h.ctx.sessSet(Object.assign({}, PLAIN));
    h.ctx.showPanel('settings');
    eq('⭐ לא-admin — ההגדרות מוסתרות', h.dom.els['settings-main'].style.display, 'none');
    eq('וכרטיס החסימה מוצג', h.dom.els['settings-denied'].style.display, 'block');
    eq('⭐ ההודעה היא MSG_SET_DENIED', h.dom.els['set-denied-msg'].innerHTML, h.ctx.MSG_SET_DENIED);
    ok('⛔ ולא ההודעה של מיגרציה חסרה',
      h.dom.els['set-denied-msg'].innerHTML !== h.ctx.MSG_SET_NO_ROLE);
    eq('הרשימות לא רונדרו', h.calls.lists, 0);
    eq('⛔ אפס קריאות רשת', h.calls.sb.length, 0);
  }
  {
    // 011 טרם הורצה: אין עמודה, ולכן אין תפקיד לאיש. ⚠️ ההודעה **חייבת**
    // להיבדל — «אין לך הרשאה» למנהל שרק צריך להריץ מיגרציה שולח אותו
    // לחפש באג בהרשאות במקום להריץ את השורה שתפתור.
    const h = makeCtx();
    h.ctx.sessSet({ id: 1, username: 'shimon' });
    h.ctx.showPanel('settings');
    eq('אין עמודת role — ההגדרות מוסתרות', h.dom.els['settings-main'].style.display, 'none');
    eq('⭐ וההודעה היא MSG_SET_NO_ROLE', h.dom.els['set-denied-msg'].innerHTML, h.ctx.MSG_SET_NO_ROLE);
    ok('⭐ שתי ההודעות נבדלות זו מזו', h.ctx.MSG_SET_DENIED !== h.ctx.MSG_SET_NO_ROLE);
    ok('MSG_SET_NO_ROLE מפנה למיגרציה בשמה', h.ctx.MSG_SET_NO_ROLE.indexOf('011') !== -1);
  }
  {
    // `refreshUI` רץ כל 3 שניות עם הסנכרון. הוא לא אמור לרנדר את מסך
    // ההגדרות למי שאינו רואה אותו — לא מחוסר הרשאה, ולא כשהפאנל סגור.
    const h = makeCtx();
    h.ctx.sessSet(Object.assign({}, ADMIN));
    h.ctx.refreshUI = undefined;
    vm.runInContext(fn('refreshUI'), h.ctx);
    h.ctx.refreshUI();
    eq('refreshUI אינו מרנדר הגדרות כשהפאנל סגור', h.calls.lists, 0);
    h.dom.els['panel-settings'].classList.add('active');
    h.ctx.refreshUI();
    eq('ומרנדר כשהוא פתוח ויש הרשאה', h.calls.lists, 1);
    h.ctx.sessSet(Object.assign({}, PLAIN));
    h.ctx.refreshUI();
    eq('⛔ ואינו מרנדר ללא-admin גם כשהפאנל פתוח', h.calls.lists, 1);
  }

  /* ── ג. התפקיד — מהמראה, ⛔ ולא מסשן ששרד על הדיסק ────────────────────── */
  sect('ג. התפקיד זמין גם בכניסה בלי רשת');
  {
    /*  ⭐ סבב 53 — `sl_session` הוסר, ולכן «התפקיד שורד עלייה מחדש» כבר
     *  אינו השער. מה שנבדק כאן הוא מה שנשאר נכון: התפקיד מגיע **מהמראה**,
     *  שיורדת לדיסק בלי סיסמאות, ולכן הוא זמין גם בכניסה אופליין. */
    const h = makeCtx({ online: false });
    setU(h, [{ id: 1, username: ADMIN.username, role: 'admin', active: true }]);
    eq('⭐ התפקיד נקרא מהמראה בכניסה בלי רשת',
      h.ctx.slSettingsAccess(h.ctx.slResolveUser({ id: 1, username: ADMIN.username })), 'ok');
    ok('⛔ ואין מפתח סשן על הדיסק', !('sl_session' in h.store));
  }
  {
    // המראה מנצחת: תפקיד שהשתנה בלוח הבקרה והגיע במשיכה גובר על הערך שביד.
    const h = makeCtx();
    setU(h, [{ id: 1, username: 'shimon', role: 'user', active: true }]);
    const merged = h.ctx.slResolveUser({ id: 1, username: 'shimon', role: 'admin' });
    eq('⭐ המראה גוברת', merged.role, 'user');
    eq('ולכן הגישה נשללת', h.ctx.slSettingsAccess(merged), 'denied');
    const noMirror = h.ctx.slResolveUser({ id: 9, username: 'ploni', role: 'admin' });
    eq('מי שאינו במראה — נשאר עם הערך שביד', noMirror.role, 'admin');
  }
  {
    // ⭐ המתנה ל**אירוע**: משיכת המשתמשים מרעננת את התפקיד של המחובר.
    const h = makeCtx({
      reply: (q) => (q.table === 'sl_users' && q.kind === 'select' && !q.eqs.username)
        ? { data: [{ id: 1, username: 'shimon', role: 'user', active: true }], error: null }
        : { data: null, error: null },
    });
    h.ctx.sessSet(Object.assign({}, ADMIN));
    h.ctx.slPullUsers();
    await waitFor(() => h.ctx.sessGet() && h.ctx.sessGet().role === 'user',
      'רענון התפקיד אחרי משיכת המשתמשים');
    eq('⭐ תפקיד שהורד בלוח הבקרה מגיע למכשיר', h.ctx.sessGet().role, 'user');
    ok('⛔ ואין מפתח סשן על הדיסק (סבב 53)', !('sl_session' in h.store));
    eq('⛔ ולא נשמרה סיסמה במראת המשתמשים',
      String(h.store['sl_mirror_users']).indexOf('password'), -1);
  }
  {
    const h = makeCtx();
    ok('role נמצא ברשימת ההיתר', h.ctx.SL_USER_COLS.indexOf('role') !== -1);
    ok('⛔ password אינו ברשימת ההיתר', h.ctx.SL_USER_COLS.indexOf('password') === -1);
    eq('slUserPub שומר role', h.ctx.slUserPub({ id: 1, username: 'a', role: 'admin' }).role, 'admin');
    ok('⛔ slUserPub מפיל password',
      !('password' in h.ctx.slUserPub({ id: 1, username: 'a', password: 'סוד', role: 'admin' })));
    // ⭐ סבב 38 — הסולם נמחק; `role` יורד למכשיר ברשימת ההיתר הישירה,
    //    ואין יותר מסלול שמסיר עמודות בזמן ריצה.
    ok('⛔ slMissingCol אינה קיימת עוד', typeof h.ctx.slMissingCol === 'undefined');
    ok('⛔ slSelectUsers אינה קיימת עוד', typeof h.ctx.slSelectUsers === 'undefined');
  }

  /* ── ד. המנגנון הישן הוסר לחלוטין ────────────────────────────────────── */
  sect('ד. ⛔ שער הסיסמה — הוסר, ואין שריד');
  {
    ok('⛔ unlockSettings אינה קיימת', !hasFn('unlockSettings'));
    ok('⛔ changeAdminPass אינה קיימת', !hasFn('changeAdminPass'));
    ok('⛔ slPassOf אינה קיימת', !hasFn('slPassOf'));
    ok('⛔ slHashPass אינה קיימת', !hasFn('slHashPass'));
    ok('⛔ slRememberPassHash אינה קיימת', !hasFn('slRememberPassHash'));
    ok('⛔ אין SL_PASS_HASH_KEY', !/^var SL_PASS_HASH_KEY\s*=/m.test(SRC));
    ok('⛔ אין SL_PASS_SALT', !/^var SL_PASS_SALT\s*=/m.test(SRC));
    ok('⛔ אין _settingsUnlocked בקוד', SRC.indexOf('_settingsUnlocked') === -1);
    ok('⛔ אין עוגן settings-lock', SRC.indexOf('settings-lock') === -1);
    ok('⛔ אין שדה סיסמת שער', SRC.indexOf('set-pass-input') === -1);
    ok('⛔ אין שדות שינוי סיסמת מנהל',
      SRC.indexOf('set-new-pass') === -1 && SRC.indexOf('set-new-pass2') === -1);
    // ⭐ הפרצה עצמה: נפילה-חזרה למחרוזת 'admin' כערך סיסמה.
    ok("⭐⛔ אין בקוד נפילה-חזרה ל-'admin' כסיסמה",
      !/\|\|\s*'admin'/.test(SRC) && !/\|\|\s*"admin"/.test(SRC));
    ok("⛔ ואין השוואה כלשהי מול === 'admin' על ערך הגדרה",
      !/SETTINGS\s*\[\s*'admin_pass'\s*\]/.test(SRC));
    // ⭐ שורת admin_pass נמחקה מהמסד ומהגיבויים בהחלטת המנהל, והרשימה
    //    רוקנה. ⛔ מנגנון הסינון נשאר דרוך — ⚠️ שלוש נקודות האכיפה שלו
    //    נאמתות במפתח בדיקה זמני, ⛔ ורשימה ריקה אינה מנגנון שהוסר.
    const h = makeCtx();
    ok('הרשימה ריקה — admin_pass אינו עוד ברשימת «לא יורד לדיסק»',
      h.ctx.SL_NEVER_MIRROR_SETTINGS.indexOf('admin_pass') === -1);
  }

  /* ── ה. הסכימה ───────────────────────────────────────────────────────── */
  sect('ה. הסכימה — role נוסף, admin_pass לא נזרע');
  {
    // ⚠️ הסרת שורות הערה **לפני** הבדיקה. `000` מכיל בהערה דוגמת
    // `INSERT INTO public.sl_users` שהמנהל מריץ ידנית, ובדיקה על הטקסט
    // הגולמי הייתה קוראת אותה כזריעה — כלומר נכשלת על הדבר הנכון.
    const code000 = SQL000.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    ok('⛔ 000 אינו זורע admin_pass', !/INSERT INTO public\.sl_settings[^;]*admin_pass/i.test(code000));
    ok("⛔ ואין בו את הצמד ('admin_pass', 'admin')", code000.indexOf("'admin_pass', 'admin'") === -1);
    ok('⛔ 000 עדיין אינו זורע משתמש', !/INSERT INTO public\.sl_users/i.test(code000));
    ok('⛔ ואינו זורע שום INSERT ל-sl_users גם בהערה עם ערכים אמיתיים',
      !/INSERT INTO public\.sl_users[^;]*VALUES\s*\(\s*'[^']*'\s*,\s*'\d{6}'\s*,\s*'admin'\s*\)/i
        .test(code000));
    ok('000 מגדיר role על sl_users', /role\s+TEXT NOT NULL,/.test(SQL000));
    // ⭐ **ההשלמה של סבב 26.** הניסוח הראשון היה `DEFAULT 'admin'` — ברירת
    // מחדל ש**מעניקה** הרשאה, כלומר בדיוק משפחת הכשל שהסבב בא לסגור, וגם
    // החריגה היחידה בארגון (`ys_users` בלי DEFAULT; `g_users` עם DEFAULT
    // אבל של התפקיד הנמוך). הטענה הפוכה עכשיו: אין DEFAULT כלל.
    const code000NoCmt = SQL000.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    // ⚠️ שורת `DROP DEFAULT` מנוטרלת מהבדיקה — היא בדיוק ההפך ממה שנאסר.
    const noDrop000 = code000NoCmt.split('\n').filter((l) => !/DROP DEFAULT/i.test(l)).join('\n');
    ok("⭐⛔ 000 אינו נותן ל-role שום DEFAULT",
      !/role[^;\n]*DEFAULT/i.test(noDrop000) && !/DEFAULT\s*'(admin|user)'/i.test(noDrop000));
    ok('000 כולל שדרוג ADD COLUMN IF NOT EXISTS role', /ADD COLUMN IF NOT EXISTS role/.test(SQL000));
    ok('000 נועל NOT NULL ומסיר DEFAULT בשדרוג',
      /ALTER COLUMN role SET NOT NULL/.test(code000NoCmt) &&
      /ALTER COLUMN role DROP DEFAULT/.test(code000NoCmt));
    ok('הוראת המשתמש הראשון כוללת role', /INSERT INTO public\.sl_users \(username, password, role\)/.test(SQL000));

    const stmts = SQL011.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join(' ');
    ok('011 אדיטיבית — ADD COLUMN IF NOT EXISTS בלבד', /ADD COLUMN IF NOT EXISTS role TEXT/.test(stmts));
    ok('⛔ 011 אינה נוגעת ב-password', stmts.indexOf('password') === -1);
    // ⚠️ הטענה הקודמת הייתה «אין UPDATE ואין DROP כלל». היא **לא הוחלשה** —
    // היא חודדה: 011 כן מריצה UPDATE אחד ו-DROP אחד, ולכן נבדק שהם בדיוק
    // אלה שמותרים. UPDATE **בלי** `WHERE role IS NULL` היה דורס תפקידים
    // קיימים; `DROP TABLE`/`DROP COLUMN` היה משמיד נתונים.
    const updates = stmts.match(/\bUPDATE\b[^;]*;/gi) || [];
    ok('⛔ 011 — ה-UPDATE היחיד הוא מילוי שורות שקדמו לעמודה',
      updates.length === 1 && /WHERE\s+role\s+IS\s+NULL/i.test(updates[0]) &&
      /SET\s+role\s*=\s*'admin'/i.test(updates[0]));
    ok('⛔ 011 — ה-DROP היחיד הוא DROP DEFAULT',
      (stmts.match(/\bDROP\b/gi) || []).length === 1 && /ALTER COLUMN role DROP DEFAULT/.test(stmts));
    ok('⛔ 011 אינה מוחקת נתונים', !/\bDELETE\b/i.test(stmts) && !/DROP\s+(TABLE|COLUMN)/i.test(stmts));
    ok('⛔ 011 אינה זורעת משתמש', !/INSERT\s+INTO/i.test(stmts));
    ok('⭐⛔ 011 אינה משאירה DEFAULT על role',
      !/DEFAULT\s*'/i.test(stmts) && /ALTER COLUMN role SET NOT NULL/.test(stmts));
  }

  /* ── ו. מסלולי הכניסה לא נגעו ────────────────────────────────────────── */
  sect('ו. ⛔ מנגנון הכניסה עצמו לא נגע');
  {
    const h = makeCtx();
    // כניסה אופליין עדיין עובדת, ומחזירה את התפקיד מהמראה.
    const made = await h.ctx.slMakePassFp('135790');
    setU(h, [{ id: 1, username: 'shimon', role: 'admin', pass_salt: made.salt, pass_fp: made.fp, active: true }]);
    eq('סיסמה נכונה ⇒ ok', await h.ctx.slVerifyOffline(UROWS(h)[0], '135790'), 'ok');
    eq('סיסמה שגויה ⇒ bad', await h.ctx.slVerifyOffline(UROWS(h)[0], '999999'), 'bad');
    eq('בלי טביעה ⇒ no-fp', await h.ctx.slVerifyOffline({ username: 'x', active: true }, '135790'), 'no-fp');

    const h2 = makeCtx({ online: false });
    setU(h2, UROWS(h));
    h2.dom.els['au-user'].value = 'shimon';
    h2.dom.els['au-pass'].value = '135790';
    await h2.ctx.doLoginOffline('shimon', '135790');
    eq('⭐ כניסה אופליין עדיין עובדת', h2.calls.enter, 1);
    eq('ובלי שגיאה', h2.calls.authErr.length, 0);
    eq('⭐ והתפקיד ירד עם המשתמש', h2.ctx.sessGet().role, 'admin');
    /*  ⭐ סבב 53 — אין סשן שנשמר; הטענה הופכת ל«אין סיסמה באף מפתח». */
    ok('⛔ ואין את הסיסמה באף מפתח על הדיסק',
      Object.keys(h2.store).every((k) => String(h2.store[k]).indexOf('135790') === -1));

    ok('⛔ אין אכיפת פורמט שש ספרות בגוף doLogin', body('doLogin').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ ולא ב-doLoginOffline', body('doLoginOffline').indexOf('PASS_SIX_RE') === -1);
    /*  ⭐ סבב 132 — `PASS_SIX_RE` חזר עם מסך שינוי הסיסמה, ⛔ והטענה
     *  מודדת את מה שהיא מדדה מלכתחילה: ⚠️ **האכיפה במסלול השינוי בלבד**,
     *  ⛔ ולא במסלול הכניסה. */
    ok('⛔ PASS_SIX_RE נאכף במסלול שינוי הסיסמה',
      /^var PASS_SIX_RE\s*=/m.test(SRC) &&
      body('slSaveMyPassword').indexOf('PASS_SIX_RE') !== -1);
    ok('שדה הכניסה שומר על רמז הקלט',
      /id="au-pass"[^>]*inputmode="numeric"/.test(SRC) && /id="au-pass"[^>]*maxlength="6"/.test(SRC));
  }

  /* ── ז. גרסת המטמון ──────────────────────────────────────────────────── */
  sect('ז. service worker');
  {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    // ⚠️ תבנית ולא מספר קבוע — טענה שמקבעת מספר נכשלת על כל קידום עתידי,
    //    כלומר חוסמת בדיוק את מה שכלל קריטי 2 מחייב.
    ok('CACHE_NAME בתבנית schar-limud-v<N>', /CACHE_NAME = 'schar-limud-v\d+'/.test(sw));
  }

  process.exit(REP.summary('מודל ההרשאות') ? 1 : 0);
}

/*  ⛔ **`await` ולא קריאה חופשית** (סבב 114) — ⚠️ הסוגר שמתחת קורא
 *  ל-`process.exit` באופן סינכרוני: ⭐ בלעדיו התהליך נסגר אחרי ה-`await`
 *  הראשון שבתוך הרתמה, ⛔ ורוב הטענות אינן רצות כלל. */
await main().catch((e) => { console.error('💥 ' + ((e && e.stack) || e)); process.exit(1); });

/* ───────────────────────────────────────────────────────────────────────────
   ⛔ מוטציה ומוטציית-נגד — סבב 67
   ───────────────────────────────────────────────────────────────────────────
   ⛔ שער נכנס עם מוטציה, או עם נימוק כתוב מדוע אינו ניתן למוטציה.
   ⚠️ בלעדיה אין שום ראיה שהשער **מסוגל** ליפול: 97 טענות שעוברות על עץ
   תקין נראות כרשת ביטחון ופועלות כאישור. ⛔ והמוטציה רצה על **עותק
   בתיקייה זמנית** ולא על העץ (הלקח של סבב 42ג).
   ⚠️ הרצת-המשנה מסומנת ב-`RD67_MUT` — ⛔ בלעדיו המוטציה הייתה מריצה את
   עצמה שוב בתוך העותק, לאין סוף.
   ──────────────────────────────────────────────────────────────────────── */
if (!process.env.RD67_MUT) {
  const _m = await import('node:fs');
  const _p = await import('node:path');
  const _o = await import('node:os');
  const _c = await import('node:child_process');
  const _self = new URL(import.meta.url).pathname;
  const _name = _p.basename(_self);
  const _root = _p.resolve(_p.dirname(_self), '..');
  const _run = (dir) => _c.spawnSync(process.execPath, [_p.join(dir, 'tools', _name)],
    { cwd: dir, encoding: 'utf8', env: { ...process.env, RD67_MUT: '1' } }).status;

  const _mut = (label, file, edit, expectFail) => { RAN++;
    /*  ⛔ כותב על עותק — ⚠️ הרתמה מריצה שער אמיתי בתהליך נפרד, ⛔ והוא קורא את המקור מהדיסק. */
    const d = _m.mkdtempSync(_p.join(_o.tmpdir(), 'rd67-'));
    _m.cpSync(_root, d, { recursive: true, filter: (s) => !s.includes('/.git') });
    const f = _p.join(d, file);
    if (!_m.existsSync(f)) { console.log('  ok   ' + label + ' — ⚠️ הקובץ אינו קיים כאן, הטענה מוצהרת ריקה'); return; }
    _m.writeFileSync(f, edit(_m.readFileSync(f, 'utf8')));
    const st = _run(d);
    const fell = st !== 0;
    console.log((fell === expectFail ? '  ok   ' : '  FAIL ') + label);
    /*  ⛔ יציאה מיידית ולא `exitCode` (סבב 67) — סיכום השער קורא
     *  ל-`process.exit` בסופו, והוא היה דורס כשל מוטציה בשקט. */
    if (fell !== expectFail) process.exit(1);
    _m.rmSync(d, { recursive: true, force: true });
  };

  /*  ⛔ מכאן ולמטה מוטציות (סבב 92) — ⚠️ הן רצות ברמה המלאה בלבד. */
  mutStage();
  if (!RUN_MUT) {
    console.log('\n⏭ test_roles: המוטציות רצות ברמה המלאה (--full)');
    process.exit(REP.st.fail ? 1 : 0);
  }
  console.log('\n— מוטציות (סבב 67) —');
  _mut('⛔ שינוי ערכי ה-role מפיל את שער ההרשאות', 'index.html',
       (s) => s.replace(/'admin'/g, "'administrator'"), true);
  _mut('⭐ מוטציית-נגד: פונקציה חדשה וחיה ב-index.html ⛔ אינה מפילה', 'index.html',
       (s) => s.replace('</body>', '<script>function r72Live(){ return 1; }\nvar _r72Seen = r72Live();</script>\n</body>'), false);
}
