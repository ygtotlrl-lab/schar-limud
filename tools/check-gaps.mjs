#!/usr/bin/env node
/*  check-gaps.mjs — אכיפת פרק «פערים פתוחים» (כלל ברזל 15, סבב 39).
 *
 *  ⚠️ **זהה בית-לבית בארבעת הריפו** — ⛔ ואין בו בלוק `APP` (סבב 39):
 *     הוא קורא את `CLAUDE.md` שלצידו, ולכן אין בו דבר שנבדל בין
 *     האפליקציות. כל שינוי בו נעשה בארבעתם באותו סבב.
 *
 *  ⭐ מה הוא פותר: פרק «פערים פתוחים» היה הפרק היחיד בקובץ ששום שער לא
 *     קרא, ולכן שורה ששרדה את הסיבה שלה נקראה כמציאות עד שמישהו בדק ידנית.
 *
 *  ⛔ הבודק **מדווח ואינו מוחק** (סבב 39) — מחיקה אוטומטית של תיעוד היא
 *     פעולה שאין ממנה חזרה בלי לקרוא git, והיא עוקפת את שיקול הדעת שקובע
 *     מה לכתוב במקום.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = path.join(ROOT, 'CLAUDE.md');

let fail = 0, measured = 0, unmeasured = 0;
const err = (m) => { fail++; console.error('❌ ' + m); };

if (!fs.existsSync(DOC_PATH)) {
  console.log('⏭️  אין CLAUDE.md — מדלג');
  process.exit(0);
}
const DOC = fs.readFileSync(DOC_PATH, 'utf8');

/* ── חיתוך הפרק ─────────────────────────────────────────────────────────────
   ⚠️ הפרק כולו אופציונלי (כלל ברזל 15) — ריפו בלי «פערים פתוחים» עובר.
      ⛔ אבל פרק שקיים נבדק במלואו (סבב 39) — פטור חלקי הוא פטור שקט. */
const lines = DOC.split('\n');
const start = lines.findIndex((l) => /^##\s+פערים פתוחים/.test(l));
if (start === -1) {
  console.log('⏭️  אין פרק «פערים פתוחים» — מדלג');
  process.exit(0);
}
let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (/^##\s/.test(lines[i])) { end = i; break; }
}
const body = lines.slice(start + 1, end);

/* ── איסוף הפריטים ברמה העליונה ─────────────────────────────────────────────
   ⚠️ פריט מתחיל ב-`- ` **בתחילת שורה** וממשיך עד הפריט הבא. שורות המשך
      מוזחות, ולכן תת-פריט מוזח אינו נספר כפריט — ⛔ וזה מכוון (סבב 39): התג נדרש
      פעם אחת לפער, לא לכל שורת הסבר שלו. */
const items = [];
for (const line of body) {
  if (/^- /.test(line)) items.push([line]);
  else if (items.length && line.trim()) items[items.length - 1].push(line);
}

if (!items.length) {
  console.log('⏭️  פרק «פערים פתוחים» ריק — מדלג');
  process.exit(0);
}

/* ── התג ────────────────────────────────────────────────────────────────────
   ⛔ תבנית אחת בלבד (כלל ברזל 15, סבב 39) — `[מדיד: …]` או `[לא-מדיד: …]`, בסוף
      הפריט. ⚠️ הבדיקה היא על **הפריט כולו** ולא על שורתו הראשונה: פער
      אמיתי נמשך על פני כמה שורות, והתג יושב בסופו. */
const TAG = /\[(מדיד|לא-מדיד):\s*([^\]]+)\]/;

/* קריאת המקורות שהתנאים נשענים עליהם. ⚠️ `index.html` נקרא **גולמי**, בלי
   הסרת הערות — תג `no-code:` נועד גם לתפוס הערה שהוחזרה, לא רק קוד. */
const SRC_PATH = path.join(ROOT, 'index.html');
const SRC = fs.existsSync(SRC_PATH) ? fs.readFileSync(SRC_PATH, 'utf8') : null;

/* ⚠️ נרמול רווחים — ורק רווחים (סבב 39, השלמה שנייה). רצף רווחים, טאבים
   ושורות חדשות מתקפל לרווח יחיד **בשני הצדדים**, ולכן עיצוב מחדש של אותה
   שורה אינו נקרא כשינוי. ⛔ שמות, מרכאות ותוכן אינם מנורמלים — נרמול שלהם
   היה הופך את העוגן לשער שעובר על קוד אחר.
   ⭐ זה נמדד ולא הונח: החלפת `X = true` ב-`X  =  true` הפילה את השער עם
   «⭐ הפער נסגר», כלומר כשל **בכיוון המסוכן** — הודעה שאומרת «הפער נסגר»
   על קוד שלא השתנה. */
const squash = (s) => s.replace(/\s+/g, ' ');
const SRC_N = SRC === null ? null : squash(SRC);

