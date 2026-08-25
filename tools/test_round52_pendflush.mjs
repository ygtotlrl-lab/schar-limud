#!/usr/bin/env node
/*  סבב 52 — אישור ה-⏳ במסלול הריקון האוטומטי.
 *
 *  ⭐ **הבאג שנמדד (דיווח המנהל, 2026-08-25):** פעולה נרשמה אופליין;
 *  כשהרשת חזרה היא **סונכרנה בפועל**, ⛔ אבל שורת «פעולות ממתינות
 *  לסנכרון» נשארה על המסך עד שהמשתמש ביצע פעולה נוספת, ובמקביל
 *  «✅ נשמר בענן» חזר שוב ושוב.
 *
 *  ⚠️ **והסיבה אחת לשני הסימפטומים, וזה מה שנמדד:** מסלול הריקון
 *  האוטומטי (מודול הניסיון החוזר של סבב 44, אירוע `online`, והדיליי
 *  הקצר אחרי שמירה) דחף בהצלחה — ⛔ ולא הוריד את סימוני ה-⏳. מכאן:
 *    • `pendCount()` נשאר > 0 ⇒ המונה נשאר על המסך (`pendRender` מצייר
 *      את האמת הלוגית, והיא לא השתנתה — כלומר זו אינה בעיית ציור).
 *    • `_rtyPending()` נשאר אמת ⇒ הניסיון החוזר ירה שוב, הצליח שוב,
 *      והשמיע «✅ נשמר בענן» שוב — עד שפעולה חדשה גררה את הסימונים.
 *
 *  ⛔ **ולכן הטענה המרכזית כאן היא הגיעוּת ולא נוכחות טקסט:** ממסלול
 *  הריקון האוטומטי חייבת להיות דרך קריאה אל אחת מפונקציות האישור של
 *  המודול. ⚠️ בכל אחת מארבע האפליקציות הדרך הזו נראית אחרת — ישירה
 *  (`pendConfirmPush`), דרך עוזר (`pendConfirmKv`), או דרך דוחף
 *  הטבלאות (`pendClear`) — ⛔ ובדיקה שמחפשת שם אחד הייתה נכשלת על
 *  שלוש מהן בלי שיהיה שם באג.
 *
 *  ⚠️ **הרתמה מריצה את הליבה האמיתית** ברתמת `vm` עם DOM מזויף ושעון
 *  מזויף. ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import vm from 'node:vm';

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
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

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

/* ── 3. ⛔ הטענה המרכזית: כל מסלול ריקון מגיע לפונקציית אישור ──────────── */
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

console.log(failures ? `\n❌ בדיקת אישור ה-⏳ נכשלה (${failures})`
                     : '\n✅ בדיקת אישור ה-⏳ עברה');
process.exit(failures ? 1 : 0);
