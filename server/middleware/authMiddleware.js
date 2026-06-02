const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT secret is not configured" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const admin = jwt.verify(token, process.env.JWT_SECRET);

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.admin = admin;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { protect };
