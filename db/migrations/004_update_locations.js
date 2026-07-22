module.exports = {
  name: "004_update_locations",

  async up(db) {
    await db.query(`
      ALTER TABLE locations
      MODIFY COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
    `);

    await db.query(`
      ALTER TABLE locations
      ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
  },
};