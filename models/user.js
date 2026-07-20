const db = require("../services/db");

async function all() {
  const [rows] = await db.query(`
    SELECT id, alias, email, role, created_at
    FROM users
    ORDER BY alias, email
  `);

  return rows;
}

async function find(id) {
  const [rows] = await db.query(
    `
    SELECT id, alias, email, role, created_at
    FROM users
    WHERE id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await db.query(
    `
    SELECT id, alias, email, password_hash, role, created_at
    FROM users
    WHERE email = ?
    `,
    [email]
  );

  return rows[0] || null;
}

async function create(user) {
  if (user.role) {
    const [result] = await db.query(
      `
      INSERT INTO users (alias, email, password_hash, role)
      VALUES (?, ?, ?, ?)
      `,
      [
        user.alias || null,
        user.email,
        user.password_hash,
        user.role,
      ]
    );

    return find(result.insertId);
  }

  const [result] = await db.query(
    `
    INSERT INTO users (alias, email, password_hash)
    VALUES (?, ?, ?)
    `,
    [
      user.alias || null,
      user.email,
      user.password_hash,
    ]
  );

  return find(result.insertId);
}

async function update(id, user) {
  await db.query(
    `
    UPDATE users
    SET alias = ?,
        email = ?,
        role = ?
    WHERE id = ?
    `,
    [
      user.alias || null,
      user.email,
      user.role || "user",
      id,
    ]
  );

  return find(id);
}

module.exports = {
  all,
  find,
  findByEmail,
  create,
  update,
};