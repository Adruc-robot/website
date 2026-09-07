module.exports = {
  name: "010_add_file_has_to_images",

  async up(db) {
    await db.query(`
      ALTER TABLE images
      ADD COLUMN file_hash CHAR(64) NULL;
    `);
    await db.query(`
      CREATE UNIQUE INDEX uq_images_file_hash
      ON images (file_hash);
    `);
  },
};