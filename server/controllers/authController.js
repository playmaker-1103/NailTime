const jwt = require("jsonwebtoken");

function buildAdminResponse(email) {
  return {
    email,
    role: "admin"
  };
}

function createToken(admin) {
  return jwt.sign(admin, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

function hasAdminConfig() {
  return process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.JWT_SECRET;
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (!hasAdminConfig()) {
    return res.status(500).json({ message: "Admin environment variables are not configured" });
  }

  const emailMatches = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const passwordMatches = password === process.env.ADMIN_PASSWORD;

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const admin = buildAdminResponse(process.env.ADMIN_EMAIL);
  const token = createToken(admin);

  return res.json({ token, admin });
}

async function me(req, res) {
  return res.json({ admin: req.admin });
}

module.exports = { login, me };
