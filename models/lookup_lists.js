const db = require("../services/db");

//
// List all lookup lists
//
async function all() {
  const [rows] = await db.query(`
    SELECT *
    FROM lookup_lists
    ORDER BY id
  `);

  return rows;
}

//
// Find by ID
//
async function find(id) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM lookup_lists
      WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

//
// Find by name
//
async function findByName(name) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM lookup_lists
      WHERE name = ?
    `,
    [name]
  );

  return rows[0] || null;
}

//
// Create
//
async function create(lookupList) {
  const [result] = await db.query(
    `
      INSERT INTO lookup_lists (
        name,
        description,
        active,
        auto_sort
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      lookupList.name,
      lookupList.description ?? null,
      lookupList.active ?? true,
      lookupList.auto_sort ?? true,
    ]
  );

  return find(result.insertId);
}

//
// Update
//
async function update(id, lookupList) {
  await db.query(
    `
      UPDATE lookup_lists
      SET
        name = ?,
        description = ?,
        active = ?,
        auto_sort = ?
      WHERE id = ?
    `,
    [
      lookupList.name,
      lookupList.description ?? null,
      lookupList.active,
      lookupList.auto_sort,
      id,
    ]
  );

  return find(id);
}

//
// Delete
//
async function remove(id) {
  const [result] = await db.query(
    `
      DELETE
      FROM lookup_lists
      WHERE id = ?
    `,
    [id]
  );

  return result.affectedRows > 0;
}

module.exports = {
  all,
  find,
  findByName,
  create,
  update,
  remove,
};