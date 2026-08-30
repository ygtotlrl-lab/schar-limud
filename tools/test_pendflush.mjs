#!/usr/bin/env node
/*  test_pendflush.mjs — מודול הניסיון החוזר, ואישור ה-⏳ בריקון האוטומטי
 *  (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) ליבת הניסיון החוזר — חתימה, מספר שורות, `RTY_CFG`
 *  מעליה, והחיווט (`rtyBoot` בעלייה · `rtyNote` במשפך · פעם אחת כל אחד);
 *  (ב) ההתנהגות — נסיגה אקספוננציאלית והגנת ריצה כפולה, ברתמת `vm` עם
 *  שעון מזויף; (ג) **הגיעוּת** — ממסלול הריקון האוטומטי יש דרך קריאה אל
 *  אחת מפונקציות האישור של מודול ה-⏳.
 *
 *  **הנימוק המדוד:** פעולה נרשמה אופליין, סונכרנה כשהרשת חזרה, ⛔ ושורת
 *  «פעולות ממתינות» נשארה על המסך — ⚠️ מסלול הריקון דחף בהצלחה ולא הוריד
 *  את סימוני ה-⏳: `pendCount()` נשאר > 0, ו-`_rtyPending()` נשאר אמת,
 *  ולכן «✅ נשמר בענן» חזר שוב ושוב. ⭐ שני השערים מדדו את שני קצותיו של
 *  אותו מסלול, ⛔ וכל אחד מהם בנה לו רתמת `vm` משלו.
 *
 *  **מה יישבר בלעדיו:** דחיפה שנכשלה **בזמן שהרשת מחוברת** נשארת תקועה —
 *  ⛔ `online` לעולם לא יופעל, והפעולה משתחררת רק כשפעולה חדשה גוררת
 *  אותה.
 *
 *  **מה אינו נאכף כאן:** ⛔ שם פונקציית האישור — ⚠️ בכל אפליקציה הדרך
 *  נראית אחרת (`pendConfirmPush` · `pendConfirmKv` · `pendClear`),
 *  ⛔ ובדיקה שמחפשת שם אחד הייתה נכשלת על שלוש בלי שיהיה שם באג.
 *
 *  ⛔ הבדיקה מריצה את **הליבה האמיתית** מתוך `index.html`, ⛔ ולא בודקת
 *  ביטויים רגולריים על הטקסט. ⛔ המוטציות אינן נכתבות לעץ (סבב 42ג).
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
  /*  ⚠️ נמדד ולא הוצהר: כאן המשיכה והדחיפה הן אותה פונקציה — `syncAll`
   *  מושכת, ממזגת ודוחפת, ולכן היא גם `RTY_CFG.flush` וגם `PL_CFG.pull`.
   *  ⛔ כלומר «הריקון מהמשיכה» ו«הריקון מהניסיון החוזר» הם מסלול אחד. */
  drainFns: ['syncAll'],
  /*  משפך הכתיבה המקומית שדורך את הניסיון החוזר. */
  noteFn: 'slLocalWrite',
  bootFn: 'slBoot',
  /*  האם לאפליקציה הזו יש פולינג שדוחף, ולכן `rtyGate()` מחווט בו.
   *  ⚠️ פולינג שמושך בלבד אינו זקוק לשער: אין מה לדחות. */
  gated: false,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

const BLOCK = {
  start: '/* ═══ ממתין לסנכרון — מודול משותף (סבב 12)',
  end:   '/* ═══════════════ סוף מודול "ממתין לסנכרון"',
};
/*  פונקציות האישור של המודול — כל אחת מהן מורידה סימון **ומרעננת את
 *  המונה**. ⛔ מסלול ריקון שאינו מגיע לאף אחת מהן הוא בדיוק הבאג. */
const CONFIRMERS = ['pendClear', 'pendClearMany', 'pendFailed', 'pendConfirmPush'];

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

const src = fs.readFileSync(APP.file, 'utf8');

console.log('\n🔎 אישור ה-⏳ בריקון האוטומטי (סבב 52) — ' + APP.app + '\n');

