
const db = require("../services/db");

/**
 * Find an existing recipe by its UUID.
 *
 * Returns the recipe if found, otherwise null.
 */
async function findByUuid(uuid) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        uuid,
        user_id,
        title
      FROM recipes
      WHERE uuid = ?
      LIMIT 1
    `,
    [uuid]
  );

  return rows[0] || null;
}

async function insertImportedRecipe(connection, recipe) {
  const [result] = await connection.query(
    `
      INSERT INTO recipes (
        uuid,
        user_id,
        title,
        description,
        servings,
        prep_minutes,
        cook_minutes,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      recipe.uuid,
      1, // System user: all imported recipes are global
      recipe.title,
      recipe.description ?? null,
      recipe.servings ?? null,
      recipe.prep_minutes ?? null,
      recipe.cook_minutes ?? null,
      recipe.notes ?? null
    ]
  );

  return result.insertId;
}

async function findGlobalIngredient(connection, ingredientName) {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        name,
        description
      FROM ingredients
      WHERE user_id = 1
        AND LOWER(name) = LOWER(?)
      ORDER BY id
      LIMIT 1
    `,
    [ingredientName.trim()]
  );

  return rows[0] || null;
}

async function insertGlobalIngredient(connection, ingredient) {
  const [result] = await connection.query(
    `
      INSERT INTO ingredients (
        user_id,
        name,
        description,
        active
      )
      VALUES (1, ?, ?, 1)
    `,
    [
      ingredient.ingredient_name.trim(),
      ingredient.ingredient_description ?? null
    ]
  );

  return result.insertId;
}

async function findGlobalUnit(connection, unit) {
  if (!unit.unit_name) {
    return null;
  }

  const [rows] = await connection.query(
    `
      SELECT
        id,
        name,
        abbreviation,
        measurement_type,
        measurement_system,
        to_base_factor,
        auto_convert,
        display_priority
      FROM units
      WHERE user_id = 1
        AND LOWER(name) = LOWER(?)
      ORDER BY id
    `,
    [unit.unit_name.trim()]
  );

  if (rows.length > 1) {
    throw new Error(
      `Multiple global units found with name "${unit.unit_name}".`
    );
  }

  if (!rows.length) {
    return null;
  }

  const existing = rows[0];

  if (
    existing.measurement_type !== unit.unit_measurement_type ||
    existing.measurement_system !== unit.unit_measurement_system ||
    (
      existing.to_base_factor === null
        ? unit.unit_to_base_factor !== null
        : Number(existing.to_base_factor) !==
          Number(unit.unit_to_base_factor)
    ) ||
    Number(existing.auto_convert) !==
      Number(unit.unit_auto_convert)
  ) {
    throw new Error(
      `Global unit "${unit.unit_name}" exists but has a different conversion definition.`
    );
  }

  return existing;
}

async function insertGlobalUnit(connection, unit) {
  if (!unit.unit_name || !unit.unit_name.trim()) {
    throw new Error("Cannot create a unit without a name.");
  }

  const [result] = await connection.query(
    `
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
      VALUES (1, ?, ?, 1, ?, ?, ?, ?, ?)
    `,
    [
      unit.unit_name.trim(),
      unit.unit_abbreviation ?? null,
      unit.unit_measurement_type,
      unit.unit_measurement_system,
      unit.unit_to_base_factor ?? null,
      unit.unit_auto_convert,
      unit.unit_display_priority ?? 100
    ]
  );

  return result.insertId;
}

async function insertRecipeIngredient(
  connection,
  recipeId,
  ingredientId,
  unitId,
  ingredient
) {
  const [result] = await connection.query(
    `
      INSERT INTO recipe_ingredients (
        recipe_id,
        ingredient_id,
        quantity,
        unit_id,
        preparation,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      recipeId,
      ingredientId,
      ingredient.quantity ?? null,
      unitId,
      ingredient.preparation ?? null,
      ingredient.sort_order ?? 0
    ]
  );

  return result.insertId;
}

async function insertRecipeStep(connection, recipeId, step) {
  const [result] = await connection.query(
    `
      INSERT INTO recipe_steps (
        recipe_id,
        step_number,
        instruction
      )
      VALUES (?, ?, ?)
    `,
    [
      recipeId,
      step.step_number,
      step.instruction
    ]
  );

  return result.insertId;
}

async function importRecipe(data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const recipe = data.recipe;

    // 1. Prevent duplicate imports.
    const [existingRecipes] = await connection.query(
      `
        SELECT id
        FROM recipes
        WHERE uuid = ?
        LIMIT 1
      `,
      [recipe.uuid]
    );

    if (existingRecipes.length) {
      throw new Error(
        `Recipe "${recipe.title}" has already been imported.`
      );
    }

    // 2. Create the global recipe.
    const recipeId = await insertImportedRecipe(
      connection,
      recipe
    );

    // 3. Import ingredients and units.
    for (const ingredient of data.ingredients) {

      // Find or create the global ingredient.
      let existingIngredient = await findGlobalIngredient(
        connection,
        ingredient.ingredient_name
      );

      let ingredientId;

      if (existingIngredient) {
        ingredientId = existingIngredient.id;
      } else {
        ingredientId = await insertGlobalIngredient(
          connection,
          ingredient
        );
      }

      // Find or create the global unit.
      let unitId = null;

      if (ingredient.unit_name) {
        const existingUnit = await findGlobalUnit(
          connection,
          ingredient
        );

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          unitId = await insertGlobalUnit(
            connection,
            ingredient
          );
        }
      }

      // Connect the ingredient to the recipe.
      await insertRecipeIngredient(
        connection,
        recipeId,
        ingredientId,
        unitId,
        ingredient
      );
    }

    // 4. Import cooking instructions.
    for (const step of data.steps) {
      await insertRecipeStep(
        connection,
        recipeId,
        step
      );
    }

    // 5. Commit everything.
    await connection.commit();

    return {
      recipeId,
      title: recipe.title,
      uuid: recipe.uuid
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

module.exports = {
  findByUuid,
  insertImportedRecipe,
  findGlobalIngredient,
  insertGlobalIngredient,
  findGlobalUnit,
  insertGlobalUnit,
  insertRecipeIngredient,
  insertRecipeStep,
  importRecipe
};
