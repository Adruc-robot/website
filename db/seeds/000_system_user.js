
module.exports = {
  name: "000_system_user",

  async up(db) {
    const [existing] = await db.query(
      "SELECT id, role FROM users WHERE id = 1"
    );

    if (existing.length > 0) {
      if (existing[0].role !== "system") {
        throw new Error(
          "User ID 1 already exists but is not the system account."
        );
      }

      console.log("  System account already exists.");
      return;
    }

    await db.query(
      `INSERT INTO users (
        id,
        alias,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, ?)`,
      [
        1,
        "System",
        "system@localhost.invalid",
        "SYSTEM_ACCOUNT_LOGIN_DISABLED",
        "system"
      ]
    );

    console.log("  Created system account (ID 1).");
  }
};
