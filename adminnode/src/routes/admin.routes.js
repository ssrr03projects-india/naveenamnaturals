const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { adminLoginLimiter } = require("../middlewares/rateLimit.middleware");

console.log("🔧 Admin routes file loaded");

// Middleware to capture rate limit info
const captureRateLimitInfo = (req, res, next) => {
  // Store original json method to intercept response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // If this is an error response (401), include rate limit info
    if (res.statusCode === 401 || res.statusCode === 429) {
      // Try to get remaining attempts from rate limiter
      if (req.rateLimit && typeof req.rateLimit.remaining === 'number') {
        data.remainingAttempts = req.rateLimit.remaining;
        data.maxAttempts = 8;
      }
    }
    return originalJson(data);
  };
  next();
};

// Public routes
router.post("/login", adminLoginLimiter, captureRateLimitInfo, (req, res) => {
  console.log("🔧 Admin login route hit");
  adminController.login(req, res);
});

// Protected routes
router.get(
  "/verify",
  authMiddleware.authenticateToken,
  adminController.verifyToken
);
router.get(
  "/profile",
  authMiddleware.authenticateToken,
  adminController.getProfile
);
router.put(
  "/profile",
  authMiddleware.authenticateToken,
  adminController.updateProfile
);
router.put(
  "/change-password",
  authMiddleware.authenticateToken,
  adminController.changePassword
);

console.log("🔧 Admin routes registered");

module.exports = router;
