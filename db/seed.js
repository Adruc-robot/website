
require("dotenv").config();

const fs = require("fs");
const path = require("path");

// Adjust this import to match your existing migrate.js
const db = require("../services/db");

const SEEDS_DIR = path.join(__dirname, "seeds");

async function runSeeds() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS data_seeds (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        executed_at TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs.readdirSync(SEEDS_DIR)
      .filter(file => /^\d+.*\.js$/.test(file))
      .sort();

    for (const file of files) {
      const seed = require(path.join(SEEDS_DIR, file));

      if (!seed.name || typeof seed.up !== "function") {
        throw new Error(`Invalid seed file: ${file}`);
      }

      const [existing] = await db.query(
        "SELECT name FROM data_seeds WHERE name = ?",
        [seed.name]
      );

      if (existing.length > 0) {
        console.log(`Skipping ${seed.name} (already applied)`);
        continue;
      }

      console.log(`Running ${seed.name}...`);

      await seed.up(db);

      await db.query(
        "INSERT INTO data_seeds (name) VALUES (?)",
        [seed.name]
      );

      console.log(`Completed ${seed.name}`);
    }

    console.log("All seeds complete.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

runSeeds();
