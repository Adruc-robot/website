
const db = require("../services/db");

const GLOBAL_USER_ID = 1;

//
// List global and user-owned ingredients
//
async function all(userId) {
  const [rows] = await db.query(`
    SELECT
      id,
      user_id,
      name,
      description,
      active,
      created_at
    FROM ingredients
    WHERE user_id IN (?, ?)
    ORDER BY name, user_id
  `, [GLOBAL_USER_ID, userId]);

  return rows;
}

//
// List active ingredients for recipe builder
//
async function allActive(userId) {
  const [rows] = await db.query(`
    SELECT
      id,
      user_id,
      name,
      description
    FROM ingredients
    WHERE user_id IN (?, ?)
      AND active = 1
    ORDER BY name, user_id
  `, [GLOBAL_USER_ID, userId]);

  return rows;
}

//
// Find by ID, restricted to visible ingredients
//
async function find(id, userId) {
  const [rows] = await db.query(`
    SELECT
      id,
      user_id,
      name,
      description,
      active,
      created_at
    FROM ingredients
    WHERE id = ?
      AND user_id IN (?, ?)
  `, [id, GLOBAL_USER_ID, userId]);

  return rows[0] || null;
}

//
// Create a user-owned ingredient
//
async function create(ingredient, userId) {
  const [result] = await db.query(`
    INSERT INTO ingredients (
      user_id,
      name,
      description,
      active
    )
    VALUES (?, ?, ?, ?)
  `, [
    userId,
    ingredient.name,
    ingredient.description || null,
    ingredient.active ?? 1,
  ]);

  return find(result.insertId, userId);
}


//
// Update an ingredient owned by the specified user
//
async function update(id, ingredient, ownerId) {
  const [result] = await db.query(`
    UPDATE ingredients
    SET
      name = ?,
      description = ?,
      active = ?
    WHERE id = ?
      AND user_id = ?
  `, [
    ingredient.name,
    ingredient.description || null,
    ingredient.active ?? 1,
    id,
    ownerId,
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await db.query(`
    SELECT *
    FROM ingredients
    WHERE id = ?
      AND user_id = ?
  `, [id, ownerId]);

  return rows[0] || null;
}


//
// Find by name within user's own ingredients
//
async function findByName(name, userId) {
  const [rows] = await db.query(`
    SELECT
      id,
      user_id,
      name,
      description,
      active,
      created_at
    FROM ingredients
    WHERE name = ?
      AND user_id = ?
    LIMIT 1
  `, [name, userId]);

  return rows[0] || null;
}

module.exports = {
  all,
  allActive,
  find,
  create,
  update,
  findByName,
};
