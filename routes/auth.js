const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const router = express.Router();

router.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  res.render("login/index", {
    title: "Login",
    activePage: null,
    error: null,
    email: ""
  });
});

router.post("/", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email.trim());

        if (!user) {
            return res.status(401).render("login/index", {
                title: "Login",
                activePage: null,
                error: "Invalid email or password.",
                email
            });
        }

        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            return res.status(401).render("login/index", {
                title: "Login",
                activePage: null,
                error: "Invalid email or password.",
                email
            });
        }

        req.session.user = {
            id: user.id,
            alias: user.alias,
            email: user.email,
            role: user.role
        };

        res.redirect("/");
    } catch (err) {
        next(err);
    }
});

module.exports = router;