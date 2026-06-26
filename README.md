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