
module.exports = {
  name: "002_ingredients",

  async up(db) {
    const GLOBAL_USER_ID = 1;

    const ingredients = [
      ["All-Purpose Flour", "General-purpose wheat flour"],
      ["Baking Powder", "Chemical leavening agent"],
      ["Baking Soda", "Sodium bicarbonate"],
      ["Black Pepper", "Ground black pepper"],
      ["Brown Sugar", "Brown sugar"],
      ["Butter", "Unsalted butter"],
      ["Cinnamon", "Ground cinnamon"],
      ["Egg", "Chicken egg"],
      ["Garlic", "Fresh garlic"],
      ["Garlic Powder", "Dried ground garlic"],
      ["Granulated Sugar", "White granulated sugar"],
      ["Honey", "Honey"],
      ["Milk", "Whole milk"],
      ["Olive Oil", "Olive oil"],
      ["Onion", "Fresh onion"],
      ["Onion Powder", "Dried ground onion"],
      ["Paprika", "Ground paprika"],
      ["Salt", "Table salt"],
      ["Vanilla Extract", "Vanilla extract"],
      ["Vegetable Oil", "Neutral cooking oil"],
      ["Water", "Water"],
      ["Yeast", "Active dry yeast"],
    ];

    const sql = `
      INSERT INTO ingredients (
        user_id,
        name,
        description,
        active
      )
      VALUES (?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        description = VALUES(description)
    `;

    for (const [name, description] of ingredients) {
      await db.query(sql, [
        GLOBAL_USER_ID,
        name,
        description,
      ]);
    }

    console.log(`  Seeded ${ingredients.length} ingredients.`);
  },
};
