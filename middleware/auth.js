function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(403).send('Forbidden');
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }

  next();
}

module.exports = {
  requireLogin,
  requireAdmin
};