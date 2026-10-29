const express = require("express");
const router = express.Router();

const Recipe = require("../models/recipe");
const RecipeIngredient = require("../models/recipeIngredient");
const RecipeStep = require("../models/recipeStep");
const Ingredient = require("../models/ingredient");
const Unit = require("../models/unit");
const RecipeExport = require("../models/recipeExport");
const { validateRecipe } = require("../services/recipeValidation");
const { requireLogin } = require("../middleware/auth");

const multer = require("multer");
const RecipeImport = require("../models/recipeImport");
const { validateRecipeImport } = require("../services/recipeImportValidation");

const GLOBAL_USER_ID = 1;

const recipeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 // Maximum 1 MB
  },
  fileFilter(req, file, callback) {
    const isJson =
      file.originalname.toLowerCase().endsWith(".json");

    if (!isJson) {
      return callback(new Error("Only JSON files are allowed."));
    }

    callback(null, true);
  }
});

//
// Public routes
//

//
// List recipes
//
router.get("/", async (req, res, next) => {
  try {
    const userId = req.session.user?.id ?? null;

    const recipes = await Recipe.all(userId);

    res.render("recipes/index", {
      title: "Recipes",
      activePage: "recipes",
      recipes,
      userId,
      globalUserId: GLOBAL_USER_ID,
    });
  } catch (error) {
    console.error("Error loading recipes:", error);
    return next(error);
  }
});

//
// Display a recipe (read-only)
//
router.get("/:id", async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) {
    return next("route");
  }  
  try {
    const userId = req.session.user?.id ?? null;
    const isAdmin = req.session.user?.role === "admin";

    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const recipeIngredients = await RecipeIngredient.all(recipe.id);
    const recipeSteps = await RecipeStep.all(recipe.id);

    const isOwner =
      userId !== null &&
      Number(recipe.user_id) === Number(userId);

    const isGlobal =
      Number(recipe.user_id) === GLOBAL_USER_ID;

    const canEdit = isOwner || (isAdmin && isGlobal);

    res.render("recipes/show", {
      title: recipe.title,
      activePage: "recipes",
      recipe,
      recipeIngredients,
      recipeSteps,
      canEdit,
      isGlobal,
    });

  } catch (error) {
    console.error("Error loading recipe:", error);
    return next(error);
  }
});

router.use(requireLogin);
//
// Import get
//
router.get("/import", (req, res) => {
  if (req.session.user.role !== "admin") {
    return res.status(403).render("errors/403", {
      title: "403 — Forbidden",
      activePage: null
    });
  }

  res.render("recipes/import", {
    title: "Import Recipe",
    activePage: "recipes",
    errors: [],
    success: null
  });
});

//
// Import post
//
router.post("/import", (req, res) => {
  // Check permissions before processing the upload.
  if (req.session.user.role !== "admin") {
    return res.status(403).render("errors/403", {
      title: "403 — Forbidden",
      activePage: null
    });
  }

  recipeUpload.single("recipeFile")(req, res, async (uploadError) => {
    const renderError = (message, status = 400) => {
      return res.status(status).render("recipes/import", {
        title: "Import Recipe",
        activePage: "recipes",
        errors: [message],
        success: null
      });
    };

    if (uploadError) {
      return renderError(uploadError.message);
    }

    if (!req.file) {
      return renderError("Please select a JSON file.");
    }

    let data;

    try {
      data = JSON.parse(req.file.buffer.toString("utf8"));
    } catch (error) {
      return renderError("The uploaded file is not valid JSON.");
    }

    const validation = validateRecipeImport(data);

    if (!validation.valid) {
      return res.status(400).render("recipes/import", {
        title: "Import Recipe",
        activePage: "recipes",
        errors: validation.errors,
        success: null
      });
    }

    try {
      const result = await RecipeImport.importRecipe(data);

      return res.render("recipes/import", {
        title: "Import Recipe",
        activePage: "recipes",
        errors: [],
        success: `Successfully imported "${result.title}".`
      });
    } catch (error) {
      console.error("Recipe import failed:", error.message);

      if (error.code === "ER_DUP_ENTRY") {
        return renderError("This recipe has already been imported.", 409);
      }

      return renderError(error.message, 400);
    }
  });
});

//
// New Recipe Form
//
router.get("/new", (req, res) => {
  const isAdmin = req.session.user.role === "admin";

  res.render("recipes/form", {
    title: "New Recipe",
    activePage: "recipes",
    recipe: {
      title: "",
      description: "",
      servings: null,
      prep_minutes: null,
      cook_minutes: null,
      notes: "",
      user_id: req.session.user.id,
    },
    action: "/recipes",
    isAdmin,
    globalUserId: GLOBAL_USER_ID,
  });
});

