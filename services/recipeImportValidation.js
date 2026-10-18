
function isValidNumber(value) {
  return (
    (typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value))
  );
}

function validateRecipeImport(data) {
  const errors = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["Invalid JSON structure."] };
  }

  if (data.formatVersion !== 1) {
    errors.push("Unsupported recipe export version.");
  }

  const recipe = data.recipe;

  if (!recipe || typeof recipe !== "object" || Array.isArray(recipe)) {
    errors.push("Recipe information is missing.");
  } else {
    if (
      typeof recipe.uuid !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipe.uuid)
    ) {
      errors.push("Invalid recipe UUID.");
    }

    if (
      typeof recipe.title !== "string" ||
      !recipe.title.trim() ||
      recipe.title.length > 255
    ) {
      errors.push("Recipe title is required and must be 255 characters or fewer.");
    }

    const optionalTextFields = [
      "description",
      "notes"
    ];

    for (const field of optionalTextFields) {
      if (
        recipe[field] != null &&
        typeof recipe[field] !== "string"
      ) {
        errors.push(`Recipe ${field} must be text or null.`);
      }
    }

    if (recipe.servings != null) {
      const servings = Number(recipe.servings);

      if (
        !isValidNumber(recipe.servings) ||
        servings <= 0 ||
        servings > 999999.99 ||
        Math.abs(servings * 100 - Math.round(servings * 100)) > 1e-7
      ) {
        errors.push("Recipe servings must be a positive number with at most two decimal places.");
      }
    }

    for (const field of ["prep_minutes", "cook_minutes"]) {
      if (recipe[field] != null) {
        const value = Number(recipe[field]);

        if (
          !isValidNumber(recipe[field]) ||
          !Number.isSafeInteger(value) ||
          value < 0 ||
          value > 4294967295
        ) {
          errors.push(`Recipe ${field} must be a valid nonnegative integer.`);
        }
      }
    }

  }

  if (!Array.isArray(data.ingredients)) {
    errors.push("Ingredients must be an array.");
  } else {
    const seenUnits = new Map();
    data.ingredients.forEach((ingredient, index) => {
      if (
        !ingredient ||
        typeof ingredient !== "object" ||
        Array.isArray(ingredient)
      ) {
        errors.push(`Ingredient ${index + 1} is invalid.`);
        return;
      }

      if (
        ingredient.ingredient_description != null &&
        typeof ingredient.ingredient_description !== "string"
      ) {
        errors.push(`Ingredient ${index + 1} has an invalid description.`);
      }

      if (
        typeof ingredient.ingredient_name !== "string" ||
        !ingredient.ingredient_name.trim() ||
        ingredient.ingredient_name.length > 255
      ) {
        errors.push(`Ingredient ${index + 1} has an invalid name.`);
      }

      // Validate ingredient quantity.
      if (ingredient.quantity != null) {
        const quantity = Number(ingredient.quantity);

        if (
          !isValidNumber(ingredient.quantity) ||
          quantity < 0 ||
          quantity > 9999999.999 ||
          Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-6
        ) {
          errors.push(`Ingredient ${index + 1} has an invalid quantity.`);
        }
      }

      // Validate unit information when a unit is specified.
      if (ingredient.unit_name != null) {
        if (
          typeof ingredient.unit_name !== "string" ||
          !ingredient.unit_name.trim()
        ) {
          errors.push(`Ingredient ${index + 1} has an invalid unit name.`);
          return;
        }

        if (ingredient.unit_name.length > 100) {
          errors.push(`Ingredient ${index + 1} unit name is too long.`);
        }

        if (
          ingredient.unit_abbreviation != null &&
          (
            typeof ingredient.unit_abbreviation !== "string" ||
            ingredient.unit_abbreviation.length > 30
          )
        ) {
          errors.push(`Ingredient ${index + 1} has an invalid unit abbreviation.`);
        }

        const validTypes = [
          "volume", "weight", "count", "length", "other"
        ];

        const validSystems = [
          "imperial", "metric", "universal"
        ];

        if (!validTypes.includes(ingredient.unit_measurement_type)) {
          errors.push(`Ingredient ${index + 1} has an invalid measurement type.`);
        }

        if (!validSystems.includes(ingredient.unit_measurement_system)) {
          errors.push(`Ingredient ${index + 1} has an invalid measurement system.`);
        }

        if (ingredient.unit_to_base_factor != null) {
          const factor = ingredient.unit_to_base_factor;

          if (
            !isValidNumber(factor) ||
            Number(factor) <= 0 ||
            !/^\d{1,10}(\.\d{1,10})?$/.test(String(factor))
          ) {
            errors.push(
              `Ingredient ${index + 1} has an invalid conversion factor.`
            );
          }
        }

        if (
          !isValidNumber(ingredient.unit_auto_convert) ||
          ![0, 1].includes(Number(ingredient.unit_auto_convert))
        ) {
          errors.push(`Ingredient ${index + 1} has an invalid auto-convert setting.`);
        }

        if (
          !isValidNumber(ingredient.unit_display_priority) ||
          !Number.isSafeInteger(Number(ingredient.unit_display_priority)) ||
          Number(ingredient.unit_display_priority) < 0 ||
          Number(ingredient.unit_display_priority) > 4294967295
        ) {
          errors.push(`Ingredient ${index + 1} has an invalid display priority.`);
        }
      }

      if (
        typeof ingredient.unit_name === "string" &&
        ingredient.unit_name.trim()
      ) {
        const key = ingredient.unit_name.trim().toLowerCase();

        const definition = JSON.stringify({
          abbreviation: ingredient.unit_abbreviation ?? null,
          measurement_type: ingredient.unit_measurement_type,
          measurement_system: ingredient.unit_measurement_system,
          to_base_factor: ingredient.unit_to_base_factor == null
            ? null
            : Number(ingredient.unit_to_base_factor),
          auto_convert: Number(ingredient.unit_auto_convert)
        });

        if (
          seenUnits.has(key) &&
          seenUnits.get(key) !== definition
        ) {
          errors.push(
            `Unit "${ingredient.unit_name}" has conflicting definitions.`
          );
        } else {
          seenUnits.set(key, definition);
        }
      }

      if (
        ingredient.preparation != null &&
        (
          typeof ingredient.preparation !== "string" ||
          ingredient.preparation.length > 255
        )
      ) {
        errors.push(`Ingredient ${index + 1} has invalid preparation text.`);
      }

      if (
        !Number.isSafeInteger(ingredient.sort_order) ||
        ingredient.sort_order < 0 ||
        ingredient.sort_order > 4294967295
      ) {
        errors.push(`Ingredient ${index + 1} has an invalid sort order.`);
      }

    });
  }

  if (!Array.isArray(data.steps)) {
    errors.push("Cooking instructions must be an array.");
  } else {

    data.steps.forEach((step, index) => {
      if (
        !step ||
        typeof step !== "object" ||
        Array.isArray(step)
      ) {
        errors.push(`Step ${index + 1} is invalid.`);
        return;
      }

      if (
        typeof step.instruction !== "string" ||
        !step.instruction.trim()
      ) {
        errors.push(`Step ${index + 1} is missing an instruction.`);
      }

      if (
        typeof step.instruction === "string" &&
        Buffer.byteLength(step.instruction, "utf8") > 65535
      ) {
        errors.push(
          `Step ${index + 1} exceeds the maximum instruction length.`
        );
      }

      if (
        !Number.isSafeInteger(step.step_number) ||
        step.step_number <= 0 ||
        step.step_number > 4294967295
      ) {
        errors.push(`Step ${index + 1} has an invalid step number.`);
      }
    });


    const stepNumbers = data.steps.map(step => step?.step_number);

    if (new Set(stepNumbers).size !== stepNumbers.length) {
      errors.push("Cooking instructions contain duplicate step numbers.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateRecipeImport
};
