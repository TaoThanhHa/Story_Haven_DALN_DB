const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();

  if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/admin/api")) {
    return res.status(401).json({ error: "Unauthorized: Vui lòng đăng nhập." });
  }

  req.session.returnTo = req.originalUrl;
  return res.redirect("/login");
};

const isAdmin = (req, res, next) => {
  if (!req.session.user) {
    if (req.originalUrl.startsWith("/admin/api") || req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ error: "Unauthorized: Yêu cầu quyền Admin." });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect("/login");
  }

  if (req.session.user.role === "admin") {
    return next();
  }

  if (req.originalUrl.startsWith("/admin/api")) {
    return res.status(403).json({ error: "Forbidden: Bạn không có quyền Admin." });
  }

  return res.status(403).render("error_page", {
    message: "Bạn không có quyền truy cập (Yêu cầu Admin)."
  });
};

const isAuthor = (req, res, next) => {
  if (!req.session.user) {
    if (req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ error: "Unauthorized: Yêu cầu quyền Author." });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect("/login");
  }

  const role = req.session.user.role;
  if (role === "author" || role === "admin") {
    return next();
  }

  if (req.originalUrl.startsWith("/api")) {
    return res.status(403).json({ error: "Forbidden: Bạn cần quyền Tác giả (Author)." });
  }

  return res.status(403).render("error_page", {
    message: "Bạn không có quyền thực hiện hành động này (Yêu cầu quyền Author)."
  });
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isAuthor
};
