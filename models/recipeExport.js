
const db = require("../services/db");

async function getExportData(recipeId) {
  // Get the recipe and its UUID.
  const [recipes] = await db.query(`
    SELECT
      uuid,
      title,
      description,
      servings,
      prep_minutes,
      cook_minutes,
      notes
    FROM recipes
    WHERE id = ?
      AND user_id = 1
    LIMIT 1
  `, [recipeId]);

  if (recipes.length === 0) {
    return null;
  }

  // Get ingredients and their unit definitions.

  const [ingredients] = await db.query(`
    SELECT
      i.name AS ingredient_name,
      i.description AS ingredient_description,
      ri.quantity,
      ri.preparation,
      ri.sort_order,
      u.name AS unit_name,
      u.abbreviation AS unit_abbreviation,
      u.measurement_type AS unit_measurement_type,
      u.measurement_system AS unit_measurement_system,
      u.to_base_factor AS unit_to_base_factor,
      u.auto_convert AS unit_auto_convert,
      u.display_priority AS unit_display_priority

    FROM recipe_ingredients ri

    JOIN ingredients i
      ON i.id = ri.ingredient_id

    LEFT JOIN units u
      ON u.id = ri.unit_id

    WHERE ri.recipe_id = ?

    ORDER BY ri.sort_order, ri.id
  `, [recipeId]);


  // Get cooking instructions.
  const [steps] = await db.query(`
    SELECT
      step_number,
      instruction
    FROM recipe_steps
    WHERE recipe_id = ?
    ORDER BY step_number
  `, [recipeId]);

  return {
    formatVersion: 1,
    recipe: recipes[0],
    ingredients,
    steps
  };
}

module.exports = {
  getExportData
};
