const fs = require("fs");
const path = require("path");
const db = require("../services/db");

const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      migration VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations() {
  const [rows] = await db.query(`
    SELECT migration
    FROM schema_migrations
  `);

  return new Set(rows.map((row) => row.migration));
}

async function recordMigration(name) {
  await db.query(
    `
    INSERT INTO schema_migrations (migration)
    VALUES (?)
    `,
    [name]
  );
}

async function runMigrations() {
  await ensureMigrationTable();

  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js"))
    .filter((file) => file !== "template.js")
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file}`);
      continue;
    }

    console.log(`Running ${file}`);

    const migration = require(path.join(migrationsDir, file));

    await migration.up(db);
    await recordMigration(file);

    console.log(`Applied ${file}`);
  }

  console.log("Migrations complete.");
  await db.end();
}

runMigrations().catch(async (err) => {
  console.error("Migration failed:");
  console.error(err);

  if (db.end) {
    await db.end();
  }

  process.exit(1);
});