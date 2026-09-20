#!/usr/bin/env node
/*  test_failsurface.mjs — משטח הכשל ונוסחו.
 *
 *  **מה נאכף:** כשל מערכת מגיע ב-`toast` — ⛔ ואינו יושב על המשטח המוטבע:
 *  ⚠️ הנמדד הוא **ערך חריגה** בארגומנט — `e.message` · `isNetErr(e)` · קוד
 *  שגיאה; ⭐ והמשטח המוטבע נושא הודעות קבועות ושמיות בלבד. ⛔ ואפס ליטרל
 *  עברי בכותב אל המשטח · ⛔ וכל הודעה שמבטיחה סנכרון מאוחר מוצהרת
 *  ב-`APP.queuedMsgs`, משני הצדדים · ⛔ וקבוע הודעה שיותר מריפו אחד מגדיר
 *  יושב בבלוק החתום.
 *
 *  **הנימוק המדוד:** `MSG_OFFLINE` נאמר בשלושה אתרים חיים, ⛔ וכולם
 *  **קריאה** שנכשלה — ⚠️ ובשניים מהם הוא הבטיח «תסתנכרן כשהחיבור יחזור»
 *  ו«הרישום נשמר במכשיר ויעלה»: ⭐ הבטחה על נתון שמעולם לא נכתב. ⛔ ובאותם
 *  שלושה אתרים כשל הרשת של הכניסה ישב על משטח שגיאת המשתמש, ⚠️ לצד «סיסמה
 *  שגויה»: ⭐ והמשתמש הקליד שוב ושוב סיסמה נכונה לחלוטין.
 *
 *  **מה יישבר בלעדיו:** ⛔ שני משטחים לאותו כשל הם שני מקומות שבהם הודעה
 *  נעלמת — ⚠️ טוסט שחלף וטופס בלי הסבר; ⭐ והבטחת סנכרון על קריאה שנכשלה
 *  היא שקר שהמשתמש פועל לפיו: ⛔ הוא סוגר את האפליקציה וממתין לנתון
 *  שאינו בדרך.
 *
 *  **מה אינו נאכף כאן:** ⛔ סיווג הטוסט (`'bad'`) — ⚠️ הוא נמדד בשורת
 *  «`toast` — חתימה, גוף ומחלקות»; ⛔ ודפוס השם `MSG_*` — ⚠️ הוא נמדד
 *  ב-`APP.namePolicy.domains.msg` שבשורת «שם נגזר מדפוס מוצהר»: ⭐ שתי
 *  שורות על אותו קלט הן שתי הכרעות על אותה ראיה.
 *
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ ההודעות שמבטיחות סנכרון מאוחר — ⚠️ **מה נכנס**: שם הקבוע ⟵ מה
   *  שכבר בתור בזמן שהוא נאמר; ⛔ **ומה מפיל**: קבוע שמבטיח ואינו כאן,
   *  והכרזה שאין לה קבוע מבטיח. ⭐ **ולמה המבנה קיים**: «יסונכרן כשתחזור
   *  הרשת» על קריאה שנכשלה הוא הבטחה על נתון שמעולם לא נכתב. */
  queuedMsgs: {
    MSG_SAVED_LOCAL: 'הכתיבה מקומית-תחילה והשורה כבר בתור הדחיפה — ⛔ וההבטחה נכונה',
    MSG_CLOUD_SYNC_FAIL: 'הדחיפה נכשלה והשורות נשארו בתור עם סימון ⏳ — ⛔ וההבטחה נכונה',
    MSG_OFFLINE_LOGIN: 'הכניסה האופליין מותירה את מה שייכתב בתור המקומי — ⛔ וההבטחה נכונה',
    MSG_LS_FULL: 'האחסון מלא והשורות שבתור עדיין במכשיר — ⛔ והחיבור הוא שמפנה אותן',
  },
  /*  ⛔ הודעת כשל שיותר מריפו אחד מגדיר מחוץ לבלוק חתום — ⚠️ **מה נכנס**:
   *  שם הקבוע ⟵ מה שנבדל כאן בהחלטת מנהל; ⛔ **ומה מפיל**: שם חצוי שאינו
   *  כאן, והכרזה שאין לה שם חצוי. ⭐ **ולמה המבנה קיים**: עד כאן ההבחנה
   *  חיה בפרוזה שבבאנר, ⛔ ופרוזה אינה מרשם שאפשר למדוד מולו. */
  msgPerApp: {
    MSG_BAD_LOGIN: 'הנוסח נבדל בהחלטת מנהל — ⚠️ וסימן השגיאה הפותח נבדל איתו',
    MSG_NO_FP_ONLINE: 'המסלול לתיקון נבדל — ⛔ כאן יש מסך ניהול משתמשים ובאחות אין',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ אוכף שורה אחת — ⚠️ והמספר מוצהר כאן בלבד: ⭐ ארבעת המרשמים
 *  המוצהרים הם המקום היחיד שמספר שורה נכתב בו. */
export const ROWS = [118];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ מדידה,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = join(ROOT, '..');
const RAW = fs.readFileSync(join(ROOT, 'index.html'), 'utf8');
const CAPS = fs.readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');

let n = 0, bad = 0;
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 7, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok = (m) => (RAN++, console.log(`  ok   ${++n} · ${m}`));
const no = (m) => { RAN++; bad++; console.error(`  FAIL ${++n} · ${m}`); };
const is = (c, m) => (c ? ok(m) : no(m));

/* ── עוזרים ────────────────────────────────────────────────────────────── */

/*  ⛔ ערך חריגה בארגומנט — ⚠️ זה הקו המכני בין שגיאת משתמש לכשל מערכת:
 *  ⭐ הודעה קבועה ושמית היא מה שהמשתמש יכול לתקן בהקלדה, ⛔ וכל דבר
 *  שנושא את גוף החריגה הוא כשל שאינו בידיו.
 *  ⛔ **והגבול משמאל נדרש** — ⚠️ `any.error` הוא שדה של אובייקט תוצאה
 *  ⛔ ואינו חריגה: ⭐ דפוס בלי גבול היה מסווג בדיקת `res.error` תקינה
 *  ככשל מערכת. */
const EXC = /(?<![.\w$])isNetErr\s*\(|(?<![.\w$])(?:e|err|error|ex)\s*(?:&&|\.|\?)|(?<![.\w$])(?:e|err|error|ex)\.(?:message|code|error_description)\b/;
const HEB = /[֐-׿]/;

/*  ⛔ המשטח המוטבע נגזר ממרשם ההחרגה שבבודק היכולות — ⚠️ ולא מרשימה
 *  שנייה כאן: ⭐ שתי רשימות לאותו מושג הן שתי הכרעות על אותה ראיה. */
function inlineErrIds(caps) {
  /*  ⛔ הריק מוכרע לפני החיתוך — ⚠️ `{}` בשורה אחת היה נחתך «עד הסוגר
   *  הבא», ⭐ והמרשם השכן היה נקרא כמשטח: ⛔ וזה נמדד ולא שוער. */
  if (/inlineErrAllow:\s*\{\s*\},/.test(caps)) return [];
  const blk = /inlineErrAllow:\s*\{([\s\S]*?)\n  \},/.exec(caps);
  if (!blk) return [];
  return [...blk[1].matchAll(/'([^']+)':/g)].map((m) => m[1]);
}

/*  ⛔ הכותבים אל המשטח נגזרים מהמקור — ⚠️ פונקציה שגופה נוגע במזהה
 *  מוצהר וכותבת בו `textContent`: ⭐ ואין רשימת שמות מוקלדת, ⛔ שכל
 *  אפליקציה קראה לה בשם אחר.
 *  ⛔ **והסריקה על המקור הגולמי, בכוונה** — ⚠️ המזהה חי כליטרל מחרוזת,
 *  ⭐ וההלבנה מוחקת בדיוק את מה שהיא סורקת: ⛔ מקור מולבן היה מחזיר
 *  אפס כותבים תמיד. */
function surfaceWriters(src, ids) {
  const out = new Set();
  if (!ids.length) return out;
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const body = cutBody(src, re.lastIndex - 1);
    if (!body) continue;
    if (!/\.textContent\s*=/.test(body)) continue;
    if (!ids.some((id) => body.includes("'" + id + "'") || body.includes('#' + id))) continue;
    out.add(m[1]);
  }
  /*  ⛔ והכותב המקונן — ⚠️ הוא אינו נוקב במזהה בעצמו: ⭐ הוא כותב למשתנה
   *  שנקלט מהמזהה בהיקף שעוטף אותו, ⛔ ומדידה שדורשת את הליטרל בגוף
   *  הכותב הייתה מאשרת אותו: ⚠️ נמדד שכותב כזה נשא ליטרל עברי, ⛔ והשער
   *  דיווח אפס. */
  re.lastIndex = 0;
  while ((m = re.exec(src))) {
    const body = cutBody(src, re.lastIndex - 1);
    if (!body) continue;
    if (!ids.some((id) => body.includes("'" + id + "'") || body.includes('#' + id))) continue;
    const inner = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
    let k;
    while ((k = inner.exec(body))) {
      const ib = cutBody(body, inner.lastIndex - 1);
      if (ib && /\.textContent\s*=/.test(ib)) out.add(k[1]);
    }
  }
  return out;
}

/*  ⛔ גוף פונקציה נחתך בהתאמת סוגריים — ⚠️ חלון תווים קבוע חותך גוף ארוך
 *  ממנו: ⭐ וגוף שנמתח מסווג את הבדיקה לקלט שאינו שלה. */
function cutBody(src, open) {
  let d = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') d++;
    else if (c === '}') { d--; if (!d) return src.slice(open + 1, i); }
  }
  return null;
}

