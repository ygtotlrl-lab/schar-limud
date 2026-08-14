#!/usr/bin/env node
/*  בדיקת סבב 26 — יישור מודל ההרשאות: תפקיד במקום סיסמת שער.
 *
 *  ⚠️ **הבדיקה רצה על הקוד האמיתי המחולץ מ-`index.html`**, לא על העתק.
 *  הפונקציות נחתכות מהקובץ לפי שם (התאמת סוגריים מסולסלים) ומורצות ב-`vm`
 *  מעל רתמה מינימלית — DOM, `localStorage`, `crypto` ולקוח Supabase
 *  מזויפים. מוטציה בקוד האמיתי מפילה כאן טענה, וזה כל הרעיון.
 *  ⚠️ **פרטי ל-schar-limud** — בניגוד ל-`check-status-area.mjs`
 *  ול-`check-docs.mjs` הוא אינו זהה לאף ריפו אחר, ואין ליישר אותו.
 *
 *  ארבע האינווריאנטות שהסבב נדרש להן:
 *    1. משתמש `admin` נכנס למסך ההגדרות.
 *    2. משתמש שאינו `admin` נחסם — **ומקבל את ההודעה הנכונה**, שנבדלת
 *       מההודעה של «העמודה עדיין לא קיימת».
 *    3. ⛔ `sl_admin_pass_h` אינו קיים באף מפתח localStorage אחרי
 *       המיגרציה המקומית.
 *    4. ⛔ אף מסלול באפליקציה אינו משווה מול המחרוזת `'admin'` כסיסמה —
 *       זו הייתה פרצת ההתקנה הטרייה שהסבב הזה סוגר.
 *
 *  הרצה:  node tools/test_round26.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SQL000 = fs.readFileSync(path.join(ROOT, 'migrations', '000_initial_schema.sql'), 'utf8');
const SQL011 = fs.readFileSync(path.join(ROOT, 'migrations', '011_users_role.sql'), 'utf8');

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
const body = (name) => fn(name);
// קיים בקובץ בכלל? משמש לטענות «X הוסר».
const hasFn = (name) =>
  SRC.indexOf('\nfunction ' + name + '(') >= 0 || SRC.indexOf('\nasync function ' + name + '(') >= 0;

const NAMES_VAR = [
  'SL_USERS_KEY', 'SL_USER_COLS', 'SL_USERS', 'SL_PASS_ITER_USER', 'SL_PASS_CTX',
  'SL_USERS_PULL_MS', 'SL_NEVER_MIRROR_SETTINGS', 'SL_OLD_PASS_HASH_KEY',
  'SL_SESSION_KEY', 'MSG_SET_DENIED', 'MSG_SET_NO_ROLE',
  'MSG_OFF_UNKNOWN', 'MSG_OFF_NO_FP', 'MSG_OFF_NO_CRYPTO', 'MSG_NO_USERS',
];
const NAMES_FN = [
  'slUserPub', 'slRandSalt', 'slPassFp', 'slMakePassFp', 'slIsMissingFpCol',
  'slUsersLoad', 'slUsersSave', 'slUserByName', 'slPullUsers', 'slVerifyOffline',
  'slSettingsAccess', 'slIsAdmin', 'slDropLegacyPassHash',
  'slSaveSession', 'slReadSession', 'slResolveUser',
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
    CUR_USER: null, SYNC_INT: null, SC_STUDENT_ID: null,
    MSG_BAD_LOGIN: '❌ שם משתמש או סיסמה שגויים',
    lsSet(k, v) { store[k] = String(v); return true; },
    lsSetArray(k, arr) { store[k] = JSON.stringify(arr); return true; },
    lsGet(k, d) { return k in store ? store[k] : d; },
    lsRemove(k) { delete store[k]; },
    lsLog(a, d) { calls.lsLog.push(a + ' | ' + d); },
    withTimeout: (p) => p,
    isNetErr: (e) => /Failed to fetch|NetworkError|network/i.test(String(e && (e.message || e))),
    showAuthErr(m) { calls.authErr.push(m); },
    startAuthLoad() {},
    enterApp() { calls.enter++; },
    toast(m) { calls.toast.push(m); },
    // קוראים חיצוניים שאינם בתחום הסבב הזה.
    renderSettingsLists() { calls.lists++; },
    updateDropdowns() {}, renderDash() {}, renderTxnLog() {}, renderStudentCard() {},
    slApplyMirror() {}, slClearSession() { delete store['sl_session']; },
    slEnsurePassFp: () => Promise.resolve(false),
    _slUsersPulling: false, _slUsersPulledAt: 0,
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

/* ⚠️ המתנה ל**אירוע**, לא לשעון — הלקח של סבב 24. `doLogin` מפעילה שרשרת
   רקע אחרי שהמסך כבר עלה, והמתנה של מספר מילישניות קבוע היא **מרוץ**:
   על מכונה עמוסה היא נגמרת לפני שהשרשרת סיימה, והטענה נופלת בזמן שהקוד
   תקין. ⛔ אין להחליף את זה בחזרה ב-`setTimeout` קבוע.
   התקרה קיימת כדי שהבדיקה **תיכשל ברעש** אם האירוע לא יקרה כלל. */
