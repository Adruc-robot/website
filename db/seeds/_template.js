
module.exports = {
  name: "002_seed_ingredients",

  async up(db) {
    const GLOBAL_USER_ID = 1;

    // ============================================================
    // Seed data
    // ============================================================

    // Each array contains:
    // [name, description, active]

    const data = [
      ["Salt", "Common table salt", 1],
      ["Black Pepper", "Ground black pepper", 1],
      ["Sugar", "Granulated white sugar", 1],
      ["Flour", "All-purpose wheat flour", 1],
      ["Butter", "Unsalted butter", 1],
    ];

    // ============================================================
    // Insert data
    // ============================================================

    const sql = `
      INSERT INTO ingredients (
        user_id,
        name,
        description,
        active
      )
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        active = VALUES(active)
    `;

    for (const row of data) {
      await db.query(sql, [GLOBAL_USER_ID, ...row]);
    }

    console.log(`  Seeded ${data.length} ingredients.`);
  },
};
