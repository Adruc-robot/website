module.exports = {
  name: "011_create_recipes",

  async up(db) {
    await db.query(`
      -- ============================================================
      -- Recipes
      -- ============================================================

      CREATE TABLE recipes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT NOT NULL,

          title VARCHAR(255) NOT NULL,
          description TEXT NULL,

          servings DECIMAL(8,2) NULL,
          prep_minutes INT UNSIGNED NULL,
          cook_minutes INT UNSIGNED NULL,

          notes TEXT NULL,

          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,

          PRIMARY KEY (id),

          INDEX idx_recipes_user (user_id),
          INDEX idx_recipes_user_title (user_id, title),

          CONSTRAINT fk_recipes_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE
      );
    `);
  },
};