/*  ⛔ ארגומנט של קריאה נחתך בהתאמת סוגריים אף הוא — ⚠️ שלישוב שנושא
 *  סוגריים היה נחתך באמצע, ⭐ והליטרל שבתוכו נעלם מהמדידה. */
function callArgs(raw, name) {
  const out = [];
  const re = new RegExp('(?:^|[^\\w$.])' + name + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(raw))) {
    const open = re.lastIndex - 1;
    let d = 0;
    for (let i = open; i < raw.length; i++) {
      const c = raw[i];
      if (c === '(') d++;
      else if (c === ')') { d--; if (!d) { out.push({ at: open, txt: raw.slice(open + 1, i) }); break; } }
    }
  }
  return out;
}

/*  ⛔ ההשמה הישירה אל המשטח — ⚠️ הכותב אינו תמיד פונקציה: ⭐ יש אתרים
 *  שכותבים `textContent` במקום, ⛔ ומדידת הפונקציות לבדן מאשרת אותם. */
function directWrites(raw, ids) {
  const out = [];
  for (const id of ids) {
    const re = new RegExp("(?:getElementById\\('" + id + "'\\)|\\$\\('#" + id + "'\\))[^\\n]*?\\.textContent\\s*=([^\\n;]*)", 'g');
    let m;
    while ((m = re.exec(raw))) out.push({ id, txt: m[1] });
  }
  return out;
}

