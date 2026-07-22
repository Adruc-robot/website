const express = require("express");
const router = express.Router();

const Model = require("../models/Model");
const { requireAdmin } = require("../middleware/auth");
//
// List
//
router.get("/", async (req, res) => {
  const items = await Model.all();

  res.render("resource/index", {
    title: "Resource",
    activePage: "resource",
    items,
  });
});

//
// New Form
//
router.get("/new", requireAdmin, (req, res) => {
  res.render("resource/form", {
    title: "New Resource",
    activePage: "resource",
    item: {},
    action: "/resource",
  });
});

//
// Create
//
router.post("/", requireAdmin, async (req, res) => {
  await Model.create(req.body);

  res.redirect("/resource");
});

//
// Details (optional)
//
router.get("/:id", requireAdmin, async (req, res) => {
  const item = await Model.find(req.params.id);

  res.render("resource/details", {
    title: "Resource Details",
    activePage: "resource",
    item,
  });
});

//
// Edit Form
//
router.get("/:id/edit", requireAdmin, async (req, res) => {
  const item = await Model.find(req.params.id);

  res.render("resource/form", {
    title: "Edit Resource",
    activePage: "resource",
    item,
    action: `/resource/${item.id}`,
  });
});

//
// Update
//
router.post("/:id", requireAdmin, async (req, res) => {
  await Model.update(req.params.id, req.body);

  res.redirect("/resource");
});

//
// Delete
//
router.post("/:id/delete", requireAdmin, async (req, res) => {
  await Model.remove(req.params.id);

  res.redirect("/resource");
});

module.exports = router;