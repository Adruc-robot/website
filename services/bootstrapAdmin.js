const bcrypt = require("bcrypt");
//const db = require("../db");
const db = require("./db");



async function bootstrapAdmin() {
    const alias = process.env.BOOTSTRAP_ADMIN_ALIAS;
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (process.env.BOOTSTRAP_ADMIN_ENABLED !== "true") {
        return;
    }

    const [rows] = await db.query(
        "SELECT COUNT(*) AS admin_count FROM users WHERE role = 'admin'"
    );

    const adminCount = Number(rows[0].admin_count);

    // An administrator already exists, so bootstrap is unnecessary.
    if (adminCount > 0) {
        return;
    }

    if (!alias || !email || !password) {
        console.warn(
            "No users exist, but bootstrap admin credentials are incomplete."
        );

        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.query(
        `
        INSERT INTO users (
            alias,
            email,
            password_hash,
            role
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            alias,
            email.trim().toLowerCase(),
            passwordHash,
            "admin"
        ]
    );

    console.log(`Bootstrap admin created: ${email}`);
}

module.exports = bootstrapAdmin;