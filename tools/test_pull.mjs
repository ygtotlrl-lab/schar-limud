#!/usr/bin/env node
/*  סבב 51 — מנגנון המשיכה המאוחד.
 *
 *  ⭐ **מה נשמר כאן:** הפולינג קורא שורת חותמת אחת ומושך את הנתונים **רק
 *  כשהיא התקדמה**. עד הסבב הזה yoman ו-hanhala עבדו כך, schar משכה ארבע
 *  טבלאות ב-`select('*')` בכל תקתוק, ו-gius משכה משיכה מלאה כל עשרים
 *  שניות — ⛔ אסימטריה שאיש לא החליט עליה (נמדדה בסבב 46ב).
 *
 *  ⚠️ **הרתמה מריצה את הליבה האמיתית** ברתמת `vm` עם `PL_CFG` מזויף ושעון
 *  מזויף — ולא בודקת ביטויים רגולריים על הטקסט. מוטציה שמשנה התנהגות
 *  חייבת להפיל טענה, וזה מה שחמש המוטציות שבסוף מוכיחות. ⛔ המוטציות
 *  אינן נכתבות לעץ (הלקח של סבב 42ג) — מוטציה שנכתבת לקובץ האמיתי
 *  ומוחזרת ב-`finally` מותירה את הריפו שבור אם התהליך נהרג באמצע.
 *
 *  ⛔ **והטענה הסטטית החשובה כאן היא «אין פולינג שמסנכרן»** — `setInterval`
 *  מחוץ למודול שקורא לפונקציית הסנכרון של האפליקציה הוא בדיוק הדחיפה
 *  התקופתית העיוורת שהסבב הזה הסיר.
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
  bootFn: 'slBoot',
  /*  פונקציית המשיכה — מה ש-`PL_CFG.pull` מפעיל. */
  syncFn: 'syncAll',
  /*  משפכי הכתיבה לענן שחייבים לקדם את החותמת: דחיפת-המצב של ארבע
   *  הטבלאות, וכתיבת הטביעה ל-`sl_users` (שנמשכת ב-`slPullUsers`). */
  touchFns: ['slPushTable', 'slEnsurePassFp'],
  every: 3000,
  stampKey: 'sl_last_changed',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

const BLOCK = {
  sha: 'd0aa2b4d27291da5',
  lines: 79,
  start: '/* ═══ מנגנון המשיכה — מודול משותף (סבב 51)',
  end: '/* ═══════════════ סוף מנגנון המשיכה',
};

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const src = fs.readFileSync(APP.file, 'utf8');

function grab(text) {
  const i = text.indexOf(BLOCK.start);
  if (i < 0) return null;
  const j = text.indexOf(BLOCK.end, i);
  if (j < 0) return null;
  const k = text.indexOf('*/', j);
  if (k < 0) return null;
  return text.slice(i, k + 2);
}

console.log('\n🔎 מנגנון המשיכה (סבב 51) — ' + APP.app + '\n');

const block = grab(src);
if (!block) {
  fail('הבלוק המשותף לא נמצא ב-' + APP.file);
  console.log('\n❌ בדיקת מנגנון המשיכה נכשלה (' + failures + ')');
  process.exit(1);
}

/* ── 1–2. הליבה — חתימה ומספר שורות ────────────────────────────────────── */
const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
if (sha !== BLOCK.sha) fail(`1. חתימת הליבה ${sha} במקום ${BLOCK.sha} — הליבה חייבת להיות זהה בית-לבית ×4`);
else pass('1. חתימת הליבה תואמת (' + BLOCK.sha + ')');
const nLines = block.split('\n').length;
if (nLines !== BLOCK.lines) fail(`2. ${nLines} שורות במקום ${BLOCK.lines}`);
else pass('2. ' + BLOCK.lines + ' שורות, כמצופה');

/* ── 3–4. `PL_CFG` מוגדר מעל הליבה, עם כל שמונת השדות ──────────────────── */
const cfgAt = src.indexOf('var PL_CFG');
const blockAt = src.indexOf(BLOCK.start);
const cfgSrc = (cfgAt >= 0 && cfgAt < blockAt) ? src.slice(cfgAt, blockAt) : '';
if (!cfgSrc) fail('3. `PL_CFG` אינו מוגדר מעל הליבה — ליבה בלי פרמטרים אינה מודול');
else pass('3. `PL_CFG` מוגדר מעל הליבה');
for (const f of ['every', 'active', 'seen', 'note', 'ok', 'stamp', 'pull', 'remote']) {
  if (new RegExp('\\b' + f + '\\s*:').test(cfgSrc)) pass('4. `PL_CFG.' + f + '` מוגדר');
  else fail('4. `PL_CFG.' + f + '` חסר');
}