//
// Create Recipe
//
router.post("/", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  //
  // Determine ownership
  //
  const ownerId =
    isAdmin && req.body.owner === "global"
      ? GLOBAL_USER_ID
      : userId;

  //
  // Validate and normalize recipe data
  //
  const result = validateRecipe(req.body);

  if (!result.valid) {
    return res.status(400).render("recipes/form", {
      title: "New Recipe",
      activePage: "recipes",
      recipe: req.body,
      action: "/recipes",
      isAdmin,
      globalUserId: GLOBAL_USER_ID,
      errors: result.errors
    });
  }

  //
  // Create recipe using validated data
  //
  await Recipe.create(result.recipe, ownerId);

  res.redirect("/recipes");
});

//
// Edit Recipe Form
//
router.get("/:id/edit", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  const recipe = await Recipe.find(req.params.id, userId);

  if (!recipe) {
    return res.status(404).render("errors/404", {
      title: "404 — Recipe Not Found",
      activePage: null
    });
  }

  //
  // Check editing permissions
  //
  const isOwner = Number(recipe.user_id) === Number(userId);
  const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).render("errors/403", {
      title: "403 — Forbidden",
      activePage: null
    });
  }

  //
  // Load recipe ingredients and available selections
  //
  const recipeIngredients = await RecipeIngredient.all(recipe.id);
  const ingredients = await Ingredient.allActive(userId);
  const units = await Unit.allActive(userId);
  const recipeSteps = await RecipeStep.all(recipe.id);

  //
  // Retrieve and clear ingredient validation error
  //
  const ingredientError = req.session.ingredientError || null;
  delete req.session.ingredientError;
  const stepError = req.session.stepError || null;
  delete req.session.stepError;

  //
  // Retrieve and clear Edit Step validation error
  //
  const stepEditError = req.session.stepEditError || null;
  delete req.session.stepEditError;

  //
  // Retrieve and clear Edit Ingredient validation error
  //
  const ingredientEditError = req.session.ingredientEditError || null;
  delete req.session.ingredientEditError;

  res.render("recipes/form", {
    title: "Edit Recipe",
    activePage: "recipes",
    recipe,
    action: `/recipes/${recipe.id}`,
    isAdmin,
    globalUserId: GLOBAL_USER_ID,
    recipeIngredients,
    ingredients,
    units,
    recipeSteps,
    ingredientError,
    ingredientEditError,
    stepError,
    stepEditError
  });
});

//
// Update Recipe
//
router.post("/:id", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  const existing = await Recipe.find(req.params.id, userId);

  if (!existing) {
    return res.status(404).render("errors/404", {
      title: "404 — Recipe Not Found",
      activePage: null
    });
  }

  //
  // Check editing permissions
  //
  const isOwner = Number(existing.user_id) === Number(userId);
  const isGlobal = Number(existing.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).render("errors/403", {
      title: "403 — Forbidden",
      activePage: null
    });
  }

  //
  // Validate submitted data
  //
  const result = validateRecipe(req.body);

  if (!result.valid) {
    
    const recipeIngredients = await RecipeIngredient.all(existing.id);
    const recipeSteps = await RecipeStep.all(existing.id);
    const ingredients = await Ingredient.all(userId);
    const units = await Unit.all(userId);
    
    return res.status(400).render("recipes/form", {
      title: "Edit Recipe",
      activePage: "recipes",
      recipe: {
        ...existing,
        ...req.body,
        id: existing.id
      },
      action: `/recipes/${existing.id}`,
      isAdmin,
      globalUserId: GLOBAL_USER_ID,
      errors: result.errors,
      recipeIngredients,
      recipeSteps,
      ingredients,
      units
    });
  }

  //
  // Update recipe using validated data
  //
  const updated = await Recipe.update(
    req.params.id,
    result.recipe,
    Number(existing.user_id)
  );

  if (!updated) {
    return res.status(404).render("errors/404", {
      title: "404 — Recipe Not Found",
      activePage: null
    });
  }

  res.redirect("/recipes");
});

