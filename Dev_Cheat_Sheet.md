# Development Cheat Sheet

Run these commands from the project root.

## Start the Node server

```bash
node app.js
```

The application entry point is `app.js`. There is currently no `npm start` or `npm run dev` script.

## Run database migrations

```bash
npm run migrate
```

This runs:

```bash
node db/migrate.js
```

The migration runner applies migrations that have not yet been recorded in `schema_migrations`.

### Useful SQL

```sql
SELECT * FROM schema_migrations;
```

```sql
SHOW TABLES;
```

```sql
DESCRIBE lookup_lists;
DESCRIBE lookup_entries;
```

**Note:** Do not edit a migration that has already been applied. Create a new migration to alter the schema instead.

To run a function without spinning up the server, do this:
 node scripts/processIncoming.js