/*  ⛔ קבועי ההודעה ברמת המודול — ⚠️ שם ⟵ טקסט, ⭐ ומיקומם ביחס לבלוק
 *  החתום הוא מה שמבדיל בין משותף לפרטי. */
function msgConsts(raw) {
  const out = new Map();
  for (const m of raw.matchAll(/^var\s+(MSG_[A-Z0-9_]+)\s*=\s*'([^']*)'/gm)) out.set(m[1], m[2]);
  return out;
}
/*  ⛔ **הודעת כשל** שאינה בשום בלוק חתום — ⚠️ והסימן שבטקסט הוא המסלול:
 *  ⭐ הוא בדיוק מה שמנתב את ההודעה לטוסט מסווג, ⛔ והוא מבדיל הודעת כשל
 *  מכותרת דיאלוג ומשאלת אישור. */
const FAILSIGN = /⚠️|❌|🚫|📴|שגוי|שגיא|נכשל|אין חיבור/;
function privateMsgs(raw, ranges, msgs) {
  const out = new Set();
  for (const m of raw.matchAll(/^var\s+(MSG_[A-Z0-9_]+)\s*=/gm))
    if (!inSealed(ranges, m.index) && FAILSIGN.test(msgs.get(m[1]) || '')) out.add(m[1]);
  return out;
}
/*  ⛔ טווחי הבלוקים החתומים נגזרים ממרשם החתימות שבבודק היכולות — ⚠️ ולא
 *  מבלוק אחד שנוקב בשמו: ⭐ קבוע הודעה חי גם בבלוק האחסון ובבלוק הצינור,
 *  ⛔ ומדידה מול הבלוק היחיד הייתה מדווחת אותם כפרטיים. */
