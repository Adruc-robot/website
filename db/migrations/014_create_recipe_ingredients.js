module.exports = {
  name: "014_create_recipe_ingredients",

  async up(db) {
    await db.query(`
      -- ============================================================
      -- Recipe ingredients
      -- ============================================================

      CREATE TABLE recipe_ingredients (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

          recipe_id BIGINT UNSIGNED NOT NULL,
          ingredient_id BIGINT UNSIGNED NOT NULL,

          quantity DECIMAL(10,3) NULL,
          unit_id BIGINT UNSIGNED NULL,

          preparation VARCHAR(255) NULL,
          sort_order INT UNSIGNED NOT NULL DEFAULT 0,

          PRIMARY KEY (id),

          INDEX idx_recipe_ingredients_recipe (recipe_id),
          INDEX idx_recipe_ingredients_ingredient (ingredient_id),
          INDEX idx_recipe_ingredients_unit (unit_id),

          CONSTRAINT fk_recipe_ingredients_recipe
              FOREIGN KEY (recipe_id)
              REFERENCES recipes(id)
              ON DELETE CASCADE,

          CONSTRAINT fk_recipe_ingredients_ingredient
              FOREIGN KEY (ingredient_id)
              REFERENCES ingredients(id)
              ON DELETE RESTRICT,

          CONSTRAINT fk_recipe_ingredients_unit
              FOREIGN KEY (unit_id)
              REFERENCES units(id)
              ON DELETE RESTRICT
      );
    `);
  },
};