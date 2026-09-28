// app/constants.js — הנתונים: שמות הטבלאות, המחרוזות והקבועים
import { appConfigure } from '../core/util.js';

// ── מסירת התצורה ──
// כאן הנתונים שהליבה קוראת, והחיווט — ב-main.js; הקובץ הזה נטען ראשון, לפני כל קריאה לליבה.
// העידן עולה בשינוי צורת רשומה או מפתחה, ושינוי שם טבלה הוא שינוי כזה — המראה ממופתחת בשם.
// עותק בעידן ישן אינו נדחף — הממתין בו נרשם ביומן, והוא נזרק ונמשך מלא.
var DATA_ERA = 5;

appConfigure({ DATA_ERA: DATA_ERA });

// ── הודעות ועוזרי רשת ──
// MSG_OFFLINE ו-MSG_BAD_LOGIN נבדלים פר-אפליקציה בהחלטת מנהל, ולכן אינם במודול המשותף
var MSG_BAD_LOGIN = 'שם משתמש או סיסמה שגויים';

// ── הודעות פר-אפליקציה ──
var MSG_NO_USER_RELOGIN = '⚠️ אין משתמש מחובר — נא להיכנס מחדש';

var MSG_PASS_UPDATED = '✅ הסיסמה עודכנה';

var MSG_PASS_UPDATED_NO_FP2 = '⚠️ הסיסמה עודכנה — אך ללא הכנה לכניסה ללא רשת';

var MSG_LOAD_FAIL_POST = ') — המוצג הוא העותק שבמכשיר';

var MSG_PICK_STUDENT_PLAIN = 'נא לבחור תלמיד';
var TXN_FILTER_ALL = 'כולם';

var MSG_PICK_DATE = 'נא לבחור תאריך';

var MSG_NEED_AMOUNT = 'נא להזין סכום תקין';

var MSG_PAY_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — התשלום לא נשמר';

var MSG_PAY_MISSING = '⚠️ התשלום לא נמצא';

var MSG_DEL_NOT_SAVED = '❌ המחיקה לא נשמרה במכשיר';

var MSG_PAY_DELETED = '✅ תשלום נמחק';

var MSG_CHANGE_NOT_SAVED = '❌ השינוי לא נשמר במכשיר';

var MSG_STUDENT_ON = '✅ תלמיד הופעל';

var MSG_STUDENT_OFF = '✅ תלמיד הושהה';

var MSG_START_MONTH_BAD = '❌ חודש הצטרפות לא תקין — פורמט YYYY-MM';

var MSG_END_MONTH_BAD = '❌ חודש עזיבה לא תקין — פורמט YYYY-MM';

var MSG_END_BEFORE_START = '❌ חודש העזיבה מוקדם מחודש ההצטרפות';

var MSG_NAME_REQUIRED = 'שם חובה';

var MSG_STUDENT_MISSING2 = '⚠️ התלמיד לא נמצא';

var MSG_TUITION_POSITIVE = '❌ שכר לימוד חייב להיות מספר חיובי';

var MSG_DEBT_POSITIVE = '❌ חוב קודם חייב להיות מספר חיובי';

var MSG_SETTINGS_NOT_SAVED = '❌ ההגדרות לא נשמרו במכשיר';

var MSG_VALUE_BAD = 'ערך לא תקין';

var MSG_VALUE_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — הערך לא נשמר';

var MSG_VALUE_EXISTS = '⚠️ הערך כבר קיים ברשימה';

var MSG_ITEM_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — הפריט לא נוסף';

var MSG_CREDIT_ITEM_LOCKED = '» הוא סעיף מערכת ואינו נמחק — בלעדיו אי אפשר לרשום ניצול יתרת זכות';

var MSG_ITEM_MISSING = '⚠️ הפריט לא נמצא';

var MSG_DELETED_OK = '✅ נמחק';

var MSG_ADD_STUDENT = 'הוספת תלמיד';

var MSG_STUDENT_SAVE_FAIL = '❌ השמירה במכשיר נכשלה — התלמיד לא נשמר';

var MSG_STUDENT_DELETED = '✅ תלמיד נמחק';

var MSG_CONFIRM = 'אישור';

var MSG_DEL_TXN_TITLE = 'מחיקת תשלום';

var MSG_DEL_TXN_BODY = 'למחוק תשלום זה?';

var MSG_DEL_ITEM_TITLE = 'מחיקת פריט';

var MSG_DEL_ITEM_BODY = 'למחוק פריט זה?';

