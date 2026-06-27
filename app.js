const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("home/index", {
    title: "Home",
    activePage: "home",
  });

});

app.get("/calendar", (req, res) => {
  res.render("calendar/index", {
    title: "Calendar",
    activePage: "calendar",
  });
});

const Location = require("./models/location");

app.get("/locations", async (req, res) => {
  const locations = await Location.all();

  res.render("locations/index", {
    title: "Locations",
    activePage: "locations",
    locations,
  });
});

app.get("/locations/new", (req, res) => {
  res.render("locations/form", {
    title: "New Location",
    activePage: "locations",
    location: {},
    action: "/locations",
  });
});

app.post("/locations", async (req, res) => {
  await Location.create(req.body);
  res.redirect("/locations");
});

app.get("/locations/:id/edit", async (req, res) => {
  const location = await Location.find(req.params.id);

  res.render("locations/form", {
    title: "Edit Location",
    activePage: "locations",
    location,
    action: `/locations/${location.id}`,
  });
});

app.post("/locations/:id", async (req, res) => {
  await Location.update(req.params.id, req.body);
  res.redirect("/locations");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

//Connection test
const db = require("./services/db");

(async () => {
  try {
    const [rows] = await db.query("SELECT VERSION() AS version");
    console.log("Up in app.js prior to logging rows.")
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
})();