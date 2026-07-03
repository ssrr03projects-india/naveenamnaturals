const jwt = require("jsonwebtoken");
const authMiddleware = require("./auth.middleware");
const customerAuth = require("./customerAuth.middleware");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Allows review creation by either authenticated customer or authenticated admin.
const authenticateReviewCreator = (req, res, next) => {
  let token = req.cookies?.customer_token;

  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type === "customer") {
      return customerAuth.authenticateCustomerToken(req, res, next);
    }

    // Non-customer token is treated as admin token.
    return authMiddleware.authenticateToken(req, res, next);
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Review auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  authenticateReviewCreator,
};
