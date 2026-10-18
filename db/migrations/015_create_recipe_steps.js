module.exports = {
  name: "015_create_recipe_steps",

  async up(db) {
    await db.query(`
      -- ============================================================
      -- Recipe steps
      -- ============================================================

      CREATE TABLE recipe_steps (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

          recipe_id BIGINT UNSIGNED NOT NULL,
          step_number INT UNSIGNED NOT NULL,
          instruction TEXT NOT NULL,

          PRIMARY KEY (id),

          UNIQUE KEY uq_recipe_steps_number (recipe_id, step_number),
          INDEX idx_recipe_steps_recipe (recipe_id),

          CONSTRAINT fk_recipe_steps_recipe
              FOREIGN KEY (recipe_id)
              REFERENCES recipes(id)
              ON DELETE CASCADE
      );
    `);
  },
};