function sealedRanges(raw, caps) {
  const out = [];
  for (const m of caps.matchAll(/block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g)) {
    const a = raw.indexOf(m[1]);
    if (a < 0) continue;
    const b = raw.indexOf(m[2], a);
    if (b < 0) continue;
    out.push([a, b]);
  }
  return out;
}
const inSealed = (rs, at) => rs.some(([a, b]) => at >= a && at <= b);
const MSG_BLOCK_END = '/* ═══════════════ סוף מודול מחרוזות ההודעה';
/*  ⛔ הבטחת סנכרון מאוחר — ⚠️ ארבע הצורות שבהן היא נאמרת בפועל: ⭐ והן
 *  נגזרו מהטקסט החי, ⛔ ולא נבחרו. ⚠️ **ואין כאן `\b`** — ⛔ גבול לטיני
 *  צמוד לתו עברי אינו גבול, ⭐ והדפוס היה מפספס את מה שהוא סורק. */
const PROMISE = /יסונכרנו|יסונכרן|יישלחו|תסתנכרן|יעלה כשה/;

/* ── המדידות ───────────────────────────────────────────────────────────── */
console.log(`\n────────────────── ${APP.app}: משטח הכשל ונוסחו (סבב 148) ──`);

const IDS = inlineErrIds(CAPS);
const WRITERS = [...surfaceWriters(RAW, IDS)];

/*  ⛔ הכותבים נמדדים על המקור הגולמי — ⚠️ הליטרל העברי הוא בדיוק מה
 *  שההלבנה מוחקת, ⭐ וסריקה מולבנת הייתה מחזירה אפס תמיד. */
function surfaceCalls() {
  const out = [];
  for (const w of WRITERS) for (const c of callArgs(RAW, w)) out.push({ w, ...c });
  for (const d of directWrites(RAW, IDS)) out.push({ w: d.id, txt: d.txt });
  return out;
}
const CALLS = surfaceCalls();

/* 1. כשל מערכת אינו על המשטח המוטבע */
{
  const hits = CALLS.filter((c) => EXC.test(c.txt));
  is(hits.length === 0,
    `[fail-surface] ⛔ אפס כשל מערכת על המשטח המוטבע — נמדדו ${hits.length} ` +
    `מתוך ${CALLS.length} אתרי כתיבה (${IDS.join(' ') || 'אין משטח'}) והצפוי אפס` +
    (hits.length ? ` (${hits.slice(0, 4).map((h) => h.w + ':' + h.txt.trim().slice(0, 40)).join(' | ')})` : '') +
    ' — מה עושים: מעבירים את הכשל ל-`toast(…, null, \'bad\')`.');
}

