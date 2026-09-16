/* ───────────────────────────────────────────────────────────────────────────
   db_schema.mjs — הסכימה המוצהרת של שני הפרויקטים
   ───────────────────────────────────────────────────────────────────────────
   ⛔ **מה נכנס**: `p` הפרויקט · `t` שם הטבלה · `c` עמודותיה **בסדרן**,
   מופרדות בפסיק. ⛔ **ומה מפיל**: טבלה כפולה באותו פרויקט · רשומה בלי
   עמודות · שם שהקוד שואל ואינו כאן · ⛔ **ועמודה שבמסד ואינה כאן**.
   ⭐ **ולמה המבנה קיים**: הוא **מראה** של הסכימה החיה — ⚠️ שער השאילתות
   מצליב אליו כל `from` וכל תנאי בלי לצאת לרשת, ⛔ ושער עובדות המסד
   מצליב אותו עצמו מול המסד בכל ריצה שמגיעה אליו.
   ⛔ **וזה הקובץ היחיד שמחזיק אותו** — ⚠️ כל העותקים של סכימה אחת הם
   מקומות רבים להתיישן, ⭐ והקובץ נחתם ומושווה בית-לבית בין כל הריפו.
   ──────────────────────────────────────────────────────────────────────── */

export const DB_SCHEMA = [
    { p: 'shared', t: 'ya_settings_rishon',        c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'shared', t: 'ya_settings_ramataviv',     c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'shared', t: 'sl_settings',      c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'shared', t: 'hr_settings',      c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'shared', t: 'sl_lists',         c: 'category,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'shared', t: 'ya_entries',       c: 'client_id,yeshiva,rec_key,updated_at,deleted,data,synced_at,archived,gdate,deleted_at,deleted_by' },
    { p: 'shared', t: 'sl_students',      c: 'name,active,card_settings,created_at,deleted,deleted_at,deleted_by,start_month,end_month,client_id,updated_at' },
    { p: 'shared', t: 'sl_transactions',  c: 'date,amount,payment_method,note,created_at,deleted,deleted_at,deleted_by,created_by,client_id,updated_at,student_client_id' },
    { p: 'shared', t: 'sl_users',         c: 'client_id,username,full_name,role,active,created_at,updated_at,pass_salt,pass_fp' },
    { p: 'shared', t: 'hr_users',         c: 'client_id,username,full_name,role,active,created_at,updated_at,pass_salt,pass_fp' },
    { p: 'shared', t: 'hr_sessions',      c: 'client_id,session,date_iso,date_heb,filled_by,filled_by_name,created_at,created_by,deleted_by,open,deleted,updated_at,synced_at,deleted_at' },
    { p: 'shared', t: 'hr_sleep_sessions', c: 'client_id,session,date_iso,date_heb,filled_by,filled_by_name,created_at,created_by,deleted_by,open,deleted,updated_at,synced_at,deleted_at' },
    { p: 'shared', t: 'hr_marks',         c: 'client_id,session_client_id,student_id,date_iso,status,minutes,deleted,updated_at,synced_at,deleted_at,deleted_by' },
    { p: 'shared', t: 'hr_sleep_marks',   c: 'client_id,session_client_id,student_id,date_iso,status,minutes,note,deleted,updated_at,synced_at,deleted_at,deleted_by' },
    { p: 'shared', t: 'hr_students_rows', c: 'client_id,student_id,updated_at,deleted,data,synced_at,deleted_at,deleted_by' },
    { p: 'shared', t: 'sh_backup',        c: 'id,created_at,key,value' },
    { p: 'shared', t: 'sh_sync_log',         c: 'id,created_at,device_id,user_name,action,key,record_count,details' },
    { p: 'gius',   t: 'g_settings',       c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'gius',   t: 'g_donors',         c: 'client_id,name,phone,agent,is_vip,notes,tags,deleted,deleted_at,created_at,updated_at,deleted_by' },
    { p: 'gius',   t: 'g_pledges',        c: 'client_id,donor_client_id,amount,cause,agent,note,due_date,deleted,deleted_at,created_at,updated_at,deleted_by' },
    { p: 'gius',   t: 'g_txns',           c: 'client_id,donor_client_id,pledge_client_id,amount,txn_date,category,agent,manager,cleared,note,deleted,deleted_at,created_at,updated_at,deleted_by' },
    { p: 'gius',   t: 'g_tasks',          c: 'client_id,title,stage,assignee,domain,due_date,log,deleted,deleted_at,created_at,updated_at,deleted_by' },
    { p: 'gius',   t: 'g_targets',        c: 'client_id,month,amount,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'gius',   t: 'g_users',          c: 'client_id,username,full_name,role,active,created_at,updated_at,pass_salt,pass_fp' },
    { p: 'gius',   t: 'sh_backup',        c: 'id,created_at,key,value' },
    { p: 'gius',   t: 'sh_sync_log',         c: 'id,created_at,device_id,user_name,action,key,record_count,details' },
    { p: 'kupa',   t: 'k_settings',        c: 'key,value,updated_at,client_id,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'k_pledges',         c: 'client_id,hebrew_year,pledge,chumash_opening_balance,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'k_standing_orders', c: 'client_id,name,amount,day_of_month,method,category,active,valid_from_month,valid_to_month,supersedes_id,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'k_so_instances',    c: 'client_id,standing_order_client_id,month_key,amount,status,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'k_entries',         c: 'client_id,type,amount,description,entry_date,method,category,source,verified,so_instance_client_id,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'k_lookups',         c: 'client_id,kind,label,sort,created_at,updated_at,deleted,deleted_at,deleted_by' },
    { p: 'kupa',   t: 'sh_backup',        c: 'id,created_at,key,value' },
    { p: 'kupa',   t: 'sh_sync_log',         c: 'id,created_at,device_id,user_name,action,key,record_count,details' },];
