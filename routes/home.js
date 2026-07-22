const express = require("express");
const router = express.Router();

//
// Home
//
router.get("/", (req, res) => {
  res.render("home/index", {
    title: "Home",
    activePage: "home",
  });
});

module.exports = router;