/* 2. אפס ליטרל עברי בכותב אל המשטח */
{
  const hits = CALLS.filter((c) => HEB.test(c.txt));
  is(hits.length === 0,
    `[fail-literal] ⛔ אפס ליטרל עברי בכותב אל המשטח — נמדדו ${hits.length} ` +
    `מתוך ${CALLS.length} והצפוי אפס` +
    (hits.length ? ` (${hits.slice(0, 4).map((h) => h.w + ':' + h.txt.trim().slice(0, 40)).join(' | ')})` : '') +
    ' — מה עושים: קבוע מוצהר, ובבלוק החתום אם יותר מאחת אומרת אותו.');
}

/* 3. המשטח נמדד — ⛔ ואינו «אין לי משטח ולכן עברתי» */
{
  const has = IDS.length > 0;
  is(has ? WRITERS.length > 0 : CALLS.length === 0,
    `[fail-writers] ⛔ כל מזהה משטח מוצהר נושא כותב חי — נמדדו ${IDS.length} ` +
    `מזהים ו-${WRITERS.length} כותבים` +
    (has && !WRITERS.length ? ' — מה עושים: מזהה בלי כותב יורד מ-`inlineErrAllow`.' : ''));
}

/* 4+5. הבטחת סנכרון מוצהרת, משני הצדדים */
const MSGS = msgConsts(RAW);
{
  const promising = [...MSGS].filter(([, t]) => PROMISE.test(t)).map(([k]) => k);
  const undeclared = promising.filter((k) => !(k in APP.queuedMsgs));
  is(undeclared.length === 0,
    `[queued-msg] ⛔ כל הודעה שמבטיחה סנכרון מאוחר מוצהרת — נמדדו ` +
    `${promising.length} מבטיחות ו-${undeclared.length} בלי הצהרה, והצפוי אפס` +
    (undeclared.length ? ` (${undeclared.join(' ')})` : '') +
    ' — מה עושים: מצהירים ב-`APP.queuedMsgs`, או מנסחים בלי הבטחה.');

  const ghost = Object.keys(APP.queuedMsgs).filter((k) => !promising.includes(k));
  const noWhy = Object.entries(APP.queuedMsgs).filter(([, v]) => !v || v.length < 12).map(([k]) => k);
  is(ghost.length + noWhy.length === 0,
    `[queued-msg-why] ⛔ כל הצהרה נושאת קבוע מבטיח ונימוק — נמדדו ` +
    `${ghost.length} בלי קבוע ו-${noWhy.length} בלי נימוק, והצפוי אפס` +
    (ghost.length + noWhy.length ? ` (${[...ghost, ...noWhy].join(' ')})` : ''));
}

/* 6+7. קבוע שיותר מריפו אחד מגדיר — בבלוק חתום */
{
  const RANGES = sealedRanges(RAW, CAPS);
  const outside = privateMsgs(RAW, RANGES, MSGS);
  const missing = [], shared = [];
  for (const p of PEERS) {
    if (p === APP.app) continue;
    const f = join(SIBS, p, 'index.html');
    if (!fs.existsSync(f)) { missing.push(p); continue; }
    const t = fs.readFileSync(f, 'utf8');
    for (const k of privateMsgs(t, sealedRanges(t, CAPS), msgConsts(t)))
      if (outside.has(k) && !shared.includes(k)) shared.push(k);
  }
  const undecl = shared.filter((k) => !(k in APP.msgPerApp));
  /*  ⛔ הכיוון ההפוך נמדד רק כשכל האחיות על הדיסק — ⚠️ בלעדיהן `shared`
   *  ריק בהכרח, ⭐ וכל הכרזה הייתה נראית «בלי מקרה»: ⛔ וזו מדידה על
   *  הסביבה ⛔ ולא על הקוד. */
  const ghost = missing.length ? []
    : Object.keys(APP.msgPerApp).filter((k) => !shared.includes(k));
  const noWhy = Object.entries(APP.msgPerApp).filter(([, v]) => !v || v.length < 12).map(([k]) => k);
  is(RANGES.length > 0,
    `[sealed-block] ⛔ מרשם הבלוקים החתומים נקרא — נמדדו ${RANGES.length} טווחים חיים והצפוי לפחות אחד`);
  /*  ⛔ אחות שאינה על הדיסק מדווחת בשמה ⛔ ואינה מפילה — ⚠️ וזה בדיוק
   *  מצב העותק הזמני שהשער הזה נמדד בו בשער אחר: ⭐ מדידה שנשענת על
   *  שכן שאינו שם הייתה מפילה על סביבה, ⛔ ולא על קוד. */
  is(undecl.length + ghost.length + noWhy.length === 0,
    `[msg-shared] ⛔ הודעת כשל שיותר מריפו אחד מגדיר — בבלוק חתום, או מוצהרת: ` +
    `נמדדו ${outside.size} הודעות כשל פרטיות, ${shared.length} מהן חיות גם באחות, ` +
    `${undecl.length} בלי הצהרה ו-${ghost.length} הצהרות בלי מקרה, והצפוי אפס` +
    ([...undecl, ...ghost, ...noWhy].length ? ` (${[...undecl, ...ghost, ...noWhy].join(' ')})` : '') +
    (missing.length ? ` · אחיות שאינן על הדיסק: ${missing.join(' ')}` : ''));
}

