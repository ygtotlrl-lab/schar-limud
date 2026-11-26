// supabase/functions/sh-gate/index.ts — שער ההתראות והמשתמשים (Supabase Edge Function): קובץ משותף, זהה בכל ריפו ובכל פרויקט
// רישום מכשיר להתראות (sh_push), כניסה שנחסמה (sh_auth_log), כניסה חדשה (sh_logins), אירועים מהמסד (טריגר, בסוד שב-sh_keys), ניהול טבלת המשתמשים של האפליקציה (<p>_users)
// ושליחת התראה — FCM למעטפת, Web Push לדפדפן, ומייל לבעלים. במפתח השירות; המקור — הקובץ הזה, והפריסה ממנו.
// זהות המבקש: בכניסה עם Google — אסימון הסשן של Supabase (Authorization), והמייל שבו מול <p>_users;
// בהנהלה — אסימון השער (hr-gate, אותה חתימה), והמשתמש מ-hr_users. שליחה — רק ממפתח השירות (שערים אחרים בפרויקט).
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

// web-push ו-nodemailer נטענים רק כשצריך — טעינה בראש הקובץ מאריכה כל עלייה קרה בשניות
let _wp: any = null;
async function wp() { if (!_wp) _wp = (await import('npm:web-push@3.6.7')).default; return _wp; }

// האפליקציות של הפרויקט — הקידומת, הבעלים (המייל) ושם התצוגה; אפליקציה שאינה כאן — נדחית
// picked — רק מי שסומן «מקבל התראות» מקבל (הנהלה); בשאר — כל המשתמשים הפעילים
const APPS: Record<string, { prefix: string; owner: string; name: string; picked?: boolean }> = {
  'hanhala-ruchanit': { prefix: 'hr_', owner: 'ygtotlrl@gmail.com', name: 'הנהלה רוחנית', picked: true },
  'schar-limud': { prefix: 'sl_', owner: 'ygtotlrl@gmail.com', name: 'שכר לימוד' },
  'yoman-avoda': { prefix: 'ya_', owner: '770mmf770@gmail.com', name: 'יומן עבודה' },
  'ha-kupa': { prefix: 'k_', owner: '770mmf770@gmail.com', name: 'הקופה' },
  'shiurim': { prefix: 's_', owner: '770mmf770@gmail.com', name: 'שיעורים' },
  'gius': { prefix: 'g_', owner: '770mmf770@gmail.com', name: 'גיוס' },
  'gius-rag': { prefix: 'gr_', owner: '770mmf770@gmail.com', name: 'גיוס · רמת אביב ג׳' },
};
const FCM_PROJECT = 'ygtotlrl-apps';
const ROLES = ['admin', 'manager', 'junior'];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => (x + 0x100).toString(16).slice(1)).join('');
const unb64u = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function out(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function sign(s: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(s)));
}

// ── זהות ──
type Who = { client_id: string; role: string; login: string; full_name: string };
// בהנהלה — אסימון השער (אותה חתימה כמו hr-gate), והמשתמש פעיל לפי המסד
async function whoHr(token: string): Promise<Who | null> {
  const [p, s] = String(token || '').split('.');
  if (!p || !s || !same(s, await sign(p))) return null;
  let pl: { u: string; exp: number };
  try { pl = JSON.parse(unb64u(p)); } catch { return null; }
  if (!pl.exp || pl.exp < Date.now()) return null;
  const r = await db.from('hr_users').select('client_id,role,active,username,full_name').eq('client_id', pl.u).maybeSingle();
  if (!r.data || r.data.active !== true) return null;
  return { client_id: r.data.client_id, role: r.data.role, login: r.data.username, full_name: r.data.full_name || '' };
}
// בכניסה עם Google — המייל מהסשן; null — אין סשן
async function authEmail(req: Request) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const r = await db.auth.getUser(t);
  const e = r.data && r.data.user && r.data.user.email;
  return e ? String(e).toLowerCase() : null;
}
async function whoGoogle(req: Request, app: string): Promise<Who | null> {
  const email = await authEmail(req);
  if (!email) return null;
  const r = await db.from(APPS[app].prefix + 'users').select('client_id,role,active,login,full_name').eq('login', email).maybeSingle();
  if (!r.data || r.data.active !== true) return null;
  return { client_id: r.data.client_id, role: r.data.role, login: r.data.login, full_name: r.data.full_name || '' };
}
async function who(req: Request, b: Record<string, any>, app: string) {
  return app === 'hanhala-ruchanit' ? whoHr(b.token) : whoGoogle(req, app);
}