var MSG_DEL_STUDENT_TITLE = 'מחיקת תלמיד';

var MSG_DEL_STUDENT_PRE = 'למחוק את ';

var MSG_DEL_STUDENT_ANON = 'תלמיד';

var MSG_DEL_STUDENT_POST = '? התלמיד יוסר מהרשימות; רשומות התשלומים שלו יישמרו במערכת.';

// ── עמידות אחסון מקומי ──
var KV_TABLE = 'sl_settings';

// ── PUSH_CFG ──
// sl_users אינה נדחפת לעולם — המראה מחזיקה טביעות בלבד, ודחיפת-מצב הייתה כותבת סיסמה ריקה; מסלולה writeUser
// סדר הטבלאות שומר על המפתח הזר — תלמידים לפני תנועות
var PUSH_TABLES = ['sl_students', 'sl_transactions', KV_TABLE, 'sl_lists'];

// ── ERA_CFG ──

var MSG_SET_DENIED  = '🔒 מסך ההגדרות פתוח למשתמשי ניהול בלבד. המשתמש שאיתו נכנסת אינו מוגדר כך — יש לפנות למנהל המערכת.';

// ── אימות אופליין מול הטביעה ──
// «המשתמש אינו בעותק המקומי» ו«אין לו טביעה» אינם «סיסמה שגויה» — הם דורשים חיבור, ולכן הודעה נפרדת לכל אחד
var MSG_NO_USERS      = '⚠️ אין עדיין משתמשים במערכת — יש ליצור משתמש ראשון ב-SQL Editor של Supabase';

// האימות המקוון עובר דרך הטביעה, ולכן המצב קיים גם עם רשת — אין לאחד עם MSG_BAD_LOGIN
// ההודעה נוקבת בשדות ולא ב«סיסמה» — אין עמודת סיסמה, ומה שנקבע ב-SQL Editor הוא הטביעה
var MSG_NO_FP_ONLINE  = '❌ למשתמש הזה אין טביעת סיסמה במערכת — יש לקבוע לו `pass_salt` ו-`pass_fp` ב-SQL Editor של Supabase';

// ── מזהה מכשיר, client_id ונעילה ──

var YEAR_MONTHS=[8,9,10,11,0,1,2,3,4,5,6,7];

// יתרת זכות אינה חוב שלילי ואינה מקוזזת; זיכוי מיתרה מקטין חוב אך אינו כסף שהתקבל
// הסיווג לפי המחרוזת שעל התנועה ולא לפי קיום הפריט ברשימה — מחיקת הפריט אינה משנה סיווג היסטורי
var CREDIT_METHOD='זוכה על חשבון יתרת זכות';

// מפתחות שאסור להם להגיע ל-localStorage המשותף ל-origin; נאכפת במשיכה, בכתיבה המקומית ובשער הדיסק
// סוד חדש נכנס לרשימה הזו ולא למנגנון חדש
var SL_NEVER_MIRROR_SETTINGS = [];

export { CREDIT_METHOD, KV_TABLE, MSG_ADD_STUDENT, MSG_BAD_LOGIN, MSG_CHANGE_NOT_SAVED,
         MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED, MSG_DEBT_POSITIVE, MSG_DELETED_OK,
         MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON,
         MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE, MSG_DEL_STUDENT_TITLE,
         MSG_DEL_TXN_BODY, MSG_DEL_TXN_TITLE, MSG_END_BEFORE_START, MSG_END_MONTH_BAD,
         MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_LOAD_FAIL_POST, MSG_NAME_REQUIRED,
         MSG_NEED_AMOUNT, MSG_NO_FP_ONLINE, MSG_NO_USERS, MSG_NO_USER_RELOGIN,
         MSG_PASS_UPDATED, MSG_PASS_UPDATED_NO_FP2, MSG_PAY_DELETED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PICK_DATE, MSG_PICK_STUDENT_PLAIN, MSG_SETTINGS_NOT_SAVED,
         MSG_SET_DENIED, MSG_START_MONTH_BAD, MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2,
         MSG_STUDENT_OFF, MSG_STUDENT_ON, MSG_STUDENT_SAVE_FAIL, MSG_TUITION_POSITIVE,
         MSG_VALUE_BAD, MSG_VALUE_EXISTS, MSG_VALUE_SAVE_FAIL, PUSH_TABLES,
         SL_NEVER_MIRROR_SETTINGS, TXN_FILTER_ALL, YEAR_MONTHS };
