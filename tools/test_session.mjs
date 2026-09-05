#!/usr/bin/env node
/*  test_session.mjs — מודל הסשן, מודול משותף.
 *
 *  **מה נאכף:** המשתמש המחובר חי **בזיכרון בלבד** ואינו יורד לדיסק,
 *  בשלוש האפליקציות שיש בהן כניסה — ⛔ וכל טעינה מחדש דורשת כניסה.
 *  ⚠️ הרתמה מריצה את הליבה האמיתית ב-`vm` עם localStorage מזויף, ⛔ והמוטציות
 *  אינן נכתבות לעץ.
 *
 *  **הנימוק המדוד:** תפוגת סשן לא הייתה קיימת באף אחת מהארבע — ⛔ ההבדל היה
 *  **עצם השמירה**: אחת החזיקה את המשתמש בזיכרון, ושתיים שמרו אותו
 *  ב-`localStorage` **בלי תפוגה**, יחד עם ההרשאה.
 *
 *  **מה יישבר בלעדיו:** ⛔ משתמש שנשמר לדיסק בלי תפוגה נשאר מחובר לנצח
 *  במכשיר משותף, ⚠️ וההרשאה שלו נשמרת איתו — ⭐ כלומר הסלמת הרשאה שורדת
 *  טעינה מחדש.
 *
 *  **מה אינו נאכף כאן:** ⛔ הכרעת מודל האבטחה עצמה — ⚠️ היא של המנהל,
 *  ⭐ והשער נועל את מה שהוכרע ⛔ ואינו מכריע.
 *
 *  ⚠️ **באפליקציה שאין בה מסך כניסה** — `present:false` בבלוק `APP` — שלוש
 *  הטענות כאן הן טענות-**חסר** ובלוק המוטציות מדולג. ⛔ יחס שורות-לטענה
 *  חריג הוא נימוק שנדרש, ⛔ ולא רשלנות.
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
   *  שאין בה מסך כניסה ואין משתמש מחובר להחזיק. */
  present: true,
  bootFn: 'slBoot',          // פונקציית העלייה — נקודת ההפעלה היחידה
  /*  ⚠️ מפתחות הסשן שהאפליקציה שמרה בהם עד סבב 53. ⛔ אין למחוק מכאן שם
   *  גם אחרי שהמנגנון הישן ירד מהקוד — המפתח עדיין על הדיסק בשטח. */
  legacy: ['sl_session'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const BLOCK = {
  sha: '4ab395fd78fa83f8',
  lines: 51,
  start: '/* ═══ מודל הסשן — מודול משותף (סבב 53)',
  end:   '/* ═══════════════ סוף מודול הסשן',
};

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const src = fs.readFileSync(APP.file, 'utf8');
console.log('\n🔎 מודל הסשן (סבב 53) — ' + APP.app + '\n');

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
   אפליקציה שהמודול אינו רלוונטי לה — ⛔ ההיעדר עצמו נאכף
   ══════════════════════════════════════════════════════════════════════════ */
if (!APP.present) {
  if (block) fail('1. הבלוק המשותף קיים כאן, בניגוד להצהרת `APP.present`');
  else pass('1. הבלוק המשותף אינו כאן, כמוצהר');
  if (/\bSESS_CFG\b/.test(code)) fail('2. `SESS_CFG` קיים כאן, בניגוד להצהרה');
  else pass('2. `SESS_CFG` אינו כאן, כמוצהר');
  /*  ⛔ והטענה החשובה — אין כאן שמירת סשן **מאולתרת** במקום המודול:
   *  מנגנון מקומי לצד המשותף הוא בדיוק ההפרש שהמודול סגר. */
  if (/SESSION_KEY|['"]sl_session['"]|['"]gius\.session['"]/.test(code))
    fail('3. ⛔ נמצאה שמירת סשן במכשיר — במקום שאין בו משתמש מחובר כלל');
  else pass('3. ⛔ אין כאן שמירת סשן במכשיר');
  console.log(failures ? `\n✗ סבב 53 (מודל הסשן) — ${failures} נכשלו`
                       : '\n✓ סבב 53 (מודל הסשן) — 3 טענות עברו, 0 נכשלו');
  process.exit(failures ? 1 : 0);
}

/* ══════════════════════════════════════════════════════════════════════════
   א. הליבה — חתימה, אורך, ומיקום `SESS_CFG`
   ══════════════════════════════════════════════════════════════════════════ */
if (!block) { fail('1. הבלוק המשותף לא נמצא'); process.exit(1); }
const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
if (sha === BLOCK.sha) pass('1. הליבה זהה לחתימה הקנונית (' + BLOCK.sha + ')');
else fail('1. הליבה אינה זהה — ' + sha + ' במקום ' + BLOCK.sha);

const nLines = block.split('\n').length;
if (nLines === BLOCK.lines) pass('2. הליבה בת ' + BLOCK.lines + ' שורות');
else fail('2. הליבה בת ' + nLines + ' שורות במקום ' + BLOCK.lines);

const cfgAt = src.indexOf('var SESS_CFG');
const blkAt = src.indexOf(BLOCK.start);
if (cfgAt >= 0 && cfgAt < blkAt) pass('3. `SESS_CFG` מוגדר מעל הליבה — ליבה בלי פרמטרים אינה מודול');
else fail('3. `SESS_CFG` אינו מוגדר מעל הליבה');

/* ── 4. `SESS_CFG.legacy` — הערך המוצהר, ולא רק קיומו ──────────────────── */
const cfgSrc = src.slice(cfgAt, blkAt);
const legM = /legacy\s*:\s*\[([^\]]*)\]/.exec(cfgSrc);
const legGot = legM ? legM[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : null;
if (legGot && legGot.join('|') === APP.legacy.join('|'))
  pass('4. `SESS_CFG.legacy` = [' + legGot.join(', ') + '] — כמוצהר');
else fail('4. `SESS_CFG.legacy` הוא [' + (legGot ? legGot.join(', ') : '?') +
          '] וההצהרה אומרת [' + APP.legacy.join(', ') + ']');

/* ══════════════════════════════════════════════════════════════════════════
   ב. הטענות הסטטיות — ⛔ המשתמש אינו יורד לדיסק בשום מסלול
   ══════════════════════════════════════════════════════════════════════════ */
const codeOutside = code.replace(codeOnly(block), ' ');

/* ── 5. ⛔ אין קבוע מפתח סשן ────────────────────────────────────────────── */
if (/SESSION_KEY\b/.test(code))
  fail('5. ⛔ נמצא קבוע `SESSION_KEY` — מסלול שמירת הסשן הישן חזר');
else pass('5. ⛔ אין בקוד קבוע `SESSION_KEY`');

/* ── 6. ⛔ אין כתיבה של המשתמש המחובר ל-localStorage ────────────────────── */
const WRITE = /(?:lsSet|lsSetRaw|localStorage\s*\.\s*setItem)\s*\([^;]*(?:SESSION|sessGet\s*\(\s*\)|\.user\b)/;
if (WRITE.test(codeOutside))
  fail('6. ⛔ נמצאה כתיבה של המשתמש המחובר ל-localStorage מחוץ למודול');
else pass('6. ⛔ אין כתיבה של המשתמש המחובר ל-localStorage');

/* ── 7. החיווט — `sessBoot()` מפונקציית העלייה, ורק ממנה ───────────────── */
const bootBody = fnBody(codeOutside, APP.bootFn);
const callsAll = (codeOutside.match(/\bsessBoot\s*\(/g) || []).length;
if (/\bsessBoot\s*\(/.test(bootBody) && callsAll === 1)
  pass('7. `sessBoot()` נקראת אך ורק מ-`' + APP.bootFn + '()`');
else fail('7. `sessBoot()` נקראת ' + callsAll + ' פעמים מחוץ למודול, ובגוף `' +
          APP.bootFn + '()` ' + (/\bsessBoot\s*\(/.test(bootBody) ? 'כן' : 'לא') + ' נמצאה');

/* ══════════════════════════════════════════════════════════════════════════
   ג. רתמת ההתנהגות — הליבה האמיתית, localStorage מזויף
   ══════════════════════════════════════════════════════════════════════════ */
function harness(moduleSrc, legacy, opts) {
  opts = opts || {};
  const store = Object.assign({}, opts.store || {});
  const log = { removed: [], logged: [], sets: 0, reads: 0 };
  const ctx = {
    console: { warn() {}, info() {}, log() {} },
    SESS_CFG: { legacy: legacy },
    lsGet(k, d) {
      log.reads++;
      if (opts.throwOnGet) throw new Error('blocked');
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : (d === undefined ? null : d);
    },
    /* ⚠️ אינה מוחקת מהחנות בכוונה — כדי שקריאה שנייה תוכל למחוק שוב,
       וכך שומר הריצה הכפולה הוא מה שנמדד ולא ריקון החנות. */
    lsRemove(k) { log.removed.push(k); return true; },
    lsSet() { log.sets++; return true; },
    lsSetRaw() { log.sets++; return true; },
    lsLog(a, d) { log.logged.push(a + ':' + d); },
  };
  vm.createContext(ctx);
  new vm.Script(moduleSrc).runInContext(ctx);
  return { ctx, log, store };
}

const SCEN = [];
function scen(name, fn, opt) { SCEN.push([name, fn, opt]); }

scen('הצבה וקריאה של המשתמש המחובר', (h) => {
  h.ctx.sessSet({ id: 1, username: 'x' });
  return h.ctx.sessGet().username === 'x' && h.ctx.sessActive() === true;
});
scen('`sessClear()` מרוקן', (h) => {
  h.ctx.sessSet({ id: 1 });
  h.ctx.sessClear();
  return h.ctx.sessGet() === null && h.ctx.sessActive() === false;
});
scen('⛔ המודול אינו כותב ל-localStorage בשום מסלול', (h) => {
  h.ctx.sessSet({ id: 1, username: 'x' });
  h.ctx.sessBoot();
  h.ctx.sessClear();
  return h.log.sets === 0;
});
scen('⛔ `sessBoot()` מוחקת שריד שקיים', (h) => {
  const n = h.ctx.sessBoot();
  return n === 1 && h.log.removed.join(',') === 'legacy_key' && h.log.logged.length === 1;
}, );
scen('⛔ אידמפוטנטית — קריאה שנייה אינה מוחקת שוב', (h) => {
  h.ctx.sessBoot();
  const before = h.log.removed.length;
  const n = h.ctx.sessBoot();
  return n === 0 && h.log.removed.length === before;
});
scen('⛔ מפתח שאינו קיים — אין מחיקה ואין רישום ליומן', (h) => {
  const n = h.ctx.sessBoot();
  return n === 0 && h.log.removed.length === 0 && h.log.logged.length === 0;
}, { store: {} });
scen('⛔ אחסון חסום — נכשלת סגור ואינה זורקת', (h) => {
  const n = h.ctx.sessBoot();
  return n === 0 && h.log.removed.length === 0;
}, { throwOnGet: true });
/*  ⚠️ החנות כאן מכילה בדיוק את **התווים** של המחרוזת — כדי שבלי שער
    המערך הלולאה הייתה רצה עליהם ומוחקת מפתחות אמיתיים. */
scen('⛔ תצורה פגומה — `legacy` שאינו מערך אינו מפיל ואינו מוחק', (h) => {
  return h.ctx.sessBoot() === 0 && h.log.removed.length === 0;
}, { legacy: 'ab', store: { a: '1', b: '2' } });
scen('`sessState()` מדווח מצב ולא את המשתמש עצמו', (h) => {
  h.ctx.sessSet({ id: 7, username: 'y' });
  const st = h.ctx.sessState();
  return st.active === true && st.user === undefined && Array.isArray(st.legacy);
});

let base = 7;
for (const [name, fn, opt] of SCEN) {
  base++;
  const o = Object.assign({ store: { legacy_key: '{"id":1}' } }, opt || {});
  const legacy = o.legacy || ['legacy_key'];
  let okRes;
  try { okRes = fn(harness(block, legacy, o)); }
  catch (e) { okRes = false; console.error('   (זרק: ' + e.message + ')'); }
  if (okRes) pass(base + '. ' + name);
  else fail(base + '. ' + name);
}

/* ══════════════════════════════════════════════════════════════════════════
   ד. מוטציות — ⛔ אינן נכתבות לעץ (הלקח של סבב 42ג)
   ══════════════════════════════════════════════════════════════════════════ */
function mutate(from, to) {
  if (block.indexOf(from) < 0) return null;
  return block.replace(from, to);
}
function mustBreak(n, label, from, to, probe, opt) {
  const m = mutate(from, to);
  if (m === null) { fail(n + '. מוטציה «' + label + '»: המחרוזת לא נמצאה בליבה'); return; }
  const o = Object.assign({ store: { legacy_key: '{"id":1}' } }, opt || {});
  let stillOk;
  try { stillOk = probe(harness(m, o.legacy || ['legacy_key'], o)); }
  catch (e) { stillOk = false; }
  if (stillOk) fail(n + '. מוטציה «' + label + '» עברה — הטענה אינה נועלת דבר');
  else pass(n + '. מוטציה «' + label + '» מפילה, כנדרש');
}

let mn = base;
mustBreak(++mn, 'הסרת שומר הריצה הכפולה',
  '  if (_sessBooted) return 0;\n', '',
  (h) => { h.ctx.sessBoot(); const b = h.log.removed.length; h.ctx.sessBoot(); return h.log.removed.length === b; });

mustBreak(++mn, 'שמירת המשתמש ל-localStorage',
  'function sessSet(u) { _sessUser = u || null; return _sessUser; }',
  'function sessSet(u) { _sessUser = u || null; lsSet(\'x\', \'y\'); return _sessUser; }',
  (h) => { h.ctx.sessSet({ id: 1 }); return h.log.sets === 0; });

mustBreak(++mn, 'מחיקה בלי בדיקת קיום',
  '      if (lsGet(keys[i], null) === null) continue;\n', '',
  (h) => { const n = h.ctx.sessBoot(); return n === 0 && h.log.logged.length === 0; },
  { store: {} });

mustBreak(++mn, 'ביטול שער המערך בתצורה',
  '    return Object.prototype.toString.call(k) === \'[object Array]\' ? k : [];',
  '    return k;',
  (h) => h.ctx.sessBoot() === 0 && h.log.removed.length === 0,
  { legacy: 'ab', store: { a: '1', b: '2' } });

mustBreak(++mn, '`sessClear()` שאינה מרוקנת',
  'function sessClear() { _sessUser = null; }',
  'function sessClear() { }',
  (h) => { h.ctx.sessSet({ id: 1 }); h.ctx.sessClear(); return h.ctx.sessGet() === null; });

if (RUN_MUT) {
/* ── מוטציית-נגד: שינוי בית בליבה **חייב** להזיז את החתימה ─────────────── */
const cn = crypto.createHash('sha256').update(block.replace('_sessUser', '_sessUserX'))
  .digest('hex').slice(0, 16);
if (cn !== BLOCK.sha) pass(++mn + '. מוטציית-נגד: שינוי בית בליבה מזיז את החתימה');
else fail(++mn + '. מוטציית-נגד: שינוי בית בליבה **אינו** מזיז את החתימה');

}

console.log(failures ? `\n✗ סבב 53 (מודל הסשן) — ${failures} נכשלו`
                     : `\n✓ סבב 53 (מודל הסשן) — ${mn} טענות עברו, 0 נכשלו`);
process.exit(failures ? 1 : 0);