/* ⭐ עוגן הבסיס — שם הסמל לבדו (סבב 39, השלמה שנייה).
   ⛔ עוגן בסיס שאינו נמצא ⇒ «העוגן נרקב», ⛔ ולעולם לא «הפער נסגר»:
   הסמל עצמו נעלם (שינוי שם, מחיקה, ריפקטור), ואין שום דרך לדעת מהריפו אם
   הפער נסגר או שרק העוגן הפסיק להצביע עליו. ההכרעה חוזרת לבן-אדם.
   ⚠️ מילות המפתח מדולגות — «הסמל» ב-`function migrateOutbox` הוא
   `migrateOutbox`, לא `function`. */
const KEYWORDS = new Set(['var', 'let', 'const', 'function', 'class', 'new',
                          'return', 'if', 'else', 'async', 'await', 'typeof',
                          'true', 'false', 'null', 'undefined', 'this',
                          'import', 'export', 'window', 'document']);
function baseAnchor(arg) {
  for (const id of arg.match(/[A-Za-z_$][\w$]*/g) || []) {
    if (!KEYWORDS.has(id)) return id;
  }
  return null;
}

/* ⛔ ארבעת התנאים, וזה הסט כולו (כלל ברזל 15, סבב 39) — תנאי שאינו כאן הוא שגיאה
      ולא «מדולג», אחרת שגיאת כתיב בתג הייתה הופכת לפטור שקט. */
function evaluate(cond) {
  const m = /^(no-code|code|no-file|file):([\s\S]+)$/.exec(cond.trim());
  if (!m) return { known: false };
  const kind = m[1], arg = m[2].trim();
  if (kind === 'code' || kind === 'no-code') {
    if (SRC === null) return { known: true, ok: null, why: 'אין index.html' };
    const hit = SRC_N.includes(squash(arg));
    if (kind === 'no-code') return { known: true, ok: !hit };
    if (hit) return { known: true, ok: true };
    const base = baseAnchor(arg);
    if (base && !SRC_N.includes(base)) return { known: true, ok: false, rot: base };
    return { known: true, ok: false, base };
  }
  const exists = fs.existsSync(path.join(ROOT, arg));
  return { known: true, ok: kind === 'file' ? exists : !exists };
}

console.log(`\n· פערים פתוחים — ${items.length} פריטים\n`);

for (const item of items) {
  const text = item.join('\n');
  const head = item[0].replace(/^- /, '').replace(/\*\*/g, '').slice(0, 62);
  const m = TAG.exec(text);

  /* א. תג חסר */
  if (!m) {
    err(`שורת פער בלי תג — «${head}»\n` +
        '   ⛔ כל פריט חייב `[מדיד: <תנאי>]` או `[לא-מדיד: <נימוק>]` (כלל ברזל 15).');
    continue;
  }

  if (m[1] === 'לא-מדיד') {
    if (!m[2].trim()) {
      err(`«לא-מדיד» בלי נימוק — «${head}»`);
      continue;
    }
    unmeasured++;
    console.log(`  ⚪ לא-מדיד · ${head}`);
    continue;
  }

  /* ב. תנאי שאינו מוכר */
  const res = evaluate(m[2]);
  if (!res.known) {
    err(`תנאי שאינו מוכר: «${m[2].trim()}» — «${head}»\n` +
        '   ⛔ הסט הוא `code:` · `no-code:` · `file:` · `no-file:` בלבד.');
    continue;
  }
  if (res.ok === null) {
    err(`לא ניתן להעריך את התנאי (${res.why}) — «${head}»`);
    continue;
  }

  /* ג. ⚠️ העוגן נרקב — הסמל עצמו נעלם */
  if (res.rot) {
    err(`⚠️ העוגן נרקב — דורש בדיקה ידנית: הסמל «${res.rot}» אינו קיים ב-index.html\n` +
        `   התנאי: «${m[2].trim()}»\n` +
        `   «${head}»\n` +
        '   ⛔ אין לקרוא את זה כ«הפער נסגר» (סבב 39) — סמל שנעלם אינו ראיה\n' +
        '   לכך שהפער נסגר, אלא לכך שהעוגן הפסיק להצביע על משהו. יש לבדוק\n' +
        '   מה קרה לסמל, ואז לתקן את העוגן או למחוק את השורה.');
    continue;
  }

  /* ד. ⭐ פער שנסגר */
  if (!res.ok) {
    err(`⭐ הפער נסגר — התנאי «${m[2].trim()}» כבר אינו מתקיים:\n` +
        `   «${head}»\n` +
        (res.base ? `   ⚠️ עוגן הבסיס «${res.base}» כן נמצא — כלומר הסמל קיים,\n` +
                    '   והערך או ההקשר שסביבו הם שהשתנו.\n' : '') +
        '   ⛔ שורת הפער חייבת להימחק (כלל ברזל 14, «פער שנסגר בפעולת מנהל»).\n' +
        '   ⚠️ הבודק מדווח ואינו מוחק — המחיקה והניסוח הם החלטת הסבב.');
    continue;
  }
  measured++;
  console.log(`  ok   מדיד · ${head}`);
}

console.log(`\n${fail ? '✗' : '✅'} פערים פתוחים — ${measured} מדידים, ` +
            `${unmeasured} לא-מדידים, ${fail} כשלים`);
process.exit(fail ? 1 : 0);
