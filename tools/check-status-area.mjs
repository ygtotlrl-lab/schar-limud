#!/usr/bin/env node
/*  בדיקת אחידות "אזור מצב" — סבב 17.
 *
 *  כלל ברזל 7 של הארגון: **רכיב משותף = קוד זהה + מיקום זהה + חיווט חי.**
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
  settingsContainerId: 'settings-main',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [56];

const CANON = {
  css:  { name: 'CSS אזור המצב',        sha: 'aa10b52e9ce1157e', lines: 16,
          start: '/* ═══ אזור מצב — CSS משותף (סבב 15/17)', end: '/* ═══ סוף CSS אזור המצב' },
  tech: { name: 'בלוק "מידע טכני"',      sha: '83096d1117e813f0', lines: 50,
          start: '/* ═══ "מידע טכני" — קיפול מסכי האחסון', end: '/* ═══ סוף רכיב "מידע טכני"' },
  sync: { name: 'בלוק "☁️ סנכרון"',      sha: 'c3e019d63fcb4024', lines: 45,
          start: '/* ═══ אזור מצב — בלוק "☁️ סנכרון"', end: '/* ═══ סוף בלוק "☁️ סנכרון"' },
  backup: { name: 'מודול הגיבוי היומי', sha: '1dba3e5eae1b810c', lines: 261,
          start: '/* ═══ גיבוי יומי ויומן פעולות', end: 'סוף מודול הגיבוי היומי' },
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
  if (text === null) { fail(`${spec.name}: הבלוק לא נמצא (סמן פתיחה/סגירה חסר)`); continue; }
  const sha = crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  if (sha !== spec.sha) {
    fail(`${spec.name}: אינו זהה לחתימה הקנונית — ${sha} במקום ${spec.sha} ` +
         `(${text.split('\n').length} שורות במקום ${spec.lines}). ` +
         `שינוי בבלוק משותף חייב להיעשות בארבע האפליקציות ובארבעת עותקי הבדיקה.`);
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
    fail(`מיכל ההגדרות "${APP.settingsContainerId}" לא נמצא או לא נסגר`);
  } else {
    const last2 = kids.slice(-2);
    const ok = last2.length === 2 &&
               last2[0].includes('id="sync-status-box"') &&
               last2[1].includes('id="tech-info-box"');
    if (ok) pass('אזור המצב: sync-status-box ואחריו tech-info-box הם שני האלמנטים האחרונים');
    else fail('אזור המצב: שני האלמנטים האחרונים ב-' + APP.settingsContainerId +
              ' אינם sync-status-box ואז tech-info-box. נמצא: ' +
              last2.map(t => t.slice(0, 60)).join(' | '));
  }
} else {
  // מסך ההגדרות של gius נבנה כמחרוזת ומוחזר; הבדיקה היא על זנב הבנייה.
  const re = new RegExp(
    "h \\+= '<div id=\"sync-status-box\"></div>';\\s*\\n\\s*" +
    "h \\+= '<div id=\"tech-info-box\"></div>';\\s*\\n\\s*return h;");
  if (re.test(src)) pass('אזור המצב: שני העוגנים נבנים אחרונים ב-' + APP.settingsFn);
  else fail('אזור המצב: ' + APP.settingsFn + ' אינה מסתיימת בעוגן sync-status-box ואז tech-info-box');
}

// העוגן הישן של מסך ה-⏳ אינו אמור להתקיים יותר — תוכנו חי בתוך אזור המצב.
if (src.includes('id="pend-status-box"')) {
  fail('נמצא עוגן ישן id="pend-status-box" — מסך ה-⏳ מוגש מתוך #sync-status-box');
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
       'הרכיב קיים אך אינו מחובר לשום מסך');
}

console.log(failures ? `\n❌ בדיקת אזור המצב נכשלה (${failures})` : '\n✅ בדיקת אזור המצב עברה');
process.exit(failures ? 1 : 0);
