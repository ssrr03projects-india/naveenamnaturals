// CSRF protection middleware
// For stateless APIs, we use a simpler approach with custom headers
// The csrf package can be used for more advanced token-based protection if needed

// Generate CSRF token (for future use with token-based CSRF)
const generateCSRFToken = (req, res, next) => {
  try {
    // For now, we use a simpler approach with custom headers
    // This can be enhanced with token-based CSRF if needed
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    res.locals.csrfToken = token;
    res.setHeader("X-CSRF-Token", token);
    next();
  } catch (error) {
    console.error("CSRF token generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSRF token",
    });
  }
};

// Verify CSRF token (for future use with token-based CSRF)
const verifyCSRFToken = (req, res, next) => {
  // This is a placeholder for token-based CSRF verification
  // Currently using verifyCSRFTokenSimple for simpler protection
  return verifyCSRFTokenSimple(req, res, next);
};

// Simple CSRF protection for stateless APIs
// This uses custom headers that browsers enforce same-origin policy for
const verifyCSRFTokenSimple = (req, res, next) => {
  try {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Get token from header
    const token =
      req.headers["x-csrf-token"] || req.headers["x-requested-with"];

    // For stateless APIs, we use a simpler approach:
    // Check if request has a custom header (browsers enforce same-origin policy)
    // This is a basic CSRF protection - for stronger protection, use the token-based approach above
    if (!token && !req.headers["x-requested-with"]) {
      // Allow if it's from same origin (check referer)
      const referer = req.headers.referer || req.headers.origin;
      const frontendUrl = process.env.FRONTEND_URL || "";
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "https://dashboard.naveenamnaturals.com",
        "https://www.naveenamnaturals.com",
        "https://www.dashboard.naveenamnaturals.com",
        "https://naveenamnaturals.com",
        frontendUrl,
      ].filter(Boolean);

      const isAllowedOrigin = allowedOrigins.some((origin) => {
        if (!referer) return false;
        return referer.includes(origin) || referer.startsWith(origin);
      });

      if (!isAllowedOrigin) {
        return res.status(403).json({
          success: false,
          message: "CSRF protection: Invalid request origin",
        });
      }
    }

    next();
  } catch (error) {
    console.error("CSRF verification error:", error);
    res.status(403).json({
      success: false,
      message: "CSRF verification failed",
    });
  }
};

module.exports = {
  generateCSRFToken,
  verifyCSRFToken,
  verifyCSRFTokenSimple,
};