async function waitFor(pred, label, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 5));
  }
  ok('⛔ ' + label + ' — לא קרה בתוך ' + ms + 'ms', false);
  return false;
}

const ADMIN = { id: 1, username: 'shimon', role: 'admin' };
const PLAIN = { id: 2, username: 'levi', role: 'user' };

/* ═══════════════════════════════════════════════════════════════════════ */
async function main() {

  /* ── א. ההרשאה נגזרת מהתפקיד ─────────────────────────────────────────── */
  sect('א. slSettingsAccess — שלושה מצבים, ונכשל סגור');
  {
    const h = makeCtx();
    eq('admin ⇒ ok', h.ctx.slSettingsAccess({ role: 'admin' }), 'ok');
    eq('user ⇒ denied', h.ctx.slSettingsAccess({ role: 'user' }), 'denied');
    eq('תפקיד לא מוכר ⇒ denied (נכשל סגור)', h.ctx.slSettingsAccess({ role: 'Admin' }), 'denied');
    eq('תפקיד עם רווח ⇒ denied', h.ctx.slSettingsAccess({ role: ' admin' }), 'denied');
    eq('אין תפקיד ⇒ no-role', h.ctx.slSettingsAccess({ username: 'x' }), 'no-role');
    eq('תפקיד null ⇒ no-role', h.ctx.slSettingsAccess({ role: null }), 'no-role');
    eq('תפקיד ריק ⇒ no-role', h.ctx.slSettingsAccess({ role: '' }), 'no-role');
    eq('⛔ אין משתמש כלל ⇒ denied ולא no-role', h.ctx.slSettingsAccess(null), 'denied');

    h.ctx.CUR_USER = { role: 'admin' };
    ok('slIsAdmin קורא את CUR_USER כברירת מחדל', h.ctx.slIsAdmin());
    h.ctx.CUR_USER = { role: 'user' };
    ok('ומחזיר false ללא-admin', !h.ctx.slIsAdmin());
    h.ctx.CUR_USER = null;
    ok('ובלי משתמש מחובר', !h.ctx.slIsAdmin());
  }

  /* ── ב. מסך ההגדרות ──────────────────────────────────────────────────── */
  sect('ב. ⭐ admin נכנס · לא-admin נחסם עם ההודעה הנכונה');
  {
    const h = makeCtx();
    h.ctx.CUR_USER = Object.assign({}, ADMIN);
    h.ctx.showPanel('settings');
    eq('⭐ admin — מסך ההגדרות מוצג', h.dom.els['settings-main'].style.display, 'block');
    eq('וכרטיס החסימה מוסתר', h.dom.els['settings-denied'].style.display, 'none');
    eq('שכר הלימוד נטען לשדה', h.dom.els['set-def-tuition'].value, '2500');
    eq('הרשימות רונדרו', h.calls.lists, 1);
    eq('⛔ ואפס קריאות רשת — ההרשאה עובדת אופליין', h.calls.sb.length, 0);
  }
  {
    const h = makeCtx();
    h.ctx.CUR_USER = Object.assign({}, PLAIN);
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
    h.ctx.CUR_USER = { id: 1, username: 'shimon' };
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
    h.ctx.CUR_USER = Object.assign({}, ADMIN);
    h.ctx.refreshUI = undefined;
    vm.runInContext(fn('refreshUI'), h.ctx);
    h.ctx.refreshUI();
    eq('refreshUI אינו מרנדר הגדרות כשהפאנל סגור', h.calls.lists, 0);
    h.dom.els['panel-settings'].classList.add('active');
    h.ctx.refreshUI();
    eq('ומרנדר כשהוא פתוח ויש הרשאה', h.calls.lists, 1);
    h.ctx.CUR_USER = Object.assign({}, PLAIN);
    h.ctx.refreshUI();
    eq('⛔ ואינו מרנדר ללא-admin גם כשהפאנל פתוח', h.calls.lists, 1);
  }

  /* ── ג. ניקוי השריד במכשיר ───────────────────────────────────────────── */
  sect('ג. ⛔ sl_admin_pass_h — ניקוי חד-פעמי');
  {
    const h = makeCtx();
    h.store['sl_admin_pass_h'] = 'a'.repeat(64);
    h.store['sl_session'] = '{"id":1,"username":"shimon"}';
    eq('המפתח קיים לפני', 'sl_admin_pass_h' in h.store, true);
    eq('המיגרציה מדווחת שניקתה', h.ctx.slDropLegacyPassHash(), true);
    ok('⛔ sl_admin_pass_h אינו קיים באף מפתח localStorage',
      !Object.keys(h.store).some((k) => k === 'sl_admin_pass_h' ||
        String(h.store[k]).indexOf('sl_admin_pass_h') !== -1));
    ok('הפעולה נרשמה ליומן', h.calls.lsLog.length === 1 &&
      h.calls.lsLog[0].indexOf('sl_admin_pass_h') !== -1);
    ok('⛔ ולא נגעה במפתחות אחרים', h.store['sl_session'] === '{"id":1,"username":"shimon"}');
    eq('הרצה שנייה — אין מה לנקות', h.ctx.slDropLegacyPassHash(), false);
    eq('ואין רישום כפול ליומן', h.calls.lsLog.length, 1);
  }
  {
    const h = makeCtx();
    eq('מכשיר נקי מלכתחילה ⇒ false', h.ctx.slDropLegacyPassHash(), false);
    eq('ואין רישום ליומן', h.calls.lsLog.length, 0);
    /* ⚠️ הטענה חודדה בהשלמת סבב 30 ולא הוחלשה: קודם היא חיפשה את הקריאה
       **אחרי** המחרוזת `DOMContentLoaded`, וזה נשבר כשהמטפל האנונימי קיבל
       שם (`slBoot`) והוגדר לפני שורת הרישום. עכשיו נבדק שהקריאה יושבת
       **בתוך פונקציית העלייה עצמה** — נקודת ההפעלה הקנונית של כלל ברזל 12 —
       ושהיא זו שנרשמת ל-`DOMContentLoaded`. */
    ok('הפונקציה מחווטת בפונקציית העלייה', /slDropLegacyPassHash\(\)/.test(fn('slBoot')));
    ok('ופונקציית העלייה היא שנרשמת ל-DOMContentLoaded',
      /addEventListener\(\s*'DOMContentLoaded'\s*,\s*slBoot\s*\)/.test(SRC));
  }

  /* ── ד. התפקיד שורד סשן, ואופליין ────────────────────────────────────── */
  sect('ד. התפקיד זמין גם בעלייה בלי רשת');
  {
    const h = makeCtx({ online: false });
    h.ctx.slSaveSession(Object.assign({}, ADMIN));
    const s = JSON.parse(h.store['sl_session']);
    eq('הסשן מחזיק role', s.role, 'admin');
    ok('⛔ והסשן אינו מחזיק סיסמה', !('password' in s) && !('pass_fp' in s));
    const sess = h.ctx.slReadSession();
    eq('⭐ בעלייה מחדש בלי רשת — התפקיד קיים',
      h.ctx.slSettingsAccess(h.ctx.slResolveUser(sess)), 'ok');
  }
  {
    // המראה מנצחת: תפקיד שהשתנה בלוח הבקרה והגיע במשיכה גובר על הסשן.
    const h = makeCtx();
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', role: 'user' }];
    const merged = h.ctx.slResolveUser({ id: 1, username: 'shimon', role: 'admin' });
    eq('⭐ המראה גוברת על הסשן', merged.role, 'user');
    eq('ולכן הגישה נשללת', h.ctx.slSettingsAccess(merged), 'denied');
    const noMirror = h.ctx.slResolveUser({ id: 9, username: 'ploni', role: 'admin' });
    eq('מי שאינו במראה — נשאר עם מה שהסשן זוכר', noMirror.role, 'admin');
  }
  {
    // ⭐ המתנה ל**אירוע**: משיכת המשתמשים מרעננת את התפקיד של המחובר.
    const h = makeCtx({
      reply: (q) => (q.table === 'sl_users' && q.kind === 'select' && !q.eqs.username)
        ? { data: [{ id: 1, username: 'shimon', role: 'user' }], error: null }
        : { data: null, error: null },
    });
    h.ctx.CUR_USER = Object.assign({}, ADMIN);
    h.ctx.slPullUsers(true);
    await waitFor(() => h.ctx.CUR_USER && h.ctx.CUR_USER.role === 'user',
      'רענון התפקיד אחרי משיכת המשתמשים');
    eq('⭐ תפקיד שהורד בלוח הבקרה מגיע למכשיר', h.ctx.CUR_USER.role, 'user');
    eq('והסשן עודכן איתו', JSON.parse(h.store['sl_mirror_users'] ? h.store['sl_session'] : '{}').role, 'user');
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
    ok('slIsMissingFpCol מזהה גם את role חסר',
      h.ctx.slIsMissingFpCol({ message: 'column sl_users.role does not exist' }));
    ok('ועדיין את pass_fp', h.ctx.slIsMissingFpCol({ message: 'column pass_fp does not exist' }));
    ok('ולא שגיאה אחרת', !h.ctx.slIsMissingFpCol({ message: 'timeout' }));
  }

  /* ── ה. המנגנון הישן הוסר לחלוטין ────────────────────────────────────── */
  sect('ה. ⛔ שער הסיסמה — הוסר, ואין שריד');
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
    // ⚠️ הסינון עצמו **נשאר** — השורה קיימת במסד ומחזיקה ערך אמיתי,
    //    ואסור לה לרדת לדיסק. ר' ההערה מעל SL_NEVER_MIRROR_SETTINGS.
    const h = makeCtx();
    ok('⚠️ admin_pass עדיין ברשימת «לא יורד לדיסק»',
      h.ctx.SL_NEVER_MIRROR_SETTINGS.indexOf('admin_pass') !== -1);
  }

  /* ── ו. הסכימה ───────────────────────────────────────────────────────── */
  sect('ו. הסכימה — role נוסף, admin_pass לא נזרע');
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

  /* ── ז. מסלולי הכניסה לא נגעו ────────────────────────────────────────── */
  sect('ז. ⛔ מנגנון הכניסה עצמו לא נגע');
  {
    const h = makeCtx();
    // כניסה אופליין עדיין עובדת, ומחזירה את התפקיד מהמראה.
    const made = await h.ctx.slMakePassFp('135790');
    h.ctx.SL_USERS = [{ id: 1, username: 'shimon', role: 'admin', pass_salt: made.salt, pass_fp: made.fp }];
    eq('סיסמה נכונה ⇒ ok', await h.ctx.slVerifyOffline(h.ctx.SL_USERS[0], '135790'), 'ok');
    eq('סיסמה שגויה ⇒ bad', await h.ctx.slVerifyOffline(h.ctx.SL_USERS[0], '999999'), 'bad');
    eq('בלי טביעה ⇒ no-fp', await h.ctx.slVerifyOffline({ username: 'x' }, '135790'), 'no-fp');

    const h2 = makeCtx({ online: false });
    h2.ctx.SL_USERS = h.ctx.SL_USERS;
    h2.dom.els['au-user'].value = 'shimon';
    h2.dom.els['au-pass'].value = '135790';
    await h2.ctx.doLoginOffline('shimon', '135790');
    eq('⭐ כניסה אופליין עדיין עובדת', h2.calls.enter, 1);
    eq('ובלי שגיאה', h2.calls.authErr.length, 0);
    eq('⭐ והתפקיד ירד עם המשתמש', h2.ctx.CUR_USER.role, 'admin');
    ok('⛔ הסשן שנשמר אינו מחזיק סיסמה',
      String(h2.store['sl_session']).indexOf('135790') === -1);

    ok('⛔ אין אכיפת פורמט שש ספרות בגוף doLogin', body('doLogin').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ ולא ב-doLoginOffline', body('doLoginOffline').indexOf('PASS_SIX_RE') === -1);
    ok('⛔ PASS_SIX_RE ירד מהקובץ יחד עם אתר האכיפה היחיד שלו',
      !/^var PASS_SIX_RE\s*=/m.test(SRC));
    ok('שדה הכניסה שומר על רמז הקלט',
      /id="au-pass"[^>]*inputmode="numeric"/.test(SRC) && /id="au-pass"[^>]*maxlength="6"/.test(SRC));
  }

  /* ── ח. גרסת המטמון ──────────────────────────────────────────────────── */
  sect('ח. service worker');
  {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    // ⚠️ תבנית ולא מספר קבוע — טענה שמקבעת מספר נכשלת על כל קידום עתידי,
    //    כלומר חוסמת בדיוק את מה שכלל קריטי 2 מחייב.
    ok('CACHE_NAME בתבנית schar-limud-v<N>', /CACHE_NAME = 'schar-limud-v\d+'/.test(sw));
  }

  console.log('\n' + (fail ? '❌' : '✅') + `  ${pass} עברו, ${fail} נכשלו`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('💥 ' + ((e && e.stack) || e)); process.exit(1); });
