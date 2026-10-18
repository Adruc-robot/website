
//
// Validate and normalize recipe data
//
function validateRecipe(input) {
  const errors = [];

  const recipe = {
    title: typeof input.title === "string"
      ? input.title.trim()
      : "",

    description: typeof input.description === "string"
      ? input.description.trim()
      : "",

    notes: typeof input.notes === "string"
      ? input.notes.trim()
      : "",

    servings: null,
    prep_minutes: null,
    cook_minutes: null,
  };

  //
  // Required title
  //
  if (!recipe.title) {
    errors.push("Recipe title is required.");
  }

  //
  // Servings: optional positive number
  //
  if (
    input.servings !== null &&
    input.servings !== undefined &&
    String(input.servings).trim() !== ""
  ) {
    const servings = Number(input.servings);

    if (!Number.isFinite(servings) || servings <= 0) {
      errors.push("Servings must be a positive number.");
    } else {
      recipe.servings = servings;
    }
  }

  //
  // Preparation and cooking time:
  // optional nonnegative integers
  //
  for (const field of ["prep_minutes", "cook_minutes"]) {
    const value = input[field];

    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      continue;
    }

    const minutes = Number(value);

    if (!Number.isSafeInteger(minutes) || minutes < 0) {
      errors.push(
        `${field} must be a nonnegative whole number.`
      );
    } else {
      recipe[field] = minutes;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    recipe,
  };
}

module.exports = {
  validateRecipe,
};
