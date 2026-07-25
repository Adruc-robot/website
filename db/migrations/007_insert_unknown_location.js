module.exports = {
  name: "007_insert_unknown_location",

  async up(db) {
    await db.query(`
      INSERT INTO locations (
        name,
        description,
        active
      )
      SELECT
        'Unknown',
        'Used when location unknown',
        TRUE
      WHERE NOT EXISTS (
        SELECT 1
        FROM locations
        WHERE name = 'Unknown'
      );
    `);
  },
};