//
// Add an ingredient to an existing recipe
//
router.post("/:id/ingredients", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists and user can edit it//
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    const ingredientError = (message) => {
      req.session.ingredientError = message;
      return res.redirect(303, `/recipes/${recipe.id}/edit#add-ingredient`);
    };

    //
    // Validate ingredient
    //
    const ingredientId = Number(req.body.ingredient_id);

    if (!Number.isSafeInteger(ingredientId) || ingredientId <= 0) {
      return ingredientError("Invalid ingredient.");
    }

    const selectedIngredient = await Ingredient.find(
      ingredientId,
      userId
    );

    if (!selectedIngredient || !Number(selectedIngredient.active)) {
      return ingredientError("Ingredient not found or inactive.");
    }

    //
    // Validate optional unit
    //
    let unitId = null;
    let selectedUnit = null;

    if (req.body.unit_id) {
      unitId = Number(req.body.unit_id);

      if (!Number.isSafeInteger(unitId) || unitId <= 0) {
        return ingredientError("Invalid unit.");
      }

      selectedUnit = await Unit.find(unitId, userId);

      if (!selectedUnit || !Number(selectedUnit.active)) {
        return ingredientError("Unit not found or inactive.");
      }
    }

    //
    // Stock recipes must use globally available ingredients and units
    //
    if (isGlobal) {
      if (Number(selectedIngredient.user_id) !== GLOBAL_USER_ID) {
        return ingredientError("Stock recipes require global ingredients.");
      }

      if (selectedUnit &&
          Number(selectedUnit.user_id) !== GLOBAL_USER_ID) {
        return ingredientError("Stock recipes require global units.");
      }
    }

    //
    // Validate quantity
    //
    const quantity =
      req.body.quantity == null || req.body.quantity === ""
        ? null
        : Number(req.body.quantity);

    if (quantity !== null &&
        (!Number.isFinite(quantity) ||
         quantity <= 0 ||
         quantity >= 10000000 ||
         Math.round(quantity * 1000) !== quantity * 1000)) {
      return ingredientError("Quantity must be positive, with at most 3 decimal places.");
    }

    //
    // Validate sort order
    //
    const sortOrder = Number(req.body.sort_order ?? 0);//

    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0 ||
        sortOrder > 4294967295) {
      return ingredientError("Invalid sort order.");
    }

    const preparation = (req.body.preparation || "").trim();

    if (preparation.length > 255) {
      return ingredientError("Preparation must be 255 characters or fewer.");
    }

    //
    // Create recipe ingredient record
    //
    await RecipeIngredient.create(recipe.id, {
      ingredient_id: ingredientId,
      quantity,
      unit_id: unitId,
      preparation,
      sort_order: sortOrder,
    });

    res.redirect(`/recipes/${recipe.id}/edit#add-ingredient`);

  } catch (error) {
    console.error("Error adding recipe ingredient:", error);
    return next(error);
  }
});

//
// Remove an ingredient from a recipe
//
router.post("/:id/ingredients/:ingredientRowId/delete", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    //
    // Verify user can edit this recipe
    //
    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    //
    // Validate the recipe ingredient row ID
    //
    const ingredientRowId = Number(req.params.ingredientRowId);

    if (!Number.isSafeInteger(ingredientRowId) || ingredientRowId <= 0) {
      return res.status(400).send("Invalid recipe ingredient ID.");
    }

    //
    // Remove only the matching row from this recipe
    //
    const removed = await RecipeIngredient.remove(
      recipe.id,
      ingredientRowId
    );

    if (!removed) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Ingredient Not Found.",
        activePage: null
      });
    }

    res.redirect(`/recipes/${recipe.id}/edit#add-ingredient`);

  } catch (error) {
    console.error("Error removing recipe ingredient:", error);
    return next(error);
  }
});

