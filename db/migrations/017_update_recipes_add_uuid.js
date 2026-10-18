module.exports = {
  name: "add UUID field to recipes table and create UUID for all recipes",

  async up(db) {
    // 1. Add the UUID column, initially nullable.
    await db.query(`
      ALTER TABLE recipes
        ADD COLUMN UUID CHAR(36) NULL
    `);
    // 2. Generate a UUID for each existing recipe.
    await db.query(`
      UPDATE recipes
      SET uuid = UUID()
      WHERE uuid IS NULL
    `);

    // 3. Make UUID required and enforce uniqueness.
    await db.query(`
      ALTER TABLE recipes
        MODIFY COLUMN uuid CHAR(36) NOT NULL,
        ADD UNIQUE KEY uq_recipes_uuid (uuid)
    `);
  },
};