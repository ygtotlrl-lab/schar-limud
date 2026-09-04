#!/usr/bin/env node
/*  test_offline_login.mjs — כניסה אופליין, סינון הסודות והמסלול החד-פעמי.
 *
 *  **מה נאכף:** ארבע אינווריאנטות — (1) כניסה אופליין למשתמש שאינו האחרון
 *  שנכנס במכשיר; (2) ⛔ הסיסמה אינה מופיעה באף מפתח אחסון, **בשום נתיב**;
 *  (3) משתמש בלי טביעה מקבל הודעה משלו ⛔ ולא «סיסמה שגויה»; (4) ⛔ אין
 *  יצירת משתמש בסכימה, ⛔ ואין סכימה מוטבעת ב-`index.html`.
 *
 *  **הנימוק המדוד:** ⛔ סינון שישב במשיכה בלבד היה בטוח **במקרה** ולא
 *  **במבנה** — ⚠️ נתיב אחד שנוסף עקף אותו וכתב סיסמה גלויה לאחסון המקומי,
 *  ⭐ באותו origin שבו חיות עוד שלוש אפליקציות.
 *
 *  **מה יישבר בלעדיו:** ⛔ הודעה מאוחדת שולחת את מי שחסרה לו טביעה לנסות
 *  את הסיסמה שוב ושוב; ⛔ ומשתמש שנוצר בלי טביעה ננעל בחוץ **לנצח**.
 *
 *  **מה אינו נאכף כאן:** ⛔ מחיקת העמודה הגלויה מהמסד — ⚠️ היא פעולת מנהל,
 *  ⭐ ומה שנאכף הוא **שאין לה קורא באימות**.
 *
 *  ⚠️ הבדיקה רצה על הקוד האמיתי המחולץ מ-`index.html`, ⛔ לא על העתק.
 *  ⚠️ `crypto` הוא ה-WebCrypto האמיתי של node, ⭐ ולכן ה-PBKDF2 שנבדק כאן
 *  הוא בדיוק זה שירוץ בדפדפן.
 *  ⛔ **פרטי לאפליקציה ואינו זהה לשלוש האחרות, ⛔ ואין ליישר אותו** —
 *  ⚠️ מודל הכניסה עצמו נבדל: אין כאן מסך ניהול משתמשים, ⭐ ולכן יש מסלול
 *  השלמת טביעה ומסלול אתחול חד-פעמי מול העמודה הגלויה, ⛔ ורשימת ההיתר
 *  נאכפת בשלוש נקודות. ⚠️ ובאפליקציה הרביעית אין קובץ כזה כלל — ⛔ אין שם
 *  כניסה, ואין מה לאמת.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto, pbkdf2Sync } from 'node:crypto';


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
const SQL010 = fs.readFileSync(path.join(ROOT, 'migrations', '010_users_pass_fp.sql'), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.error('  ❌ ' + name + (extra ? '  →  ' + extra : '')); }
};
const eq = (name, got, want) =>
  ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const sect = (t) => console.log('\n▶ ' + t);

/* ── חילוץ מהקוד האמיתי ────────────────────────────────────────────────── */
// נכשל **ברעש** אם השם נעלם — שינוי שם בקוד לא יעבור כאן בשקט כ"אפס בדיקות".
function fn(name) {
  let at = SRC.indexOf('\nfunction ' + name + '(');
  if (at < 0) at = SRC.indexOf('\nasync function ' + name + '(');
  if (at < 0) throw new Error('לא נמצאה הפונקציה ' + name + ' ב-index.html');
  let i = SRC.indexOf('{', at), depth = 0, j = i;
  for (; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (!depth) break; }
  }
  return SRC.slice(at + 1, j + 1);
}
function decl(name) {
  const m = new RegExp('^var ' + name + '\\s*=', 'm').exec(SRC);
  if (!m) throw new Error('לא נמצאה ההצהרה ' + name + ' ב-index.html');
  let depth = 0;
  for (let j = m.index; j < SRC.length; j++) {
    const c = SRC[j];
    if ('{(['.includes(c)) depth++;
    else if ('})]'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return SRC.slice(m.index, j + 1);
  }
  throw new Error('הצהרה לא נסגרה: ' + name);
}
// גוף פונקציה כטקסט — לטענות "X אינו מופיע בגוף Y".
const body = (name) => fn(name);

const NAMES_VAR = [
  'SL_USERS_KEY', 'SL_USER_COLS', 'SL_USERS', 'SL_PASS_ITER_USER', 'SL_PASS_CTX',
  'SL_NEVER_MIRROR_SETTINGS', 'SL_MIRROR_PREFIX', 'SL_MIRROR_OF',
  'SL_STAMP_KEY', '_sessUser', '_sessBooted',
  'MSG_OFF_UNKNOWN', 'MSG_OFF_NO_FP', 'MSG_OFF_NO_CRYPTO',
  'MSG_NO_USERS',
];
const NAMES_FN = [
  'slUserPub', 'slRandSalt', 'slPassFp', 'slMakePassFp', 'slPassFields',
  'slUsersLoad', 'slUsersSave', 'slUsersSaveOne', 'slUserByName', 'slPullUsers',
  'slEnsurePassFp', 'slVerifyOffline', 'slIsSecretSetting', 'slStripSecrets',
  'slStripMeta',
  'slSanitizeRows', 'slMirrorSave', 'slLocalWrite', 'slWhoName',
  /*  ⭐ סבב 53 — המשתמש המחובר חי במודול הסשן המשותף, ולכן הרתמה מריצה
   *  את הפונקציות **האמיתיות** שלו ולא בדל. */
  'sessSet', 'sessGet', 'sessClear', 'sessActive',
  'slNow', 'slKey', 'slTs', 'doLogin', 'doLoginOffline',
];

/* ── הרתמה ─────────────────────────────────────────────────────────────── */
function makeCtx(opts = {}) {
  const store = Object.create(null);
  const calls = { authErr: [], toast: [], enter: 0, sb: [], warn: [] };
  const fields = { 'au-user': '', 'au-pass': '' };
  const el = (id) => ({
    get value() { return fields[id] || ''; },
    set value(v) { fields[id] = v; },
    style: {}, classList: { add() {}, remove() {} }, textContent: '',
  });
  const ctx = {
    console: { log() {}, warn(...a) { calls.warn.push(a[0]); }, error(...a) { calls.warn.push(a[0]); } },
    TextEncoder, Promise, Object, Array, String, JSON, Date, Uint8Array, isFinite, RegExp, Math,
    crypto: opts.noCrypto ? undefined : webcrypto,
    navigator: { onLine: opts.online !== false },
    document: { getElementById: (id) => el(id) },
    MIRROR: {},
    STUDENTS: [], TRANSACTIONS: [], SETTINGS: {}, LISTS: {},
    // ⭐ סבב 51 — קידום חותמת המשיכה. הרתמה מחליפה אותו בפעולה שקטה:
    //    מה שנבדק כאן הוא מסלול הסיסמאות, לא מנגנון המשיכה.
    plTouch() { return Promise.resolve(0); },
    MSG_BAD_LOGIN: '❌ שם משתמש או סיסמה שגויים',
    // חוזה `lsSet`/`lsSetArray`/`lsGet` כפי שהמודול המשותף מקיים אותו.
    // הבדיקה «אין password בדיסק» סורקת בדיוק את ה-`store` הזה.
    lsSet(k, v) { store[k] = String(v); return true; },
    lsSetArray(k, arr) { store[k] = JSON.stringify(arr); return true; },
    // ⭐ סבב 35: שער הדיסק של החלון החם עוטף את כתיבות המראה — כאן שקוף
    //    בכוונה; בדיקות החלון עצמו יושבות ב-test_hotwin.
    hwDiskFilter(k, rows) { return rows; },
    hwNoteCloud() {},
    lsGet(k, d) { return k in store ? store[k] : d; },
    lsRemove(k) { delete store[k]; },
    withTimeout: (p) => p,
    isNetErr: (e) => /Failed to fetch|NetworkError|network/i.test(String(e && (e.message || e))),
    showAuthErr(m) { calls.authErr.push(m); },
    startAuthLoad() {},
    enterApp() { calls.enter++; },
    toast(m) { calls.toast.push(m); },
    slApplyMirror() {},
    slKeyOf: (m, r) => (m === 'settings' ? 'k:' + r.key : (r.client_id ? 'c:' + r.client_id : 'i:' + r.id)),
    slResetLock() {}, slMaybeDailyBackup() {}, ensureCreditMethod() {},
    // מצב המודול של המשיכה — מוצהר ב-index.html בשורה נפרדת מהפונקציה.
    _slUsersPulling: false,
    refreshUI() {}, syncAll() {}, setInterval() { return 0; },
  };
  // לקוח Supabase מזויף — רושם כל שאילתה, כדי שאפשר יהיה לטעון «אפס
  // קריאות רשת» ולבדוק **אילו עמודות** נתבקשו.
  ctx.SB = {
    from(table) {
      const q = { table, cols: null, eqs: {}, kind: 'select' };
      const api = {
        select(cols) { q.cols = cols; calls.sb.push(q); return api; },
        update(bodyObj) { q.kind = 'update'; q.body = bodyObj; calls.sb.push(q); return api; },
        eq(c, v) { q.eqs[c] = v; return api; },
        limit(n) { q.limit = n; return api.then ? api : api; },
        maybeSingle() { return api; },
        then(res, rej) { return Promise.resolve(opts.reply ? opts.reply(q) : { data: null, error: null }).then(res, rej); },
      };
      return api;
    },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(NAMES_VAR.map(decl).join('\n') + '\n' + NAMES_FN.map(fn).join('\n'), ctx);
  return { ctx, store, calls, fields };
}

// PBKDF2 עצמאי, מחושב ב-node:crypto — האורקל שמול הוא נבדק `slPassFp`.
function oraclePbkdf2(passVal, salt, ctxPrefix, iter) {
  return pbkdf2Sync(String(passVal), Buffer.from(ctxPrefix + String(salt), 'utf8'), iter, 32, 'sha256').toString('hex');
}

const A = { id: 1, username: 'shimon', password: '135790' };
const B = { id: 2, username: 'levi', password: '246801' };

async function userRow(h, u) {
  const made = await h.ctx.slMakePassFp(u.password);
  // ⚠️ `active: true` — במציאות כל שורה במראה עוברת דרך `slUserPub`, שמשלימה
  //    את השדה. פיקסטורה בלעדיו הייתה בודקת מצב שאינו קיים בקוד הרץ.
  return { id: u.id, username: u.username, pass_salt: made.salt, pass_fp: made.fp, active: true };
}

/* ═══════════════════════════════════════════════════════════════════════ */
async function main() {

  /* ── א. גזירת הטביעה ─────────────────────────────────────────────────── */
  sect('א. גזירת הטביעה — PBKDF2-SHA256, 100k, מלח פר-משתמש');
  {
    const h = makeCtx();
    const s1 = h.ctx.slRandSalt(), s2 = h.ctx.slRandSalt();
    ok('מלח הוא hex בן 32 תווים (16 בתים)', /^[0-9a-f]{32}$/.test(s1), s1);
    ok('מלח שונה בכל קריאה', s1 !== s2);

    const f1 = await h.ctx.slPassFp('135790', s1);
    const f2 = await h.ctx.slPassFp('135790', s1);
    ok('טביעה היא hex בן 64 תווים', /^[0-9a-f]{64}$/.test(f1), f1);
    eq('דטרמיניסטית — אותה סיסמה ואותו מלח', f1, f2);
    ok('מלח שונה ⇒ טביעה שונה', (await h.ctx.slPassFp('135790', s2)) !== f1);
    ok('סיסמה שונה ⇒ טביעה שונה', (await h.ctx.slPassFp('135791', s1)) !== f1);

    eq('⭐ תואמת ל-PBKDF2-SHA256 100k שחושב עצמאית ב-node:crypto',
      f1, oraclePbkdf2('135790', s1, h.ctx.SL_PASS_CTX, h.ctx.SL_PASS_ITER_USER));
    eq('מספר הסיבובים הוא 100,000', h.ctx.SL_PASS_ITER_USER, 100000);
    ok('⭐ קידומת הפרדת-ההקשר באמת נכנסת למלח',
      f1 !== oraclePbkdf2('135790', s1, '', h.ctx.SL_PASS_ITER_USER));
    ok('קידומת ההקשר ייחודית ל-schar-limud', /schar-limud/.test(h.ctx.SL_PASS_CTX), h.ctx.SL_PASS_CTX);

    eq('בלי מלח ⇒ null (נכשל סגור)', await h.ctx.slPassFp('135790', ''), null);
    const made = await h.ctx.slMakePassFp('135790');
    ok('slMakePassFp מחזירה {salt,fp}', !!(made && made.salt && made.fp));
    eq('slMakePassFp — הטביעה תואמת למלח שהוחזר',
      made.fp, await h.ctx.slPassFp('135790', made.salt));
    const pf = await h.ctx.slPassFields('135790');
    ok('slPassFields מחזירה את שני השדות', !!(pf.pass_salt && pf.pass_fp));
  }
  {
    const h = makeCtx({ noCrypto: true });
    eq('בלי crypto — slRandSalt מחזירה null', h.ctx.slRandSalt(), null);
    eq('בלי crypto — slPassFp מחזירה null', await h.ctx.slPassFp('x', 'abc'), null);
    eq('בלי crypto — slMakePassFp מחזירה null', await h.ctx.slMakePassFp('x'), null);
    const pf = await h.ctx.slPassFields('x');
    ok('⛔ בלי crypto — slPassFields מאפסת את שני השדות',
      pf.pass_salt === null && pf.pass_fp === null, JSON.stringify(pf));
  }

  /* ── ב. מראת המשתמשים — password לעולם לא יורד ───────────────────────── */
  sect('ב. מראת המשתמשים — רשימת היתר, בשלוש נקודות');
  {
    const h = makeCtx();
    ok('⛔ `password` אינו ברשימת ההיתר', h.ctx.SL_USER_COLS.indexOf('password') === -1);
    // ⚠️ **עודכן בסבב 26** — `role` נוסף לרשימה. הוא מקור האמת להרשאות
    // ולכן חייב לרדת למכשיר, אחרת מסך ההגדרות לא היה עובד אופליין.
    // הטענה שנשמרת כאן היא הצורה, לא המספר: רשימת-**היתר** סגורה.
    // ⚠️ **עודכן שוב בסבב 37** — `active` נוסף. בלעדיו `slVerifyOffline`
    // לא יכלה לחסום משתמש מושבת, וההשבתה בלוח הבקרה לא הגיעה למכשיר.
    eq('רשימת ההיתר היא שש העמודות המוכרות',
      h.ctx.SL_USER_COLS.join(','), 'id,username,pass_salt,pass_fp,role,active');

    const dirty = { id: 7, username: 'x', password: 'סוד', pass_salt: 's', pass_fp: 'f',
                    role: 'admin', secret_note: 'עמודה רגישה חדשה' };
    const pub = h.ctx.slUserPub(dirty);
    ok('slUserPub מפיל `password`', !('password' in pub));
    // ⭐ זו הטענה שמצדיקה רשימת-היתר ולא רשימת-איסור: עמודה חדשה בטבלה
    //    נופלת מעצמה, בלי שאיש צריך לזכור להוסיף אותה לאיסור.
    ok('⭐ slUserPub מפיל עמודה זרה שנוספה לטבלה', !('secret_note' in pub));
    eq('slUserPub שומר את המותרות', Object.keys(pub).sort().join(','), 'id,pass_fp,pass_salt,role,username');
    /* ⛔ שורה בלי `active` אינה מושלמת עוד (סבב 63) — העמודה קיימת בטבלה
       (`not null default true`), ולכן «חסר» הוא חוסר-ידיעה
       ולא «ישן», וההכרעה נכשלת-סגור. */
    eq('⛔ עמודה חסרה אינה מושלמת — נכשל-סגור', pub.active, undefined);
    eq('   וערך מפורש false נשמר כמו שהוא',
      h.ctx.slUserPub({ id: 1, username: 'a', active: false }).active, false);
    eq('slUserPub על קלט שאינו אובייקט מחזירה {}', JSON.stringify(h.ctx.slUserPub(null)), '{}');
  }
  {
    // השרת מחזיר בכוונה גם `password` — המראה חייבת להישאר נקייה.
    const h = makeCtx({
      reply: (q) => (q.table === 'sl_users'
        ? { data: [{ id: 1, username: 'shimon', password: '135790', pass_salt: 's', pass_fp: 'f' }], error: null }
        : { data: null, error: null }),
    });
    eq('slPullUsers מצליחה', await h.ctx.slPullUsers(true), true);
    const q = h.calls.sb.find((x) => x.table === 'sl_users');
    ok('⭐ ה-select מבקש עמודות מפורשות ולא `*`', q.cols === h.ctx.SL_USER_COLS.join(','), q.cols);
    ok('⛔ המראה שבזיכרון בלי `password`', !('password' in h.ctx.SL_USERS[0]));
    ok('⛔ המראה שעל הדיסק בלי `password`', h.store[h.ctx.SL_USERS_KEY].indexOf('password') === -1);
    ok('⛔ ערך הסיסמה עצמו אינו על הדיסק', h.store[h.ctx.SL_USERS_KEY].indexOf('135790') === -1);

    // הלוך-ושוב: כתיבה לדיסק וקריאה חזרה
    h.ctx.SL_USERS = [];
    h.ctx.slUsersLoad();
    eq('טעינה מהדיסק מחזירה את המשתמש', h.ctx.SL_USERS.length, 1);
    eq('ואת שם המשתמש', h.ctx.SL_USERS[0].username, 'shimon');
    ok('⛔ וגם אחרי הטעינה אין `password`', !('password' in h.ctx.SL_USERS[0]));
  }
  {
    // שער הדיסק מסנן גם כשהמראה שבזיכרון הורעלה ישירות (עקיפת המשיכה).
    const h = makeCtx();
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', password: 'סוד-גלוי', pass_salt: 's', pass_fp: 'f', active: true }];
    h.ctx.slUsersSave();
    ok('⭐ שער הדיסק מסנן `password` גם ממראה שהורעלה',
      h.store[h.ctx.SL_USERS_KEY].indexOf('password') === -1 && h.store[h.ctx.SL_USERS_KEY].indexOf('סוד-גלוי') === -1);
  }
  {
    const h = makeCtx();
    h.store[h.ctx.SL_USERS_KEY] = '{{ לא JSON';
    h.ctx.slUsersLoad();
    eq('מראה פגומה נטענת ריקה ולא זורקת', h.ctx.SL_USERS.length, 0);
    h.store[h.ctx.SL_USERS_KEY] = JSON.stringify([{ id: 1 }, { id: 2, username: 'ok' }]);
    h.ctx.slUsersLoad();
    eq('שורה בלי username נזרקת', h.ctx.SL_USERS.length, 1);
  }
  {
    // ⭐ סבב 38 — אין יותר נפילה-חזרה. `migrations/010`/`011`/`013` רצו
    //    כולן, ולכן שגיאת «עמודה חסרה» היא מעכשיו שגיאה לכל דבר: המשיכה
    //    נכשלת, ⛔ **והמראה הקיימת אינה נדרסת** — היא נשארת כפי שהייתה
    //    ומשרתת את הכניסה האופליין. זו בדיוק ההתנהגות של כשל רשת.
    const h = makeCtx({
      reply: () => ({ data: null, error: { message: 'column sl_users.pass_fp does not exist' } }),
    });
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', pass_salt: 'aa', pass_fp: 'bb', active: true }];
    eq('שגיאת עמודה חסרה מפילה את המשיכה', await h.ctx.slPullUsers(), false);
    eq('⛔ ואין ניסיון שני — שאילתה אחת בלבד', h.calls.sb.length, 1);
    eq('⛔ והמראה הקיימת לא נדרסה', h.ctx.SL_USERS.length, 1);
  }
  {
    const h = makeCtx({ reply: () => ({ data: [], error: null }) });
    eq('משיכה ראשונה עוברת', await h.ctx.slPullUsers(), true);
    /*  ⭐ סבב 53 — הוויסות הזמני הוסר: הוא נולד כשה-`syncAll` רץ כל שלוש
     *  שניות בלי תנאי, ומסבב 51 הוא רץ רק כשהחותמת התקדמה. */
    eq('⭐ ואין ויסות זמן — משיכה שנייה עוברת גם היא', await h.ctx.slPullUsers(), true);
    /*  ⚠️ ההצהרה ולא האזכור — ההערה שמסבירה את ההסרה מזכירה את השם. */
    ok('⛔ הצהרת `SL_USERS_PULL_MS` ירדה מהקובץ (סבב 53)',
      !/^var SL_USERS_PULL_MS\s*=/m.test(SRC));
  }
  {
    const h = makeCtx({ online: false });
    eq('⛔ אופליין — slPullUsers אינה נוגעת ברשת', await h.ctx.slPullUsers(), false);
    eq('ואפס שאילתות נשלחו', h.calls.sb.length, 0);
  }

  /* ── ג. כניסה אופליין ────────────────────────────────────────────────── */
  sect('ג. כניסה אופליין — ארבעה מצבים, ארבע הודעות');
  {
    const h = makeCtx({ online: false });
    h.ctx.SL_USERS = [await userRow(h, A), await userRow(h, B)];
    ok('שני משתמשים במראה', h.ctx.SL_USERS.length === 2);

    // ⭐ הטענה המרכזית של הסבב.
    h.fields['au-user'] = B.username; h.fields['au-pass'] = B.password;
    await h.ctx.doLogin();
    eq('⭐ משתמש שאינו האחרון שנכנס — נכנס אופליין', h.calls.enter, 1);
    eq('   בלי הודעת שגיאה', h.calls.authErr.length, 0);
    eq('   ⭐ באפס קריאות רשת', h.calls.sb.length, 0);
    eq('   המשתמש המחובר הוא הנכון', h.ctx.sessGet().username, B.username);
    ok('   ⛔ והוא בלי password', !('password' in h.ctx.sessGet()));
    ok('   טוסט מצב אופליין הוצג', h.calls.toast.some((t) => /אופליין/.test(t)));

    // הראשון ממשיך לעבוד גם הוא
    h.calls.enter = 0; h.calls.authErr = [];
    h.fields['au-user'] = A.username; h.fields['au-pass'] = A.password;
    await h.ctx.doLogin();
    eq('גם המשתמש האחר נכנס', h.calls.enter, 1);

    // סיסמה שגויה
    h.calls.enter = 0; h.calls.authErr = [];
    h.fields['au-pass'] = 'לא-נכון';
    await h.ctx.doLogin();
    eq('סיסמה שגויה — לא נכנס', h.calls.enter, 0);
    eq('סיסמה שגויה ⇒ MSG_BAD_LOGIN', h.calls.authErr[0], h.ctx.MSG_BAD_LOGIN);

    // משתמש שאינו במראה
    h.calls.authErr = [];
    h.fields['au-user'] = 'zzz'; h.fields['au-pass'] = '111111';
    await h.ctx.doLogin();
    eq('⭐ משתמש שאינו במראה ⇒ «נדרש חיבור», לא «סיסמה שגויה»',
      h.calls.authErr[0], h.ctx.MSG_OFF_UNKNOWN);
    eq('   ולא נכנס', h.calls.enter, 0);
  }
  {
    const h = makeCtx({ online: false });
    h.ctx.SL_USERS = [{ id: 9, username: 'noab', active: true }];   // בלי טביעה
    h.fields['au-user'] = 'noab'; h.fields['au-pass'] = '135790';
    await h.ctx.doLogin();
    eq('⭐ משתמש בלי טביעה ⇒ MSG_OFF_NO_FP', h.calls.authErr[0], h.ctx.MSG_OFF_NO_FP);
    ok('   ⛔ ולא MSG_BAD_LOGIN', h.calls.authErr[0] !== h.ctx.MSG_BAD_LOGIN);
    eq('   ולא נכנס', h.calls.enter, 0);
    eq('slVerifyOffline מחזירה no-fp', await h.ctx.slVerifyOffline({ username: 'x', active: true }, 'p'), 'no-fp');
  }
  {
    const h = makeCtx({ online: false, noCrypto: true });
    h.ctx.SL_USERS = [{ id: 9, username: 'shimon', pass_salt: 's', pass_fp: 'f', active: true }];
    h.fields['au-user'] = 'shimon'; h.fields['au-pass'] = '135790';
    await h.ctx.doLogin();
    eq('בלי crypto ⇒ MSG_OFF_NO_CRYPTO', h.calls.authErr[0], h.ctx.MSG_OFF_NO_CRYPTO);
    eq('   ⛔ ולא נכנס (נכשל סגור)', h.calls.enter, 0);
  }
  {
    const h = makeCtx();
    const m = [h.ctx.MSG_OFF_UNKNOWN, h.ctx.MSG_OFF_NO_FP, h.ctx.MSG_OFF_NO_CRYPTO, h.ctx.MSG_BAD_LOGIN];
    eq('ארבע ההודעות נבדלות זו מזו', new Set(m).size, 4);
    ok('⛔ שלוש החדשות מחוץ לבלוק ההודעות המשותף',
      !/^var MSG_OFFLINE[\s\S]{0,400}MSG_OFF_UNKNOWN/m.test(SRC));
  }
  {
    // ⛔ מטמון מפורמט ישן — סיסמה גלויה אינה מתקבלת כטביעה.
    const h = makeCtx({ online: false });
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', password: '135790', active: true }];
    h.fields['au-user'] = 'shimon'; h.fields['au-pass'] = '135790';
    await h.ctx.doLogin();
    eq('⛔ סיסמה גלויה במראה אינה מתקבלת כטביעה', h.calls.enter, 0);
    eq('   ומקבלת «טרם הוכן»', h.calls.authErr[0], h.ctx.MSG_OFF_NO_FP);
  }
  {
    // סיסמה ישנה שאינה שש ספרות — נכנסת בכל זאת (סבב 19).
    const h = makeCtx({ online: false });
    const made = await h.ctx.slMakePassFp('admin');
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', pass_salt: made.salt, pass_fp: made.fp, active: true }];
    h.fields['au-user'] = 'shimon'; h.fields['au-pass'] = 'admin';
    await h.ctx.doLogin();
    eq('⭐ סיסמה ישנה שאינה שש ספרות — נכנסת', h.calls.enter, 1);
  }

  /* ── ד. ⛔ אין סשן על הדיסק, ואין סיסמה באף מפתח ──────────────────────── */
  sect('ד. ⛔ המשתמש המחובר בזיכרון בלבד, ואין סיסמה באף מפתח');
  {
    const h = makeCtx({ online: false });
    h.ctx.SL_USERS = [await userRow(h, A)];
    h.fields['au-user'] = A.username; h.fields['au-pass'] = A.password;
    await h.ctx.doLogin();
    /*  ⭐ סבב 53 — `sl_session` הוסר. המשתמש קיים בזיכרון, ⛔ ואף מפתח
     *  על הדיסק אינו מחזיק אותו. */
    eq('⭐ המשתמש המחובר קיים בזיכרון', h.ctx.sessGet().username, A.username);
    ok('⛔ ואין מפתח סשן על הדיסק', !('sl_session' in h.store));
    ok('⛔ ואין שם המשתמש באף מפתח', Object.keys(h.store)
      .every((k) => String(h.store[k]).indexOf('"username"') === -1 || k.indexOf('users') >= 0));

    const all = Object.keys(h.store).map((k) => k + '=' + h.store[k]).join('\n');
    ok('⭐⭐ המחרוזת `password` אינה באף מפתח localStorage', all.indexOf('password') === -1);
    ok('⭐⭐ ערך הסיסמה עצמו אינו באף מפתח localStorage', all.indexOf(A.password) === -1);
  }

  /* ── ה. כניסה מקוונת ─────────────────────────────────────────────────── */
  sect('ה. כניסה מקוונת — המסלול לא השתנה');
  {
    /*  ⭐ סבב 40 — הפיקסטורה נושאת **טביעה**, והשאילתה נשלפת לפי שם
     *  המשתמש בלבד. עד סבב 40 היא החזירה שורה בלי טביעה כשה-`.eq` על
     *  `password` התאים; ⛔ הטענה שאכפה זאת התהפכה במכוון — ר' למטה.  */
    const seed = makeCtx({ reply: () => ({ data: null, error: null }) });
    const rowA = await userRow(seed, A);
    const h = makeCtx({
      reply: (q) => {
        if (q.kind === 'update') return { data: null, error: null };
        if (q.eqs.username) {
          return q.eqs.username === A.username
            ? { data: rowA, error: null }
            : { data: null, error: null };
        }
        return { data: [{ id: A.id }], error: null };
      },
    });
    h.fields['au-user'] = A.username; h.fields['au-pass'] = A.password;
    await h.ctx.doLogin();
    eq('כניסה מקוונת מצליחה', h.calls.enter, 1);
    const q0 = h.calls.sb[0];
    ok('⛔ ההשוואה **אינה** מול `password` שבמסד (סבב 40)', !q0.eqs.password);
    ok('⭐ והשליפה היא לפי שם המשתמש', q0.eqs.username === A.username);
    ok('⭐ ה-select מבקש עמודות מפורשות', q0.cols === h.ctx.SL_USER_COLS.join(','), q0.cols);
    ok('⛔ המשתמש המחובר בלי password', !('password' in h.ctx.sessGet()));
    /*  ⚠️ סבב 40 — הטביעה כבר תואמת, ולכן `slEnsurePassFp` יוצאת מוקדם
     *  ואינה כותבת. זו התנהגות קיימת שלא השתנתה («תואמת — אין מה
     *  להשלים»); מה שהשתנה הוא שהפיקסטורה מגיעה עם טביעה מלכתחילה.
     *  ⛔ מה שכן נאכף כאן: גם כשההשלמה **כן** רצה, היא אינה נוגעת
     *  ב-`password`.                                                   */
    const upd = h.calls.sb.find((x) => x.kind === 'update');
    ok('⛔ אף כתיבה במסלול הכניסה אינה נוגעת ב-password', !upd || !('password' in upd.body));
  }
  {
    const h = makeCtx({ reply: () => ({ data: null, error: null }) });
    h.fields['au-user'] = A.username; h.fields['au-pass'] = 'שגוי';
    await h.ctx.doLogin();
    eq('סיסמה שגויה מקוון ⇒ MSG_BAD_LOGIN', h.calls.authErr[0], h.ctx.MSG_BAD_LOGIN);
  }
  {
    // ⭐ טבלה ריקה ⇒ הודעה שמסבירה, לא «סיסמה שגויה».
    const h = makeCtx({ reply: (q) => ({ data: q.limit ? [] : null, error: null }) });
    h.fields['au-user'] = 'anyone'; h.fields['au-pass'] = '135790';
    await h.ctx.doLogin();
    eq('⭐ טבלה ריקה ⇒ MSG_NO_USERS', h.calls.authErr[0], h.ctx.MSG_NO_USERS);
    ok('   ⛔ ולא MSG_BAD_LOGIN', h.calls.authErr[0] !== h.ctx.MSG_BAD_LOGIN);
    ok('   ההודעה מפנה ליצירת משתמש ראשון', /משתמש ראשון/.test(h.ctx.MSG_NO_USERS));
  }
  {
    // ⭐ כשל רשת באמצע כניסה מקוונת ⇒ נפילה-חזרה לאימות אופליין.
    const h = makeCtx({ reply: () => { throw new Error('Failed to fetch'); } });
    h.ctx.SL_USERS = [await userRow(h, A)];
    h.fields['au-user'] = A.username; h.fields['au-pass'] = A.password;
    await h.ctx.doLogin();
    eq('⭐ כשל רשת ⇒ נפילה-חזרה מוצלחת לאופליין', h.calls.enter, 1);
    eq('   בלי הודעת שגיאה', h.calls.authErr.length, 0);
  }

  /* ── ו. slEnsurePassFp — שלושת המצבים ────────────────────────────────── */
  sect('ו. slEnsurePassFp — השלמה, שתיקה, ואיפוס');
  {
    const h = makeCtx({ reply: () => ({ data: null, error: null }) });
    const u = { id: 1, username: 'shimon' };
    eq('אין טביעה ⇒ משלימה', await h.ctx.slEnsurePassFp(u, A.password), true);
    ok('הטביעה נכתבה על האובייקט', !!(u.pass_salt && u.pass_fp));
    eq('⭐ והטביעה שנכתבה מאומתת מול חישוב עצמאי',
      u.pass_fp, oraclePbkdf2(A.password, u.pass_salt, h.ctx.SL_PASS_CTX, h.ctx.SL_PASS_ITER_USER));

    const before = h.calls.sb.length;
    eq('טביעה תואמת ⇒ שותקת', await h.ctx.slEnsurePassFp(u, A.password), false);
    eq('   ואפס קריאות רשת נוספות', h.calls.sb.length, before);
  }
  {
    // ⭐⭐ טביעה תקפה לסיסמה **הישנה** — חייבת להתחלף.
    const h = makeCtx({ reply: () => ({ data: null, error: null }) });
    const old = await h.ctx.slMakePassFp('111111');
    const u = { id: 1, username: 'shimon', pass_salt: old.salt, pass_fp: old.fp };
    eq('⭐ טביעה שאינה תואמת ⇒ מוחלפת', await h.ctx.slEnsurePassFp(u, '222222'), true);
    ok('   הטביעה החדשה תואמת לסיסמה החדשה',
      u.pass_fp === oraclePbkdf2('222222', u.pass_salt, h.ctx.SL_PASS_CTX, h.ctx.SL_PASS_ITER_USER));
    ok('   ⛔ והישנה כבר אינה תקפה', u.pass_fp !== old.fp);
  }
  {
    // ⭐⭐ טביעה לא-תואמת + כשל גזירה ⇒ **איפוס שני השדות**, לא דילוג.
    const h = makeCtx({ reply: () => ({ data: null, error: null }) });
    const old = await h.ctx.slMakePassFp('111111');
    const u = { id: 1, username: 'shimon', pass_salt: old.salt, pass_fp: old.fp };
    // ראשית מחשבים את הטביעה הנוכחית (מצליח), ורק אחר כך שוברים את הגזירה.
    let n = 0;
    const realFp = h.ctx.slPassFp;
    h.ctx.slPassFp = async (p, s) => (++n === 1 ? realFp(p, s) : null);
    h.ctx.slRandSalt = () => null;
    const r = await h.ctx.slEnsurePassFp(u, '222222');
    eq('⭐⭐ כשל גזירה על טביעה ישנה ⇒ pass_salt מאופס', u.pass_salt, null);
    eq('⭐⭐ ו-pass_fp מאופס', u.pass_fp, null);
    ok('   ⛔ הטביעה הישנה אינה נשארת', u.pass_fp !== old.fp);
    eq('   הפעולה מדווחת הצלחה (השדות נכתבו)', r, true);
  }
  {
    // אין טביעה + כשל גזירה ⇒ דילוג שקט (אין מה לאפס).
    const h = makeCtx({ reply: () => ({ data: null, error: null }) });
    h.ctx.slRandSalt = () => null;
    const u = { id: 1, username: 'shimon' };
    eq('אין טביעה + כשל גזירה ⇒ דילוג', await h.ctx.slEnsurePassFp(u, '222222'), false);
    eq('   ואפס קריאות רשת', h.calls.sb.length, 0);
    ok('   והאובייקט לא נגע', !('pass_salt' in u));
  }
  {
    const h = makeCtx({ noCrypto: true, reply: () => ({ data: null, error: null }) });
    const u = { id: 1, username: 'shimon', pass_salt: 's', pass_fp: 'f' };
    eq('בלי crypto — לא נוגעת בטביעה קיימת', await h.ctx.slEnsurePassFp(u, 'x'), false);
    eq('   pass_fp נשאר', u.pass_fp, 'f');
    eq('   ואפס קריאות רשת', h.calls.sb.length, 0);
  }
  {
    const h = makeCtx({ online: false, reply: () => ({ data: null, error: null }) });
    eq('אופליין — ההשלמה אינה נוגעת ברשת', await h.ctx.slEnsurePassFp({ id: 1 }, 'x'), false);
    eq('   ואפס שאילתות', h.calls.sb.length, 0);
  }
  {
    // ⭐ סבב 38 — הסולם נמחק, ושלוש נקודות הקריאה חוזרות ל-`SL_USER_COLS`
    //    ישיר. `migrations/013` רצה ב-2026-08-18 והקוד נפרס, ולכן החלון
    //    שהפיגום הגן עליו נסגר. הטענות כאן נועלות את **היעדרו**: שאילתה
    //    אחת בלבד, עם כל שש העמודות.
    const h = makeCtx({ reply: () => ({ data: [], error: null }) });
    ok('⛔ slMissingCol אינה קיימת עוד', typeof h.ctx.slMissingCol === 'undefined');
    ok('⛔ slSelectUsers אינה קיימת עוד', typeof h.ctx.slSelectUsers === 'undefined');
    await h.ctx.slPullUsers(true);
    eq('משיכת המשתמשים היא שאילתה אחת', h.calls.sb.length, 1);
    eq('   ועם רשימת ההיתר המלאה', h.calls.sb[0].cols, h.ctx.SL_USER_COLS.join(','));
    ok('   כולל active', h.calls.sb[0].cols.indexOf('active') !== -1);
    ok('   וכולל role', h.calls.sb[0].cols.indexOf('role') !== -1);
    ok('   ⛔ ובלי password', h.calls.sb[0].cols.indexOf('password') === -1);
  }

  /* ── ז. סינון הסודות — שלוש נקודות ───────────────────────────────────── */
  sect('ז. סינון `admin_pass` — שלוש נקודות אכיפה');
  {
    const h = makeCtx();
    // ⭐ מסבב 35 הרשימה ריקה — שורת `admin_pass` נמחקה מהמסד ע"י המנהל
    //    (17.8, אומת אפס מופעים). המנגנון נשאר, ולכן הבדיקה מזריקה מפתח
    //    זמני ומוודאת ששלוש נקודות האכיפה עדיין עובדות.
    eq('הרשימה ריקה — אין עוד שריד admin_pass', h.ctx.SL_NEVER_MIRROR_SETTINGS.length, 0);
    ok('admin_pass אינו מסונן עוד', !h.ctx.slIsSecretSetting('admin_pass'));
    h.ctx.SL_NEVER_MIRROR_SETTINGS.push('secret_probe');
    ok('slIsSecretSetting מזהה מפתח שברשימה', h.ctx.slIsSecretSetting('secret_probe'));
    ok('ואינו מזהה מפתח אחר', !h.ctx.slIsSecretSetting('default_tuition'));
    const rows = [{ key: 'secret_probe', value: 'סוד' }, { key: 'default_tuition', value: '2000' }];
    eq('1) משיכה — slStripSecrets מסירה את השורה', h.ctx.slStripSecrets(rows).length, 1);
    ok('   הקלט לא שונה (טהורה)', rows.length === 2);
    eq('2) כתיבה מקומית — slLocalWrite מסרבת',
      h.ctx.slLocalWrite('sl_settings', { key: 'secret_probe', value: 'סוד' }), false);
    ok('   ולא נכתב דבר לדיסק', !(h.ctx.SL_MIRROR_PREFIX + 'settings' in h.store));

    // 3) שער הדיסק — המראה הורעלה ישירות, בעקיפת שני הקודמים.
    h.ctx.MIRROR.settings = [{ key: 'secret_probe', value: 'סוד-גלוי' }, { key: 'default_tuition', value: '2000' }];
    h.ctx.slMirrorSave('settings');
    const disk = h.store[h.ctx.SL_MIRROR_PREFIX + 'settings'];
    ok('⭐ 3) שער הדיסק מסנן גם מראה שהורעלה', disk.indexOf('secret_probe') === -1 && disk.indexOf('סוד-גלוי') === -1);
    ok('   והשורה הלגיטימית כן נשמרה', disk.indexOf('default_tuition') !== -1);
    eq('slSanitizeRows על טבלה אחרת אינה מסננת',
      h.ctx.slSanitizeRows('students', [{ id: 1 }]).length, 1);
  }

  /* ── ח. הסכימה, והסרת העותק המוטבע ───────────────────────────────────── */
  sect('ח. הסכימה — אין משתמש זרוע, ואין סכימה מוטבעת');
  {
    // ההנחיה שבהערת קובץ ההתקנה היא **מצייני מקום** ולא זריעה — לכן
    // הבדיקה על SQL חי בלבד, אחרי הסרת ההערות.
    const live = (t) => t.replace(/--.*$/gm, '');
    ok('⛔ אין INSERT חי ל-sl_users ב-000', !/insert\s+into\s+public\.sl_users/i.test(live(SQL000)));
    ok('⛔ אין את הצמד admin/admin ב-000', !/'admin'\s*,\s*'admin'/.test(SQL000));
    ok('⛔ ואין צמד ערכים אמיתי ב-index.html', !/sl_users[^;]{0,120}VALUES\s*\('[a-z0-9]+'\s*,\s*'[0-9]{6}'\)/i.test(SRC));
    // ⚠️ סבב 26 — ההוראה כוללת עכשיו גם `role`, כי המשתמש הראשון חייב
    //    להיות 'admin' אחרת מסך ההגדרות לא ייפתח לאיש.
    ok('000 מסביר איך יוצרים משתמש ראשון', /sl_users \(username, password, role\)/.test(SQL000));

    const adds = (SQL010.match(/add\s+column\s+if\s+not\s+exists/gi) || []).length;
    eq('010 אדיטיבית — בדיוק שני ADD COLUMN IF NOT EXISTS', adds, 2);
    ok('010 מוסיפה pass_salt ו-pass_fp', /pass_salt/.test(SQL010) && /pass_fp/.test(SQL010));
    ok('⛔ 010 אינה נוגעת ב-password', !/\bpassword\b/i.test(SQL010.replace(/--.*$/gm, '')));

    // ⭐ ההשלמה של סבב 24 — אין יותר עותק מוטבע של הסכימה.
    ok('⭐ ⛔ אין הצהרת SETUP_SQL_FALLBACK ב-index.html', !/var\s+SETUP_SQL_FALLBACK/.test(SRC));
    ok('⭐ ⛔ ואין סמני הבלוק המיוצר', SRC.indexOf('BEGIN GENERATED SQL FALLBACK') === -1);
    ok('⭐ ⛔ אין CREATE TABLE מוטבע ב-index.html', !/create\s+table\s+if\s+not\s+exists\s+public\./i.test(SRC));
    ok('⛔ ואין יותר tools/sync-setup-sql.py', !fs.existsSync(path.join(ROOT, 'tools', 'sync-setup-sql.py')));
    // ⛔ מסך ההתקנה הוסר מהאפליקציה (סבב 58) — ההתקנה נעשית מול המסד
    //    מ-`migrations/`, ומה שנשאר בקוד הוא היעדרו. ⚠️ הטענות שקדמו כאן
    //    («התיבה מתמלאת ב-fetch», «כשל מפנה ל-GitHub») היו על המסך עצמו,
    //    ולכן הן ירדו איתו — והוחלפו בטענת ההיעדר.
    ok('⛔ אין `showSetupScreen` בקוד', !/function\s+showSetupScreen\s*\(/.test(SRC));
    ok('⛔ ואין `startSetupPoll` — הסקר האוטומטי ירד איתו',
       !/function\s+startSetupPoll\s*\(/.test(SRC));
    ok('⛔ ואין משיכת קובץ ההתקנה לתוך הדף', !/SETUP_SQL_URL|loadSetupSql/.test(SRC));
  }

  /* ── ט. אינווריאנטות במקור עצמו ──────────────────────────────────────── */
  sect('ט. אינווריאנטות במקור עצמו');
  {
    ok('⛔ אין select(\'*\') על sl_users', !/from\('sl_users'\)\s*\.\s*select\('\*'\)/.test(SRC));
    // ⚠️ **עודכן בסבב 26.** `changeAdminPass` היה אתר האכיפה **היחיד** של
    // `PASS_SIX_RE`, והוא הוסר יחד עם שער סיסמת ההגדרות שהוא שירת; הקבוע
    // ירד איתו. הטענה המקורית («כן מופיע ב-changeAdminPass») אינה ניתנת
    // לבדיקה יותר, אבל **הכוונה שלה נשמרת במלואה**: מסלולי הכניסה נשארים
    // נקיים מאכיפת פורמט, מאותו נימוק בדיוק (סבב 19 — אכיפה שם נועלת
    // בחוץ סיסמה קיימת ותקפה). ⛔ אין להוסיף שם בדיקת פורמט.
    ok('⛔ אין אכיפת פורמט בגוף doLogin', body('doLogin').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ ולא ב-doLoginOffline', body('doLoginOffline').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ ולא ב-slVerifyOffline', body('slVerifyOffline').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ PASS_SIX_RE ירד מהקובץ (סבב 26)', !/^var PASS_SIX_RE\s*=/m.test(SRC));
    ok('⛔ אין קבוע `SESSION_KEY` בקובץ (סבב 53)', !/SESSION_KEY/.test(SRC));
    ok('⛔ אין password ברשימת ההיתר שבמקור', !/SL_USER_COLS\s*=\s*\[[^\]]*password/.test(SRC));
    // ⚠️ תבנית ולא מספר קבוע (סבב 26) — טענה שמקבעת מספר נכשלת על כל
    //    קידום עתידי, כלומר חוסמת בדיוק את מה שכלל קריטי 2 מחייב.
    ok('CACHE_NAME בתבנית schar-limud-v<N>',
      /CACHE_NAME = 'schar-limud-v\d+'/.test(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')));
  }

  console.log('\n' + (fail ? '❌' : '✅') + `  ${pass} עברו, ${fail} נכשלו\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
if (!RUN_MUT) {
  console.log('\n⏭ test_offline_login: המוטציות רצות ברמה המלאה (--full)');
  process.exit(fail ? 1 : 0);
}
/* ───────────────────────────────────────────────────────────────────────────
   ⛔ מוטציה ומוטציית-נגד — סבב 67
   ───────────────────────────────────────────────────────────────────────────
   ⛔ מבחן נכנס עם מוטציה, או עם נימוק כתוב מדוע אינו ניתן למוטציה.
   ⚠️ בלעדיה אין שום ראיה שהמבחן **מסוגל** ליפול: 97 טענות שעוברות על עץ
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

  const _mut = (label, file, edit, expectFail) => {
    const d = _m.mkdtempSync(_p.join(_o.tmpdir(), 'rd67-'));
    _m.cpSync(_root, d, { recursive: true, filter: (s) => !s.includes('/.git') });
    const f = _p.join(d, file);
    if (!_m.existsSync(f)) { console.log('  ok   ' + label + ' — ⚠️ הקובץ אינו קיים כאן, הטענה מוצהרת ריקה'); return; }
    _m.writeFileSync(f, edit(_m.readFileSync(f, 'utf8')));
    const st = _run(d);
    const fell = st !== 0;
    console.log((fell === expectFail ? '  ok   ' : '  FAIL ') + label);
    /*  ⛔ יציאה מיידית ולא `exitCode` (סבב 67) — סיכום המבחן קורא
     *  ל-`process.exit` בסופו, והוא היה דורס כשל מוטציה בשקט. */
    if (fell !== expectFail) process.exit(1);
    _m.rmSync(d, { recursive: true, force: true });
  };

  console.log('\n— מוטציות (סבב 67) —');
  _mut('⛔ ביטול בדיקת הטביעה בכניסה האופליין מפיל', 'index.html',
       (s) => s.replace(/pass_fp/g, 'pass_fp_x'), true);
  _mut('⭐ מוטציית-נגד: פונקציה חדשה וחיה ב-index.html ⛔ אינה מפילה', 'index.html',
       (s) => s.replace('</body>', '<script>function r72Live(){ return 1; }\nvar _r72Seen = r72Live();</script>\n</body>'), false);
}