//
// Update an ingredient already attached to a recipe
//
router.post("/:id/ingredients/:ingredientRowId", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    //
    // Store validation error for the specific ingredient being edited
    //
    const ingredientEditError = (message) => {
      req.session.ingredientEditError = {
        ingredientRowId: Number(req.params.ingredientRowId),
        message
      };

      return res.redirect(
        303,
        `/recipes/${recipe.id}/edit#edit-${req.params.ingredientRowId}`
      );
    };

    const rowId = Number(req.params.ingredientRowId);
    const ingredientId = Number(req.body.ingredient_id);

    if (!Number.isSafeInteger(rowId) || rowId <= 0 ||
        !Number.isSafeInteger(ingredientId) || ingredientId <= 0) {
      return ingredientEditError("Invalid ingredient ID.");
    }

    const selectedIngredient = await Ingredient.find(ingredientId, userId);

    if (!selectedIngredient || !Number(selectedIngredient.active)) {
      return ingredientEditError("Ingredient not found or inactive.");
    }

    let unitId = null;
    let selectedUnit = null;

    if (req.body.unit_id) {
      unitId = Number(req.body.unit_id);

      if (!Number.isSafeInteger(unitId) || unitId <= 0) {
        return ingredientEditError("Invalid unit ID.");
      }

      selectedUnit = await Unit.find(unitId, userId);

      if (!selectedUnit || !Number(selectedUnit.active)) {
        return ingredientEditError("Unit not found or inactive.");
      }
    }

    // Stock recipes must reference global ingredients and units.
    if (isGlobal) {
      if (Number(selectedIngredient.user_id) !== GLOBAL_USER_ID ||
          (selectedUnit &&
           Number(selectedUnit.user_id) !== GLOBAL_USER_ID)) {
        return ingredientEditError(
          "Stock recipes require global ingredients and units."
        );
      }
    }

    const quantity =
      req.body.quantity == null || req.body.quantity === ""
        ? null
        : Number(req.body.quantity);

    if (quantity !== null &&
        (!Number.isFinite(quantity) ||
         quantity <= 0 ||
         quantity >= 10000000 ||
         Math.round(quantity * 1000) !== quantity * 1000)) {
      return ingredientEditError("Invalid quantity.");
    }

    const sortOrder = Number(req.body.sort_order ?? 0);

    if (!Number.isSafeInteger(sortOrder) ||
        sortOrder < 0 ||
        sortOrder > 4294967295) {
      return ingredientEditError("Invalid sort order.");
    }

    const preparation = (req.body.preparation || "").trim();

    if (preparation.length > 255) {
      return ingredientEditError("Preparation is too long.");
    }

    const updated = await RecipeIngredient.update(recipe.id, rowId, {
      ingredient_id: ingredientId,
      quantity,
      unit_id: unitId,
      preparation,
      sort_order: sortOrder,
    });

    if (!updated) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe ingredient not found.",
        activePage: null
      });
    }

    res.redirect(`/recipes/${recipe.id}/edit#add-ingredient`);

  } catch (error) {
    console.error("Error updating recipe ingredient:", error);
    return next(error);
  }
});

//
// Add a cooking instruction to a recipe
//
router.post("/:id/steps", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists and user can edit it
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    const stepError = (message) => {
      req.session.stepError = message;
      return res.redirect(303, `/recipes/${recipe.id}/edit#add-step`);
    };

    //
    // Validate step number
    //
    const stepNumber = Number(req.body.step_number);

    if (!Number.isSafeInteger(stepNumber) ||
        stepNumber <= 0 ||
        stepNumber > 4294967295) {
      return stepError("Step number must be a positive whole number.");
    }

    //
    // Validate instruction
    //
    const instruction =
      typeof req.body.instruction === "string"
        ? req.body.instruction.trim()
        : "";

    if (!instruction) {
      return stepError("Instruction is required.");
    }

    //
    // Save step
    //
    await RecipeStep.create(recipe.id, {
      step_number: stepNumber,
      instruction,
    });

    res.redirect(`/recipes/${recipe.id}/edit#add-step`);

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      req.session.stepError =
        "That step number is already used in this recipe.";

      return res.redirect(
        303,
        `/recipes/${req.params.id}/edit#add-step`
      );
    }

    console.error("Error adding recipe step:", error);
    return next(error);
  }
});

//
// Update an existing recipe step
//
router.post("/:id/steps/:stepId", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists and user can edit it
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    const stepError = (message) => {
      req.session.stepEditError = {
        stepId: Number(req.params.stepId),
        message
      };

      return res.redirect(
        303,
        `/recipes/${recipe.id}/edit#step-edit-${req.params.stepId}`
      );
    };

    //
    // Validate step ID and step number
    //
    const stepId = Number(req.params.stepId);
    const stepNumber = Number(req.body.step_number);

    if (!Number.isSafeInteger(stepId) || stepId <= 0) {
      return stepError("Invalid step ID.");
    }

    if (!Number.isSafeInteger(stepNumber) ||
        stepNumber <= 0 ||
        stepNumber > 4294967295) {
      return stepError(
        "Step number must be a positive whole number."
      );
    }

    //
    // Validate instruction
    //
    const instruction =
      typeof req.body.instruction === "string"
        ? req.body.instruction.trim()
        : "";

    if (!instruction) {
      return stepError("Instruction is required.");
    }

    //
    // Update only the step belonging to this recipe
    //
    const updated = await RecipeStep.update(recipe.id, stepId, {
      step_number: stepNumber,
      instruction,
    });

    if (!updated) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Step Not Found",
        activePage: null
      });
    }

    res.redirect(`/recipes/${recipe.id}/edit#steps-section`);

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      req.session.stepEditError = {
        stepId: Number(req.params.stepId),
        message: "That step number is already used in this recipe."
      };

      return res.redirect(
        303,
        `/recipes/${req.params.id}/edit#step-edit-${req.params.stepId}`
      );
    }

    console.error("Error updating recipe step:", error);
    return next(error);
  }
});

