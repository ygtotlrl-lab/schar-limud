#!/usr/bin/env node
/*  בדיקת אחידות "אזור מצב" — סבב 17.
 *
 *  ⭐ משימת הבודק: סורק את בלוק «אזור מצב» שבסוף ההגדרות — ⛔ ומפיל על סטייה
 *  בטקסט, במיקום או בחיווט של הרכיב המשותף.
 *
 *  ⭐ **רכיב משותף = קוד זהה + מיקום זהה + חיווט חי.**
 *  שלושת הסבבים הקודמים הוכיחו שתיעוד לבדו לא מחזיק אותו: סבב 15 קיפל את
 *  מסכי האחסון בארבע האפליקציות, וחצי שנה של עריכות אחר כך הרכיב ישב
 *  במקום אחר בכל אחת מהן, ובגיוס הוא בכלל היה קוד מת. הבדיקה הזו רצה עם
 *  שערי התחביר לפני כל דחיפה, ונכשלת על שלושת סוגי הסטייה:
 *
 *    א. `#sync-status-box` ו-`#tech-info-box` אינם שני האלמנטים האחרונים
 *       במסך ההגדרות, בסדר הזה.
 *    ב. אחד משלושת הבלוקים המשותפים (CSS, "מידע טכני", "☁️ סנכרון") אינו
 *       זהה לחתימה הקנונית שרשומה כאן.
 *    ג. `statusAreaMount()` אינו נקרא מקוד חי — כלומר הרכיב קיים אך לא
 *       מחווט, בדיוק התקלה של gius בסבב 15.
 *
 *  החתימות זהות בארבעת הריפו. שינוי מכוון בבלוק משותף = עדכון הבלוק
 *  בארבע האפליקציות **ובארבעת עותקי הקובץ הזה**, באותו סבב.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  mode: 'html',
  /*  ⛔ שני השדות מוצהרים בשתי הצורות (סבב 72) — ⚠️ מסך ההגדרות באפליקציה
      אחת נבנה כמחרוזת ומוחזר מפונקציה, ובשלוש כמיכל ב-DOM: ⭐ הענף שאינו
      רץ כאן מקבל `null`, ⛔ ואינו נשמט — שדה חסר נקרא «לא נשאל». */
  settingsContainerId: 'settings-main',
  settingsFn: null,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [61];

/*  ⛔ החתימה נקראת מ-`check-capabilities` ⛔ ואינה מוקלדת כאן (סבב 96ד) —
 *  ⚠️ ערך שמוצהר בשני מקומות מתיישן באחד מהם, ⭐ והשער השני מאשר בשקט את
 *  מה שכבר אינו: ⛔ המרשם שם הוא המקור, וכאן קוראים ממנו לפי סמן הפתיחה. */
function capsBlock(startMark) {
  const caps = fs.readFileSync(new URL('./check-capabilities.mjs', import.meta.url), 'utf8');
  const re = /block:\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(caps)) !== null) {
    const s = /start:\s*'([^']*)'/.exec(m[1]);
    if (!s || s[1] !== startMark) continue;
    return { sha: (/sha:\s*'([0-9a-f]{16})'/.exec(m[1]) || [])[1] || '',
             lines: Number((/lines:\s*(\d+)/.exec(m[1]) || [])[1]) || 0 };
  }
  return { sha: '', lines: 0 };
}
const CANON = {
  /*  ⛔ שכבת הטוסט (סבב 87ב) — ⚠️ שלוש מהן החזיקו אלמנט קבוע אחד ⛔ ושם
   *  מחלקה משלהן, ⭐ והודעה שנייה דרסה את הראשונה: ⛔ המנגנון, שמות
   *  המחלקות והצבעים אחד בארבעתן. */
  toast: { name: 'CSS שכבת הטוסט',       sha: '53a6aa03d82fd7dc', lines: 14,
          start: '/* ═══ שכבת הטוסט — CSS משותף (סבב 87ב)', end: '/* ═══ סוף CSS שכבת הטוסט' },
  css:  { name: 'CSS אזור המצב',        sha: 'aa10b52e9ce1157e', lines: 16,
          start: '/* ═══ אזור מצב — CSS משותף (סבב 15/17)', end: '/* ═══ סוף CSS אזור המצב' },
  /*  ⛔ שלושת הבלוקים האלה מוצהרים גם ב-`check-capabilities` — ⚠️ ולכן
   *  החתימה ומספר השורות נקראים משם, ⛔ ואינם מוקלדים כאן פעם שנייה. */
  tech: Object.assign({ name: 'בלוק "מידע טכני"',
          start: '/* ═══ מידע טכני — מודול משותף (סבב 91)', end: '/* ═══════════════ סוף מודול מידע טכני' },
          capsBlock('/* ═══ מידע טכני — מודול משותף (סבב 91)')),
  sync: Object.assign({ name: 'בלוק "☁️ סנכרון"',
          start: '/* ═══ אזור מצב — בלוק "☁️ סנכרון" — מודול משותף (סבב 17)', end: '/* ═══ סוף בלוק "☁️ סנכרון"' },
          capsBlock('/* ═══ אזור מצב — בלוק "☁️ סנכרון" — מודול משותף (סבב 17)')),
  backup: Object.assign({ name: 'מודול הגיבוי היומי',
          start: '/* ═══ גיבוי יומי ויומן פעולות — מודול משותף (סבב 30)', end: 'סוף מודול הגיבוי היומי' },
          capsBlock('/* ═══ גיבוי יומי ויומן פעולות — מודול משותף (סבב 30)')),
};

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link',
                      'meta','param','source','track','wbr']);

const src = fs.readFileSync(APP.file, 'utf8');
let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

