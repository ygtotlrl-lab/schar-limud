#!/usr/bin/env node
/*  סבב 44 — מודול הניסיון החוזר בסנכרון.
 *
 *  ⚠️ **הבאג שהמודול בא לסגור, כפי שנמדד:** פעולה נשארה מסומנת ⏳ למרות
 *  שהרשת מחוברת, ומשתחררה רק כשפעולה חדשה גררה אותה. מסלול הריקון הופעל
 *  בשלושה טריגרים בלבד — עלייה, אירוע `online`, ושמירה חדשה — ולכן דחיפה
 *  שנכשלה **בזמן שהרשת מחוברת** נשארה תקועה: `online` לעולם לא יופעל.
 *
 *  ⛔ הבדיקה מריצה את **הליבה האמיתית** מתוך `index.html` ברתמת `vm` עם
 *  שעון מזויף — ולא בודקת ביטויים רגולריים על הטקסט. מוטציה שמשנה
 *  התנהגות חייבת להפיל טענה, וזה מה שארבע המוטציות שבסוף מוכיחות.
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
  /*  משפך הכתיבה המקומית — נקודת הדריכה היחידה של `rtyNote()`. */
  noteFn: 'slLocalWrite',
  /*  האם לאפליקציה הזו יש פולינג שדוחף, ולכן `rtyGate()` מחווט בו.
   *  ⚠️ פולינג שמושך בלבד אינו זקוק לשער — ר' הנימוק ב-CLAUDE.md. */
  gated: true,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const BLOCK = {
  sha: 'b26046c13cb36986',
  lines: 100,
  start: '/* ═══ ניסיון חוזר בסנכרון — מודול משותף (סבב 44)',
  end: '/* ═══════════════ סוף מודול הניסיון החוזר',
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

const block = grab(src);
if (!block) {
  fail('הבלוק המשותף לא נמצא ב-' + APP.file);
  console.log('\n❌ בדיקת הניסיון החוזר נכשלה (' + failures + ')');
  process.exit(1);
}

/* ── 1. הליבה — חתימה ומספר שורות ──────────────────────────────────────── */
const sha = crypto.createHash('sha256').update(block).digest('hex').slice(0, 16);
if (sha !== BLOCK.sha) fail(`1. חתימת הליבה ${sha} במקום ${BLOCK.sha} — הליבה חייבת להיות זהה בית-לבית ×4`);
else pass('1. חתימת הליבה תואמת (' + BLOCK.sha + ')');
const nLines = block.split('\n').length;
if (nLines !== BLOCK.lines) fail(`2. ${nLines} שורות במקום ${BLOCK.lines}`);
else pass('2. ' + BLOCK.lines + ' שורות, כמצופה');

/* ── 3. `RTY_CFG` מוגדר מעל הליבה ──────────────────────────────────────── */
const cfgAt = src.indexOf('var RTY_CFG');
const blockAt = src.indexOf(BLOCK.start);
if (cfgAt < 0 || cfgAt > blockAt) fail('3. `RTY_CFG` אינו מוגדר מעל הליבה — ליבה בלי פרמטרים אינה מודול');
else pass('3. `RTY_CFG` מוגדר מעל הליבה');
for (const f of ['flush', 'pending']) {
  if (new RegExp('\\b' + f + '\\s*:').test(src.slice(cfgAt, blockAt))) pass('4. `RTY_CFG.' + f + '` מוגדר');
  else fail('4. `RTY_CFG.' + f + '` חסר');
}

/* ── 5. החיווט — `rtyBoot` בעלייה, `rtyNote` במשפך, פעם אחת כל אחד ─────── */
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

console.log(failures ? `\n❌ בדיקת הניסיון החוזר נכשלה (${failures})`
                     : '\n✅ בדיקת הניסיון החוזר עברה');
process.exit(failures ? 1 : 0);