// ── מפתחות Web Push — נוצרים בשער בפעם הראשונה ונשמרים בטבלה שרק השירות קורא; אף אחד אינו מקליד אותם ──
let _vapid: { pub: string; priv: string } | null = null;
async function vapid() {
  if (_vapid) return _vapid;
  const r = await db.from('sh_keys').select('value').eq('key', 'vapid').maybeSingle();
  if (r.data) { _vapid = r.data.value; return _vapid!; }
  const k = (await wp()).generateVAPIDKeys();
  const v = { pub: k.publicKey, priv: k.privateKey };
  // שני מופעים ברגע אחד — הראשון נשמר, והשני קורא אותו
  await db.from('sh_keys').upsert({ key: 'vapid', value: v }, { onConflict: 'key', ignoreDuplicates: true });
  const again = await db.from('sh_keys').select('value').eq('key', 'vapid').maybeSingle();
  _vapid = again.data ? again.data.value : v;
  return _vapid!;
}

// ── FCM — אסימון גישה מחשבון השירות (הסוד FCM_SERVICE_ACCOUNT), לשעה ──
let _fcm: { tok: string; exp: number } | null = null;
const b64uBytes = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s: string) => b64uBytes(enc.encode(s));
async function fcmToken() {
  if (_fcm && _fcm.exp > Date.now() + 60000) return _fcm.tok;
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return null;
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64uStr(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + body)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + body + '.' + b64uBytes(sig) });
  const j = await r.json();
  if (!j.access_token) { console.error('[fcm token]', j); return null; }
  _fcm = { tok: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return _fcm.tok;
}

