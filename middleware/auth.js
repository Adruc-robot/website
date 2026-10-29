
function renderForbidden(req, res) {
  return res.status(403).render("errors/403", {
    title: "403 — Forbidden",
    activePage: null
  });
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return renderForbidden(req, res);
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return renderForbidden(req, res);
  }

  next();
}

module.exports = {
  requireLogin,
  requireAdmin
};
