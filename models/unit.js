
const db = require("../services/db");

const GLOBAL_USER_ID = 1;

//
// List global and user-owned units
//
async function all(userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM units
    WHERE user_id IN (?, ?)
    ORDER BY measurement_type, display_priority, name
  `, [GLOBAL_USER_ID, userId]);

  return rows;
}

//
// List active units for recipe builder
//
async function allActive(userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM units
    WHERE user_id IN (?, ?)
      AND active = 1
    ORDER BY measurement_type, display_priority, name
  `, [GLOBAL_USER_ID, userId]);

  return rows;
}

//
// Find by ID, restricted to visible units
//
async function find(id, userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM units
    WHERE id = ?
      AND user_id IN (?, ?)
  `, [id, GLOBAL_USER_ID, userId]);

  return rows[0] || null;
}

//
// Create a unit
//
async function create(unit, ownerId) {
  const [result] = await db.query(`
    INSERT INTO units (
      user_id,
      name,
      abbreviation,
      active,
      measurement_type,
      measurement_system,
      to_base_factor,
      auto_convert,
      display_priority
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    ownerId,
    unit.name,
    unit.abbreviation || null,
    unit.active ?? 1,
    unit.measurement_type || "other",
    unit.measurement_system || "universal",
    unit.to_base_factor ?? null,
    unit.auto_convert ?? 1,
    unit.display_priority ?? 100,
  ]);

  return find(result.insertId, ownerId);
}

//
// Update a unit owned by the specified user
//
async function update(id, unit, ownerId) {
  const [result] = await db.query(`
    UPDATE units
    SET
      name = ?,
      abbreviation = ?,
      active = ?,
      measurement_type = ?,
      measurement_system = ?,
      to_base_factor = ?,
      auto_convert = ?,
      display_priority = ?
    WHERE id = ?
      AND user_id = ?
  `, [
    unit.name,
    unit.abbreviation || null,
    unit.active ?? 1,
    unit.measurement_type || "other",
    unit.measurement_system || "universal",
    unit.to_base_factor ?? null,
    unit.auto_convert ?? 1,
    unit.display_priority ?? 100,
    id,
    ownerId,
  ]);

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await db.query(`
    SELECT *
    FROM units
    WHERE id = ?
      AND user_id = ?
  `, [id, ownerId]);

  return rows[0] || null;
}

//
// Find by name within a user's own units
//
async function findByName(name, userId) {
  const [rows] = await db.query(`
    SELECT *
    FROM units
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