/* ── ב. חתימות הבלוקים המשותפים ────────────────────────────────────────── */
function grab(spec) {
  const i = src.indexOf(spec.start);
  if (i < 0) return null;
  const j = src.indexOf(spec.end, i);
  if (j < 0) return null;
  const k = src.indexOf('*/', j);
  if (k < 0) return null;
  return src.slice(i, k + 2);
}
for (const key of Object.keys(CANON)) {
  const spec = CANON[key];
  const text = grab(spec);
  if (text === null) { fail(`${spec.name}: הבלוק לא נמצא — נמדדו 0 סמנים מתוך שניים ` +
        `(פתיחה וסגירה). מוסיפים את הסמנים החסרים סביב הבלוק`); continue; }
  const sha = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  if (sha !== spec.sha) {
    fail(`${spec.name}: אינו זהה לחתימה הקנונית — ${sha} במקום ${spec.sha} ` +
         `(${text.split('\n').length} שורות במקום ${spec.lines}). ` +
         `מיישרים את הבלוק, או מעדכנים את החתימה — שינוי בבלוק משותף ` +
         `נכנס בארבע האפליקציות ובארבעת עותקי הבדיקה, באותו סבב.`);
  } else {
    pass(`${spec.name}: זהה לחתימה הקנונית (${spec.sha})`);
  }
}

/* ── א. מיקום — שני האלמנטים האחרונים במסך ההגדרות ─────────────────────── */
// ההשוואה היא על **ילדים ישירים** של מיכל ההגדרות. אנקור שיושב בתוך כרטיס
// היה עובר בדיקה רופפת ("שני המזהים מופיעים בסוף") גם כשמשהו אחר מוצג
// אחריו, ולכן שניהם חייבים לשבת חשופים בתחתית המיכל.
function directChildren(html, containerId) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const idAt = noComments.indexOf(`id="${containerId}"`);
  if (idAt < 0) return null;
  const open = noComments.lastIndexOf('<', idAt);
  const openEnd = noComments.indexOf('>', idAt);
  if (open < 0 || openEnd < 0) return null;
  const re = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  re.lastIndex = openEnd + 1;
  const kids = [];
  let depth = 0, m;
  while ((m = re.exec(noComments)) !== null) {
    const closing = m[0][1] === '/';
    const tag = m[1].toLowerCase();
    const selfClosed = /\/\s*$/.test(m[2]);
    if (closing) { if (depth === 0) return kids; depth--; continue; }
    if (VOID.has(tag) || selfClosed) { if (depth === 0) kids.push(m[0]); continue; }
    if (depth === 0) kids.push(m[0]);
    depth++;
  }
  return null;   // המיכל לא נסגר — קלט פגום
}

if (APP.mode === 'html') {
  const kids = directChildren(src, APP.settingsContainerId);
  if (!kids) {
    fail(`מיכל ההגדרות "${APP.settingsContainerId}" לא נמצא או לא נסגר — ` +
        `נמדדו 0 מיכלים תקינים והצפוי אחד. מתקנים את תגי הפתיחה והסגירה`);
  } else {
    const last2 = kids.slice(-2);
    const ok = last2.length === 2 &&
               last2[0].includes('id="sync-status-box"') &&
               last2[1].includes('id="tech-info-box"');
    if (ok) pass('אזור המצב: sync-status-box ואחריו tech-info-box הם שני האלמנטים האחרונים');
    else fail('אזור המצב: שני האלמנטים האחרונים ב-' + APP.settingsContainerId +
              ' אינם sync-status-box ואז tech-info-box. נמדד: ' +
              last2.map(t => t.slice(0, 60)).join(' | ') +
              ' — מעדכנים את סדר שני האלמנטים האחרונים במיכל');
  }
} else {
  // מסך ההגדרות של gius נבנה כמחרוזת ומוחזר; הבדיקה היא על זנב הבנייה.
  const re = new RegExp(
    "h \\+= '<div id=\"sync-status-box\"></div>';\\s*\\n\\s*" +
    "h \\+= '<div id=\"tech-info-box\"></div>';\\s*\\n\\s*return h;");
  if (re.test(src)) pass('אזור המצב: שני העוגנים נבנים אחרונים ב-' + APP.settingsFn);
  else fail('אזור המצב: ' + APP.settingsFn + ' אינה מסתיימת בעוגן sync-status-box ' +
              'ואז tech-info-box — נמדד סדר אחר והצפוי הסדר הזה. מעדכנים את סוף הפונקציה');
}

// העוגן הישן של מסך ה-⏳ אינו אמור להתקיים יותר — תוכנו חי בתוך אזור המצב.
if (src.includes('id="pend-status-box"')) {
  fail('נמצא עוגן ישן id="pend-status-box" — נמדד עוגן אחד והצפוי אפס. ' +
       'מסירים אותו: מסך ה-⏳ מוגש מתוך #sync-status-box');
} else {
  pass('אין עוגן ⏳ נפרד מחוץ לאזור המצב');
}

/* ── ג. חיווט חי ───────────────────────────────────────────────────────── */
const syncBlock = grab(CANON.sync) || '';
const outside = src.split(syncBlock).join('');
if (/statusAreaMount\s*\(\s*\)/.test(outside)) {
  pass('חיווט חי: statusAreaMount() נקראת מקוד האפליקציה');
} else {
  fail('חיווט חי: statusAreaMount() אינה נקראת בשום מקום מחוץ לבלוק המשותף — ' +
       'נמדדו 0 קריאות והצפוי אחת. מוסיפים את הקריאה למסך ההגדרות; ' +
       'הרכיב קיים אך אינו מחובר לשום מסך');
}

console.log(failures ? `\n❌ בדיקת אזור המצב נכשלה (${failures})` : '\n✅ בדיקת אזור המצב עברה');
process.exit(failures ? 1 : 0);
