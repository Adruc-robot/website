require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

const captureApiRouter = require("./routes/api/captures");

const session = require("express-session");

const bootstrapAdmin = require("./services/bootstrapAdmin");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

//Routes requires
const homeRoutes = require("./routes/home");
const authRoutes = require("./routes/auth");
const locationsRoutes = require("./routes/locations");

//Authentication
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});

app.use("/", homeRoutes);
app.use("/login", authRoutes);
app.use("/locations", locationsRoutes);

app.get("/calendar", (req, res) => {
  res.render("calendar/index", {
    title: "Calendar",
    activePage: "calendar",
  });
});

app.use("/api/captures", captureApiRouter);

async function initializeApplication() {
    try {
        await bootstrapAdmin();

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error("Application startup failed:", error);
        process.exit(1);
    }
}

initializeApplication();

//Connection test
const db = require("./services/db");

(async () => {
  try {
    const [rows] = await db.query("SELECT VERSION() AS version");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
})();