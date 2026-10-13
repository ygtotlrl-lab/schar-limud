// app/constants.js — הנתונים: שמות הטבלאות, המחרוזות והקבועים
import { appConfigure } from '../core/util.js';

// ── מסירת התצורה ──
// כאן הנתונים שהליבה קוראת, והחיווט — ב-main.js; הקובץ הזה נטען ראשון, לפני כל קריאה לליבה.
// העידן עולה בשינוי צורת רשומה או מפתחה, ושינוי שם טבלה הוא שינוי כזה — המראה ממופתחת בשם.
// עותק בעידן ישן אינו נדחף — הממתין בו נרשם ביומן, והוא נזרק ונמשך מלא.
var DATA_ERA = 9;

appConfigure({ DATA_ERA: DATA_ERA });

// ── הודעות פר-אפליקציה ──
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

var MSG_HANDLED_ON = '✅ סומן «טופל» לחודש';

var MSG_HANDLED_OFF = '✅ הסימון «טופל» הוסר';

var MSG_START_MONTH_BAD = '❌ חודש הצטרפות לא תקין — פורמט YYYY-MM';

var MSG_END_MONTH_BAD = '❌ חודש עזיבה לא תקין — פורמט YYYY-MM';

var MSG_END_BEFORE_START = '❌ חודש העזיבה מוקדם מחודש ההצטרפות';

var MSG_PERIOD_OVERLAP = '❌ התקופה חופפת לתקופה אחרת של התלמיד';

var MSG_PERIOD_OPEN_LAST = '❌ תקופה פתוחה — רק האחרונה; לתקופה שלפני אחרת נדרש חודש עזיבה';

var MSG_PERIOD_MISSING = '⚠️ התקופה לא נמצאה';

var MSG_DEL_PERIOD_TITLE = 'מחיקת תקופה';

var MSG_DEL_PERIOD_BODY = 'למחוק את התקופה? החודשים שבה לא יחויבו.';

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
// סדר הטבלאות שומר על המפתח הזר — תלמידים לפני תנועות
var PUSH_TABLES = ['sl_students', 'sl_transactions', KV_TABLE, 'sl_lookups'];

// סוג הרשימה ב-sl_lookups — אמצעי תשלום.
var LK_METHOD = 'method';

// השיעור — קבוע, כמו בהנהלה: הסדר א׳ ⟵ ב׳ ⟵ ג׳, והמחזור — שנת הסיום: ג׳ שנת הלימודים, ב׳ הבאה, א׳ שלאחריה.
var CLS_LIST = ['a', 'b', 'g'];
var CLS_NAME = { a: 'שיעור א׳', b: 'שיעור ב׳', g: 'שיעור ג׳' };
var CLS_CYCLE_ADD = { g: 0, b: 1, a: 2 };
var MSG_YEAR_UNSET = '⚠️ שנת הלימודים לא נקבעה — המעבר השנתי אינו זמין';
var MSG_YEAR_ROLL_DONE = '✅ מעבר שנתי הושלם — ';
var MSG_CLS_REQUIRED = 'יש לבחור שיעור';

var YEAR_MONTHS=[8,9,10,11,0,1,2,3,4,5,6,7];

// יתרת זכות אינה חוב שלילי ואינה מקוזזת; זיכוי מיתרה מקטין חוב אך אינו כסף שהתקבל
// הסיווג לפי המחרוזת שעל התנועה ולא לפי קיום הפריט ברשימה — מחיקת הפריט אינה משנה סיווג היסטורי
var CREDIT_METHOD='זוכה על חשבון יתרת זכות';

// מפתחות שאסור להם להגיע לאחסון המקומי; נאכפת במשיכה, בכתיבה המקומית ובשער הדיסק
// סוד חדש נכנס לרשימה הזו ולא למנגנון חדש
var SL_NEVER_MIRROR_SETTINGS = [];

export { CLS_CYCLE_ADD, CLS_LIST, CLS_NAME, CREDIT_METHOD, KV_TABLE, LK_METHOD, MSG_CLS_REQUIRED, MSG_YEAR_ROLL_DONE, MSG_YEAR_UNSET, MSG_ADD_STUDENT, MSG_CHANGE_NOT_SAVED,
         MSG_CONFIRM, MSG_CREDIT_ITEM_LOCKED, MSG_DEBT_POSITIVE, MSG_DELETED_OK,
         MSG_DEL_ITEM_BODY, MSG_DEL_ITEM_TITLE, MSG_DEL_NOT_SAVED, MSG_DEL_STUDENT_ANON,
         MSG_DEL_STUDENT_POST, MSG_DEL_STUDENT_PRE, MSG_DEL_STUDENT_TITLE,
         MSG_DEL_TXN_BODY, MSG_DEL_TXN_TITLE, MSG_END_BEFORE_START, MSG_END_MONTH_BAD,
         MSG_HANDLED_OFF, MSG_HANDLED_ON, MSG_ITEM_MISSING, MSG_ITEM_SAVE_FAIL, MSG_LOAD_FAIL_POST, MSG_NAME_REQUIRED,
         MSG_NEED_AMOUNT, MSG_DEL_PERIOD_BODY, MSG_DEL_PERIOD_TITLE, MSG_PAY_DELETED, MSG_PAY_MISSING,
         MSG_PAY_SAVE_FAIL, MSG_PERIOD_MISSING, MSG_PERIOD_OPEN_LAST, MSG_PERIOD_OVERLAP, MSG_PICK_DATE, MSG_PICK_STUDENT_PLAIN, MSG_SETTINGS_NOT_SAVED,
         MSG_START_MONTH_BAD, MSG_STUDENT_DELETED, MSG_STUDENT_MISSING2,
         MSG_STUDENT_OFF, MSG_STUDENT_ON, MSG_STUDENT_SAVE_FAIL, MSG_TUITION_POSITIVE,
         MSG_VALUE_BAD, MSG_VALUE_EXISTS, MSG_VALUE_SAVE_FAIL, PUSH_TABLES,
         SL_NEVER_MIRROR_SETTINGS, TXN_FILTER_ALL, YEAR_MONTHS };