// ── שליחה ──
type Msg = { title: string; body: string; url?: string; tag?: string };
async function sendFcm(token: string, m: Msg) {
  const t = await fcmToken();
  if (!t) return 'nokey';
  // התראה ונתונים, בעדיפות גבוהה: כשהאפליקציה ברקע או סגורה — המערכת מציגה את ההתראה בעצמה (בערוץ, בסמל ובתג של המעטפת);
  // הודעת נתונים בלבד נבלעת בטלפונים שעוצרים אפליקציה סגורה (חיסכון בסוללה). בחזית — המעטפת בונה אותה (onMessageReceived).
  const an: Record<string, string> = { title: m.title, body: m.body, channel_id: 'alerts', icon: 'ic_stat' };
  if (m.tag) an.tag = m.tag;
  const r = await fetch('https://fcm.googleapis.com/v1/projects/' + FCM_PROJECT + '/messages:send', { method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, android: { priority: 'high', notification: an },
      data: { title: m.title, body: m.body, url: m.url || '', tag: m.tag || '' } } }) });
  if (r.ok) return 'ok';
  const txt = await r.text();
  console.error('[fcm]', r.status, txt.slice(0, 300));
  return (r.status === 404 || /UNREGISTERED/.test(txt)) ? 'gone' : 'fail';
}
async function sendWeb(sub: string, m: Msg) {
  const v = await vapid();
  try {
    await (await wp()).sendNotification(JSON.parse(sub), JSON.stringify(m),
      { vapidDetails: { subject: 'mailto:ygtotlrl@gmail.com', publicKey: v.pub, privateKey: v.priv }, TTL: 86400, urgency: 'high' });
    return 'ok';
  } catch (e: any) {
    return (e && (e.statusCode === 404 || e.statusCode === 410)) ? 'gone' : 'fail';
  }
}
async function sendMail(to: string, subject: string, text: string) {
  const user = Deno.env.get('GMAIL_USER'), pass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !pass) return 'nokey';
  try {
    const nodemailer = (await import('npm:nodemailer@6.9.16')).default;
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await t.sendMail({ from: user, to, subject, text });
    return 'ok';
  } catch (e) { console.error('[mail]', e); return 'fail'; }
}
// לכל המשתמשים הפעילים (ובהנהלה — רק למי שסומן «מקבל התראות») — לכל המכשירים שלהם, במקביל;
// מכשיר שהשירות אמר שאינו קיים — יורד מהרשימה. only — מכשירי משתמש אחד או כמה (בדיקה מהמכשיר · נמענים מסוימים)
async function notify(app: string, m: Msg, mail: boolean, only?: string | string[]) {
  const a = APPS[app];
  const res: Record<string, number> = { ok: 0, gone: 0, fail: 0, nokey: 0 };
  let keys: string[] = only ? (Array.isArray(only) ? only : [only]) : [];
  if (!only) {
    let q = db.from(a.prefix + 'users').select('client_id').eq('active', true);
    if (a.picked) q = q.eq('notify', true);
    const u = await q;
    keys = (u.data || []).map((x: any) => String(x.client_id));
  }
  const mailP = mail ? sendMail(a.owner, a.name + ' — ' + m.title, m.body) : Promise.resolve('skip');
  if (keys.length) {
    const p = await db.from('sh_push').select('id,kind,token').eq('app', app).in('user_key', keys);
    // אסימון אחד — התראה אחת: מכשיר שנרשם פעמיים (מזהה שהתחלף) אינו מקבל כפולה
    const seenTok = new Set<string>();
    const rows = (p.data || []).filter((row: any) => !seenTok.has(row.token) && !!seenTok.add(row.token));
    await Promise.all(rows.map(async (row: any) => {
      const r = row.kind === 'fcm' ? await sendFcm(row.token, m) : await sendWeb(row.token, m);
      res[r] = (res[r] || 0) + 1;
      if (r === 'gone') await db.from('sh_push').delete().eq('id', row.id);
    }));
  }
  return { push: res, mail: await mailP };
}

// לבעלים בלבד — המכשירים של המשתמש שהמייל שלו הוא הבעלים (ובהנהלה, שאין בה מייל — המנהלים), והמייל
async function notifyOwner(app: string, m: Msg) {
  const a = APPS[app];
  let keys: string[] = [];
  if (app !== 'hanhala-ruchanit') {
    const u = await db.from(a.prefix + 'users').select('client_id').eq('login', a.owner);
    keys = (u.data || []).map((x: any) => String(x.client_id));
  }
  if (!keys.length) {
    const u = await db.from(a.prefix + 'users').select('client_id').eq('role', 'admin').eq('active', true);
    keys = (u.data || []).map((x: any) => String(x.client_id));
  }
  const res: Record<string, number> = { ok: 0, gone: 0, fail: 0, nokey: 0 };
  const mailP = sendMail(a.owner, a.name + ' — ' + m.title, m.body);
  if (keys.length) {
    const p = await db.from('sh_push').select('id,kind,token').eq('app', app).in('user_key', keys);
    // אסימון אחד — התראה אחת: מכשיר שנרשם פעמיים (מזהה שהתחלף) אינו מקבל כפולה
    const seenTok = new Set<string>();
    const rows = (p.data || []).filter((row: any) => !seenTok.has(row.token) && !!seenTok.add(row.token));
    await Promise.all(rows.map(async (row: any) => {
      const r = row.kind === 'fcm' ? await sendFcm(row.token, m) : await sendWeb(row.token, m);
      res[r] = (res[r] || 0) + 1;
      if (r === 'gone') await db.from('sh_push').delete().eq('id', row.id);
    }));
  }
  return { push: res, mail: await mailP };
}

