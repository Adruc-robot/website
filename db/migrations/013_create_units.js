module.exports = {
  name: "013_create_units",

  async up(db) {
    await db.query(`
      -- ============================================================
      -- Units of measure
      -- ============================================================

      CREATE TABLE units (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,

          name VARCHAR(100) NOT NULL,
          abbreviation VARCHAR(30) NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,

          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (id),

          UNIQUE KEY uq_units_user_name (user_id, name),
          INDEX idx_units_user_active (user_id, active),

          CONSTRAINT fk_units_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE
      );
    `);
  },
};