console.log("APP FILE:", __filename);
console.log("WORKING DIR:", process.cwd());
console.log("MODULE PATHS:", module.paths);

const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//app.use(express.static(path.join(__dirname, "public")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("home/index", {
    title: "Home",
    activePage: "home",
  });

});

/*app.get("/calendar", (req, res) => {
  res.render("calendar/index", {
    title: "Calendar",
    activePage: "calendar",
  });
});*/
app.get("/calendar", (req, res) => {
  /*res.render("calendar/index", {
    title: "Calendar",
    activePage: "calendar",
    });*/
    res.send("Calendar Route Works");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});