const db = require("../services/db");

//
// List
//
async function all() {
  const [rows] = await db.query(`
    SELECT *
    FROM table_name
    ORDER BY id
  `);

  return rows;
}

//
// Find by ID
//
async function find(id) {
  const [rows] = await db.query(`
    SELECT *
    FROM table_name
    WHERE id = ?
  `, [id]);

  return rows[0] || null;
}

//
// Create
//
async function create(item) {
  const [result] = await db.query(`
    INSERT INTO table_name (
      column1,
      column2
    )
    VALUES (?, ?)
  `, [
    item.column1,
    item.column2,
  ]);

  return find(result.insertId);
}

//
// Update
//
async function update(id, item) {
  await db.query(`
    UPDATE table_name
    SET
      column1 = ?,
      column2 = ?
    WHERE id = ?
  `, [
    item.column1,
    item.column2,
    id,
  ]);

  return find(id);
}

//
// Delete
//
async function remove(id) {
  await db.query(`
    DELETE
    FROM table_name
    WHERE id = ?
  `, [id]);
}

module.exports = {
  all,
  find,
  create,
  update,
  remove,
};