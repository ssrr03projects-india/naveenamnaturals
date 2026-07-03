const jwt = require("jsonwebtoken");
const db = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Middleware to verify JWT token for customers
const authenticateCustomerToken = async (req, res, next) => {
  try {
    // Try to get token from cookie first (httpOnly, more secure)
    let token = req.cookies?.customer_token;
    
    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers["authorization"];
      token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access token required" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is for customer type
    if (decoded.type && decoded.type !== "customer") {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token type" 
      });
    }

    // Get customer from database
    const customerData = await db.customer.findByPk(decoded.id);

    if (!customerData) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token - customer not found" 
      });
    }

    if (!customerData.isActive) {
      return res.status(401).json({ 
        success: false,
        message: "Account is deactivated" 
      });
    }

    // Add customer to request object
    req.user = customerData;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }

    console.error("Customer auth middleware error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

module.exports = {
  authenticateCustomerToken,
};