//
// Delete a recipe step
//
router.post("/:id/steps/:stepId/delete", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists and user can edit it
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    //
    // Validate step ID
    //
    const stepId = Number(req.params.stepId);

    if (!Number.isSafeInteger(stepId) || stepId <= 0) {
      return res.status(400).send("Invalid step ID.");
    }

    //
    // Delete only the step belonging to this recipe
    //
    const removed = await RecipeStep.remove(recipe.id, stepId);

    if (!removed) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Step Not Found",
        activePage: null
      });
    }

    res.redirect(`/recipes/${recipe.id}/edit#steps-section`);

  } catch (error) {
    console.error("Error deleting recipe step:", error);
    return next(error);
  }
});

//
// Move a cooking instruction up or down
//
router.post("/:id/steps/:stepId/move", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    //
    // Verify recipe exists and user can edit it
    //
    const recipe = await Recipe.find(req.params.id, userId);

    if (!recipe) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe Not Found",
        activePage: null
      });
    }

    const isOwner = Number(recipe.user_id) === Number(userId);
    const isGlobal = Number(recipe.user_id) === GLOBAL_USER_ID;

    if (!isOwner && !(isAdmin && isGlobal)) {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    //
    // Validate step ID and direction
    //
    const stepId = Number(req.params.stepId);
    const direction = req.body.direction;

    if (!Number.isSafeInteger(stepId) || stepId <= 0) {
      return res.status(400).send("Invalid step ID.");
    }

    if (!["up", "down"].includes(direction)) {
      return res.status(400).send("Invalid move direction.");
    }

    //
    // Move the step
    //
    const moved = await RecipeStep.move(
      recipe.id,
      stepId,
      direction
    );

    if (!moved) {
      return res.status(400).send(
        "Step cannot be moved in that direction."
      );
    }

    res.redirect(`/recipes/${recipe.id}/edit#steps-section`);

  } catch (error) {
    console.error("Error moving recipe step:", error);
    return next(error);
  }
});

//
// Copy a stock recipe into the user's personal recipes
//
router.post("/:id/copy", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const recipeId = Number(req.params.id);

    // Validate the recipe ID.
    if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
      return res.status(400).send("Invalid recipe ID.");
    }

    // Copy the stock recipe and all its related records.
    const newRecipeId = await Recipe.copyStockRecipe(recipeId, userId);

    if (!newRecipeId) {
      return res.status(404).render("errors/404", {
        title: "404 — Stock Recipe Not Found",
        activePage: null
      });
    }

    // Open the new personal recipe.
    res.redirect(`/recipes/${newRecipeId}`);

  } catch (error) {
    console.error("Error copying stock recipe:", error);
    return next(error);
  }
});

//
// Delete a recipe
//
router.post("/:id/delete", async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const isAdmin = req.session.user.role === "admin";
    const recipeId = Number(req.params.id);

    // Validate the recipe ID.
    if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
      return res.status(400).send("Invalid recipe ID.");
    }

    // Delete the recipe if the user has permission.
    const deleted = await Recipe.remove(recipeId, userId, isAdmin);

    if (!deleted) {
      return res.status(404).render("errors/404", {
        title: "404 — Recipe not found or you do not have permission to delete it.",
        activePage: null
      });
    }

    // Return to the recipe list.
    res.redirect("/recipes");

  } catch (error) {
    console.error("Error deleting recipe:", error);
    return next(error);
  }
});

//
// Export a global recipe as JSON (admin only)
//
router.get("/:id/export", async (req, res, next) => {
  try {
    // Only administrators can export recipes.
    if (req.session.user.role !== "admin") {
      return res.status(403).render("errors/403", {
        title: "403 — Forbidden",
        activePage: null
      });
    }

    const recipeId = Number(req.params.id);

    if (!Number.isSafeInteger(recipeId) || recipeId <= 0) {
      return res.status(400).send("Invalid recipe ID.");
    }

    // Load the recipe and all associated data.
    const exportData = await RecipeExport.getExportData(recipeId);

    if (!exportData) {
      return res.status(404).render("errors/404", {
        title: "404 — Global Recipe Not Found",
        activePage: null
      });
    }

    // Build a safe filename from the recipe title.
    const filename = exportData.recipe.title
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "recipe";

    // Tell the browser to download the JSON.
    res.attachment(`${filename}.json`);
    res.type("json");

    res.send(JSON.stringify(exportData, null, 2));

  } catch (error) {
    console.error("Error exporting recipe:", error);
    return next(error);
  }
});

module.exports = router;
