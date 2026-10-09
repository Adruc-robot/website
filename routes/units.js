
const express = require("express");
const router = express.Router();

const Unit = require("../models/unit");
const { requireLogin } = require("../middleware/auth");
const { validateUnit } = require("../services/unitValidation");

const GLOBAL_USER_ID = 1;

//
// Require login for all unit routes
//
router.use(requireLogin);

//
// List
//
router.get("/", async (req, res) => {
  const userId = req.session.user.id;
  const units = await Unit.all(userId);

  res.render("units/index", {
    title: "Units",
    activePage: "units",
    units,
    userId,
    globalUserId: GLOBAL_USER_ID,
  });
});

//
// New Form
//
router.get("/new", (req, res) => {
  const isAdmin = req.session.user.role === "admin";

  res.render("units/form", {
    title: "New Unit",
    activePage: "units",
    unit: {
      name: "",
      abbreviation: "",
      active: 1,
      measurement_type: "other",
      measurement_system: "universal",
      to_base_factor: null,
      auto_convert: 0,
      display_priority: 100,
      user_id: req.session.user.id,
    },
    action: "/units",
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
  // Determine ownership
  //
  const ownerId =
    isAdmin && req.body.owner === "global"
      ? GLOBAL_USER_ID
      : userId;

  //
  // Validate submitted data
  //
  const result = validateUnit(req.body);

  if (!result.valid) {
    return res.status(400).send(
      result.errors.join("\n")
    );
  }

  //
  // Save validated unit
  //
  await Unit.create(result.unit, ownerId);

  res.redirect("/units");
});


//
// Edit Form
//
router.get("/:id/edit", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  const unit = await Unit.find(req.params.id, userId);

  if (!unit) {
    return res.status(404).send("Unit not found.");
  }

  const isOwner = Number(unit.user_id) === Number(userId);
  const isGlobal = Number(unit.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).send("Forbidden");
  }

  res.render("units/form", {
    title: "Edit Unit",
    activePage: "units",
    unit,
    action: `/units/${unit.id}`,
    isAdmin,
    globalUserId: GLOBAL_USER_ID,
  });
});

//
// Update
//
router.post("/:id", async (req, res) => {
  const userId = req.session.user.id;
  const isAdmin = req.session.user.role === "admin";

  const existing = await Unit.find(req.params.id, userId);

  if (!existing) {
    return res.status(404).send("Unit not found.");
  }

  const isOwner = Number(existing.user_id) === Number(userId);
  const isGlobal = Number(existing.user_id) === GLOBAL_USER_ID;

  if (!isOwner && !(isAdmin && isGlobal)) {
    return res.status(403).send("Forbidden");
  }

  
  //
  // Validate submitted data
  //
  const result = validateUnit(req.body);

  if (!result.valid) {
    return res.status(400).send(
      result.errors.join("\n")
    );
  }

  //
  // Update using validated data
  //
  const updated = await Unit.update(
    req.params.id,
    result.unit,
    Number(existing.user_id)
  );

  if (!updated) {
    return res.status(404).send("Unit not found.");
  }

  res.redirect("/units");
});


module.exports = router;
