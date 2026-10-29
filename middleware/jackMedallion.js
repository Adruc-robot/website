
const availableMedallions = ["october"];

function jackMedallion(req, res, next) {
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "America/Denver"
  }).format(new Date()).toLowerCase();

  res.locals.medallion = availableMedallions.includes(month)
    ? month
    : "october";

  next();
}

module.exports = jackMedallion;
