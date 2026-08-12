const db = require('../config/database');
class Template {
  static async list() {
    const { rows } = await db.query(`SELECT id, name, description, thumbnail_url AS "thumbnailUrl", config, active, created_at AS "createdAt", updated_at AS "updatedAt" FROM templates WHERE active = TRUE ORDER BY name`);
    return rows;
  }
}
module.exports = Template;
