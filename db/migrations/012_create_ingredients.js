module.exports = {
  name: "012_create_ingredients",

  async up(db) {
    await db.query(`
      -- ============================================================
      -- Ingredients
      -- ============================================================

      CREATE TABLE ingredients (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,

          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,

          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          PRIMARY KEY (id),

          UNIQUE KEY uq_ingredients_user_name (user_id, name),
          INDEX idx_ingredients_user_active (user_id, active),

          CONSTRAINT fk_ingredients_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE
      );
    `);
  },
};