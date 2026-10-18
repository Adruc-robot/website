
const db = require("../services/db");

//
// List ingredients for a recipe
//
async function all(recipeId) {
  const [rows] = await db.query(`
    SELECT
      ri.id,
      ri.recipe_id,
      ri.ingredient_id,
      ri.quantity,
      ri.unit_id,
      ri.preparation,
      ri.sort_order,
      i.name AS ingredient_name,
      u.name AS unit_name,
      u.abbreviation AS unit_abbreviation
    FROM recipe_ingredients ri
    JOIN ingredients i
      ON i.id = ri.ingredient_id
    LEFT JOIN units u
      ON u.id = ri.unit_id
    WHERE ri.recipe_id = ?
    ORDER BY ri.sort_order, ri.id
  `, [recipeId]);

  return rows;
}

//
// Add an ingredient to a recipe
//
async function create(recipeId, ingredient) {
  const [result] = await db.query(`
    INSERT INTO recipe_ingredients (
      recipe_id,
      ingredient_id,
      quantity,
      unit_id,
      preparation,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    recipeId,
    ingredient.ingredient_id,
    ingredient.quantity ?? null,
    ingredient.unit_id ?? null,
    ingredient.preparation || null,
    ingredient.sort_order ?? 0,
  ]);

  return result;
}

//
// Update a recipe ingredient
//
async function update(recipeId, id, ingredient) {
  const [result] = await db.query(`
    UPDATE recipe_ingredients
    SET
      ingredient_id = ?,
      quantity = ?,
      unit_id = ?,
      preparation = ?,
      sort_order = ?
    WHERE id = ?
      AND recipe_id = ?
  `, [
    ingredient.ingredient_id,
    ingredient.quantity ?? null,
    ingredient.unit_id ?? null,
    ingredient.preparation || null,
    ingredient.sort_order ?? 0,
    id,
    recipeId,
  ]);

  return result.affectedRows > 0;
}

//
// Remove a recipe ingredient
//
async function remove(recipeId, id) {
  const [result] = await db.query(`
    DELETE FROM recipe_ingredients
    WHERE id = ?
      AND recipe_id = ?
  `, [id, recipeId]);

  return result.affectedRows > 0;
}

module.exports = {
  all,
  create,
  update,
  remove,
};
