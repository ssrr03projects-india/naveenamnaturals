const jwt = require("jsonwebtoken");
const db = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get admin from database
    const admin = await db.admin.findByPk(decoded.id);

    if (!admin) {
      return res
        .status(401)
        .json({ message: "Invalid token - admin not found" });
    }

    if (!admin.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Add admin to request object
    req.user = admin;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if admin has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// Generate refresh token
const generateRefreshToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      type: "refresh",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = {
  authenticateToken,
  requireRole,
  generateToken,
  generateRefreshToken,
};