// ── כניסה חדשה — חשבון שנכנס לראשונה, או חשבון מוכר במכשיר חדש (sh_logins): התראה ומייל לבעלים ──
// בתקופת השקט שאחרי ההפעלה (sh_keys: logins_quiet) הכניסות נרשמות בלי התראה — כדי שהמכשירים הקיימים לא יתריעו כולם
async function seen(app: string, me: Who, device: string, devname: string) {
  const prev = await db.from('sh_logins').select('device').eq('app', app).eq('user_key', me.client_id);
  const known = (prev.data || []).some((x: any) => x.device === device);
  const now = new Date().toISOString();
  if (known) { await db.from('sh_logins').update({ last_at: now, devname }).eq('app', app).eq('user_key', me.client_id).eq('device', device); return { known: true }; }
  await db.from('sh_logins').insert({ app, user_key: me.client_id, device, devname, login: me.login, last_at: now });
  const q = await db.from('sh_keys').select('value').eq('key', 'logins_quiet').maybeSingle();
  if (q.data && Number(q.data.value) > Date.now()) return { known: false, quiet: true };
  const first = !(prev.data || []).length;
  const who_ = (me.full_name || me.login) + (me.full_name && me.login !== me.full_name ? ' (' + me.login + ')' : '');
  const title = first ? 'כניסה ראשונה לאפליקציה' : 'כניסה ממכשיר חדש';
  return { known: false, sent: await notifyOwner(app, { title, body: who_ + ' · ' + devname, tag: 'seen' }) };
}

// ── נמענים — מי מקבל: האחראי על המשימה, השגריר של הכרטיס; ומה שאין לו משתמש — המנהלים ──
// המיפוי בטבלת ההגדרות של האפליקציה (<p>settings): assignees — [{name, login}] · ambassador_logins — {שגריר: login}
async function settingJson(app: string, key: string) {
  const r = await db.from(APPS[app].prefix + 'settings').select('value').eq('key', key).eq('deleted', false).maybeSingle();
  try { return r.data ? JSON.parse(String(r.data.value)) : null; } catch { return null; }
}
async function userKeys(app: string) {
  const u = await db.from(APPS[app].prefix + 'users').select('client_id,login,role').eq('active', true);
  const byLogin: Record<string, string> = {}, admins: string[] = [];
  for (const x of u.data || []) {
    byLogin[String(x.login).toLowerCase()] = String(x.client_id);
    if (x.role === 'admin') admins.push(String(x.client_id));
  }
  return { byLogin, admins };
}
// מקבצים לפי נמען — מפתח המשתמש, ובלי משתמש ממופה — '' (המנהלים)
function addTo(g: Record<string, string[]>, key: string, line: string) { (g[key] = g[key] || []).push(line); }
// acc — סיכום תוצאות השליחה (ok · gone · fail · nokey), שהקריאה המתוזמנת מחזירה ונשמר ביומן התגובות
async function sendGrouped(app: string, g: Record<string, string[]>, admins: string[], mk: (lines: string[]) => Msg, acc?: Record<string, number>) {
  let n = 0;
  for (const k of Object.keys(g)) {
    const keys = k ? [k] : admins;
    if (!keys.length) continue;
    const r = await notify(app, mk(g[k]), false, keys);
    if (acc) for (const x of Object.keys(r.push)) acc[x] = (acc[x] || 0) + r.push[x];
    n += g[k].length;
  }
  return n;
}

