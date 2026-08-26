#!/usr/bin/env node
/*  סבב 52 — נעילת חוסר-פעילות, מודול משותף.
 *
 *  ⭐ **מה נשמר כאן:** משתמש שהתחבר ואינו נוגע במסך מקבל אחרי ארבע דקות
 *  חלון אזהרה, ואחרי חמש מוצא החוצה — **אותם ערכים ואותה התנהגות** בשלוש
 *  האפליקציות שיש בהן כניסה.
 *
 *  ⚠️ **מה שנמדד לפני האיחוד (2026-08-25), ולא הוצהר:** ל-hanhala היה
 *  המנגנון המלא (5 ו-4 דקות + חלון אזהרה), ל-schar היה **אותו ערך בלי
 *  חלון אזהרה** (טוסט בלבד), ול-gius לא היה כלום. ⛔ שלושה מימושים
 *  לאותה יכולת, בלי ששום שער חיפש אותה ובלי שאיש החליט — בדיוק צורת
 *  הכשל שכלל ברזל 14 אוסר.
 *
 *  ⚠️ **הרתמה מריצה את הליבה האמיתית** ברתמת `vm` עם DOM מזויף ושעון
 *  מזויף. ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  /*  ⛔ `present:false` הוא הצהרה מנומקת ולא היעדר שקט — ר' יומן העבודה,
   *  שאין בה מסך כניסה כלל. */
  present: true,
  bootFn:  'slBoot',        // פונקציית העלייה — נקודת ההפעלה היחידה
  resetFn: 'enterApp',      // מסלול הכניסה המוצלחת — נקודת הדריכה מחדש
  stopFn:  'doLogout',      // מסלול היציאה
  /*  ⚠️ מפתח הסשן הקבוע — `null` פירושו שהסשן אינו נשמר במכשיר.
   *  ⭐ מסבב 53 הוא `null` **בארבעתן** (מטריצה, שורה 35), והאכיפה
   *  המלאה עברה ל-`test_round53_session.mjs`; הטענה כאן נשארת כשכבה
   *  שנייה שנכשלת-סגור אם מסלול שמירה כלשהו יחזור. */
  sessionKey: null,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const BLOCK = {
  sha: 'faf3168aa73eeb97',
  lines: 133,
  start: '/* ═══ נעילת חוסר-פעילות — מודול משותף (סבב 52)',
  end:   '/* ═══════════════ סוף מודול נעילת חוסר-הפעילות',
};
const LOCK_MS = 5 * 60 * 1000;
const WARN_MS = 4 * 60 * 1000;

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const src = fs.readFileSync(APP.file, 'utf8');
console.log('\n🔎 נעילת חוסר-פעילות (סבב 52) — ' + APP.app + '\n');

function codeOnly(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
function fnBody(text, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(text);
  if (!m) return '';
  const i = text.indexOf('{', m.index);
  let d = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') d++;
    else if (text[j] === '}') { d--; if (!d) return text.slice(i, j + 1); }
  }
  return '';
}
function grab(text) {
  const i = text.indexOf(BLOCK.start);
  if (i < 0) return null;
  const j = text.indexOf(BLOCK.end, i);
  if (j < 0) return null;
  const k = text.indexOf('*/', j);
  return k < 0 ? null : text.slice(i, k + 2);
}

const block = grab(src);
const code = codeOnly(src);

/* ══════════════════════════════════════════════════════════════════════════
   אפליקציה שהמנגנון אינו רלוונטי לה — ⛔ ההיעדר עצמו נאכף
   ══════════════════════════════════════════════════════════════════════════ */
