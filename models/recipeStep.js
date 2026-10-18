
const db = require("../services/db");

//
// List all steps for a recipe
//
async function all(recipeId) {
  const [rows] = await db.query(`
    SELECT
      id,
      recipe_id,
      step_number,
      instruction
    FROM recipe_steps
    WHERE recipe_id = ?
    ORDER BY step_number
  `, [recipeId]);

  return rows;
}

//
// Find a specific step
//
async function find(recipeId, id) {
  const [rows] = await db.query(`
    SELECT
      id,
      recipe_id,
      step_number,
      instruction
    FROM recipe_steps
    WHERE recipe_id = ?
      AND id = ?
    LIMIT 1
  `, [recipeId, id]);

  return rows[0] || null;
}

//
// Add a step to a recipe
//
async function create(recipeId, step) {
  const [result] = await db.query(`
    INSERT INTO recipe_steps (
      recipe_id,
      step_number,
      instruction
    )
    VALUES (?, ?, ?)
  `, [
    recipeId,
    step.step_number,
    step.instruction,
  ]);

  return result.insertId;
}

//
// Update an existing step
//
async function update(recipeId, id, step) {
  const [result] = await db.query(`
    UPDATE recipe_steps
    SET
      step_number = ?,
      instruction = ?
    WHERE id = ?
      AND recipe_id = ?
  `, [
    step.step_number,
    step.instruction,
    id,
    recipeId,
  ]);

  return result.affectedRows > 0;
}

//
// Remove a step from a recipe
//
async function remove(recipeId, id) {
  const [result] = await db.query(`
    DELETE FROM recipe_steps
    WHERE id = ?
      AND recipe_id = ?
  `, [id, recipeId]);

  return result.affectedRows > 0;
}


//
// Move a recipe step up or down one position
//
async function move(recipeId, stepId, direction) {
  if (!["up", "down"].includes(direction)) {
    return false;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    //
    // Lock all steps for this recipe while reordering
    //
    const [steps] = await connection.query(`
      SELECT id, step_number
      FROM recipe_steps
      WHERE recipe_id = ?
      ORDER BY step_number
      FOR UPDATE
    `, [recipeId]);

    const index = steps.findIndex(
      step => Number(step.id) === Number(stepId)
    );

    if (index === -1) {
      await connection.rollback();
      return false;
    }

    //
    // Find the neighboring step
    //
    const neighborIndex =
      direction === "up" ? index - 1 : index + 1;

    if (neighborIndex < 0 || neighborIndex >= steps.length) {
      await connection.rollback();
      return false;
    }

    const current = steps[index];
    const neighbor = steps[neighborIndex];

    //
    // Find an unused temporary step number
    //
    const maxNumber = Math.max(
      ...steps.map(step => Number(step.step_number))
    );

    if (maxNumber >= 4294967295) {
      throw new Error("No temporary step number available.");
    }

    const temporaryNumber = maxNumber + 1;

    //
    // Move current step to temporary number
    //
    await connection.query(`
      UPDATE recipe_steps
      SET step_number = ?
      WHERE id = ? AND recipe_id = ?
    `, [temporaryNumber, current.id, recipeId]);

    //
    // Move neighbor into current step's old number
    //
    await connection.query(`
      UPDATE recipe_steps
      SET step_number = ?
      WHERE id = ? AND recipe_id = ?
    `, [current.step_number, neighbor.id, recipeId]);

    //
    // Move current step into neighbor's old number
    //
    await connection.query(`
      UPDATE recipe_steps
      SET step_number = ?
      WHERE id = ? AND recipe_id = ?
    `, [neighbor.step_number, current.id, recipeId]);

    await connection.commit();
    return true;

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

module.exports = {
  all,
  find,
  create,
  update,
  remove,
  move,
};