/* ── 5. המרווח והמפתח — נמדדים מהאפליקציה ולא נבחרים במודול ────────────── */
if (new RegExp('every\\s*:\\s*' + APP.every + '\\b').test(cfgSrc))
  pass('5. `PL_CFG.every` = ' + APP.every + ' — המרווח שנמדד כאן');
else fail('5. `PL_CFG.every` אינו ' + APP.every + ' — המרווח הוא פרמטר מדוד ולא ברירת מחדל');
if (cfgSrc.indexOf(APP.stampKey) >= 0 || src.indexOf("'" + APP.stampKey + "'") >= 0)
  pass('6. שורת החותמת היא `' + APP.stampKey + '`');
else fail('6. שורת החותמת `' + APP.stampKey + '` לא נמצאה');

/* ── 7–9. החיווט — `plBoot` פעם אחת, מפונקציית העלייה ──────────────────── */
/*  ⚠️ סופרים על הקוד בלבד: כל אזכור בהערת המודול היה נספר כקריאה. */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const codeOutside = codeOnly(src.slice(0, blockAt) + src.slice(blockAt + block.length));
function calls(fn) { return (codeOutside.match(new RegExp('\\b' + fn + '\\s*\\(', 'g')) || []).length; }

if (calls('plBoot') === 1) pass('7. `plBoot()` נקראת פעם אחת בלבד מקוד האפליקציה');
else fail(`7. \`plBoot()\` נקראת ${calls('plBoot')} פעמים — נקודת ההפעלה חייבת להיות אחת`);

