module.exports = {
  name: "008_create_lookup_lists",

  async up(db) {
    await db.query(`
      CREATE TABLE lookup_lists (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

        name VARCHAR(50) NOT NULL,
        description TEXT NULL,

        active BOOLEAN NOT NULL DEFAULT TRUE,
        auto_sort BOOLEAN NOT NULL DEFAULT TRUE,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_lookup_lists_name (name)
      );
    `);
  },
};