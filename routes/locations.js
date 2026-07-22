const express = require("express");
const router = express.Router();

const Location = require("../models/location");
const { requireAdmin } = require("../middleware/auth");
//
// List
//
router.get("/", async (req, res) => {
  const locations = await Location.all();

  res.render("locations/index", {
    title: "Locations",
    activePage: "locations",
    locations,
  });
});

//
// New Form
//
router.get("/new", requireAdmin, (req, res) => {
  res.render("locations/form", {
    title: "New Location",
    activePage: "locations",
    location: {
        active: 1,
    },
    action: "/locations",
  });
});

//
// Create
//
router.post("/", requireAdmin, async (req, res) => {
  await Location.create(req.body);

  res.redirect("/locations");
});

//
// Details (optional)
//
/*router.get("/:id", async (req, res) => {
  const location = await Location.find(req.params.id);

  res.render("locations/details", {
    title: "Location Details",
    activePage: "locations",
    location,
  });
});*/

//
// Edit Form
//
router.get("/:id/edit", requireAdmin, async (req, res) => {
  const location = await Location.find(req.params.id);

  res.render("locations/form", {
    title: "Edit Location",
    activePage: "locations",
    location,
    action: `/locations/${location.id}`,
  });
});

//
// Update
//
router.post("/:id", requireAdmin, async (req, res) => {
  await Location.update(req.params.id, req.body);

  res.redirect("/locations");
});

//
// Delete
//
router.post("/:id/delete", requireAdmin, async (req, res) => {
  await Location.remove(req.params.id);

  res.redirect("/locations");
});

module.exports = router;