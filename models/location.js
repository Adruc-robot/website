const db = require("../services/db");

async function all() {
  const [rows] = await db.query(`
    SELECT id, name, description, active, latitude, longitude, created_at, updated_at
    FROM locations
    ORDER BY name
  `);

  return rows;
}

async function find(id) {
  const [rows] = await db.query(
    `
    SELECT id, name, description, active, latitude, longitude, created_at, updated_at
    FROM locations
    WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

async function create(location) {
  const [result] = await db.query(
    `
    INSERT INTO locations (name, description, active, latitude, longitude)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      location.name,
      location.description || null,
      location.active,
      location.latitude || null,
      location.longitude || null,
    ]
  );

  return find(result.insertId);
}

async function update(id, location) {
  await db.query(
    `
    UPDATE locations
    SET name = ?,
        description = ?,
        active = ?,
        latitude = ?,
        longitude = ?
    WHERE id = ?
    `,
    [
      location.name,
      location.description || null,
      location.active,
      location.latitude || null,
      location.longitude || null,
      id,
    ]
  );

  return find(id);
}

//
// find by name
//
async function findByName(name) {
  const [rows] = await db.query(
    `
      SELECT *
      FROM locations
      WHERE name = ?
      LIMIT 1
    `,
    [name]
  );

  return rows[0] || null;
}

module.exports = {
  all,
  find,
  create,
  update,
  findByName,
};