/*  ⚠️ סורקים על הקוד בלבד: כל אזכור בהערת המודול היה נספר כקריאה. */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const code = codeOnly(src);

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
function callees(body) {
  const out = new Set();
  const re = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(body))) out.add(m[1]);
  return out;
}

/* ── 1. מסלול הריקון נמדד מ-`RTY_CFG.flush` ולא מוצהר ──────────────────── */
const rtyAt = code.indexOf('RTY_CFG');
const rtyCfg = rtyAt >= 0 ? code.slice(rtyAt, rtyAt + 400) : '';
const flushM = /flush\s*:\s*function\s*\([^)]*\)\s*\{\s*return\s+([A-Za-z_$][\w$]*)\s*\(/.exec(rtyCfg);
if (!flushM) fail('1. `RTY_CFG.flush` לא נמדד — בלי הידית הזו אין מסלול ריקון אוטומטי');
else if (APP.drainFns.indexOf(flushM[1]) < 0)
  fail('1. `RTY_CFG.flush` מפעיל את `' + flushM[1] + '()` שאינו ברשימת מסלולי הריקון של APP');
else pass('1. `RTY_CFG.flush` מפעיל את `' + flushM[1] + '()`, כפי שנמדד');

/* ── 2. הדריכה — משפך הכתיבה המקומית קורא ל-`rtyNote()` ────────────────── */
if (/\brtyNote\s*\(/.test(fnBody(code, APP.noteFn)))
  pass('2. `' + APP.noteFn + '()` דורך את הניסיון החוזר');
else fail('2. `' + APP.noteFn + '()` אינו קורא ל-`rtyNote()` — הריקון לא יידרך');

/* ── 3. ⛔ הטענה המרכזית: כל מסלול ריקון מגיע לפונקציית אישור ───────────── */
/*  BFS על גרף הקריאות של הקובץ. ⚠️ עומק מוגבל ל-6 — מסלול ריקון שמגיע
 *  לאישור דרך שש שכבות אינו מסלול, הוא מקרה. */
function reaches(entry) {
  const seen = new Set([entry]);
  let level = [entry];
  for (let depth = 0; depth < 6 && level.length; depth++) {
    const next = [];
    for (const fn of level) {
      const body = fnBody(code, fn);
      if (!body) continue;
      for (const c of callees(body)) {
        if (CONFIRMERS.indexOf(c) >= 0) return { ok: true, via: fn, name: c };
        if (!seen.has(c)) { seen.add(c); next.push(c); }
      }
    }
    level = next;
  }
  return { ok: false };
}
for (const fn of APP.drainFns) {
  if (!fnBody(code, fn)) { fail('3. מסלול הריקון `' + fn + '()` לא נמצא בקוד'); continue; }
  const r = reaches(fn);
  if (r.ok) pass('3. `' + fn + '()` מגיע ל-`' + r.name + '()` (דרך `' + r.via + '`) — הסימון יורד');
  else fail('3. ⛔ `' + fn + '()` מרוקן את התור ואינו מאשר שום סימון ⏳ — ' +
            'המונה יישאר על המסך והניסיון החוזר יירה שוב ושוב');
}

/* ══════════════════════════════════════════════════════════════════════════
   רתמת ההתנהגות — הליבה האמיתית, DOM מזויף ושעון מזויף
   ══════════════════════════════════════════════════════════════════════════ */
function grab(text) {
  const i = text.indexOf(BLOCK.start);
  if (i < 0) return null;
  const j = text.indexOf(BLOCK.end, i);
  if (j < 0) return null;
  const k = text.indexOf('*/', j);
  return k < 0 ? null : text.slice(i, k + 2);
}
const block = grab(src);
if (!block) {
  fail('4. הבלוק המשותף של מודול ה-⏳ לא נמצא');
  console.log('\n❌ בדיקת אישור ה-⏳ נכשלה (' + failures + ')');
  process.exit(1);
}

function fakeEl(id) {
  return {
    id, textContent: '', className: '', style: { display: '' },
    firstChild: null, type: '', onclick: null,
    appendChild(c) { if (!this.firstChild) this.firstChild = c; return c; },
    remove() { this.__gone = true; },
  };
}
function harness(moduleSrc) {
  const store = {};
  const els = {};
  const log = { renders: 0, saves: 0 };
  const doc = {
    body: fakeEl('body'),
    head: fakeEl('head'),
    documentElement: fakeEl('html'),
    getElementById: (id) => (els[id] && !els[id].__gone ? els[id] : null),
    createElement: () => fakeEl(''),
  };
  doc.body.appendChild = function (c) { if (c && c.id) els[c.id] = c; return c; };
  doc.head.appendChild = function (c) { if (c && c.id) els[c.id] = c; return c; };
  const st = { now: 1700000000000 };
  const ctx = {
    JSON, Math, Object, Array, String, Number, isFinite,
    console: { warn() {}, log() {}, error() {} },
    Date: function (t) { this.t = t; },
    setTimeout: () => 0,
    setInterval: () => 0,
    navigator: { onLine: true },
    document: doc,
    window: { addEventListener() {} },
    esc: (s) => String(s),
    lsGet: (k, d) => (k in store ? store[k] : d),
    lsSet: (k, v) => { store[k] = v; log.saves++; return true; },
    lsLog: () => {},
    PEND_CFG: { app: 'test', key: 'pend_test' },
  };
  ctx.Date.now = () => st.now;
  ctx.Date.prototype.toLocaleString = function () { return 'x'; };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(moduleSrc, ctx);
  /*  עוטפים את pendRender כדי לספור ציורים — ⚠️ בלי לגעת בליבה עצמה. */
  const real = ctx.pendRender;
  ctx.pendRender = function () { log.renders++; return real.apply(null, arguments); };
  return { ctx, log, els, st, bar: () => (els['pend-bar'] && !els['pend-bar'].__gone ? els['pend-bar'] : null) };
}

function scenarios(moduleSrc) {
  const res = [];
  const add = (name, ok) => res.push({ name, ok: !!ok });

  /* א. `pendConfirmPush` אחרי דחיפה מוצלחת מוריד את הסימון */
  {
    const h = harness(moduleSrc);
    h.ctx.pendMark('entry:1');
    const t0 = h.st.now + 10;
    h.st.now += 20;
    h.ctx.pendConfirmPush('entry:', t0);
    add('א. pendConfirmPush מוריד סימון שקדם ל-t0', h.ctx.pendCount() === 0);
  }

  /* ב. הורדת הסימון מרעננת את המונה */
  {
    const h = harness(moduleSrc);
    h.ctx.pendMark('entry:1');
    const before = h.log.renders;
    h.st.now += 20;
    h.ctx.pendConfirmPush('entry:', h.st.now);
    add('ב. אישור מרענן את המונה', h.log.renders > before);
  }

  /* ג. תור שהתרוקן ⇒ המונה אינו מציג דבר */
  {
    const h = harness(moduleSrc);
    h.ctx.pendMark('entry:1');
    h.st.now += 3000;                      // מעבר להשהיית הציור (סבב 16)
    h.ctx.pendDrawFlush();
    h.ctx.pendRender();
    const shown = !!(h.bar() && h.bar().style.display !== 'none');
    h.st.now += 20;
    h.ctx.pendClear('entry:1');
    const hidden = !h.bar() || h.bar().style.display === 'none';
    add('ג. תור שהתרוקן ⇒ המונה יורד מהמסך', shown && hidden && h.ctx.pendCount() === 0);
  }

  /* ד. אישור שלא שינה דבר אינו מצייר מחדש */
  {
    const h = harness(moduleSrc);
    h.ctx.pendMark('entry:1');
    const before = h.log.renders;
    h.ctx.pendConfirmPush('arc:', h.st.now + 50);
    add('ד. אישור לקידומת אחרת אינו נוגע בסימון ואינו מצייר',
        h.ctx.pendCount() === 1 && h.log.renders === before);
  }

  /* ה. סימון שנוצר **אחרי** t0 שורד — ר\' כלל ה-t0 (סבב 12) */
  {
    const h = harness(moduleSrc);
    const t0 = h.st.now;
    h.st.now += 50;
    h.ctx.pendMark('entry:late');
    h.ctx.pendConfirmPush('entry:', t0);
    add('ה. סימון שנרשם אחרי t0 אינו מאושר', h.ctx.pendCount() === 1);
  }
  return res;
}

const base = scenarios(block);
for (const r of base) { if (r.ok) pass('4. ' + r.name); else fail('4. ' + r.name); }

/* ══════════════════════════════════════════════════════════════════════════
   מוטציות — ⛔ אינן נכתבות לעץ (הלקח של סבב 42ג)
   ══════════════════════════════════════════════════════════════════════════ */
const MUTATIONS = [
  { name: 'אישור שאינו מרענן את המונה',
    from: '  if (ch) { pendSave(); pendRender(); }\n}\n\nfunction pendHas(key)',
    to:   '  if (ch) { pendSave(); }\n}\n\nfunction pendHas(key)',
    hits: 'ב' },
  { name: 'המונה מציג גם כשהתור ריק',
    from: '  if (!n || !pendDrawCount()) return off ? \'⚠️ אין רשת\' : \'\';',
    to:   '  if (false) return off ? \'⚠️ אין רשת\' : \'\';',
    hits: 'ג' },
  { name: 'אישור גורף שמתעלם מ-t0',
    from: '    if (m[k] < t0) { delete m[k]; delete _pendDrawHold[k]; ch = true; }',
    to:   '    { delete m[k]; delete _pendDrawHold[k]; ch = true; }',
    hits: 'ה' },
  { name: 'אישור שמתעלם מהקידומת',
    from: '    if (prefix && k.indexOf(prefix) !== 0) return;',
    to:   '    if (false) return;',
    hits: 'ד' },
];

for (const mu of MUTATIONS) {
  if (block.indexOf(mu.from) < 0) { fail('5. עוגן המוטציה «' + mu.name + '» לא נמצא בליבה'); continue; }
  const mutated = block.replace(mu.from, mu.to);
  let res;
  try { res = scenarios(mutated); } catch (e) { res = [{ name: mu.hits + '.', ok: false }]; }
  const target = res.filter((r) => r.name.indexOf(mu.hits + '.') === 0);
  if (!target.length) { fail('5. המוטציה «' + mu.name + '» מכוונת לטענה «' + mu.hits + '» שאינה קיימת'); continue; }
  if (target.every((r) => r.ok)) fail('5. המוטציה «' + mu.name + '» ⛔ **לא** הפילה את טענה «' + mu.hits + '»');
  else pass('5. המוטציה «' + mu.name + '» הפילה את טענה «' + mu.hits + '», כנדרש');
}

/*  ⭐ מוטציה סטטית — מסלול הריקון שאיבד את האישור חייב להפיל את טענה 3.
 *  ⛔ זו המוטציה שמכסה את הבאג עצמו: הקוד עובד, הדחיפה מצליחה, והמונה
 *  נשאר תקוע. ⚠️ הנטרול חל על **כל סגור הקריאות** של מסלול הריקון ולא על
 *  גופו בלבד — בשלוש מארבע האפליקציות האישור יושב פונקציה או שתיים
 *  פנימה, ומוטציה שנוגעת רק בגוף החיצוני לא הייתה משנה דבר.
 */
{
  function closure(text, entry) {
    const seen = new Set([entry]);
    let level = [entry];
    for (let d = 0; d < 6 && level.length; d++) {
      const next = [];
      for (const fn of level) {
        const body = fnBody(text, fn);
        if (!body) continue;
        for (const c of callees(body)) if (!seen.has(c)) { seen.add(c); next.push(c); }
      }
      level = next;
    }
    return seen;
  }
  let mutated = code;
  for (const entry of APP.drainFns) {
    for (const fn of closure(code, entry)) {
      const body = fnBody(mutated, fn);
      if (!body) continue;
      let cleaned = body;
      for (const c of CONFIRMERS) cleaned = cleaned.replace(new RegExp('\\b' + c + '\\s*\\(', 'g'), 'noop(');
      if (cleaned !== body) mutated = mutated.replace(body, cleaned);
    }
  }
  const probe = (entry) => {
    const seen = new Set([entry]);
    let level = [entry];
    for (let d = 0; d < 6 && level.length; d++) {
      const next = [];
      for (const fn of level) {
        const b = fnBody(mutated, fn);
        if (!b) continue;
        for (const c of callees(b)) {
          if (CONFIRMERS.indexOf(c) >= 0) return true;
          if (!seen.has(c)) { seen.add(c); next.push(c); }
        }
      }
      level = next;
    }
    return false;
  };
  if (mutated === code) fail('5. המוטציה «ריקון אוטומטי בלי אישור ⏳» לא שינתה דבר — אין מה לנטרל');
  else if (APP.drainFns.some(probe)) fail('5. המוטציה «ריקון אוטומטי בלי אישור ⏳» ⛔ **לא** הפילה את טענה 3');
  else pass('5. המוטציה «ריקון אוטומטי בלי אישור ⏳» הפילה את טענה 3, כנדרש');
}

/*  ⭐ ומוטציית-נגד: שינוי רווחים בלבד ⛔ אינו מפיל — אחרת השער היה נופל
 *  על עיצוב ולא על התנהגות. */
{
  const spaced = block.replace('function pendClear(key) {', 'function  pendClear( key ) {');
  const res = spaced === block ? null : scenarios(spaced);
  if (res && res.every((r) => r.ok)) pass('6. ⛔ שינוי רווחים בלבד אינו מפיל — השער מודד התנהגות');
  else fail('6. שינוי רווחים הפיל טענה — השער נופל על עיצוב');
}

/* ══ מודול הניסיון החוזר (סבב 72: מוזג לכאן) ══════════════════════════════ */
/*  ⛔ בלוק משלו (סבב 72) — ⚠️ שני השערים חתכו בלוקים שונים מאותו קובץ
 *  ותחת אותם שמות, ⛔ והמיזוג בלי הפרדה היה מחליף ביניהם בשקט. */
{
  const BLOCK = {
    sha: '7afbe0d58ffa8c8e',
    lines: 66,
    start: '/* ═══ ניסיון חוזר בסנכרון — מודול משותף (סבב 44)',
    end: '/* ═══════════════ סוף מודול הניסיון החוזר',
  };


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

  const block = grab(src);
  if (!block) {
    fail('הבלוק המשותף לא נמצא ב-' + APP.file);
    console.log('\n❌ בדיקת הניסיון החוזר נכשלה (' + failures + ')');
    process.exit(1);
  }

  /* ── 1. הליבה — חתימה ומספר שורות ────────────────────────────────────── */
  const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
  if (sha !== BLOCK.sha) fail(`1. חתימת הליבה ${sha} במקום ${BLOCK.sha} — הליבה חייבת להיות זהה בית-לבית ×4`);
  else pass('1. חתימת הליבה תואמת (' + BLOCK.sha + ')');
  const nLines = block.split('\n').length;
  if (nLines !== BLOCK.lines) fail(`2. ${nLines} שורות במקום ${BLOCK.lines}`);
  else pass('2. ' + BLOCK.lines + ' שורות, כמצופה');

  /* ── 3. `RTY_CFG` מוגדר מעל הליבה ────────────────────────────────────── */
  const cfgAt = src.indexOf('var RTY_CFG');
  const blockAt = src.indexOf(BLOCK.start);
  if (cfgAt < 0 || cfgAt > blockAt) fail('3. `RTY_CFG` אינו מוגדר מעל הליבה — ליבה בלי פרמטרים אינה מודול');
  else pass('3. `RTY_CFG` מוגדר מעל הליבה');
  for (const f of ['flush', 'pending']) {
    if (new RegExp('\\b' + f + '\\s*:').test(src.slice(cfgAt, blockAt))) pass('4. `RTY_CFG.' + f + '` מוגדר');
    else fail('4. `RTY_CFG.' + f + '` חסר');
  }

  /* ── 5. החיווט — `rtyBoot` בעלייה, `rtyNote` במשפך, פעם אחת כל אחד ───── */
  /*  ⚠️ סופרים על הקוד בלבד: כל אזכור בהערת המודול היה נספר כקריאה. */
  function codeOnly(text) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  }
  const codeOutside = codeOnly(src.slice(0, blockAt) + src.slice(blockAt + block.length));
  function calls(fn) { return (codeOutside.match(new RegExp('\\b' + fn + '\\s*\\(', 'g')) || []).length; }

  if (calls('rtyBoot') === 1) pass('5. `rtyBoot()` נקראת פעם אחת בלבד מקוד האפליקציה');
  else fail(`5. \`rtyBoot()\` נקראת ${calls('rtyBoot')} פעמים — נקודת ההפעלה חייבת להיות אחת`);

  if (calls('rtyNote') === 1) pass('6. `rtyNote()` נקראת פעם אחת בלבד — נקודת דריכה יחידה');
  else fail(`6. \`rtyNote()\` נקראת ${calls('rtyNote')} פעמים — הדריכה חייבת להיות ממשפך אחד`);

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
  if (/\brtyNote\s*\(/.test(fnBody(codeOutside, APP.noteFn)))
    pass('7. `rtyNote()` נקראת מתוך `' + APP.noteFn + '()` — משפך הכתיבה המקומית');
  else fail('7. `rtyNote()` אינה נקראת מתוך `' + APP.noteFn + '()`');

  if (/\brtyBoot\s*\(/.test(fnBody(codeOutside, APP.bootFn)))
    pass('8. `rtyBoot()` נקראת מתוך `' + APP.bootFn + '()` — פונקציית העלייה');
  else fail('8. `rtyBoot()` אינה נקראת מתוך `' + APP.bootFn + '()`');

  const gateCalls = (codeOutside.match(/\brtyGate\s*\(/g) || []).length;
  if (APP.gated && gateCalls === 1) pass('9. `rtyGate()` מחווט בפולינג שדוחף');
  else if (!APP.gated && gateCalls === 0) pass('9. אין כאן פולינג שדוחף, ולכן אין `rtyGate()` — כמוצהר');
  else fail(`9. חיווט \`rtyGate()\` אינו תואם להצהרה (gated=${APP.gated}, נמצאו ${gateCalls})`);

  /* ══════════════════════════════════════════════════════════════════════════
     רתמת ההתנהגות — הליבה האמיתית, שעון מזויף
     ══════════════════════════════════════════════════════════════════════════ */
  function harness(moduleSrc) {
    const t = { now: 0, timers: [], seq: 1 };
    const listeners = { win: {}, doc: {} };
    const state = { pending: 0, flushes: 0, fail: false, inFlight: 0, maxInFlight: 0 };
    const sandbox = {
      console: { warn() {}, log() {} },
      Promise, Math, Date,
      setTimeout(fn, ms) { const id = t.seq++; t.timers.push({ id, at: t.now + (ms || 0), fn }); return id; },
      clearTimeout(id) { t.timers = t.timers.filter((x) => x.id !== id); },
      navigator: { onLine: true },
      document: {
        visibilityState: 'visible',
        addEventListener(ev, fn) { (listeners.doc[ev] = listeners.doc[ev] || []).push(fn); },
      },
      window: {
        addEventListener(ev, fn) { (listeners.win[ev] = listeners.win[ev] || []).push(fn); },
      },
      RTY_CFG: {
        pending() { return state.pending > 0; },
        flush() {
          state.flushes++;
          state.inFlight++;
          state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
          return new Promise((res, rej) => {
            state.inFlight--;
            if (state.fail) return rej(new Error('boom'));
            state.pending = 0;
            res(true);
          });
        },
      },
    };
    vm.createContext(sandbox);
    vm.runInContext(moduleSrc, sandbox);
    const micro = () => new Promise((r) => setImmediate(r));
    return {
      s: state, sb: sandbox,
      async advance(ms) {
        t.now += ms;
        const due = t.timers.filter((x) => x.at <= t.now).sort((a, b) => a.at - b.at);
        t.timers = t.timers.filter((x) => x.at > t.now);
        for (const d of due) { d.fn(); await micro(); await micro(); }
        await micro();
      },
      async emit(target, ev) {
        for (const fn of (listeners[target][ev] || [])) { fn(); await micro(); await micro(); }
      },
      micro,
      armed() { return t.timers.length > 0; },
      nextDelay() { return t.timers.length ? t.timers[0].at - t.now : null; },
    };
  }

  async function scenarios(moduleSrc) {
    const out = [];
    const t = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });

    /* א. תור לא ריק + רשת + מסמך גלוי ⇒ ריקון תוך 15 שניות */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1;
      h.sb.rtyBoot();
      t('א. הטיימר נדרך כשיש ממתינים', h.armed() && h.nextDelay() === 15000);
      await h.advance(15000);
      t('ב. ריקון רץ אחרי 15 שניות', h.s.flushes === 1, 'flushes=' + h.s.flushes);
      t('ג. התור התרוקן ⇒ הטיימר נעצר', !h.armed());
    }
    /* ד. תור ריק ⇒ אין טיימר כלל */
    {
      const h = harness(moduleSrc);
      h.s.pending = 0;
      h.sb.rtyBoot();
      t('ד. תור ריק ⇒ אין טיימר פעיל', !h.armed());
      await h.advance(120000);
      t('ה. תור ריק ⇒ אפס ניסיונות גם אחרי שתי דקות', h.s.flushes === 0);
    }
    /* ו. מסמך מוסתר ⇒ אין ניסיון */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1;
      h.sb.document.visibilityState = 'hidden';
      h.sb.rtyBoot();
      await h.advance(60000);
      t('ו. מסמך מוסתר ⇒ אין ניסיון', h.s.flushes === 0, 'flushes=' + h.s.flushes);
      h.sb.document.visibilityState = 'visible';
      await h.emit('doc', 'visibilitychange');
      t('ז. חזרה לפוקוס ⇒ ריקון מיידי', h.s.flushes === 1, 'flushes=' + h.s.flushes);
    }
    /* ח. אין רשת ⇒ אין ניסיון; אירוע online מריץ מיד */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1;
      h.sb.navigator.onLine = false;
      h.sb.rtyBoot();
      await h.advance(60000);
      t('ח. אופליין ⇒ אין ניסיון', h.s.flushes === 0);
      h.sb.navigator.onLine = true;
      await h.emit('win', 'online');
      t('ט. אירוע online ⇒ ריקון מיידי', h.s.flushes === 1);
    }
    /* י. נסיגה אקספוננציאלית על כישלון חוזר, עם תקרה */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1; h.s.fail = true;
      h.sb.rtyBoot();
      await h.advance(15000);
      t('י. אחרי כישלון ראשון המרווח 30 שניות', h.nextDelay() === 30000, 'delay=' + h.nextDelay());
      await h.advance(30000);
      t('יא. אחרי כישלון שני המרווח 60 שניות', h.nextDelay() === 60000, 'delay=' + h.nextDelay());
      await h.advance(60000);
      t('יב. תקרת הנסיגה 60 שניות', h.nextDelay() === 60000, 'delay=' + h.nextDelay());
      t('יג. `rtyGate()` חוסם פולינג בזמן נסיגה', h.sb.rtyGate() === true);
      h.s.fail = false;
      await h.advance(60000);
      t('יד. הצלחה ⇒ הטיימר נעצר והמרווח מתאפס', !h.armed() && h.sb.rtyState().delay === 15000);
      t('טו. `rtyGate()` פתוח כשאין נסיגה ואין ריצה', h.sb.rtyGate() === false);
    }
    /* טז. הגנת ריצה כפולה */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1;
      let release;
      h.sb.RTY_CFG.flush = function () {
        h.s.flushes++;
        return new Promise((res) => { release = res; });
      };
      h.sb.rtyKick();
      await h.micro();
      h.sb.rtyKick();
      h.sb.rtyKick();
      await h.micro();
      t('טז. אין ריצה כפולה — ניסיון שני נחסם', h.s.flushes === 1, 'flushes=' + h.s.flushes);
      t('יז. `rtyGate()` חוסם פולינג בזמן ריצה', h.sb.rtyGate() === true);
      if (release) release(true);
      await h.micro(); await h.micro();
    }
    /* יח. `rtyNote` דורכת מחדש ומאפסת את הנסיגה */
    {
      const h = harness(moduleSrc);
      h.s.pending = 1; h.s.fail = true;
      h.sb.rtyBoot();
      await h.advance(15000);
      const grown = h.nextDelay();
      h.sb.rtyStop();
      h.sb.rtyNote();
      t('יח. `rtyNote()` דורכת מחדש ומאפסת את הנסיגה', grown === 30000 && h.nextDelay() === 15000,
        'grown=' + grown + ' after=' + h.nextDelay());
    }
    return out;
  }

  const base = await scenarios(block);
  for (const r of base) {
    if (r.ok) pass('10. ' + r.name);
    else fail('10. ' + r.name + (r.extra ? ' — ' + r.extra : ''));
  }

  /* ══════════════════════════════════════════════════════════════════════════
     מוטציות — ⛔ כל אחת חייבת להפיל את הטענה שהיא מכוונת אליה
     ══════════════════════════════════════════════════════════════════════════
     ⚠️ המוטציה רצה על **עותק בזיכרון** ולא על הקובץ שבעץ (סבב 42ג) —
     מוטציה שנכתבת לקובץ האמיתי ומוחזרת ב-`finally` מותירה את הריפו שבור
     אם התהליך נהרג באמצע.                                                */
  const MUTATIONS = [
    { name: 'הסרת הגנת הריצה הכפולה',
      from: '  if (_rtyBusy) return Promise.resolve(false);', to: '  if (false) return Promise.resolve(false);',
      hits: 'טז' },
    { name: 'הסרת תנאי «התור אינו ריק» מהדריכה',
      from: '  if (!_rtyPending()) return false;\n  _rtyTimer = setTimeout(_rtyFire, _rtyDelay);',
      to: '  _rtyTimer = setTimeout(_rtyFire, _rtyDelay);',
      hits: 'ד' },
    { name: 'הסרת תנאי «המסמך גלוי»',
      from: "  try { return typeof document === 'undefined' || document.visibilityState !== 'hidden'; } catch (e) { return true; }",
      to: '  return true;',
      hits: 'ו' },
    { name: 'ביטול הנסיגה האקספוננציאלית',
      from: '  var grow = function () { _rtyDelay = Math.min(_rtyDelay * 2, RTY_MAX_MS); };',
      to: '  var grow = function () { _rtyDelay = RTY_BASE_MS; };',
      hits: 'י' },
  ];

  for (const mu of MUTATIONS) {
    if (block.indexOf(mu.from) < 0) { fail('11. עוגן המוטציה «' + mu.name + '» לא נמצא בליבה'); continue; }
    const mutated = block.replace(mu.from, mu.to);
    let res;
    try { res = await scenarios(mutated); } catch (e) { res = [{ name: mu.hits, ok: false }]; }
    const target = res.filter((r) => r.name.indexOf(mu.hits + '.') === 0);
    if (!target.length) { fail('11. המוטציה «' + mu.name + '» מכוונת לטענה «' + mu.hits + '» שאינה קיימת'); continue; }
    if (target.every((r) => r.ok)) fail('11. המוטציה «' + mu.name + '» ⛔ **לא** הפילה את טענה «' + mu.hits + '»');
    else pass('11. המוטציה «' + mu.name + '» הפילה את טענה «' + mu.hits + '», כנדרש');
  }
}

console.log(failures ? `\n❌ בדיקת הניסיון החוזר ואישור ה-⏳ נכשלה (${failures})`
                     : '\n✅ סבב 72 — הניסיון החוזר ואישור ה-⏳ עברו');
process.exit(failures ? 1 : 0);
