# Website

Personal website built with Node.js and Express.

## Features

- Time-lapse calendar
- Photography
- Future projects

## To add a new page:
1. Copy views/template/page.ejs.
2. Put it into views/<section>/ and rename it to index.ejs.
3. Add an app.get route in app.js.
4. Add a nav link if needed in the views/partials/header.ejs.
5. Update the page.ejs as necessary.

## Database connection
Copy .env.example to .env and populate accordingly.

## Database Migrations

This project uses lightweight forward-only JavaScript migrations.

Migration files live in:

```text
db/migrations/

Migrations are forward-only for now. Do not edit a migration after it has been applied. Create a new migration instead.


One important note: since `migrate.js` filters out `template.js`, that file can safely live in the migrations folder.

Process:
1. Copy db/migrations/template.js.
2. Rename it using the next number, for example:
```
003_add_state_to_locations.js
```
3. Update the name value inside the file.
4. Add SQL inside up(db).
5. Run:
```
npm run migrate
```