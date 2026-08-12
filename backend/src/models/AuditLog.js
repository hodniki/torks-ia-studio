const db=require('../config/database');
class AuditLog{
 static async create({userId,action,details,ipAddress}){await db.query('INSERT INTO logs(id,user_id,level,action,details,ip_address)VALUES($1,$2,$3,$4,$5,$6)',[db.uuid(),userId,'audit',action,details||{},ipAddress||null])}
 static async list(limit=100){const{rows}=await db.query(`SELECT l.id,l.action,l.details,l.ip_address AS "ipAddress",l.created_at AS "createdAt",u.name,u.email FROM logs l LEFT JOIN users u ON u.id=l.user_id WHERE l.level='audit' ORDER BY l.created_at DESC LIMIT $1`,[limit]);return rows}
}
module.exports=AuditLog;