// ── תאריכים — ימי הולדת ותאריכים נוספים בכרטיסים (<p>donors: birth_date · dates), לפי התאריך העברי ──
// הטריגר המתוזמן קורא כל חצי שעה; בשעון ירושלים — ב-15:30 «מחר», וב-11:00 «היום». כל סוג בהתראה משלו.
const DATE_KINDS: Record<string, string> = { family: 'יום הולדת במשפחה', yahrzeit: 'יארצייט', other: 'תאריך' };
const HEB_FMT = (tz?: string) => new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz || 'UTC' });
function hebParts(d: Date, tz?: string) {
  const p = HEB_FMT(tz).formatToParts(d);
  const g = (t: string) => (p.find((x) => x.type === t) || { value: '' }).value;
  return { day: Number(g('day')), month: g('month'), year: Number(g('year')) };
}
function hebLeap(y: number) { return ((7 * y + 1) % 19) < 7; }
// אדר — באדר ב׳ בשנה מעוברת, ואדר א׳ / ב׳ — באדר בשנה רגילה
function sameHebDay(ev: { day: number; month: string }, t: { day: number; month: string; year: number }) {
  let m = ev.month;
  if (hebLeap(t.year) && m === 'Adar') m = 'Adar II';
  if (!hebLeap(t.year) && (m === 'Adar I' || m === 'Adar II')) m = 'Adar';
  return ev.day === t.day && m === t.month;
}
async function datesRun(app: string, when: string) {
  const a = APPS[app];
  const now = new Date();
  const target = new Date(now.getTime() + (when === 'tomorrow' ? 86400000 : 0));
  const t = hebParts(target, 'Asia/Jerusalem');
  const r = await db.from(a.prefix + 'donors').select('name,ambassador,birth_date,dates,deleted').eq('deleted', false);
  // לכל כרטיס — השגריר שלו, אם הוא משתמש; ובלעדיו — המנהלים
  const ambs = (await settingJson(app, 'ambassador_logins')) || {};
  const { byLogin, admins } = await userKeys(app);
  const to = (d: any) => byLogin[String(ambs[d.ambassador] || '').toLowerCase()] || '';
  const groups: Record<string, Record<string, string[]>> = { birth: {} };
  for (const d of r.data || []) {
    const evOf = (iso: string) => hebParts(new Date(String(iso).slice(0, 10) + 'T12:00:00Z'));
    if (d.birth_date && sameHebDay(evOf(d.birth_date), t)) addTo(groups.birth, to(d), d.name);
    for (const x of (Array.isArray(d.dates) ? d.dates : [])) {
      if (!x || !x.date || !sameHebDay(evOf(x.date), t)) continue;
      const k = DATE_KINDS[x.kind] ? x.kind : 'other';
      addTo(groups[k] = groups[k] || {}, to(d), (x.label ? x.label + ' · ' : '') + d.name);
    }
  }
  const pre = when === 'tomorrow' ? 'מחר' : 'היום';
  const sent: Record<string, number> = {};
  sent.birth = await sendGrouped(app, groups.birth, admins, (l) => ({ title: pre + ' יום הולדת', body: l.join(', '), tag: 'dates-birth' }));
  for (const k of Object.keys(DATE_KINDS)) {
    if (!groups[k]) continue;
    sent[k] = await sendGrouped(app, groups[k], admins, (l) => ({ title: pre + ' · ' + DATE_KINDS[k], body: l.join(', '), tag: 'dates-' + k }));
  }
  return { when, hebrew: t, sent };
}
// ── תזכורות המשימות — משימה «בעבודה» שתאריך היעד שלה היום, בשעת התזכורת שלה (due_time; בלעדיה — 10:00), בשעון ירושלים ──
// הטריגר המתוזמן קורא כל 5 דקות, והתזכורת יוצאת בקריאה הראשונה שאחרי השעה; לאחראי בלבד, ובלי אחראי ממופה — למנהלים.
const TASK_DEFAULT_TIME = '10:00', TASK_TICK_MIN = 5;
function jlmNow() {
  const d = new Date();
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(d);
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const [h, m] = hm.split(':').map(Number);
  return { day, min: h * 60 + m };
}
async function tasksRun(app: string, force: boolean) {
  const a = APPS[app];
  const now = jlmNow();
  const r = await db.from(a.prefix + 'tasks').select('title,assignee,stage,due_date,due_time,deleted').eq('deleted', false).eq('due_date', now.day);
  const due = (r.data || []).filter((t: any) => {
    if ((t.stage || 'בעבודה') !== 'בעבודה') return false;
    if (force) return true;
    const [h, m] = String(t.due_time || TASK_DEFAULT_TIME).split(':').map(Number);
    const at = (h || 0) * 60 + (m || 0);
    return at <= now.min && at > now.min - TASK_TICK_MIN;
  });
  if (!due.length) return { tasks: 0 };
  const list = (await settingJson(app, 'assignees')) || [];
  const loginOf: Record<string, string> = {};
  for (const x of Array.isArray(list) ? list : []) if (x && x.name) loginOf[x.name] = String(x.login || '').toLowerCase();
  const { byLogin, admins } = await userKeys(app);
  const g: Record<string, string[]> = {};
  for (const t of due) addTo(g, byLogin[loginOf[t.assignee] || ''] || '', String(t.title || '') + (t.due_time ? ' · ' + t.due_time : ''));
  const push: Record<string, number> = {};
  const n = await sendGrouped(app, g, admins, (l) => ({ title: l.length === 1 ? 'תזכורת למשימה' : l.length + ' משימות להיום', body: l.join('\n').slice(0, 480), tag: 'tasks-today' }), push);
  return { tasks: n, push };
}
function datesWhen() {
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const [h, m] = hm.split(':').map(Number);
  if (h === 15 && m >= 30) return 'tomorrow';
  if (h === 11 && m < 30) return 'today';
  return '';
}