function fnBody(text, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(text);
  if (!m) return '';
  let i = text.indexOf('{', m.index), d = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') d++;
    else if (text[j] === '}') { d--; if (!d) return text.slice(i, j + 1); }
  }
  return '';
}
if (/\bplBoot\s*\(/.test(fnBody(codeOutside, APP.bootFn)))
  pass('8. `plBoot()` נקראת מתוך `' + APP.bootFn + '()` — פונקציית העלייה');
else fail('8. `plBoot()` אינה נקראת מתוך `' + APP.bootFn + '()`');

/*  ⛔ כל מסלול כתיבה לענן מקדם את החותמת (סבב 51) — אחרת השינוי נשאר
 *  בלתי-נראה לכל מכשיר אחר לנצח. */
for (const fn of APP.touchFns) {
  const body = fnBody(codeOutside, fn);
  if (!body) { fail('9. מסלול הכתיבה `' + fn + '()` לא נמצא'); continue; }
  if (/\bplTouch\s*\(|PL_CFG\s*\.\s*stamp\s*\(/.test(body))
    pass('9. `' + fn + '()` מקדם את החותמת');
  else fail('9. `' + fn + '()` כותב לענן ואינו מקדם את החותמת — עדכון שקט');
}

/* ── 10. ⛔ אין פולינג שמסנכרן מחוץ למודול ──────────────────────────────── */
/*  זו הטענה שמחזיקה את סעיף 3 של הסבב: `setInterval` שקורא לפונקציית
 *  הסנכרון הוא הדחיפה/משיכה התקופתית העיוורת שהוסרה. */
function periodicSync(code) {
  const out = [];
  const re = /\bsetInterval\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    let i = m.index + m[0].length, d = 1;
    while (i < code.length && d > 0) {
      if (code[i] === '(') d++;
      else if (code[i] === ')') d--;
      i++;
    }
    const arg = code.slice(m.index, i);
    if (new RegExp('\\b' + APP.syncFn + '\\s*\\(').test(arg)) out.push(arg.slice(0, 60));
  }
  return out;
}
const periodic = periodicSync(codeOutside);
if (!periodic.length) pass('10. ⛔ אין `setInterval` שקורא ל-`' + APP.syncFn + '()` — אין פולינג עיוור');
else fail('10. פולינג תקופתי עיוור חזר: ' + periodic.join(' | '));

/* ══════════════════════════════════════════════════════════════════════════
   רתמת ההתנהגות — הליבה האמיתית, `PL_CFG` מזויף ושעון מזויף
   ══════════════════════════════════════════════════════════════════════════ */
function harness(moduleSrc) {
  const log = { pulls: 0, remotes: 0, oks: 0, stamps: [], wired: 0 };
  const st = { seen: 0, now: 1700000000000, active: true, reply: { ok: true, ts: 0 } };
  const timers = [];
  const ctx = {
    Promise, JSON, Math, parseInt, String, Number,
    console: { warn() {}, log() {}, error() {} },
    Date: { now: () => st.now },
    window: { addEventListener() { log.wired++; } },
    setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearInterval: () => { timers.length = 0; },
  };
  ctx.PL_CFG = {
    every: 4321,
    active: () => st.active,
    seen: () => st.seen,
    note: (t) => { st.seen = t; },
    ok: () => { log.oks++; },
    stamp: (t) => { log.stamps.push({ t, seenThen: st.seen }); return Promise.resolve({ ok: true }); },
    pull: () => { log.pulls++; return Promise.resolve(true); },
    remote: () => { log.remotes++; return Promise.resolve(st.reply); },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(moduleSrc, ctx);
  return { ctx, log, st, timers };
}

async function scenarios(moduleSrc) {
  const res = [];
  const add = (name, ok) => res.push({ name, ok: !!ok });

  /* א. חותמת שלא זזה ⇒ אין משיכה */
  {
    const h = harness(moduleSrc);
    h.st.seen = 500; h.st.reply = { ok: true, ts: 500 };
    await h.ctx.plTick();
    add('א. חותמת שלא זזה ⇒ אין משיכה', h.log.pulls === 0 && h.log.remotes === 1);
  }
  /* ב. חותמת שהתקדמה ⇒ משיכה אחת, ו«מה שנראה» מתקדם */
  {
    const h = harness(moduleSrc);
    h.st.seen = 500; h.st.reply = { ok: true, ts: 900 };
    await h.ctx.plTick();
    add('ב. חותמת שהתקדמה ⇒ משיכה אחת ו-seen מתקדם', h.log.pulls === 1 && h.st.seen === 900);
  }
  /* ג. כשל בקריאת החותמת אינו ראיה — אין משיכה ואין «שיחה מוצלחת» */
  {
    const h = harness(moduleSrc);
    h.st.seen = 500; h.st.reply = { ok: false, ts: null };
    await h.ctx.plTick();
    add('ג. כשל בקריאה ⇒ אין משיכה, seen לא זז', h.log.pulls === 0 && h.st.seen === 500 && h.log.oks === 0);
  }
  /* ד. אין שורת חותמת ⇒ נפילה-חזרה, ולא יותר מפעם ב-PL_FALLBACK_MS */
  {
    const h = harness(moduleSrc);
    h.st.reply = { ok: true, ts: null };
    await h.ctx.plTick();
    const first = h.log.pulls;
    h.st.now += 1000;
    await h.ctx.plTick();
    const second = h.log.pulls;
    h.st.now += h.ctx.PL_FALLBACK_MS + 1;
    await h.ctx.plTick();
    add('ד. אין חותמת ⇒ משיכה מלאה מווסתת', first === 1 && second === 1 && h.log.pulls === 2);
  }
  /* ה. `active()` שקרי ⇒ אין נגיעה ברשת כלל */
  {
    const h = harness(moduleSrc);
    h.st.active = false; h.st.reply = { ok: true, ts: 999 };
    await h.ctx.plTick();
    add('ה. active() שקרי ⇒ אפס קריאות רשת', h.log.remotes === 0 && h.log.pulls === 0);
  }
  /* ו. אין ריצה כפולה */
  {
    const h = harness(moduleSrc);
    h.st.seen = 0; h.st.reply = { ok: true, ts: 900 };
    const a = h.ctx.plTick(), b = h.ctx.plTick();
    await a; await b;
    add('ו. אין ריצה כפולה — תקתוק שני נחסם', h.log.remotes === 1 && h.log.pulls === 1);
  }
  /* ז. `plTouch` מקדם את seen **לפני** הכתיבה לענן */
  {
    const h = harness(moduleSrc);
    h.st.seen = 100; h.st.now = 1700000007777;
    await h.ctx.plTouch();
    add('ז. plTouch מקדם seen לפני הכתיבה', h.st.seen === 1700000007777 && h.log.stamps.length === 1 &&
        h.log.stamps[0].t === 1700000007777 && h.log.stamps[0].seenThen === 1700000007777);
  }
  /* ח. `plBoot` דורך תקתוק במרווח של `PL_CFG.every`, ורק פעם אחת */
  {
    const h = harness(moduleSrc);
    h.st.reply = { ok: true, ts: 0 };
    const first = h.ctx.plBoot(), again = h.ctx.plBoot();
    add('ח. plBoot דורך תקתוק אחד במרווח PL_CFG.every',
        first === true && again === false && h.timers.length === 1 && h.timers[0].ms === 4321 && h.log.wired === 1);
  }
  return res;
}

const base = await scenarios(block);
for (const r of base) { if (r.ok) pass('11. ' + r.name); else fail('11. ' + r.name); }

/* ══════════════════════════════════════════════════════════════════════════
   מוטציות — ⛔ אינן נכתבות לעץ (הלקח של סבב 42ג)
   ══════════════════════════════════════════════════════════════════════════ */
const MUTATIONS = [
  { name: 'משיכה מלאה בלי בדיקת החותמת',
    from: '    if (ts > _plSeen()) { try { PL_CFG.note(ts); } catch (e) { } return _plFull(); }',
    to:   '    { try { PL_CFG.note(ts); } catch (e) { } return _plFull(); }',
    hits: 'א' },
  { name: 'הסרת ההגנה מפני ריצה כפולה',
    from: '  if (_plBusy) return Promise.resolve(false);', to: '  if (false) return Promise.resolve(false);',
    hits: 'ו' },
  { name: 'משיכה על סמך כשל בקריאת החותמת',
    from: '    if (!r || !r.ok) return done(false);', to: '    if (!r || !r.ok) return _plFull();',
    hits: 'ג' },
  { name: 'ביטול ויסות הנפילה-חזרה',
    from: '      if (Date.now() - _plFullAt >= PL_FALLBACK_MS) return _plFull();',
    to:   '      return _plFull();',
    hits: 'ד' },
  { name: 'קידום «מה שכבר נראה» רק אחרי הכתיבה',
    from: '  try { PL_CFG.note(t); } catch (e) { }\n  try {\n    return Promise.resolve(PL_CFG.stamp(t))',
    to:   '  try {\n    return Promise.resolve(PL_CFG.stamp(t))',
    hits: 'ז' },
];

for (const mu of MUTATIONS) {
  if (block.indexOf(mu.from) < 0) { fail('12. עוגן המוטציה «' + mu.name + '» לא נמצא בליבה'); continue; }
  const mutated = block.replace(mu.from, mu.to);
  let res;
  try { res = await scenarios(mutated); } catch (e) { res = [{ name: mu.hits + '.', ok: false }]; }
  const target = res.filter((r) => r.name.indexOf(mu.hits + '.') === 0);
  if (!target.length) { fail('12. המוטציה «' + mu.name + '» מכוונת לטענה «' + mu.hits + '» שאינה קיימת'); continue; }
  if (target.every((r) => r.ok)) fail('12. המוטציה «' + mu.name + '» ⛔ **לא** הפילה את טענה «' + mu.hits + '»');
  else pass('12. המוטציה «' + mu.name + '» הפילה את טענה «' + mu.hits + '», כנדרש');
}

/*  ⭐ מוטציה שישית — סטטית: פולינג תקופתי שחוזר חייב להפיל את טענה 10. */
{
  const mutant = codeOutside + '\nsetInterval(function () { ' + APP.syncFn + '(); }, 3000);\n';
  if (periodicSync(mutant).length) pass('12. המוטציה «החזרת פולינג תקופתי» הפילה את טענה 10, כנדרש');
  else fail('12. המוטציה «החזרת פולינג תקופתי» ⛔ **לא** הפילה את טענה 10');
}

/*  ⭐ ומוטציית-נגד: שינוי בית בליבה מזיז את החתימה, ולכן `check-capabilities`
 *  היה נכשל עליו — כלומר החתימה אינה קישוט. */
{
  const mutated = block.replace('var PL_FALLBACK_MS = 60000;', 'var PL_FALLBACK_MS = 60001;');
  const s2 = crypto.createHash('sha256').update(mutated).digest('hex').slice(0, 16);
  if (s2 !== BLOCK.sha) pass('13. ⛔ שינוי בית בליבה מזיז את החתימה — check-capabilities היה נכשל');
  else fail('13. שינוי בית בליבה לא הזיז את החתימה');
}

console.log(failures ? `\n❌ בדיקת מנגנון המשיכה נכשלה (${failures})`
                     : '\n✅ בדיקת מנגנון המשיכה עברה');
process.exit(failures ? 1 : 0);
