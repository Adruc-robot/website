
const db = require("../services/db");
const GLOBAL_USER_ID = 1;
const { randomUUID } = require("crypto");

//
// List recipes belonging to the current user
//
async function all(userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM recipes
    WHERE user_id IN (?, ?)
    ORDER BY title
  `, [GLOBAL_USER_ID, userId]);

  return rows;
}

//
// Find a recipe belonging to the current user
//
async function find(id, userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM recipes
    WHERE id = ?
      AND user_id IN (?, ?)
  `, [id, GLOBAL_USER_ID, userId]);

  return rows[0] || null;
}

//
// Create a recipe
//
async function create(recipe, userId) {
  const [result] = await db.query(`
    INSERT INTO recipes (
      user_id,
      uuid,
      title,
      description,
      servings,
      prep_minutes,
      cook_minutes,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userId,
    randomUUID(),
    recipe.title,
    recipe.description || null,
    recipe.servings ?? null,
    recipe.prep_minutes ?? null,
    recipe.cook_minutes ?? null,
    recipe.notes || null,
  ]);

  return find(result.insertId, userId);
}

//
// Update a recipe
//
async function update(id, recipe, ownerId) {
  const [result] = await db.query(`
    UPDATE recipes
    SET
      title = ?,
      description = ?,
      servings = ?,
      prep_minutes = ?,
      cook_minutes = ?,
      notes = ?
    WHERE id = ?
      AND user_id = ?
  `, [
    recipe.title,
    recipe.description || null,
    recipe.servings ?? null,
    recipe.prep_minutes ?? null,
    recipe.cook_minutes ?? null,
    recipe.notes || null,
    id,
    ownerId,
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  return find(id, ownerId);
}

async function copyStockRecipe(recipeId, userId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Find the original stock recipe.
    const [recipes] = await connection.query(
      `SELECT *
       FROM recipes
       WHERE id = ? AND user_id = 1
       LIMIT 1`,
      [recipeId]
    );

    if (recipes.length === 0) {
      await connection.rollback();
      return null;
    }

    const original = recipes[0];

    // Create the user's personal copy.
    const [result] = await connection.query(
      `INSERT INTO recipes
        (
          user_id,
          uuid,
          title,
          description,
          servings,
          prep_minutes,
          cook_minutes,
          notes
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        randomUUID(),
        `${original.title.slice(original,248)} - Copy`,
        original.description,
        original.servings,
        original.prep_minutes,
        original.cook_minutes,
        original.notes
      ]
    );

    const newRecipeId = result.insertId;

    // Copy all ingredients, preserving their order.
    await connection.query(
      `INSERT INTO recipe_ingredients
        (recipe_id, ingredient_id, quantity,
         unit_id, preparation, sort_order)
       SELECT ?, ingredient_id, quantity,
              unit_id, preparation, sort_order
       FROM recipe_ingredients
       WHERE recipe_id = ?
       ORDER BY sort_order, id`,
      [newRecipeId, recipeId]
    );

    // Copy cooking instructions and step numbers.
    await connection.query(
      `INSERT INTO recipe_steps
        (recipe_id, step_number, instruction)
       SELECT ?, step_number, instruction
       FROM recipe_steps
       WHERE recipe_id = ?
       ORDER BY step_number`,
      [newRecipeId, recipeId]
    );

    await connection.commit();

    return newRecipeId;

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

//
// Update a recipe
//
async function remove(id, userId, isAdmin) {
  const [result] = await db.query(
    `DELETE FROM recipes
     WHERE id = ?
       AND (
         user_id = ?
         OR (? = 1 AND user_id = 1)
       )`,
    [id, userId, isAdmin ? 1 : 0]
  );

  return result.affectedRows > 0;
}

module.exports = {
  all,
  find,
  create,
  update,
  copyStockRecipe,
  remove,
};
