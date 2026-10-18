
const express = require("express");
const router = express.Router();

const Ingredient = require("../models/ingredient");
const { requireLogin } = require("../middleware/auth");

const GLOBAL_USER_ID = 1;

// All ingredient routes require authentication.
router.use(requireLogin);

//
// List
//
router.get("/", async (req, res) => {
  const userId = req.session.user.id;
  const ingredients = await Ingredient.all(userId);

  res.render("ingredients/index", {
    title: "Ingredients",
    activePage: "ingredients",
    ingredients,
    userId,
    globalUserId: GLOBAL_USER_ID,
  });
});


//
// New Form
//
router.get("/new", (req, res) => {
  const isAdmin = req.session.user.role === "admin";

  res.render("ingredients/form", {
    title: "New Ingredient",
    activePage: "ingredients",
    ingredient: {
      name: "",
      description: "",
      active: 1,
      user_id: req.session.user.id,
    },
    action: "/ingredients",
    isAdmin,
    globalUserId: GLOBAL_USER_ID,
  });
});



//
// Create
//
router.post("/", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  //
  // Determine who owns the new ingredient
  //
  const ownerId =
    isAdmin && req.body.owner === "global"
      ? GLOBAL_USER_ID
      : userId;

  //
  // Build the ingredient object
  //
  const ingredient = {
    name: req.body.name?.trim(),
    description: req.body.description?.trim(),
    active: req.body.active === "1" ? 1 : 0,
  };

  //
  // Validate required fields
  //
  if (!ingredient.name) {
    return res.status(400).send("Ingredient name is required.");
  }

  //
  // Save the ingredient
  //
  await Ingredient.create(ingredient, ownerId);

  res.redirect("/ingredients");
});



//
// Edit Form
//
router.get("/:id/edit", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  //
  // Find the ingredient
  //
  const ingredient = await Ingredient.find(
    req.params.id,
    userId
  );

  if (!ingredient) {
    return res.status(404).send("Ingredient not found.");
  }

  //
  // Check editing permissions
  //
  const isOwner =
    Number(ingredient.user_id) === Number(userId);

  const isGlobal =
    Number(ingredient.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).send("Forbidden");
  }

  //
  // Display the edit form
  //
  res.render("ingredients/form", {
    title: "Edit Ingredient",
    activePage: "ingredients",
    ingredient,
    action: `/ingredients/${ingredient.id}`,
    isAdmin,
    globalUserId: GLOBAL_USER_ID,
  });
});



//
// Update
//S
router.post("/:id", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  //
  // Find the existing ingredient
  //
  const existing = await Ingredient.find(
    req.params.id,
    userId
  );

  if (!existing) {
    return res.status(404).send("Ingredient not found.");
  }

  //
  // Check editing permissions
  //
  const isOwner =
    Number(existing.user_id) === Number(userId);

  const isGlobal =
    Number(existing.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).send("Forbidden");
  }

  //
  // Build the updated ingredient
  //
  const ingredient = {
    name: req.body.name?.trim(),
    description: req.body.description?.trim(),
    active: req.body.active === "1" ? 1 : 0,
  };

  //
  // Validate required fields
  //
  if (!ingredient.name) {
    return res.status(400).send("Ingredient name is required.");
  }

  //
  // Save the changes
  //
  const updated = await Ingredient.update(
    req.params.id,
    ingredient,
    Number(existing.user_id)
  );

  if (!updated) {
    return res.status(404).send("Ingredient not found.");
  }

  res.redirect("/ingredients");
});


module.exports = router;
