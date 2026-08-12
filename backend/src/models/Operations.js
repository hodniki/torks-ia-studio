const db=require('../config/database');
class Operations{
 static async ticket(data){const id=db.uuid();await db.query(`INSERT INTO support_tickets(id,user_id,name,email,category,subject,message)VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,data.userId||null,data.name,data.email,data.category,data.subject,data.message]);return(await db.query(`SELECT id,status,created_at AS "createdAt" FROM support_tickets WHERE id=$1`,[id])).rows[0]}
 static async tickets(){return(await db.query(`SELECT t.id,t.name,t.email,t.category,t.subject,t.status,t.created_at AS "createdAt",u.id AS "userId" FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`)).rows}
 static async updateTicket(id,status){await db.query(`UPDATE support_tickets SET status=$2 WHERE id=$1`,[id,status]);return(await db.query('SELECT id,status FROM support_tickets WHERE id=$1',[id])).rows[0]||null}
 static async error(data){await db.query(`INSERT INTO error_events(id,request_id,user_id,method,path,status,message,stack,ip_address,user_agent)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[db.uuid(),data.requestId,data.userId||null,data.method,data.path,data.status,data.message,data.stack||null,data.ipAddress||null,data.userAgent||null])}
 static async errors(){return(await db.query(`SELECT id,request_id AS "requestId",method,path,status,message,created_at AS "createdAt" FROM error_events ORDER BY created_at DESC LIMIT 200`)).rows}
}
module.exports=Operations;