if (!APP.present) {
  if (block) fail('1. הבלוק המשותף קיים כאן, בניגוד להצהרת `APP.present`');
  else pass('1. הבלוק המשותף אינו כאן, כמוצהר');
  if (/\bLK_CFG\b/.test(code)) fail('2. `LK_CFG` קיים כאן, בניגוד להצהרה');
  else pass('2. `LK_CFG` אינו כאן, כמוצהר');
  /*  ⛔ והטענה החשובה: אין כאן מנגנון נעילה **מאולתר** במקומו. זה בדיוק
   *  מה שהיה ב-schar עד הסבב הזה — אותו רעיון, מימוש פרטי, ואף שער לא
   *  חיפש אותו. */
  if (/\b(LOCK_MS|lockTimer|ResetLock|resetLockTimer)\b/.test(code))
    fail('3. ⛔ נמצא מנגנון נעילה פרטי כאן — «קיים רק באחת, בשקט» אינו מצב חוקי');
  else pass('3. ⛔ אין כאן מנגנון נעילה פרטי');
  console.log(failures ? `\n❌ בדיקת נעילת חוסר-הפעילות נכשלה (${failures})`
                       : '\n✅ בדיקת נעילת חוסר-הפעילות עברה');
  process.exit(failures ? 1 : 0);
}

if (!block) {
  fail('1. הבלוק המשותף לא נמצא ב-' + APP.file);
  console.log('\n❌ בדיקת נעילת חוסר-הפעילות נכשלה (' + failures + ')');
  process.exit(1);
}

/* ── 1–2. הליבה — חתימה ומספר שורות ────────────────────────────────────── */
const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
if (sha !== BLOCK.sha) fail(`1. חתימת הליבה ${sha} במקום ${BLOCK.sha} — הליבה חייבת להיות זהה בית-לבית`);
else pass('1. חתימת הליבה תואמת (' + BLOCK.sha + ')');
const nLines = block.split('\n').length;
if (nLines !== BLOCK.lines) fail(`2. ${nLines} שורות במקום ${BLOCK.lines}`);
else pass('2. ' + BLOCK.lines + ' שורות, כמצופה');

/* ── 3. הערכים עצמם — ⛔ קריאים בהודעת הכשל ולא רק בחתימה ──────────────── */
/*  חתימה שזזה אומרת «משהו השתנה»; זו אומרת **מה** השתנה. */
for (const [name, want] of [['LK_LOCK_MS', LOCK_MS], ['LK_WARN_MS', WARN_MS]]) {
  const m = new RegExp('var\\s+' + name + '\\s*=\\s*([^;]+);').exec(block);
  if (!m) { fail('3. `' + name + '` לא נמצא בליבה'); continue; }
  let got;
  try { got = vm.runInNewContext(m[1]); } catch (e) { got = NaN; }
  if (got === want) pass('3. `' + name + '` = ' + want / 60000 + ' דקות, כפי שנמדד ב-hanhala');
  else fail('3. `' + name + '` = ' + got + ' במקום ' + want + ' — ⛔ ערך שנבדל באחת הוא בדיוק הסחיפה');
}

/* ── 4. `LK_CFG` מוגדר מעל הליבה, עם שני השדות ─────────────────────────── */
const cfgAt = code.indexOf('var LK_CFG');
const blockAt = src.indexOf(BLOCK.start);
if (cfgAt < 0) fail('4. `LK_CFG` אינו מוגדר — ליבה בלי פרמטרים אינה מודול');
else {
  pass('4. `LK_CFG` מוגדר');
  const cfgSrc = code.slice(cfgAt, cfgAt + 400);
  for (const f of ['active', 'lock']) {
    if (new RegExp('\\b' + f + '\\s*:').test(cfgSrc)) pass('4. `LK_CFG.' + f + '` מוגדר');
    else fail('4. `LK_CFG.' + f + '` חסר');
  }
}

/* ── 5–7. החיווט ───────────────────────────────────────────────────────── */
const codeOutside = codeOnly(src.slice(0, blockAt) + src.slice(blockAt + block.length));
const calls = (fn, where) => (where.match(new RegExp('\\b' + fn + '\\s*\\(', 'g')) || []).length;