if (RUN_MUT) {
  mutStage();
/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');

/*  ⛔ המוטציות אינן נכתבות לעץ — ⚠️ הן רצות על עותק בזיכרון, ⭐ והשער
 *  האמיתי מודד אותו: ⛔ מדידה שנפלה באמצע הייתה משאירה את העץ שגוי. */
const runOn = (raw, caps) => {
  const ids = inlineErrIds(caps);
  const writers = [...surfaceWriters(raw, ids)];
  const calls = [];
  for (const w of writers) for (const c of callArgs(raw, w)) calls.push({ w, ...c });
  for (const d of directWrites(raw, ids)) calls.push({ w: d.id, txt: d.txt });
  const msgs = msgConsts(raw);
  const promising = [...msgs].filter(([, t]) => PROMISE.test(t)).map(([k]) => k);
  return {
    ids, writers, calls,
    exc: calls.filter((c) => EXC.test(c.txt)).length,
    heb: calls.filter((c) => HEB.test(c.txt)).length,
    undeclared: promising.filter((k) => !(k in APP.queuedMsgs)).length,
    sealed: sealedRanges(raw, caps).length,
  };
};
const BASE = runOn(RAW, CAPS);

/*  ⛔ משטח סינתטי — ⚠️ שתיים מהאפליקציות אינן נושאות משטח מוטבע כלל:
 *  ⭐ מוטציה שנשענת על משטח חי הייתה «עוברת» שם בלי למדוד דבר, ⛔ וזה
 *  בדיוק «probe שאינו יכול להיכשל». */
const SURF_CAPS = CAPS.replace('inlineErrAllow: {',
  "inlineErrAllow: {\n    'mut-err': 'משטח סינתטי למוטציה',");
const SURF_FN = "function mutSurface(m){document.getElementById('mut-err').textContent=m;}\n";
const surfMut = (call) => runOn(RAW.replace(MSG_BLOCK_END, SURF_FN + call + '\n' + MSG_BLOCK_END), SURF_CAPS);
const SURF_BASE = surfMut('mutSurface(MSG_SAVED);');

/* מ1. כשל מערכת מוחזר אל המשטח המוטבע — [fail-surface] נופלת */
is(surfMut('mutSurface(e && e.message);').exc === SURF_BASE.exc + 1,
  'מוטציה 1: ערך חריגה בקריאה אל הכותב — [fail-surface] הייתה נכשלת');

/* מ2. ליטרל עברי בכותב — [fail-literal] נופלת */
is(surfMut("mutSurface('שגיאה כלשהי');").heb === SURF_BASE.heb + 1,
  'מוטציה 2: ליטרל עברי בקריאה אל הכותב — [fail-literal] הייתה נכשלת');

/* מ3. הבטחת סנכרון בלי הצהרה — [queued-msg] נופלת */
{
  const m = RAW.replace(MSG_BLOCK_END,
    "var MSG_MUT_PROMISE = 'הנתונים יסונכרנו כשהרשת תחזור';\n" + MSG_BLOCK_END);
  is(runOn(m, CAPS).undeclared === 1,
    'מוטציה 3: קבוע חדש שמבטיח סנכרון ואינו מוצהר — [queued-msg] הייתה נכשלת');
}

/* מ4. הבטחה שהוסרה מהטקסט ונשארה בהצהרה — [queued-msg-why] נופלת */
{
  const first = Object.keys(APP.queuedMsgs)[0];
  const m = RAW.replace(new RegExp('^var\\s+' + first + "\\s*=\\s*'[^']*'", 'm'),
    'var ' + first + " = 'נשמר'");
  const promising = [...msgConsts(m)].filter(([, t]) => PROMISE.test(t)).map(([k]) => k);
  is(!promising.includes(first),
    `מוטציה 4: \`${first}\` בלי הבטחה בטקסט — [queued-msg-why] הייתה נכשלת`);
}

/* מ5. חיתוך הגוף בחלון תווים קבוע במקום התאמת סוגריים */
{
  const probe = 'function mutLong(m){var a=1;' + 'var b=2;'.repeat(60) +
                "document.getElementById('mut-err').textContent=m;}";
  const open = probe.indexOf('{');
  const matched = cutBody(probe, open);
  const flat = probe.slice(open + 1, open + 200);
  is(matched !== null && matched.length > flat.length && /textContent/.test(matched) && !/textContent/.test(flat),
    'מוטציה 5: חלון תווים קבוע חותך גוף ארוך ממנו — הכותב לא היה נמצא');
}

/* מ6. מרשם הבלוקים החתומים רוקן — [sealed-block] נופלת */
{
  const caps2 = CAPS.replace(/block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g, 'block2: {');
  is(runOn(RAW, caps2).sealed === 0,
    'מוטציה 6: מרשם הבלוקים החתומים אינו נקרא — [sealed-block] הייתה נכשלת');
}

/* מ7. מרשם המשטח רוקן — [fail-writers] נופלת כשהמזהים אינם */
{
  const caps2 = CAPS.replace(/inlineErrAllow:\s*\{[\s\S]*?\n  \},/,
    "inlineErrAllow: {\n    'ghost-err': 'מוטציה',\n  },");
  const r = runOn(RAW, caps2);
  is(r.ids.length === 1 && r.writers.length === 0,
    'מוטציה 7: מזהה משטח שאין לו כותב — [fail-writers] הייתה נכשלת');
}

/*  ⭐ מוטציית-נגד א — ⛔ שינוי חי שאינו משנה את הנמדד: ⚠️ קבוע הודעה חדש
 *  שאינו מבטיח סנכרון, ⭐ ושם שהוחלף בעקביות בגוף עוזר. */
{
  const m = RAW.replace(MSG_BLOCK_END,
    "var MSG_MUT_PLAIN = '✅ בוצע';\n" + MSG_BLOCK_END);
  const r = runOn(m, CAPS);
  is(r.exc === BASE.exc && r.heb === BASE.heb && r.undeclared === 0 && r.sealed === BASE.sealed,
    '⭐ מוטציית-נגד א: קבוע חדש בלי הבטחת סנכרון ⛔ אינו משנה אף מדידה');
}

/*  ⭐ מוטציית-נגד ב — ⛔ קריאה חיה אל הכותב עם קבוע מוצהר: ⚠️ זה בדיוק
 *  השימוש התקין במשטח, ⭐ ואסור לו להפיל. */
{
  const r = surfMut('mutSurface(MSG_FILL_LOGIN);');
  is(r.exc === SURF_BASE.exc && r.heb === SURF_BASE.heb && r.writers.length > 0,
    '⭐ מוטציית-נגד ב: קריאה אל הכותב עם קבוע מוצהר ⛔ אינה מפילה');
}

}

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ סבב 148 (משטח הכשל ונוסחו) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);
