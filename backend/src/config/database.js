const mysql = require('mysql2/promise');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('Configure DATABASE_URL ou DB_HOST, DB_NAME, DB_USER e DB_PASSWORD.');
}

const common = {
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_MAX || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
};

const pool = process.env.DATABASE_URL
  ? mysql.createPool({ uri: process.env.DATABASE_URL, ...common })
  : mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, ...common });

function compile(text, params = []) {
  const values = [];
  const source = String(text)
    .replace(/::(?:int|bigint|text|uuid|date|jsonb)(?:\[\])?/gi, '')
    .replace(/\bAS\s+"([A-Za-z][A-Za-z0-9_]*)"/gi, 'AS `$1`')
    .replace(/\b([a-z_][a-z0-9_.]*)\s*"([A-Za-z][A-Za-z0-9_]*)"/gi, '$1 AS `$2`')
    .replace(/\)\s*"([A-Za-z][A-Za-z0-9_]*)"/g, ') AS `$1`');
  const sql = source.replace(/\$(\d+)/g, (_match, number) => {
    const value=params[Number(number)-1];values.push(value&&typeof value==='object'&&!(value instanceof Date)&&!Buffer.isBuffer(value)?JSON.stringify(value):value);
    return '?';
  });
  return { sql, values: values.length ? values : params.map(value=>value&&typeof value==='object'&&!(value instanceof Date)&&!Buffer.isBuffer(value)?JSON.stringify(value):value) };
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    for (const [key, value] of Object.entries(row)) {
      if (Buffer.isBuffer(value)) row[key] = value.toString('utf8');
      if (typeof row[key] === 'string' && (row[key].startsWith('{') || row[key].startsWith('['))) {
        try { row[key] = JSON.parse(row[key]); } catch {}
      }
    }
    return row;
  });
}

function clientApi(connection) {
  return {
    async query(text, params) {
      const returning = String(text).match(/\s+RETURNING\s+([\s\S]+)$/i);
      if (returning) {
        const base = String(text).slice(0, returning.index).trim();
        const insert = base.match(/^INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)([\s\S]*)$/i);
        if (insert) {
          const id = randomUUID();
          const expanded = `INSERT INTO ${insert[1]} (id,${insert[2]}) VALUES ($0,${insert[3]})${insert[4]}`;
          const numbered = expanded.replace('$0', '?');
          const compiled = compile(numbered, params);
          await connection.execute(compiled.sql, [id, ...compiled.values]);
          const fields = compile(returning[1], []).sql;
          const [selected] = await connection.query(`SELECT ${fields} FROM ${insert[1]} WHERE id=?`, [id]);
          return { rows: normalizeRows(selected), rowCount: 1 };
        }
        const update = base.match(/^UPDATE\s+([a-z_][a-z0-9_]*)[\s\S]*?WHERE[\s\S]*?\bid\s*=\s*\$(\d+)/i);
        const compiled = compile(base, params);
        const [result] = await connection.execute(compiled.sql, compiled.values);
        if (update && result.affectedRows) {
          const id = params[Number(update[2]) - 1];
          const fields = compile(returning[1], []).sql;
          const [selected] = await connection.query(`SELECT ${fields} FROM ${update[1]} WHERE id=?`, [id]);
          return { rows: normalizeRows(selected), rowCount: selected.length };
        }
        return { rows: [], rowCount: Number(result.affectedRows || 0) };
      }
      const { sql, values } = compile(text, params);
      const [result] = await connection.execute(sql, values);
      return { rows: normalizeRows(result), rowCount: Array.isArray(result) ? result.length : Number(result.affectedRows || 0), insertId: result.insertId };
    },
  };
}

async function query(text, params) {
  return clientApi(pool).query(text, params);
}

async function initSchema() {
  const sql = await fs.readFile(path.join(__dirname, '../../sql/init.mysql.sql'), 'utf8');
  const connection = await pool.getConnection();
  try {
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(item => item.trim()).filter(Boolean)) await connection.query(statement);
  } finally { connection.release(); }
}

module.exports = {
  query,
  uuid: randomUUID,
  withTransaction: async callback => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(clientApi(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  },
  checkConnection: () => query('SELECT UTC_TIMESTAMP() AS now'),
  initSchema,
  close: () => pool.end(),
};
