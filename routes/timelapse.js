const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("timelapse/index", {
    title: "Time-Lapse",
    activePage: "timelapse",
  });
});

module.exports = router;