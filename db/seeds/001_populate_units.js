
module.exports = {
  name: "001_units",

  async up(db) {
    const GLOBAL_USER_ID = 1;

    const units = [
      // US customary volume
      ["Teaspoon", "tsp", "volume", "imperial", 4.9289215938, 1, 10],
      ["Tablespoon", "tbsp", "volume", "imperial", 14.7867647813, 1, 20],
      ["Fluid ounce", "fl oz", "volume", "imperial", 29.5735295625, 1, 40],
      ["Cup", "cup", "volume", "imperial", 236.5882365, 1, 10],
      ["Pint", "pt", "volume", "imperial", 473.176473, 1, 30],
      ["Quart", "qt", "volume", "imperial", 946.352946, 1, 30],
      ["Gallon", "gal", "volume", "imperial", 3785.411784, 1, 30],

      // US customary weight
      ["Ounce", "oz", "weight", "imperial", 28.349523125, 1, 10],
      ["Pound", "lb", "weight", "imperial", 453.59237, 1, 10],

      // Metric volume
      ["Milliliter", "mL", "volume", "metric", 1, 1, 10],
      ["Liter", "L", "volume", "metric", 1000, 1, 10],

      // Metric weight
      ["Milligram", "mg", "weight", "metric", 0.001, 1, 20],
      ["Gram", "g", "weight", "metric", 1, 1, 10],
      ["Kilogram", "kg", "weight", "metric", 1000, 1, 10],

      // Universal
      ["Each", "each", "count", "universal", 1, 0, 100],
      ["Dozen", "doz", "count", "universal", 12, 0, 100],
      ["Pinch", "pinch", "other", "universal", null, 0, 100],
      ["Dash", "dash", "other", "universal", null, 0, 100],
      ["Clove", "clove", "other", "universal", null, 0, 100],
      ["Can", "can", "other", "universal", null, 0, 100],
      ["Package", "pkg", "other", "universal", null, 0, 100],
      ["Bunch", "bunch", "other", "universal", null, 0, 100],
      ["Slice", "slice", "other", "universal", null, 0, 100],
      ["Sprig", "sprig", "other", "universal", null, 0, 100]
    ];

    const [users] = await db.query(
      "SELECT id FROM users WHERE id = ?",
      [GLOBAL_USER_ID]
    );

    if (users.length === 0) {
      throw new Error("Global user 1 does not exist.");
    }

    const sql = `
      INSERT INTO units (
        user_id,
        name,
        abbreviation,
        measurement_type,
        measurement_system,
        to_base_factor,
        auto_convert,
        display_priority
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        abbreviation = VALUES(abbreviation),
        measurement_type = VALUES(measurement_type),
        measurement_system = VALUES(measurement_system),
        to_base_factor = VALUES(to_base_factor),
        auto_convert = VALUES(auto_convert),
        display_priority = VALUES(display_priority)
    `;

    for (const unit of units) {
      await db.query(sql, [GLOBAL_USER_ID, ...unit]);
    }

    console.log(`  Seeded ${units.length} units.`);
  }
};