if (calls('lkBoot', codeOutside) === 1) pass('5. `lkBoot()` נקראת פעם אחת בלבד');
else fail('5. `lkBoot()` נקראת ' + calls('lkBoot', codeOutside) + ' פעמים — נקודת ההפעלה חייבת להיות אחת');
if (/\blkBoot\s*\(/.test(fnBody(codeOutside, APP.bootFn)))
  pass('5. `lkBoot()` נקראת מתוך `' + APP.bootFn + '()` — פונקציית העלייה');
else fail('5. `lkBoot()` אינה נקראת מתוך `' + APP.bootFn + '()`');

if (/\blkReset\s*\(/.test(fnBody(codeOutside, APP.resetFn)))
  pass('6. `lkReset()` נקראת ממסלול הכניסה `' + APP.resetFn + '()`');
else fail('6. `' + APP.resetFn + '()` אינו דורך את הנעילה — משתמש שנכנס לא יינעל עד לנגיעה הבאה');

if (/\blkStop\s*\(/.test(fnBody(codeOutside, APP.stopFn)))
  pass('7. `lkStop()` נקראת ממסלול היציאה `' + APP.stopFn + '()`');
else fail('7. `' + APP.stopFn + '()` אינו עוצר את הנעילה — טיימר דרוך היה נועל את מסך הכניסה');

/* ── 8. ⛔ אין מנגנון נעילה פרטי ששרד לצד המשותף ───────────────────────── */
if (/\b(SL_LOCK_MS|slResetLock|resetLockTimer|AUTH\.lockTimer)\b/.test(codeOutside))
  fail('8. ⛔ שריד של מנגנון הנעילה הפרטי נשאר בקוד — שני מנגנונים לאותה יכולת');
else pass('8. ⛔ אין שריד של מנגנון נעילה פרטי');

/* ── 9. סשן שנשמר במכשיר — נמדד ומושווה להצהרה (מטריצה, שורה 35) ───────── */
const hasSession = /SESSION_KEY\b/.test(code);
if (hasSession === !!APP.sessionKey)
  pass('9. סשן נשמר במכשיר: ' + (hasSession ? 'כן (' + APP.sessionKey + ')' : 'לא') + ' — כמוצהר');
else fail('9. סשן נשמר במכשיר: הקוד אומר ' + (hasSession ? 'כן' : 'לא') +
          ' וההצהרה אומרת ' + (APP.sessionKey ? 'כן' : 'לא'));

/* ══════════════════════════════════════════════════════════════════════════
   רתמת ההתנהגות — הליבה האמיתית, DOM מזויף ושעון מזויף
   ══════════════════════════════════════════════════════════════════════════ */
function fakeEl(id) {
  return { id, className: '', textContent: '', type: '', onclick: null, style: {},
           children: [], appendChild(c) { this.children.push(c); return c; } };
}
function harness(moduleSrc) {
  const els = {};
  const log = { locks: 0, listeners: [] };
  const st = { now: 0, active: true };
  const timers = [];
  const doc = {
    body: fakeEl('body'), head: fakeEl('head'), documentElement: fakeEl('html'),
    getElementById: (id) => els[id] || null,
    createElement: () => fakeEl(''),
    addEventListener: (ev, fn) => { log.listeners.push(ev); els.__fns = els.__fns || []; els.__fns.push(fn); },
  };
  doc.body.appendChild = function (c) { if (c && c.id) els[c.id] = c; this.children.push(c); return c; };
  doc.head.appendChild = function (c) { if (c && c.id) els[c.id] = c; this.children.push(c); return c; };
  const ctx = {
    console: { warn() {}, log() {}, error() {} },
    document: doc,
    setTimeout: (fn, ms) => { const t = { fn, at: st.now + ms, id: timers.length + 1 }; timers.push(t); return t.id; },
    clearTimeout: (id) => { for (let i = 0; i < timers.length; i++) if (timers[i].id === id) timers.splice(i, 1); },
  };
  ctx.LK_CFG = { active: () => st.active, lock: () => { log.locks++; st.active = false; } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(moduleSrc, ctx);
  const advance = (ms) => {
    st.now += ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= st.now).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers.splice(timers.indexOf(due), 1);
      due.fn();
    }
  };
  return { ctx, log, st, els, advance, timers, touch: () => (els.__fns || []).forEach((f) => f()) };
}

function scenarios(moduleSrc) {
  const res = [];
  const add = (name, ok) => res.push({ name, ok: !!ok });

  /* א. עלייה עם משתמש מחובר דורכת אזהרה ונעילה */
  {
    const h = harness(moduleSrc);
    const armed = h.ctx.lkBoot();
    add('א. lkBoot דורך שני טיימרים כשיש משתמש', armed === true && h.timers.length === 2);
  }
  /* ב. אין משתמש ⇒ שום דבר אינו דרוך */
  {
    const h = harness(moduleSrc);
    h.st.active = false;
    const armed = h.ctx.lkBoot();
    add('ב. בלי משתמש מחובר אין טיימר דרוך', armed === false && h.timers.length === 0);
  }
  /* ג. חלון האזהרה עולה בדיוק ב-WARN_MS, והנעילה ב-LOCK_MS */
  {
    const h = harness(moduleSrc);
    h.ctx.lkBoot();
    h.advance(WARN_MS - 1000);
    const quiet = !h.ctx.lkShown() && h.log.locks === 0;
    h.advance(1000);
    const warned = h.ctx.lkShown() && h.log.locks === 0;
    h.advance(LOCK_MS - WARN_MS);
    add('ג. אזהרה ב-4 דקות ונעילה ב-5', quiet && warned && h.log.locks === 1 && !h.ctx.lkShown());
  }
  /* ד. פעילות מאפסת — החלון נסגר והנעילה נדחית */
  {
    const h = harness(moduleSrc);
    h.ctx.lkBoot();
    h.advance(WARN_MS);
    const shown = h.ctx.lkShown();
    h.ctx.lkReset();
    const hidden = !h.ctx.lkShown();
    h.advance(LOCK_MS - 1000);
    add('ד. lkReset סוגר את החלון ודוחה את הנעילה', shown && hidden && h.log.locks === 0);
  }
  /* ה. lkStop עוצר הכול — ⛔ ואינו דורך מחדש גם כשהמשתמש עדיין «פעיל» */
  {
    const h = harness(moduleSrc);
    h.ctx.lkBoot();
    h.ctx.lkStop();
    h.advance(LOCK_MS * 2);
    add('ה. lkStop עוצר ואינו דורך מחדש', h.log.locks === 0 && h.timers.length === 0);
  }
  /* ו. מאזיני הפעילות נרשמים פעם אחת, ומאפסים את המונה */
  {
    const h = harness(moduleSrc);
    h.ctx.lkBoot();
    const once = h.log.listeners.length;
    h.ctx.lkBoot();
    const twice = h.log.listeners.length;
    h.advance(WARN_MS);
    h.touch();
    add('ו. מאזיני הפעילות נרשמים פעם אחת ומאפסים',
        once === 4 && twice === 4 && !h.ctx.lkShown());
  }
  return res;
}

const base = scenarios(block);
for (const r of base) { if (r.ok) pass('10. ' + r.name); else fail('10. ' + r.name); }

/* ══════════════════════════════════════════════════════════════════════════
   מוטציות — ⛔ אינן נכתבות לעץ (הלקח של סבב 42ג)
   ══════════════════════════════════════════════════════════════════════════ */
const MUTATIONS = [
  { name: 'הסרת חלון האזהרה',
    from: "  _lkWarnT = setTimeout(function () { _lkShow(); }, LK_WARN_MS);",
    to:   "  _lkWarnT = null;",
    hits: 'ג' },
  { name: 'דריכה גם בלי משתמש מחובר',
    from: '  if (!_lkActive()) return false;', to: '  if (false) return false;',
    hits: 'ב' },
  { name: 'lkStop שנשען על lkReset',
    from: 'function lkStop() {\n  if (_lkLockT) { clearTimeout(_lkLockT); _lkLockT = null; }\n  if (_lkWarnT) { clearTimeout(_lkWarnT); _lkWarnT = null; }\n  _lkHide();\n}',
    to:   'function lkStop() {\n  lkReset();\n}',
    hits: 'ה' },
  { name: 'מאזיני פעילות שנרשמים בכל עלייה',
    from: '  if (!_lkWired) {\n    _lkWired = true;', to: '  if (true) {\n    _lkWired = true;',
    hits: 'ו' },
  { name: 'נעילה שאינה מנקה את הטיימר הקודם',
    from: '  if (_lkLockT) { clearTimeout(_lkLockT); _lkLockT = null; }\n  if (_lkWarnT) { clearTimeout(_lkWarnT); _lkWarnT = null; }\n  if (!_lkActive()) return false;',
    to:   '  if (!_lkActive()) return false;',
    hits: 'ד' },
];

for (const mu of MUTATIONS) {
  if (block.indexOf(mu.from) < 0) { fail('11. עוגן המוטציה «' + mu.name + '» לא נמצא בליבה'); continue; }
  const mutated = block.replace(mu.from, mu.to);
  let res;
  try { res = scenarios(mutated); } catch (e) { res = [{ name: mu.hits + '.', ok: false }]; }
  const target = res.filter((r) => r.name.indexOf(mu.hits + '.') === 0);
  if (!target.length) { fail('11. המוטציה «' + mu.name + '» מכוונת לטענה שאינה קיימת'); continue; }
  if (target.every((r) => r.ok)) fail('11. המוטציה «' + mu.name + '» ⛔ **לא** הפילה את טענה «' + mu.hits + '»');
  else pass('11. המוטציה «' + mu.name + '» הפילה את טענה «' + mu.hits + '», כנדרש');
}

/*  ⭐ מוטציית הערך — ⛔ שינוי `LK_LOCK_MS` באפליקציה אחת חייב להיתפס
 *  בשני מקומות: בטענה 3 (הערך עצמו) ובחתימה (check-capabilities). */
{
  const mutated = block.replace('var LK_LOCK_MS = 5 * 60 * 1000;', 'var LK_LOCK_MS = 10 * 60 * 1000;');
  const s2 = crypto.createHash('sha256').update(mutated).digest('hex').slice(0, 16);
  const m = /var\s+LK_LOCK_MS\s*=\s*([^;]+);/.exec(mutated);
  const val = m ? vm.runInNewContext(m[1]) : NaN;
  if (s2 !== BLOCK.sha && val !== LOCK_MS)
    pass('12. ⛔ שינוי `LK_LOCK_MS` נתפס גם בערך וגם בחתימה');
  else fail('12. שינוי `LK_LOCK_MS` לא נתפס');
}

/*  ⭐ ומוטציית-נגד: שינוי רווחים בלבד ⛔ אינו מפיל את ההתנהגות. */
{
  const spaced = block.replace('function lkStop() {', 'function  lkStop( ) {');
  const res = spaced === block ? null : scenarios(spaced);
  if (res && res.every((r) => r.ok)) pass('13. ⛔ שינוי רווחים בלבד אינו מפיל — השער מודד התנהגות');
  else fail('13. שינוי רווחים הפיל טענה — השער נופל על עיצוב');
}

console.log(failures ? `\n❌ בדיקת נעילת חוסר-הפעילות נכשלה (${failures})`
                     : '\n✅ בדיקת נעילת חוסר-הפעילות עברה');
process.exit(failures ? 1 : 0);
