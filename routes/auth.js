const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const router = express.Router();

router.get("/login", (req, res) => {
    res.render("auth/login");
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
        return res.render("auth/login", {
            error: "Invalid email or password."
        });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
        return res.render("auth/login", {
            error: "Invalid email or password."
        });
    }

    // User is authenticated
    req.session.user = {
        id: user.id,
        alias: user.alias,
        email: user.email,
        role: user.role
    };

    res.redirect("/");
});

module.exports = router;