// ── משתמשים — רק מנהל, ובאפליקציות עם כניסה Google (בהנהלה — ניהול המשתמשים שבאפליקציה) ──
async function users(act: string, app: string, me: Who, b: Record<string, any>) {
  if (me.role !== 'admin') return out({ error: 'perm' }, 403);
  const t = APPS[app].prefix + 'users';
  if (act === 'users_list') {
    const r = await db.from(t).select('client_id,login,full_name,role,active,notify,updated_at').order('full_name');
    return r.error ? out({ error: 'db' }, 500) : out({ rows: r.data });
  }
  const x = b.row || {};
  const login = String(x.login || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(login) || ROLES.indexOf(String(x.role)) < 0) return out({ error: 'bad_request' }, 400);
  // המנהל אינו מוריד את עצמו — אחרת אין מי שינהל
  if (String(x.client_id || '') === me.client_id && (x.role !== 'admin' || x.active === false)) return out({ error: 'self' }, 400);
  const row = { client_id: String(x.client_id || crypto.randomUUID()), login, full_name: String(x.full_name || '').trim(),
    role: String(x.role), active: x.active !== false, notify: x.notify !== false, updated_at: Date.now() };
  const r = await db.from(t).upsert(row, { onConflict: 'client_id' });
  if (r.error) return out({ error: /duplicate|unique/i.test(r.error.message) ? 'dup' : 'db' }, 409);
  return out({ ok: true, row });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let b: Record<string, any>;
  try { b = await req.json(); } catch { return out({ error: 'bad_request' }, 400); }
  const act = String(b.action || ''), app = String(b.app || '');
  if (act === 'vapid') return out({ key: (await vapid()).pub });
  if (!APPS[app]) return out({ error: 'app' }, 400);

  // שליחה — רק משער אחר בפרויקט, במפתח השירות
  if (act === 'send') {
    const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!same(t, KEY)) return out({ error: 'perm' }, 403);
    const m: Msg = { title: String(b.title || ''), body: String(b.body || ''), url: String(b.url || ''), tag: String(b.tag || '') };
    return out(await notify(app, m, b.mail === true));
  }

  // אירוע מהמסד (טריגר) — בסוד שהמסד יצר ושמר ב-sh_keys; אף אחד אינו מקליד אותו
  if (act === 'hook') {
    const h = await db.from('sh_keys').select('value').eq('key', 'hook').maybeSingle();
    if (!h.data || !same(String(b.hook || ''), String(h.data.value))) return out({ error: 'perm' }, 403);
    if (b.kind === 'k_entry') {
      const amt = Number(b.amount) || 0;
      const title = b.type === 'tzedakah' ? 'צדקה נרשמה' : b.type === 'so' ? 'הוראת קבע נרשמה' : 'הכנסה נרשמה';
      const body = (amt < 0 ? '−' : '') + '₪' + Math.abs(amt).toLocaleString('he-IL') + (b.description ? ' · ' + String(b.description) : '');
      return out(await notify(app, { title, body }, false));
    }
    // ימי הולדת ותאריכים — מהטריגר המתוזמן; when מפורש — לבדיקה
    if (b.kind === 'dates') {
      const when = b.when === 'today' || b.when === 'tomorrow' ? b.when : datesWhen();
      if (!when) return out({ ok: true, skip: true });
      return out(await datesRun(app, when));
    }
    // תזכורות המשימות — מהטריגר המתוזמן כל 5 דקות; force — כל המשימות של היום, לבדיקה
    if (b.kind === 'tasks') {
      if (app !== 'gius' && app !== 'gius-rag') return out({ error: 'app' }, 400);
      return out(await tasksRun(app, b.force === true));
    }
    // בדיקת המייל לבעלים — אחרי הגדרת הסיסמה
    if (b.kind === 'mail') return out({ mail: await sendMail(APPS[app].owner, APPS[app].name + ' — בדיקת מייל', 'המייל מהאפליקציות פועל.') });
    // תנועה — הכותרת והגוף נבנים בטריגר (שכר לימוד · גיוס · גיוס רמת אביב ג׳)
    if (b.kind === 'txn') return out(await notify(app, { title: String(b.title || '').slice(0, 80), body: String(b.body || '').slice(0, 240) }, false));
    return out({ error: 'bad_request' }, 400);
  }

  // כניסה שנחסמה — סשן תקף של Google שאינו ברשימה: נרשם, ומתריעים לבעלים על כל ניסיון
  if (act === 'blocked') {
    const email = await authEmail(req);
    if (!email) return out({ error: 'login' }, 401);
    const me = await whoGoogle(req, app);
    if (me) return out({ ok: true, allowed: true });
    await db.from('sh_auth_log').insert({ app, login: email, reason: 'not_listed' });
    await notifyOwner(app, { title: 'ניסיון כניסה נחסם', body: email + ' ניסה להיכנס ואינו ברשימת המשתמשים.' });
    // הסשן של מי שנחסם יורד בשרת — לא נשאר אסימון רענון שאפשר לחדש בו
    const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    try { await db.auth.admin.signOut(t, 'global'); } catch (_) { /* */ }
    return out({ ok: true, allowed: false });
  }

  const me = await who(req, b, app);
  if (!me) return out({ error: 'login' }, 401);

  if (act === 'me') return out({ user: me });
  if (act === 'reg') {
    const kind = b.kind === 'fcm' ? 'fcm' : b.kind === 'web' ? 'web' : '';
    const device = String(b.device || ''), token = String(b.push || '');
    if (!kind || !/^[A-Za-z0-9_-]{8,64}$/.test(device) || !token || token.length > 4096) return out({ error: 'bad_request' }, 400);
    const r = await db.from('sh_push').upsert({ app, device, kind, token, user_key: me.client_id, updated_at: new Date().toISOString() }, { onConflict: 'app,device' });
    return r.error ? out({ error: 'db' }, 500) : out({ ok: true });
  }
  if (act === 'unreg') {
    await db.from('sh_push').delete().eq('app', app).eq('device', String(b.device || '')).eq('user_key', me.client_id);
    return out({ ok: true });
  }
  if (act === 'seen') {
    const device = String(b.device || '');
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(device)) return out({ error: 'bad_request' }, 400);
    return out(await seen(app, me, device, String(b.devname || '').slice(0, 60)));
  }
  if (act === 'test') return out(await notify(app, { title: 'בדיקת התראות', body: 'ההתראות פועלות במכשיר הזה.', tag: 'test' }, false, me.client_id));
  // מי הפעיל התראות — מספר המכשירים הרשומים לכל משתמש; למנהל בלבד
  if (act === 'devices') {
    if (me.role !== 'admin') return out({ error: 'perm' }, 403);
    const r = await db.from('sh_push').select('user_key,token').eq('app', app);
    const m: Record<string, number> = {}, tk = new Set<string>();
    for (const x of r.data || []) { if (tk.has(x.token)) continue; tk.add(x.token); m[x.user_key] = (m[x.user_key] || 0) + 1; }
    return out({ devices: m });
  }
  if ((act === 'users_list' || act === 'users_save') && app !== 'hanhala-ruchanit') return users(act, app, me, b);
  return out({ error: 'bad_action' }, 400);
});
